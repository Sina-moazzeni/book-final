import JSZip from 'jszip';
import { BookChunk } from '../types.ts';

export interface ParsedEpubResult {
  title: string;
  originalTitle: string;
  author: string;
  chunks: BookChunk[];
  totalImagesCount: number;
}

/**
 * Normalizes relative paths within EPUB zip archive.
 */
function resolveZipPath(baseDir: string, relativePath: string): string {
  // Decode URI components (e.g. %20 -> space)
  const decodedRel = decodeURIComponent(relativePath);
  if (!baseDir) return decodedRel.replace(/^\/+/, '');

  const parts = (baseDir.replace(/^\/+/, '') + '/' + decodedRel).split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Extracts text and paragraphs from XHTML chapter string, resolving images.
 */
function parseChapterHtml(
  xhtmlString: string,
  imageMap: Map<string, string>,
  chapterDir: string
): { title: string; htmlBlocks: string[] } {
  let doc: Document | null = null;
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      doc = parser.parseFromString(xhtmlString, 'text/html');
    } catch (e) {
      // fallback to regex if DOMParser fails
    }
  }

  let chapterTitle = '';
  const htmlBlocks: string[] = [];

  if (doc && doc.body) {
    // 1. Find title from heading or title tag
    const heading = doc.querySelector('h1, h2, h3, title');
    if (heading && heading.textContent?.trim()) {
      chapterTitle = heading.textContent.trim().replace(/\s+/g, ' ');
    }

    // 2. Resolve image src attributes to base64 data URLs
    const images = doc.querySelectorAll('img, image');
    images.forEach(img => {
      const rawSrc = img.getAttribute('src') || img.getAttribute('xlink:href') || '';
      if (!rawSrc) return;

      const resolvedPath = resolveZipPath(chapterDir, rawSrc);
      const dataUrl = imageMap.get(resolvedPath) || imageMap.get(rawSrc.split('/').pop() || '');

      if (dataUrl) {
        img.setAttribute('src', dataUrl);
        img.setAttribute(
          'class',
          'book-embedded-image rounded-xl shadow-md my-4 max-w-full mx-auto block border border-slate-300'
        );
        img.removeAttribute('xlink:href');
      }
    });

    // 3. Extract semantic blocks (headings, paragraphs, blockquotes, images)
    const blocks = doc.querySelectorAll('h1, h2, h3, h4, p, blockquote, div.image, figure');
    const processedImgElements = new Set<Element>();
    const processedSrcFingerprints = new Set<string>();

    if (blocks.length > 0) {
      blocks.forEach(block => {
        // If block has an img inside or is an image
        const imgEl = block.tagName.toLowerCase() === 'img' ? block : block.querySelector('img');
        if (imgEl && !processedImgElements.has(imgEl)) {
          processedImgElements.add(imgEl);
          const src = imgEl.getAttribute('src');
          if (src && src.startsWith('data:image')) {
            const fingerprint = src.slice(0, 250);
            if (!processedSrcFingerprints.has(fingerprint)) {
              processedSrcFingerprints.add(fingerprint);
              htmlBlocks.push(
                `<div class="book-illustration-wrap my-4 text-center"><img src="${src}" class="book-embedded-image rounded-xl shadow-md my-3 max-w-full mx-auto block border border-slate-300" alt="تصویر کتاب" /></div>`
              );
            }
          }
        }

        const text = block.textContent?.trim() || '';
        if (text) {
          const tag = block.tagName.toLowerCase();
          if (['h1', 'h2', 'h3'].includes(tag)) {
            htmlBlocks.push(`<${tag}>${text}</${tag}>`);
          } else if (tag === 'blockquote') {
            htmlBlocks.push(`<blockquote>${text}</blockquote>`);
          } else {
            htmlBlocks.push(`<p>${text}</p>`);
          }
        }
      });
    } else {
      // Fallback: split body text by paragraphs
      const bodyText = doc.body.textContent || '';
      bodyText.split(/\n\s*\n/).forEach(p => {
        if (p.trim()) htmlBlocks.push(`<p>${p.trim()}</p>`);
      });
    }
  } else {
    // Regex-based fallback
    const titleMatch = /<(?:h[1-3]|title)[^>]*>([\s\S]*?)<\/(?:h[1-3]|title)>/i.exec(xhtmlString);
    if (titleMatch) {
      chapterTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Replace images with resolved data URLs
    let modifiedHtml = xhtmlString;
    for (const [imgPath, dataUrl] of imageMap.entries()) {
      const fileName = imgPath.split('/').pop() || '';
      const regex = new RegExp(`src=["'][^"']*${fileName}["']`, 'gi');
      modifiedHtml = modifiedHtml.replace(
        regex,
        `src="${dataUrl}" class="book-embedded-image rounded-xl shadow-md my-4 max-w-full mx-auto block border border-slate-300"`
      );
    }

    const pMatches = modifiedHtml.match(/<(?:p|h[1-3]|blockquote)[^>]*>[\s\S]*?<\/(?:p|h[1-3]|blockquote)>/gi);
    if (pMatches) {
      htmlBlocks.push(...pMatches);
    } else {
      modifiedHtml.split(/\n\s*\n/).forEach(p => {
        if (p.trim()) htmlBlocks.push(`<p>${p.replace(/<[^>]+>/g, '').trim()}</p>`);
      });
    }
  }

  return {
    title: chapterTitle,
    htmlBlocks,
  };
}

/**
 * Parses an EPUB file into structured book project chunks.
 */
export async function parseEpubFile(
  fileData: ArrayBuffer | Blob | Uint8Array,
  fileName: string = 'کتاب.epub',
  maxWordsPerChunk: number = 700
): Promise<ParsedEpubResult> {
  const zip = await JSZip.loadAsync(fileData);

  // 1. Read META-INF/container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('فایل EPUB فاقد ساختار استاندارد است (فایل container.xml یافت نشد).');
  }

  // Find full-path to OPF file
  const opfPathMatch = /full-path=["']([^"']+\.opf)["']/i.exec(containerXml);
  if (!opfPathMatch) {
    throw new Error('مسیر فایل محتوای اصلی (.opf) در سند EPUB یافت نشد.');
  }

  const opfPath = opfPathMatch[1];
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  // 2. Read OPF package file
  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error(`فایل پکیج EPUB در مسیر ${opfPath} یافت نشد.`);
  }

  // 3. Extract Metadata
  const cleanBaseName = fileName.replace(/\.epub$/i, '').trim();
  let bookTitle = cleanBaseName;
  let author = 'نامشخص';

  const titleMatch = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opfContent);
  if (titleMatch && titleMatch[1].trim()) {
    bookTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  const authorMatch = /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opfContent);
  if (authorMatch && authorMatch[1].trim()) {
    author = authorMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // 4. Extract Manifest Items
  interface ManifestItem {
    id: string;
    href: string;
    mediaType: string;
    resolvedZipPath: string;
  }

  const manifestMap = new Map<string, ManifestItem>();
  const itemRegex = /<item\s+[^>]*>/gi;
  let match;

  while ((match = itemRegex.exec(opfContent)) !== null) {
    const itemTag = match[0];
    const idMatch = /id=["']([^"']+)["']/i.exec(itemTag);
    const hrefMatch = /href=["']([^"']+)["']/i.exec(itemTag);
    const mediaMatch = /media-type=["']([^"']+)["']/i.exec(itemTag);

    if (idMatch && hrefMatch) {
      const id = idMatch[1];
      const href = hrefMatch[1];
      const mediaType = mediaMatch ? mediaMatch[1].toLowerCase() : '';
      const resolvedZipPath = resolveZipPath(opfDir, href);

      manifestMap.set(id, {
        id,
        href,
        mediaType,
        resolvedZipPath,
      });
    }
  }

  // 5. Extract and cache all image assets as base64 data URLs
  const imageMap = new Map<string, string>();
  let totalImagesCount = 0;

  for (const item of manifestMap.values()) {
    if (item.mediaType.startsWith('image/')) {
      const imgFile = zip.file(item.resolvedZipPath);
      if (imgFile) {
        try {
          const base64 = await imgFile.async('base64');
          const dataUrl = `data:${item.mediaType};base64,${base64}`;
          imageMap.set(item.resolvedZipPath, dataUrl);
          // Also set by bare filename for loose matching
          const baseName = item.resolvedZipPath.split('/').pop() || '';
          if (baseName) imageMap.set(baseName, dataUrl);
          totalImagesCount++;
        } catch (e) {
          console.warn(`Could not read EPUB image ${item.resolvedZipPath}`, e);
        }
      }
    }
  }

  // 6. Extract Spine (Reading Order)
  const spineIds: string[] = [];
  const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*>/gi;
  while ((match = itemrefRegex.exec(opfContent)) !== null) {
    spineIds.push(match[1]);
  }

  // If no spine found, fallback to manifest html files
  if (spineIds.length === 0) {
    manifestMap.forEach(item => {
      if (item.mediaType.includes('xhtml') || item.mediaType.includes('html')) {
        spineIds.push(item.id);
      }
    });
  }

  // 7. Parse Chapters in Spine Order
  const chunks: BookChunk[] = [];
  let globalChunkCounter = 1;
  let chapterIndex = 1;

  for (const spineId of spineIds) {
    const item = manifestMap.get(spineId);
    if (!item) continue;

    const file = zip.file(item.resolvedZipPath);
    if (!file) continue;

    const xhtmlString = await file.async('text');
    const chapterDir = item.resolvedZipPath.includes('/')
      ? item.resolvedZipPath.slice(0, item.resolvedZipPath.lastIndexOf('/'))
      : '';

    const { title: extractedTitle, htmlBlocks } = parseChapterHtml(xhtmlString, imageMap, chapterDir);

    if (htmlBlocks.length === 0) continue;

    const cleanChapterTitle = extractedTitle || `فصل ${chapterIndex}`;

    // Chunk this chapter by maxWordsPerChunk
    let currentChunkHtml: string[] = [];
    let currentWordCount = 0;
    let subChunkNumber = 1;

    const commitSubChunk = () => {
      if (currentChunkHtml.length === 0) return;
      const chunkHtml = currentChunkHtml.join('\n');
      const plainText = chunkHtml.replace(/<img[^>]*>/gi, '').replace(/<[^>]+>/g, ' ').trim();
      const words = plainText.split(/\s+/).filter(Boolean).length;
      const hasImages = /<img[^>]*>/i.test(chunkHtml);
      const imageCount = (chunkHtml.match(/<img[^>]*>/gi) || []).length;

      chunks.push({
        id: `chk_${Date.now()}_${globalChunkCounter}`,
        chapterNumber: chapterIndex,
        chapterTitle: cleanChapterTitle,
        chunkNumber: subChunkNumber,
        englishText: chunkHtml,
        wordCount: Math.max(1, words),
        estimatedTokens: Math.ceil(words * 1.35),
        status: 'idle',
        hasImages,
        imageCount,
      });

      globalChunkCounter++;
      subChunkNumber++;
      currentChunkHtml = [];
      currentWordCount = 0;
    };

    htmlBlocks.forEach(block => {
      const blockWords = block
        .replace(/<img[^>]*>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;

      if (currentWordCount + blockWords > maxWordsPerChunk && currentWordCount > 200) {
        commitSubChunk();
      }
      currentChunkHtml.push(block);
      currentWordCount += blockWords;
    });

    commitSubChunk();
    chapterIndex++;
  }

  if (chunks.length === 0) {
    throw new Error('هیچ متنی از فایل EPUB قابل استخراج نبود. ممکن است فایل محافظت‌شده (DRM) باشد.');
  }

  return {
    title: bookTitle,
    originalTitle: bookTitle,
    author,
    chunks,
    totalImagesCount,
  };
}
