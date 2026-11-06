import { BookChunk } from '../types.ts';

export interface ChunkOptions {
  maxWordsPerChunk?: number; // Target word count per chunk, default ~700
}

export function chunkBookText(rawText: string, options: ChunkOptions = {}): BookChunk[] {
  const maxWords = options.maxWordsPerChunk || 700;
  const chunks: BookChunk[] = [];

  if (!rawText || !rawText.trim()) return chunks;

  // Normalize line endings
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Chapter detection pattern for English and Persian book conventions
  const headingRegex = /^(?:#{1,3}\s+|(?:CHAPTER|Chapter|PART|Part|BOOK|Book|SECTION|Section|ACT|Act)\s+(?:[0-9]+|[IVXLCDM]+|[A-Za-z]+)|(?:Introduction|Prologue|Preface|Foreword|Epilogue|Conclusion|Afterword)|(?:فصل|بخش|گفتار|دیباچه|پیش‌گفتار|مقدمه)\s*(?:[۰-۹0-9]+|[A-Za-z]+)?)/i;

  // Split into raw chapter blocks if multiple chapters found
  const rawChapters: { title: string; body: string }[] = [];
  const lines = cleanText.split('\n');

  let currentTitle = 'فصل اول';
  let currentLines: string[] = [];
  let foundFirstHeading = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isHeading =
      headingRegex.test(trimmed) ||
      (trimmed.length > 0 && trimmed.length < 80 && /^(?:Chapter\s+|فصل\s+|Part\s+)/i.test(trimmed));

    if (isHeading && (currentLines.join('\n').trim().length > 60 || !foundFirstHeading)) {
      if (currentLines.join('\n').trim().length > 0) {
        rawChapters.push({
          title: currentTitle,
          body: currentLines.join('\n').trim(),
        });
      }
      currentTitle = trimmed.replace(/^#+\s*/, '').replace(/[:—–-]+$/, '').trim();
      currentLines = [];
      foundFirstHeading = true;
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    rawChapters.push({
      title: currentTitle,
      body: currentLines.join('\n').trim(),
    });
  }

  // If no chapter headings were detected, treat the entire text as one block
  if (rawChapters.length === 0) {
    rawChapters.push({
      title: 'فصل اول',
      body: cleanText.trim(),
    });
  }

  let globalChunkCounter = 1;

  rawChapters.forEach((ch, chIdx) => {
    const paragraphs = ch.body.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    let currentChunkParagraphs: string[] = [];
    let currentWordCount = 0;
    let subChunkNumber = 1;

    const commitSubChunk = () => {
      if (currentChunkParagraphs.length === 0) return;
      const englishText = currentChunkParagraphs.join('\n\n');
      const words = englishText.split(/\s+/).filter(Boolean).length;

      chunks.push({
        id: `chk_${Date.now()}_${globalChunkCounter}`,
        chapterNumber: chIdx + 1,
        chapterTitle: ch.title,
        chunkNumber: subChunkNumber,
        englishText,
        wordCount: words,
        estimatedTokens: Math.ceil(words * 1.35),
        status: 'idle',
      });

      globalChunkCounter++;
      subChunkNumber++;
      currentChunkParagraphs = [];
      currentWordCount = 0;
    };

    paragraphs.forEach(p => {
      const pWords = p.split(/\s+/).filter(Boolean).length;
      if (currentWordCount + pWords > maxWords && currentWordCount > 250) {
        commitSubChunk();
      }
      currentChunkParagraphs.push(p.trim());
      currentWordCount += pWords;
    });

    commitSubChunk();
  });

  return chunks;
}
