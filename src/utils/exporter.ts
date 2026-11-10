import type {
  Document as DocumentType,
  Paragraph as ParagraphType,
  TextRun as TextRunType,
} from 'docx';
import { BookProject, BookChunk, BookDesignConfig } from '../types.ts';
import { BOOK_THEMES, DEFAULT_DESIGN_CONFIG } from '../constants/themes.ts';
import { resolveApiUrl } from './aiClient.ts';

/**
 * Clean chapter titles by removing artificial chunk suffixes like:
 * "(بخش 1)", "(بخش ۱)", "- بخش 1", "بخش 1", "[Part 1]", "(Part 1)", etc.
 */
export function cleanChapterTitle(title: any): string {
  if (!title) return 'فصل کتاب';
  const str = typeof title === 'string' ? title : String(title);
  try {
    let cleaned = str
      .replace(/\s*[\(\[\{]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]/gi, '')
      .replace(/\s*[-–—|:]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+/gi, '')
      .replace(/\s+بخش\s+[0-9۰-۹IVXLCDMivxlcdm]+$/gi, '')
      .replace(/\s*[\(\[\{]\s*(?:Part|Section|Chunk)\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]/gi, '')
      .replace(/\s*[-–—|:]\s*(?:Part|Section|Chunk)\s*[0-9۰-۹IVXLCDMivxlcdm]+/gi, '')
      .trim();

    return cleaned || 'فصل کتاب';
  } catch (e) {
    return str || 'فصل کتاب';
  }
}

/**
 * Splits run-on walls of text or blocks with breaks into elegant, distinct paragraphs.
 * Enforces strong readability, appropriate line-height, and generous margins between paragraphs.
 */
export function formatToDistinctParagraphs(html: string): string {
  if (!html || typeof html !== 'string' || !html.trim()) return '';

  try {
    let clean = sanitizeTranslatedHtml(html);

    // 1. Table of Contents Smart Separation
    // If text contains "فهرست مطالب" or "فهرست", extract title and separate items onto individual lines
    if (/فهرست مطالب|فهرست/i.test(clean)) {
      clean = clean.replace(/<p([^>]*)>\s*(?:#\s*)?(?:فهرست مطالب|فهرست)(?:[:：]|\s*<br\s*[\/]?>|\s*\n)?([\s\S]*?)<\/p>/gi, (_whole, _attrs, innerContent) => {
        let itemsHtml = '';
        const rawItems = innerContent
          .split(/<br\s*[\/]?>|\n|(?=[۰-۹0-9]+[-–.])/i)
          .map((s: string) => s.trim())
          .filter(Boolean);

        if (rawItems.length > 1) {
          itemsHtml = rawItems
            .map((item: string) => `<p style="line-height: 2.2; font-size: 13pt; margin-bottom: 12px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 6px; text-align: right;">${item}</p>`)
            .join('\n');
        } else if (innerContent.trim()) {
          itemsHtml = `<p style="line-height: 2.2; font-size: 13pt; margin-bottom: 12px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 6px; text-align: right;">${innerContent.trim()}</p>`;
        }
        return `<h1 style="color: #1a365d; font-size: 24pt; margin-bottom: 24px; text-align: center; font-weight: 800;">فهرست مطالب</h1>\n${itemsHtml}`;
      });
    }

    // 2. If text doesn't contain any <p>, <h1>, <h2> tags at all, wrap distinct blocks into <p>
    if (!/<(p|h[1-3]|blockquote|div)[\s>]/i.test(clean)) {
      const rawParagraphs = clean
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      return rawParagraphs
        .map(p => {
          const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length >= 2 && lines.every(l => l.length < 85)) {
            return lines
              .map(l => `<p style="line-height: 2.2; font-size: 13pt; margin-bottom: 12px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 6px; text-align: right;">${l}</p>`)
              .join('\n');
          }
          const textWithBreaks = p.replace(/\n/g, '<br/>');
          return `<p style="line-height: 2.2; font-size: 12.5pt; text-align: justify; margin-bottom: 24px;">${textWithBreaks}</p>`;
        })
        .join('\n\n');
    }

    // 3. If single <p> tags contain multiple consecutive <br><br> or linebreaks, break them into separate paragraphs
    clean = clean.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
      // If the paragraph has <br> or multiple breaks, split into multiple <p>
      if (/<br\s*[\/]?>|\n/i.test(content)) {
        const parts = content
          .split(/<br\s*[\/]?>\s*<br\s*[\/]?>|\n\s*\n|<br\s*[\/]?>|\n/i)
          .map((part: string) => part.trim())
          .filter(Boolean);

        if (parts.length > 1) {
          const allShort = parts.every((p: string) => p.length < 90);
          return parts
            .map((part: string) => {
              if (allShort) {
                return `<p style="line-height: 2.2; font-size: 13pt; margin-bottom: 12px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 6px; text-align: right;">${part}</p>`;
              }
              return `<p${attrs || ' style="line-height: 2.2; font-size: 12.5pt; text-align: justify; margin-bottom: 24px;"'}>${part}</p>`;
            })
            .join('\n\n');
        }
      }

      // Ensure margin-bottom is at least 24px in style attribute for clear separation
      if (!attrs.includes('margin-bottom')) {
        return `<p${attrs} style="margin-bottom: 24px; line-height: 2.2; font-size: 12.5pt; text-align: justify;">${content}</p>`;
      }
      return match;
    });

    return clean;
  } catch (e) {
    return html;
  }
}

/**
 * Strips raw URLs and ugly hyperlinks from book text.
 * Books should not contain printed raw URLs like https://... or giant links.
 * Descriptive anchor texts like <a href="...">متن</a> are retained as clean plain text.
 */
export function stripBookUrls(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    let cleaned = html;

    // 1. If anchor tag text itself is a URL, remove the whole anchor tag
    cleaned = cleaned.replace(/<a\s+[^>]*href=["'][^"']*["'][^>]*>\s*https?:\/\/[^\s<]+<\/a>/gi, '');
    cleaned = cleaned.replace(/<a\s+[^>]*href=["'][^"']*["'][^>]*>\s*www\.[^\s<]+<\/a>/gi, '');

    // 2. If anchor tag has descriptive text, keep only the descriptive text and drop the <a> link wrapper
    cleaned = cleaned.replace(/<a\s+[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');

    // 3. Remove raw URLs in plain text: https://... or http://...
    cleaned = cleaned.replace(/https?:\/\/[^\s<>"'\)]+/gi, '');

    // 4. Remove www.... links in plain text
    cleaned = cleaned.replace(/(?:^|\s)(?:www\.)[a-z0-9\-]+(?:\.[a-z0-9\-]+)+(?:\/[^\s<>"'\)]*)?/gi, ' ');

    // 5. Clean up any leftover empty parentheses or brackets like () or [] or [ ]
    cleaned = cleaned.replace(/\(\s*\)/g, '');
    cleaned = cleaned.replace(/\[\s*\]/g, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');

    return cleaned.trim();
  } catch (e) {
    return html;
  }
}

/**
 * Detects whether a book chunk represents a Reference, Bibliography, or Sources section
 * (typically located at the end of the book).
 */
export function isReferenceOrBibliographyChunk(chunk: { chapterTitle?: string; englishText?: string; translatedHtml?: string }): boolean {
  if (!chunk) return false;
  const title = (chunk.chapterTitle ? String(chunk.chapterTitle) : '').toLowerCase();
  const keywords = [
    'references',
    'bibliography',
    'works cited',
    'sources',
    'further reading',
    'notes and references',
    'منابع',
    'مآخذ',
    'منابع و مآخذ',
    'فهرست منابع',
    'پی‌نوشت‌ها',
    'پی‌نوشت',
    'پاورقی‌ها',
    'یادداشت‌های پایانی',
    'یادداشت‌ها',
    'مراجع',
  ];
  if (keywords.some(kw => title.includes(kw))) return true;

  // If text or html starts with references or bibliography
  const snippet = ((chunk.translatedHtml || chunk.englishText || '').slice(0, 200)).toLowerCase();
  return keywords.some(kw => snippet.includes(kw));
}

/**
 * Formats footnotes, endnotes, and references into distinct, publication-grade styling.
 * Applies separator lines, smaller readable font, and distinct numbering badges.
 */
export function formatFootnotesAndReferences(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    let formatted = html;

    // Enhance footnotes or notes paragraphs
    // E.g. <p>[1] ...</p> or <p>[۱] ...</p> or <p>پاورقی: ...</p> or <p>1. ...</p>
    formatted = formatted.replace(
      /<p([^>]*)>\s*(\[[0-9۰-۹IVXLCDMivxlcdm]+\]|\([0-9۰-۹IVXLCDMivxlcdm]+\)|(?:پانویس|پاورقی|پی‌نوشت|یادداشت)\s*[:：]|\b[0-9۰-۹]+\s*[-–.]\s*)([\s\S]*?)<\/p>/gi,
      (_match, _attrs, num, content) => {
        return `<div class="book-footnote"><span class="book-footnote-badge">${num}</span> <span class="book-footnote-text">${content}</span></div>`;
      }
    );

    return formatted;
  } catch (e) {
    return html;
  }
}

/**
 * Removes any artificial chunk headers injected by AI models into HTML, strips raw URLs,
 * and formats footnotes for elegant book typography.
 */
export function sanitizeTranslatedHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    // Strip ugly raw URLs and hyperlinks from book text
    let sanitized = stripBookUrls(html);

    sanitized = sanitized
      .replace(/<span[^>]*style=["'][^"']*#(?:9b2c2c|c53030|e53e3e)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '$1')
      .replace(/<span[^>]*class=["'][^"']*highlight[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '$1')
      .replace(/<h[1-3][^>]*>\s*مقدمه و بخش نخست\s*(?:\([^\)]*\))?\s*<\/h[1-3]>/gi, '')
      .replace(/<h[1-3][^>]*>[^<]*[\(\[\{]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}][^<]*<\/h[1-3]>/gi, '')
      .replace(/<p[^>]*>\s*[\(\[\{]?\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]?\s*<\/p>/gi, '')
      .replace(/(?:margin-right|margin-left|padding-right|padding-left|text-indent)\s*:\s*[^;"]+;?/gi, '')
      // Strip chatbot conversational remarks and meta-fillers (e.g. "اگر متن اصلی ... را ارسال کنید...")
      .replace(/(?:<p[^>]*>)?\s*(?:اگر|چنانچه|در\s+صورت\s+اینکه|در\s+صورتی\s+که|لطفاً|خواهشمند\s+است)\s+(?:متن\s+اصلی|متن\s+کتاب|پاراگراف‌ها|دیالوگ‌ها|ادامه\s+متن)[\s\S]*?(?:ارائه\s+می‌?کنم|ترجمه\s+خواهم\s+کرد|ارسال\s+فرمایید|ارسال\s+کنید|در\s+اختیار\s+قرار\s+دهید|خدمت\s+شما\s+ارائه\s+می‌?گردد)[.!?؟\s]*(?:<\/p>)?/gi, '')
      .replace(/(?:<p[^>]*>)?\s*اگر\s+متن\s+اصلی\s*\([^\)]*\)\s*را\s+ارسال\s+کنید[\s\S]*?(?:<\/p>)?/gi, '')
      .replace(/(?:<p[^>]*>)?\s*[^<]*رعایت\s+واژگان\s+تثبیت[\s\S]*?پیوند\s+ریتمیک[^<]*(?:<\/p>)?/gi, '')
      .replace(/(?:<p[^>]*>)?\s*(?:لطفاً|خواهشمند\s+است)\s+متن\s+اصلی\s+را\s+ارسال\s+کنید[.!?؟\s]*(?:<\/p>)?/gi, '')
      .replace(/(?:<p[^>]*>)?\s*(?:Please provide the text|If you provide the text|Waiting for the text)[\s\S]*?(?:<\/p>)?/gi, '')
      .trim();

    // Fast & safe non-backtracking image deduplication
    if (sanitized.includes('<img')) {
      const seenSrcs = new Set<string>();
      sanitized = sanitized.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
        if (!src) return match;
        const fingerprint = src.length > 250 ? src.slice(0, 250) : src;
        if (seenSrcs.has(fingerprint)) {
          return '';
        }
        seenSrcs.add(fingerprint);
        return match;
      });
      // Clean up empty figure or wrapper divs leftover after image removal
      sanitized = sanitized
        .replace(/<figure[^>]*>\s*<\/figure>/gi, '')
        .replace(/<div class="[^"]*book-illustration-wrap[^"]*">\s*<\/div>/gi, '');
    }

    // Format footnotes and references into distinct publication styling
    sanitized = formatFootnotesAndReferences(sanitized);

    return sanitized;
  } catch (e) {
    return html;
  }
}

/**
 * Converts formatted book HTML to clean plain text for easy manual editing.
 * Strips HTML markup while preserving paragraph breaks, headings, and quotes.
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    let clean = html;

    // Preserve image slots cleanly
    clean = clean.replace(/<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>|<div[^>]*class="[^"]*book-illustration-wrap[^"]*"[^>]*>[\s\S]*?<\/div>|<img[^>]*>/gi, '\n[[تصویر کتاب]]\n');
    clean = clean.replace(/(?:\[\[(?:تصویر کتاب|IMAGE_PRESERVED_SLOT_\d+)\]\]\s*){2,}/gi, '[[تصویر کتاب]]\n');

    // Replace block closures with double newlines
    clean = clean.replace(/<\/(p|h1|h2|h3|h4|blockquote|div)>/gi, '\n\n');
    clean = clean.replace(/<br\s*[\/]?>/gi, '\n');

    // Strip all other HTML tags
    clean = clean.replace(/<[^>]+>/g, '');

    // Decode common HTML entities
    clean = clean
      .replace(/&nbsp;/g, ' ')
      .replace(/&zwnj;/g, '\u200c')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    clean = clean.replace(/\n{3,}/g, '\n\n').trim();
    return clean;
  } catch (e) {
    return html.replace(/<[^>]+>/g, '');
  }
}

/**
 * Converts manually edited plain text back into standard publication-grade book HTML.
 * Formats paragraphs, detects headings, blockquotes, and restores preserved images.
 */
export function plainTextToHtml(plainText: string, originalHtml?: string): string {
  if (!plainText || !plainText.trim()) return '';

  // Extract distinct original high-res image blocks from originalHtml to prevent losing or duplicating images
  const originalImages: string[] = [];
  const seenOriginalFp = new Set<string>();
  if (originalHtml) {
    const imgMatches = originalHtml.match(/<div[^>]*class="[^"]*book-illustration-wrap[^"]*"[^>]*>[\s\S]*?<\/div>|<figure[^>]*>[\s\S]*?<\/figure>|<img[^>]*src=["']data:[^"']+["'][^>]*>/gi);
    if (imgMatches) {
      for (const m of imgMatches) {
        const fp = m.slice(0, 200);
        if (!seenOriginalFp.has(fp)) {
          seenOriginalFp.add(fp);
          originalImages.push(m);
        }
      }
    }
  }

  const blocks = plainText
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  let imageIndex = 0;
  const htmlParts: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Check if block represents an image slot
    if (block.includes('[[تصویر کتاب]]') || block.includes('[[IMAGE_PRESERVED_SLOT_')) {
      if (imageIndex < originalImages.length) {
        htmlParts.push(originalImages[imageIndex]);
        imageIndex++;
      }
      continue;
    }

    // Fleuron and ornamental dividers (e.g. ✤ ── ❦ ── ✤)
    if (block.includes('❦') || block.includes('───') || block.startsWith('✤')) {
      htmlParts.push(`<div class="book-fleuron-divider" style="text-align: center; margin: 26px 0; font-size: 15pt; color: #b45309; letter-spacing: 5px;">✤ ───── ❦ ───── ✤</div>`);
      continue;
    }

    // Markdown-style Heading 1 or chapter title
    if (block.startsWith('# ')) {
      const headingText = block.replace(/^#\s*/, '').trim();
      htmlParts.push(`<h1 style="color: #1a365d; font-size: 24pt; margin-bottom: 22px; text-align: center;">${headingText}</h1>`);
    } else if (block.startsWith('## ')) {
      const headingText = block.replace(/^##\s*/, '').trim();
      htmlParts.push(`<h2 style="color: #2b6cb0; font-size: 18pt; margin-top: 28px; margin-bottom: 14px;">${headingText}</h2>`);
    } else if (block.startsWith('### ')) {
      const headingText = block.replace(/^###\s*/, '').trim();
      htmlParts.push(`<h3 style="color: #2c5282; font-size: 14pt; margin-top: 18px; margin-bottom: 10px;">${headingText}</h3>`);
    } else if (block.includes('💡') || block.includes('نکته کلیدی')) {
      // 💡 جعبه نکته کلیدی و خلاصه (Key Takeaway Box)
      const text = block.replace(/^[>*\s]*💡\s*(?:[*\s]*نکته کلیدی:?[*\s]*)?/i, '').trim();
      htmlParts.push(`
        <div class="book-callout book-callout-tip" style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 14px 18px; margin: 22px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #b45309; margin-bottom: 6px; font-size: 11pt;">
            <span>💡</span>
            <span>نکته کلیدی و خلاصه فصل</span>
          </div>
          <p style="margin: 0; line-height: 2.0; font-size: 11.5pt; color: #78350f;">${text}</p>
        </div>
      `);
    } else if (block.includes('📜') || block.includes('نقل‌قول') || block.includes('نقل قول')) {
      // 📜 جعبه نقل قول زرین (Author / Golden Quote Box)
      const text = block.replace(/^[>*\s]*📜\s*(?:[*\s]*نقل‌?قول:?[*\s]*)?/i, '').trim();
      htmlParts.push(`
        <div class="book-callout book-callout-quote" style="background: #f0fdf4; border-right: 4px solid #10b981; padding: 14px 18px; margin: 22px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #047857; margin-bottom: 6px; font-size: 11pt;">
            <span>📜</span>
            <span>کلام و نقل‌قول بزرگان</span>
          </div>
          <p style="margin: 0; line-height: 2.1; font-size: 12pt; color: #064e3b; font-style: italic;">«${text.replace(/^[«"]+|[»"]+$/g, '')}»</p>
        </div>
      `);
    } else if (block.includes('⚠️') || block.includes('توجه مهم') || block.includes('هشدار')) {
      // ⚠️ جعبه هشدار و توجه حساس (Warning Callout Box)
      const text = block.replace(/^[>*\s]*⚠️\s*(?:[*\s]*توجه مهم:?[*\s]*)?/i, '').trim();
      htmlParts.push(`
        <div class="book-callout book-callout-warning" style="background: #fef2f2; border-right: 4px solid #ef4444; padding: 14px 18px; margin: 22px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #b91c1c; margin-bottom: 6px; font-size: 11pt;">
            <span>⚠️</span>
            <span>توجه مهم و تمایز مفهومی</span>
          </div>
          <p style="margin: 0; line-height: 2.0; font-size: 11.5pt; color: #7f1d1d;">${text}</p>
        </div>
      `);
    } else if (block.includes('❓') || block.includes('پرسش برای تامل') || block.includes('پرسش و تامل')) {
      // ❓ جعبه تامل و پرسش برای خواننده (Reflection / Study Box)
      const text = block.replace(/^[>*\s]*❓\s*(?:[*\s]*پرسش برای تامل:?[*\s]*)?/i, '').trim();
      htmlParts.push(`
        <div class="book-callout book-callout-question" style="background: #f0f9ff; border-right: 4px solid #0284c7; padding: 14px 18px; margin: 22px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #0369a1; margin-bottom: 6px; font-size: 11pt;">
            <span>❓</span>
            <span>پرسش برای تامل و تمرین خواننده</span>
          </div>
          <p style="margin: 0; line-height: 2.0; font-size: 11.5pt; color: #0c4a6e;">${text}</p>
        </div>
      `);
    } else if (block.startsWith('[پانویس:') || block.startsWith('پانویس:')) {
      // 📝 یادداشت و پانویس استاندارد مترجم
      const text = block.replace(/^\[?پانویس:\s*|\]$/g, '').trim();
      htmlParts.push(`
        <div class="book-footnote" style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 9.5pt; color: #64748b; line-height: 1.8;">
          <strong style="color: #475569;">[پانویس مترجم]:</strong> ${text}
        </div>
      `);
    } else if (block.startsWith('> ') || block.startsWith('«')) {
      const quoteText = block.replace(/^>\s*/, '').trim();
      htmlParts.push(`<blockquote style="border-right: 4px solid #3182ce; padding: 12px 18px; margin: 18px 0; background: #f7fafc; color: #4a5568; font-style: italic;">${quoteText}</blockquote>`);
    } else if (/^(?:#\s*)?(?:فهرست مطالب|فهرست)(?:[:：]|\n|$)/i.test(block)) {
      // Dedicated Table of contents block
      const subLines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const tocHeading = subLines[0].replace(/^#+\s*/, '').trim();
      htmlParts.push(`<h1 style="color: #1a365d; font-size: 24pt; margin-bottom: 24px; text-align: center; font-weight: 800;">${tocHeading}</h1>`);
      for (let s = 1; s < subLines.length; s++) {
        htmlParts.push(`<p style="line-height: 2.2; font-size: 13pt; margin-bottom: 12px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 6px; text-align: right;">${subLines[s]}</p>`);
      }
    } else {
      const subLines = block.split('\n').map(l => l.trim()).filter(Boolean);
      // If block contains multiple short lines (TOC, poetry, headings, or list items)
      if (subLines.length >= 2 && subLines.every(l => l.length < 85)) {
        for (const line of subLines) {
          if (line.startsWith('# ')) {
            htmlParts.push(`<h1 style="color: #1a365d; font-size: 24pt; margin-bottom: 22px; text-align: center;">${line.replace(/^#\s*/, '')}</h1>`);
          } else if (line.startsWith('## ')) {
            htmlParts.push(`<h2 style="color: #2b6cb0; font-size: 18pt; margin-top: 28px; margin-bottom: 14px;">${line.replace(/^##\s*/, '')}</h2>`);
          } else if (line.startsWith('### ')) {
            htmlParts.push(`<h3 style="color: #2c5282; font-size: 14pt; margin-top: 18px; margin-bottom: 10px;">${line.replace(/^###\s*/, '')}</h3>`);
          } else {
            htmlParts.push(`<p style="line-height: 2.2; font-size: 13pt; margin-bottom: 12px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 6px; text-align: right;">${line}</p>`);
          }
        }
      } else {
        // Standard publication body paragraph with generous spacing for readability
        const pContent = block.replace(/\n/g, '<br/>');
        htmlParts.push(`<p style="line-height: 2.2; font-size: 12.5pt; text-align: justify; margin-bottom: 24px;">${pContent}</p>`);
      }
    }
  }

  // If there are remaining images not consumed, append them cleanly
  while (imageIndex < originalImages.length) {
    htmlParts.push(originalImages[imageIndex]);
    imageIndex++;
  }

  return htmlParts.join('\n');
}

export interface GroupedChapter {
  chapterKey: string;
  title: string;
  htmlContent: string;
}

/**
 * Groups consecutive chunks belonging to the same chapter into one continuous chapter flow.
 * Ensures the chapter title is displayed only ONCE and sub-chunks flow seamlessly without repeating headers or mid-chapter page breaks.
 */
export function groupChunksIntoChapters(chunks: BookChunk[], excludedChunkIds?: string[]): GroupedChapter[] {
  const excludedSet = new Set(excludedChunkIds || []);
  const validChunks = (chunks || []).filter(c =>
    c &&
    !c.isExcludedFromBook &&
    !excludedSet.has(c.id) &&
    c.translatedHtml &&
    c.translatedHtml.trim().length > 0
  );
  if (validChunks.length === 0) return [];

  // Check if chunks are primarily page-based (imported from PDF pages like "صفحه 1", "صفحه 2")
  const pageChunkCount = validChunks.filter(c => /^(صفحه|page)\s*\d+/i.test(c.chapterTitle?.trim() || '')).length;
  const isPageBased = pageChunkCount >= Math.min(2, validChunks.length);

  const chapters: GroupedChapter[] = [];
  let currentChapter: GroupedChapter | null = null;

  for (const chunk of validChunks) {
    const rawTitle = chunk.chapterTitle || 'فصل کتاب';
    const cleanedTitle = cleanChapterTitle(rawTitle);
    const sanitizedChunkHtml = sanitizeTranslatedHtml(chunk.translatedHtml || '');
    if (!sanitizedChunkHtml) continue;

    const isThisChunkPage = /^(صفحه|page)\s*\d+/i.test(cleanedTitle);

    // If PDF pages, keep continuous flow under unified book body so pages flow seamlessly underneath each other
    const chapterKey = isPageBased
      ? (isThisChunkPage ? 'continuous_book_stream' : cleanedTitle)
      : (chunk.chapterNumber ? `ch_${chunk.chapterNumber}` : cleanedTitle);

    const chapterTitle = (isPageBased && isThisChunkPage) ? '' : cleanedTitle;

    if (!currentChapter || currentChapter.chapterKey !== chapterKey) {
      currentChapter = {
        chapterKey,
        title: chapterTitle,
        htmlContent: sanitizedChunkHtml,
      };
      chapters.push(currentChapter);
    } else {
      currentChapter.htmlContent += `\n${sanitizedChunkHtml}`;
    }
  }

  // Ensure strict image deduplication on concatenated chapter content
  chapters.forEach(ch => {
    ch.htmlContent = sanitizeTranslatedHtml(ch.htmlContent);
  });

  return chapters;
}

/**
 * Standardize font names for Microsoft Word.
 * Removes suffixes like "Medium", "Bold" so Word matches the exact Windows font family registry name.
 */
export function cleanFontFamily(fontName: string = 'Vazirmatn'): string {
  if (!fontName) return 'Vazirmatn';
  const cleaned = fontName.replace(/\s+(Medium|Regular|Bold|Light|SemiBold|Black)$/i, '').trim();
  return cleaned || 'Vazirmatn';
}

/**
 * Generates Word multi-script font definition with Complex Script (cs) support.
 * For Persian & Arabic, Word relies strictly on w:cs font mapping.
 */
export function createFontDef(fontName: string = 'Vazirmatn') {
  const family = cleanFontFamily(fontName);
  return {
    name: family,
    cs: family,       // Complex Script for Persian characters
    ascii: family,    // Latin text, numbers, punctuation
    hAnsi: family,
    eastAsia: family,
  };
}

/**
 * Convert base64 data URL to Uint8Array for docx ImageRun in browser.
 * Safe from string limits and memory crashes.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn('Failed to convert base64 image data to Uint8Array:', e);
    return new Uint8Array(0);
  }
}

/**
 * Parse HTML content into styled TextRun objects preserving color highlights and weights.
 */
export function parseHtmlToTextRuns(html: string, fontName: string = 'Vazirmatn', TextRunClass?: any): any[] {
  const runs: any[] = [];
  const fontDef = createFontDef(fontName);
  const makeRun = (opts: any) => TextRunClass ? new TextRunClass(opts) : opts;

  const regex = /<span style="[^"]*#9b2c2c[^"]*"[^>]*>([\s\S]*?)<\/span>|<b[^>]*>([\s\S]*?)<\/b>|<strong[^>]*>([\s\S]*?)<\/strong>|<i[^>]*>([\s\S]*?)<\/i>|<em[^>]*>([\s\S]*?)<\/em>|([^<]+)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      // Glossary term treated with standard body styling (no crimson highlight)
      runs.push(
        makeRun({
          text: match[1].replace(/<[^>]+>/g, ''),
          font: fontDef,
          size: 24, // 12pt
          color: '2D3748',
          rightToLeft: true,
        })
      );
    } else if (match[2] || match[3]) {
      // Bold text
      runs.push(
        makeRun({
          text: (match[2] || match[3]).replace(/<[^>]+>/g, ''),
          font: fontDef,
          size: 24,
          bold: true,
          color: '2D3748',
          rightToLeft: true,
        })
      );
    } else if (match[4] || match[5]) {
      // Italic text
      runs.push(
        makeRun({
          text: (match[4] || match[5]).replace(/<[^>]+>/g, ''),
          font: fontDef,
          size: 24,
          italics: true,
          color: '4A5568',
          rightToLeft: true,
        })
      );
    } else if (match[6] && match[6].length > 0) {
      runs.push(
        makeRun({
          text: match[6],
          font: fontDef,
          size: 24,
          color: '2D3748',
          rightToLeft: true,
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(
      makeRun({
        text: html.replace(/<[^>]+>/g, '').trim(),
        font: fontDef,
        size: 24,
        color: '2D3748',
        rightToLeft: true,
      })
    );
  }

  return runs;
}

/**
 * Builds a complete Word (.docx) document object with Persian typography and RTL formatting.
 */
export async function buildClientDocxDocument(project: BookProject): Promise<DocumentType> {
  const docx = await import('docx');
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ImageRun,
    BorderStyle,
    Header,
    Footer,
    PageNumber,
  } = docx;

  const design: BookDesignConfig = {
    ...DEFAULT_DESIGN_CONFIG,
    ...(project.designConfig || {}),
  };

  const fontFamily = cleanFontFamily(design.fontFamily || 'Vazirmatn');
  const fontDef = createFontDef(fontFamily);

  const activeTheme = BOOK_THEMES[design.themeId] || BOOK_THEMES.spiritual;
  const customColors = design.customColors || {};
  const h1Color = (customColors.heading1Color || activeTheme.headingColor || '1A365D').replace('#', '').toUpperCase();
  const h2Color = (customColors.heading2Color || activeTheme.accentColor || '2B6CB0').replace('#', '').toUpperCase();
  const h3Color = (customColors.heading3Color || '2C5282').replace('#', '').toUpperCase();
  const headerColor = (customColors.headerColor || '718096').replace('#', '').toUpperCase();
  const footerColor = (customColors.footerColor || '718096').replace('#', '').toUpperCase();
  const textColor = (customColors.textColor || activeTheme.textColor || '2D3748').replace('#', '').toUpperCase();
  const pageBgColor = (customColors.pageBgColor || activeTheme.pageBgColor || 'FBF6EA').replace('#', '').toUpperCase();

  const pSpacingAfter =
    design.paragraphSpacing === 'generous'
      ? 420
      : design.paragraphSpacing === 'relaxed'
      ? 340
      : design.paragraphSpacing === 'compact'
      ? 180
      : 260;
  const pSpacingBefore = design.paragraphSpacing === 'generous' ? 120 : 60;
  const pLineSpacing = design.lineSpacing === 'relaxed' ? 440 : design.lineSpacing === 'compact' ? 340 : 380;

  const showHeader = design.showHeader === true && Boolean(design.headerText?.trim());
  const headerText = showHeader ? (design.headerText?.trim() || '') : '';

  const showFooter = design.showFooter === true && Boolean(design.footerText?.trim());
  const footerText = showFooter ? (design.footerText?.trim() || '') : '';
  const showPageNumbers = design.showPageNumbers !== false;

  const docChildren: ParagraphType[] = [];

  // Title Page (Cover / First Page)
  const cover = design.coverPage;
  const coverTitle = cover?.title?.trim() || project.title || project.originalTitle || 'کتاب ترجمه شده';
  const coverTitleSize = Math.round((cover?.titleSize || 28) * 2);
  const coverTitleColor = cover?.titleColor ? cover.titleColor.replace(/^#/, '') : h1Color;
  const coverSubtitle = cover?.subtitle?.trim() || '';
  const coverSubtitleSize = Math.round((cover?.subtitleSize || 14) * 2);
  const coverAuthor = cover?.author?.trim() || project.author || '';
  const coverAuthorSize = Math.round((cover?.authorSize || 14) * 2);
  const coverTranslator = cover?.translator?.trim() || project.translator || '';
  const coverPublisher = cover?.publisher?.trim() || '';
  const coverNote = cover?.note?.trim() || '';
  const coverShowMotif = cover?.showMotif !== false;
  const coverShowDivider = cover?.showDivider !== false;
  const coverAlign = (cover?.layout === 'right_aligned' || cover?.layout === 'right') ? AlignmentType.RIGHT : AlignmentType.CENTER;

  if (coverShowMotif) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { before: 1400, after: 200 },
        bidirectional: true,
        children: [
          new TextRun({
            text: '✤ ───── ❦ ───── ✤',
            font: fontDef,
            size: 24,
            color: 'B45309',
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: coverAlign,
      spacing: { before: coverShowMotif ? 300 : 2000, after: 300 },
      bidirectional: true,
      children: [
        new TextRun({
          text: coverTitle,
          font: fontDef,
          size: coverTitleSize,
          bold: true,
          color: coverTitleColor,
          rightToLeft: true,
        }),
      ],
    })
  );

  if (coverSubtitle) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { after: 300 },
        bidirectional: true,
        children: [
          new TextRun({
            text: coverSubtitle,
            font: fontDef,
            size: coverSubtitleSize,
            color: '64748B',
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  if (coverShowDivider) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { before: 200, after: 400 },
        bidirectional: true,
        children: [
          new TextRun({
            text: '❖',
            font: fontDef,
            size: 20,
            color: 'D97706',
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  if (coverAuthor) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { after: 200 },
        bidirectional: true,
        children: [
          new TextRun({
            text: `نویسنده: ${coverAuthor}`,
            font: fontDef,
            size: coverAuthorSize,
            color: '4A5568',
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  if (coverTranslator) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { after: 300 },
        bidirectional: true,
        children: [
          new TextRun({
            text: `ترجمه و ویرایش: ${coverTranslator}`,
            font: fontDef,
            size: 24, // 12pt
            italics: true,
            color: '718096',
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  if (coverPublisher) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { after: 200 },
        bidirectional: true,
        children: [
          new TextRun({
            text: `ناشر: ${coverPublisher}`,
            font: fontDef,
            size: 22, // 11pt
            color: '64748B',
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  if (coverNote) {
    docChildren.push(
      new Paragraph({
        alignment: coverAlign,
        spacing: { after: 600 },
        bidirectional: true,
        children: [
          new TextRun({
            text: coverNote,
            font: fontDef,
            size: 20, // 10pt
            color: '94A3B8',
            italics: true,
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  // Page break after title page
  docChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 400 },
    })
  );

  // Chapters & paragraphs grouped seamlessly by genuine chapter
  const groupedChapters = groupChunksIntoChapters(project.chunks, project.designConfig?.excludedChunkIds);

  for (let chIdx = 0; chIdx < groupedChapters.length; chIdx++) {
    const ch = groupedChapters[chIdx];
    // Yield to the browser UI thread every 4 chapters to keep the browser responsive
    if (chIdx > 0 && chIdx % 4 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (chIdx > 0) {
      if (design.continuousFlow === false) {
        docChildren.push(new Paragraph({ pageBreakBefore: true }));
      } else {
        // Continuous Flow: Elegant ornamental divider instead of blank page
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 240 },
            bidirectional: true,
            children: [
              new TextRun({
                text: '✤ ───── ❦ ───── ✤',
                font: fontDef,
                size: 20,
                color: 'b45309',
              }),
            ],
          })
        );
      }
    }

    const html = ch.htmlContent || '';
    const blockRegex = /<(h[1-3]|p|blockquote|div|figure)[^>]*>([\s\S]*?)<\/\1>|<img\s+[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi;
    let match;
    let foundAny = false;

    while ((match = blockRegex.exec(html)) !== null) {
      foundAny = true;

      // Standalone Image
      if (match[3]) {
        const dataUrl = match[3];
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx !== -1) {
          try {
            const base64Data = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
            const imgBuffer = base64ToUint8Array(base64Data);
            const isJpg = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg');
            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 240 },
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: {
                      width: 440,
                      height: 280,
                    },
                    type: isJpg ? 'jpg' : 'png',
                  } as any),
                ],
              })
            );
          } catch (imgErr) {
            console.warn('Could not add image to docx:', imgErr);
          }
        }
        continue;
      }

      const tag = match[1].toLowerCase();
      const innerHtml = match[2];

      // Embedded image within block
      const embeddedImgRegex = /<img\s+[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi;
      let imgMatch;
      while ((imgMatch = embeddedImgRegex.exec(innerHtml)) !== null) {
        try {
          const dataUrl = imgMatch[1];
          const commaIdx = dataUrl.indexOf(',');
          if (commaIdx !== -1) {
            const base64Data = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
            const imgBuffer = base64ToUint8Array(base64Data);
            const isJpg = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg');
            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 240 },
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: {
                      width: 440,
                      height: 280,
                    },
                    type: isJpg ? 'jpg' : 'png',
                  } as any),
                ],
              })
            );
          }
        } catch (imgErr) {
          console.warn('Could not add embedded image to docx:', imgErr);
        }
      }

      const cleanHtmlNoImg = innerHtml.replace(/<img[^>]*>/gi, '');
      const plainText = cleanHtmlNoImg.replace(/<[^>]+>/g, '').trim();
      if (!plainText) continue;

      const h1DocxSize = Math.round((design.heading1Size || 22) * 2);
      const h2DocxSize = Math.round((design.heading2Size || 17) * 2);
      const h3DocxSize = Math.round((design.heading3Size || 14) * 2);

      if (tag === 'h1') {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.RIGHT,
            spacing: { before: 500, after: 300 },
            bidirectional: true,
            children: [
              new TextRun({
                text: plainText,
                font: fontDef,
                size: h1DocxSize,
                bold: true,
                color: h1Color,
                rightToLeft: true,
              }),
            ],
          })
        );
      } else if (tag === 'h2') {
        // Sub-heading / Sub-menu H2 with custom h2Color
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400, after: 200 },
            bidirectional: true,
            children: [
              new TextRun({
                text: plainText,
                font: fontDef,
                size: h2DocxSize,
                bold: true,
                color: h2Color,
                rightToLeft: true,
              }),
            ],
          })
        );
      } else if (tag === 'h3') {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300, after: 150 },
            bidirectional: true,
            children: [
              new TextRun({
                text: plainText,
                font: fontDef,
                size: h3DocxSize,
                bold: true,
                color: h3Color,
                rightToLeft: true,
              }),
            ],
          })
        );
      } else if (tag === 'blockquote') {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 240 },
            indent: { right: 720 },
            bidirectional: true,
            border: {
              right: {
                color: h2Color || '3182CE',
                size: 24,
                style: BorderStyle.SINGLE,
              },
            },
            children: [
              new TextRun({
                text: '« ',
                font: fontDef,
                size: 22,
                color: h2Color || '3182CE',
                rightToLeft: true,
              }),
              ...parseHtmlToTextRuns(innerHtml, fontFamily, TextRun),
              new TextRun({
                text: ' »',
                font: fontDef,
                size: 22,
                color: h2Color || '3182CE',
                rightToLeft: true,
              }),
            ],
          })
        );
      } else {
        // Standard Persian Paragraph with natural RTL alignment (prevents ugly word gaps from justified in Word)
        const paraAlignment = design.textAlignment === 'both' ? AlignmentType.BOTH : AlignmentType.RIGHT;
        docChildren.push(
          new Paragraph({
            alignment: paraAlignment,
            spacing: { line: pLineSpacing, before: pSpacingBefore, after: pSpacingAfter },
            bidirectional: true,
            children: parseHtmlToTextRuns(innerHtml, fontFamily, TextRun),
          })
        );
      }
    }

    if (!foundAny) {
      const lines = html.replace(/<[^>]+>/g, '').split('\n').map(l => l.trim()).filter(Boolean);
      const paraAlignment = design.textAlignment === 'both' ? AlignmentType.BOTH : AlignmentType.RIGHT;
      lines.forEach(line => {
        docChildren.push(
          new Paragraph({
            alignment: paraAlignment,
            spacing: { line: 360, after: 200 },
            bidirectional: true,
            children: [
              new TextRun({
                text: line,
                font: fontDef,
                size: 24,
                rightToLeft: true,
              }),
            ],
          })
        );
      });
    }
  }

  const themeKey = (design.themeId || 'spiritual') as keyof typeof BOOK_THEMES;
  const theme = BOOK_THEMES[themeKey] || BOOK_THEMES.spiritual;

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: fontDef,
            rightToLeft: true,
            size: 24, // 12pt
            color: textColor,
          },
          paragraph: {
            alignment: AlignmentType.RIGHT,
            spacing: { line: pLineSpacing, after: pSpacingAfter },
          },
        },
      },
    },
    background: {
      color: pageBgColor,
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: showHeader && headerText ? {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: headerText,
                    font: fontDef,
                    size: 18, // 9pt
                    color: headerColor,
                    rightToLeft: true,
                  }),
                ],
              }),
            ],
          }),
        } : undefined,
        footers: (showFooter || showPageNumbers) ? {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [
                  ...(footerText ? [
                    new TextRun({
                      text: showPageNumbers ? `${footerText} • صفحه ` : footerText,
                      font: fontDef,
                      size: 18,
                      color: footerColor,
                      rightToLeft: true,
                    }),
                  ] : (showPageNumbers ? [
                    new TextRun({
                      text: 'صفحه ',
                      font: fontDef,
                      size: 18,
                      color: footerColor,
                      rightToLeft: true,
                    }),
                  ] : [])),
                  ...(showPageNumbers ? [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: fontDef,
                      size: 18,
                      color: footerColor,
                      rightToLeft: true,
                    }),
                  ] : []),
                ],
              }),
            ],
          }),
        } : undefined,
        children: docChildren,
      },
    ],
  });
}

/**
 * Downloads high-fidelity Persian DOCX file.
 * Prioritizes high-capacity server-side generation (/api/export/docx) for speed,
 * preventing browser tab crashes and memory freezes on 100-500+ page books.
 * Falls back to cooperative client-side generation and Word-HTML if server is unreachable.
 */
export async function downloadDocx(project: BookProject): Promise<boolean> {
  const validChunks = (project.chunks || [])
    .filter(c => c && c.translatedHtml && c.translatedHtml.trim().length > 0 && !c.isExcludedFromBook);

  if (validChunks.length === 0) {
    alert('هیچ بخشی هنوز ترجمه نشده است.');
    return false;
  }

  const groupedChapters = groupChunksIntoChapters(project.chunks, project.designConfig?.excludedChunkIds);

  // 1. Try High-Capacity Server Endpoint FIRST (handles 100 to 1,000+ pages in seconds without browser memory spikes)
  try {
    const res = await fetch(resolveApiUrl('/api/export/docx'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: project.title || project.originalTitle || 'کتاب ترجمه شده',
        author: project.author,
        translator: project.translator || 'سامانه هوشمند ترجمه کتاب',
        chapters: groupedChapters.map(ch => ({
          title: ch.title,
          htmlContent: ch.htmlContent,
        })),
        designConfig: project.designConfig,
      }),
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        const blob = await res.blob();
        if (blob && blob.size > 100) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${project.title || project.originalTitle || 'book-translated'}.docx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return true;
        }
      }
    }
    console.warn('Server docx endpoint returned unexpected response, attempting client generation...');
  } catch (serverErr) {
    console.warn('Server docx endpoint unavailable, falling back to browser generation:', serverErr);
  }

  // 2. Cooperative Client-Side DOCX Generation Fallback
  try {
    const docx = await import('docx');
    const doc = await buildClientDocxDocument(project);
    const blob = await docx.Packer.toBlob(doc);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || project.originalTitle || 'book-translated'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (clientErr: any) {
    console.error('Client docx generation failed, falling back to Word-HTML format:', clientErr);
    downloadWordHtml(project);
    return true;
  }
}

/**
 * Downloads Word-compatible HTML format (.doc) with extensive Microsoft Word bidi styling.
 */
export function downloadWordHtml(project: BookProject) {
  const design: BookDesignConfig = {
    ...DEFAULT_DESIGN_CONFIG,
    ...(project.designConfig || {}),
  };

  const fontFamily = cleanFontFamily(design.fontFamily || 'Vazirmatn');
  const theme = BOOK_THEMES[design.themeId] || BOOK_THEMES.spiritual;
  const customColors = design.customColors || {};
  const bgColor = customColors.pageBgColor || theme.pageBgColor || '#fbf6ea';
  const headingColor = customColors.heading1Color || theme.headingColor || '#1a365d';
  const h2Color = customColors.heading2Color || theme.accentColor || '#2b6cb0';
  const h3Color = customColors.heading3Color || '#2c5282';
  const headerColor = customColors.headerColor || '#718096';
  const footerColor = customColors.footerColor || '#718096';
  const textColor = customColors.textColor || theme.textColor || '#2d3748';
  const accentColor = customColors.accentColor || theme.accentColor || '#b45309';

  const pMarginBottom =
    design.paragraphSpacing === 'generous'
      ? '36px'
      : design.paragraphSpacing === 'relaxed'
      ? '30px'
      : design.paragraphSpacing === 'compact'
      ? '16px'
      : '24px';

  const groupedChapters = groupChunksIntoChapters(project.chunks, project.designConfig?.excludedChunkIds);

  const chaptersHtml = groupedChapters
    .map((ch, idx) => `
      ${idx > 0 && design.continuousFlow !== false ? '<div style="text-align: center; margin: 36px 0; font-size: 14pt; color: #b45309;">✤ ───── ❦ ───── ✤</div>' : ''}
      <div style="${idx > 0 && design.continuousFlow === false ? 'page-break-before: always; ' : ''}margin-top: 30px;">
        ${design.showHeader && design.headerText ? `
        <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 24px; font-size: 9pt; color: ${headerColor}; display: flex; justify-content: space-between;">
          <span>${design.headerText}</span>
          <span dir="ltr">${project.originalTitle || ''}</span>
        </div>` : ''}
        <div style="margin-top: 10px;">${ch.htmlContent}</div>
        ${design.showFooter && design.footerText ? `
        <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 35px; font-size: 9pt; color: ${footerColor}; text-align: center;">
          ${design.footerText}
        </div>` : ''}
      </div>
    `)
    .join('\n');

  const fullWordHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>${project.title}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: '${fontFamily}', 'Vazirmatn', 'B Nazanin', 'B Mitra', 'IRANSans', 'Tahoma', 'Arial', sans-serif;
        mso-ascii-font-family: '${fontFamily}';
        mso-hansi-font-family: '${fontFamily}';
        mso-bidi-font-family: '${fontFamily}';
        direction: rtl;
        text-align: right;
        margin: 40px;
        background-color: ${bgColor};
        color: ${textColor};
      }
      p, div, span, h1, h2, h3, blockquote {
        font-family: '${fontFamily}', 'Vazirmatn', 'B Nazanin', 'B Mitra', 'Tahoma', sans-serif;
        mso-bidi-font-family: '${fontFamily}';
        mso-ascii-font-family: '${fontFamily}';
      }
      h1 { color: ${headingColor}; font-size: 22pt; margin-bottom: 20px; text-align: right; font-weight: bold; }
      h2 { color: ${h2Color}; font-size: 17pt; margin-top: 24px; margin-bottom: 12px; text-align: right; font-weight: bold; }
      h3 { color: ${h3Color}; font-size: 14pt; margin-top: 18px; margin-bottom: 10px; text-align: right; font-weight: bold; }
      p { line-height: 2.0; font-size: 12.5pt; text-align: right; margin-bottom: ${pMarginBottom}; text-justify: none; }
      blockquote { border-right: 4px solid ${h2Color}; padding: 12px 18px; margin: 18px 0; background: #f7fafc; color: #4a5568; font-style: italic; }
      span.highlight { color: inherit; font-weight: 600; }
      img, .book-embedded-image { max-width: 85%; height: auto; display: block; margin: 18px auto; border-radius: 8px; }
      .book-illustration-wrap { text-align: center; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div style="text-align: center; margin-top: 80px; margin-bottom: 100px;">
      <h1>${project.title || project.originalTitle}</h1>
      <p style="font-size: 14pt; color: #4a5568;">نویسنده: ${project.author || 'نامشخص'}</p>
      <p style="font-size: 12pt; color: ${footerColor}; font-style: italic;">مترجم: ${project.translator || 'سامانه هوشمند ترجمه کتاب'}</p>
      ${design.showHeader && design.headerText ? `<p style="font-size: 11pt; color: ${headerColor}; margin-top: 15px;">${design.headerText}</p>` : ''}
    </div>
    ${chaptersHtml}
  </body>
  </html>`;

  const blob = new Blob(['\ufeff', fullWordHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title || project.originalTitle || 'book-translated'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadStyledHtml(project: BookProject) {
  const groupedChapters = groupChunksIntoChapters(project.chunks, project.designConfig?.excludedChunkIds);
  const content = groupedChapters
    .map(ch => `
      <section class="chapter-section" style="margin-bottom: 50px; border-bottom: 1px solid #e2e8f0; padding-bottom: 30px;">
        <h2 class="chapter-title" style="color: #1a365d; font-size: 20pt; text-align: center; margin-bottom: 25px;">${ch.title}</h2>
        ${ch.htmlContent}
      </section>
    `)
    .join('\n');

  const htmlDoc = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${project.title || project.originalTitle}</title>
  <style>
    body {
      font-family: 'Vazirmatn', sans-serif;
      direction: rtl;
      text-align: right;
      background: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 40px 20px;
    }
    .book-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 60px 50px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .book-header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 40px;
      margin-bottom: 50px;
    }
    h1 { color: #1a365d; font-size: 26pt; margin-bottom: 15px; }
    h2 { color: #2b6cb0; font-size: 18pt; margin-top: 25px; margin-bottom: 12px; }
    h3 { color: #2c5282; font-size: 14pt; margin-top: 15px; margin-bottom: 8px; }
    p { line-height: 1.95; font-size: 12.5pt; text-align: justify; margin-bottom: 16px; color: #334155; }
    blockquote { border-right: 4px solid #3182ce; padding: 12px 20px; margin: 18px 0; background: #f0f7ff; color: #1e293b; font-style: italic; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <div class="book-container">
    <div class="book-header">
      <h1>${project.title || project.originalTitle}</h1>
      <p style="font-size: 16px; color: #64748b; margin: 8px 0;">نویسنده: ${project.author || 'نامشخص'}</p>
      <p style="font-size: 14px; color: #94a3b8; font-style: italic; margin: 5px 0;">مترجم: ${project.translator || 'سامانه هوشمند ترجمه کتاب'}</p>
    </div>
    <div class="book-content">
      ${content}
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title || project.originalTitle || 'book-translated'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPlainText(project: BookProject) {
  let plain = `# ${project.title || project.originalTitle}\n`;
  if (project.author) plain += `نویسنده: ${project.author}\n`;
  if (project.translator) plain += `مترجم: ${project.translator}\n`;
  plain += `\n=========================================\n\n`;

  const groupedChapters = groupChunksIntoChapters(project.chunks, project.designConfig?.excludedChunkIds);
  groupedChapters.forEach(ch => {
    plain += `## ${ch.title}\n\n`;
    const textOnly = (ch.htmlContent || '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/blockquote>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    plain += `${textOnly}\n\n-----------------------------------------\n\n`;
  });

  const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title || project.originalTitle || 'book-translated'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProjectJson(project: BookProject) {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title || project.originalTitle || 'project'}-backup.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
