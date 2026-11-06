import { db, BookRecord } from './db.ts';

export interface EstablishedTerm {
  en: string;
  fa: string;
  category?: string;
}

export interface BookContextCache {
  bookId: string;
  totalChunksTranslated: number;
  lastChunkNumber: number;
  // Compact running narrative / argument thread (kept under 120-180 words to minimize tokens)
  runningNarrativeSummary: string;
  // Dynamic registry of key character names & recurring terms discovered and established in earlier chunks
  establishedTerminology: EstablishedTerm[];
  // The last 1-2 translated Persian sentences from the immediately preceding chunk to anchor tone and sentence cadence
  lastEndingSentence?: string;
  // Tone & rhythm instructions
  rhythmCadenceNotes?: string;
  updatedAt: number;
  // Estimated token savings compared to dumping raw historical chapters into the context window
  tokensSavedEstimate: number;
}

// In-memory fast cache map
const memoryCache = new Map<string, BookContextCache>();

/**
 * Strips HTML tags and excessive whitespace to get clean plain text
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the last 1-2 meaningful sentences from translated Persian text
 */
function extractLastEndingSentences(plainText: string): string {
  if (!plainText) return '';
  // Split on sentence-ending punctuation (. or ! or ؟ or \n)
  const sentences = plainText
    .split(/(?<=[.!?؟\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('#'));

  if (sentences.length === 0) {
    return plainText.slice(-160).trim();
  }

  // Pick last 1 or 2 sentences
  const lastParts = sentences.slice(-2);
  const combined = lastParts.join(' ');
  return combined.length > 220 ? combined.slice(-220).trim() : combined;
}

/**
 * Extracts key recurring proper nouns or capitalized technical terms from English text
 */
function extractKeyTerms(englishText: string, persianText: string): EstablishedTerm[] {
  const terms: EstablishedTerm[] = [];
  const words = englishText.match(/\b[A-Z][a-zA-Z]{2,20}\b/g) || [];
  const frequency = new Map<string, number>();

  for (const w of words) {
    // Exclude common starting sentence words
    if (/^(The|This|That|These|Those|When|What|Where|Which|Who|How|Why|There|Here|Then|Once|Also|However|Although|Because|After|Before|While|Each|Every|Many|Some|With|From|Into|Over|Under)$/i.test(w)) {
      continue;
    }
    frequency.set(w, (frequency.get(w) || 0) + 1);
  }

  // Sort by occurrence
  const sorted = Array.from(frequency.entries())
    .filter(([_, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [en] of sorted) {
    // If the term might have a direct mention or translation, record as tracked term
    terms.push({ en, fa: '', category: 'نام/مفهوم کلیدی' });
  }

  return terms;
}

export class BookCacheManager {
  /**
   * Retrieves or initializes the dedicated context cache for a book
   */
  public getCache(bookId: string): BookContextCache | null {
    if (!bookId) return null;

    if (memoryCache.has(bookId)) {
      return memoryCache.get(bookId)!;
    }

    const book = db.getBookById(bookId);
    if (book && (book as any).contextCache) {
      const persisted = (book as any).contextCache as BookContextCache;
      memoryCache.set(bookId, persisted);
      return persisted;
    }

    return null;
  }

  /**
   * Formats the dedicated book context cache into a token-efficient prompt block
   */
  public formatPromptContext(bookId: string, chapterTitle?: string, tone?: string): string {
    const cache = this.getCache(bookId);
    if (!cache || cache.totalChunksTranslated === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('[DEDICATED BOOK CONTEXT CACHE - حافظه اختصاصی ریتم و پیوستگی کتاب]');
    lines.push(`- شناسه کش این کتاب: ${cache.bookId} (بخش‌های ترجمه‌شده تا کنون: ${cache.totalChunksTranslated})`);

    if (cache.runningNarrativeSummary && cache.runningNarrativeSummary.trim()) {
      lines.push(`- سیر پیوسته محتوا و تم اصلی اثر تا این لحظه:`);
      lines.push(`  ${cache.runningNarrativeSummary.trim()}`);
    }

    if (cache.establishedTerminology && cache.establishedTerminology.length > 0) {
      const validTerms = cache.establishedTerminology.filter(t => t.en && t.fa);
      if (validTerms.length > 0) {
        lines.push(`- واژگان و نام‌های تثبیت‌شده در بخش‌های قبلی (رعایت ۱۰۰٪ یکدستی در ترجمه جاری):`);
        validTerms.slice(0, 8).forEach(t => {
          lines.push(`  * ${t.en} -> ${t.fa}`);
        });
      }
    }

    if (cache.lastEndingSentence && cache.lastEndingSentence.trim()) {
      lines.push(`- اتصال ریتمیک انتهای بخش قبل (نقطه شروع لحن و ساختار نحوی این بخش):`);
      lines.push(`  «... ${cache.lastEndingSentence.trim()}»`);
      lines.push(`  (دستور: ترجمه متن جاری باید به شکل یکدست، روان و بدون ایجاد عنوان ساختگی یا تکرار مقدمات، پیوند طبیعی با جملات بالا داشته باشد.)`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Updates the book's context cache after a chunk is successfully translated
   */
  public updateCacheAfterChunk(params: {
    bookId: string;
    chunkNumber: number;
    englishText: string;
    translatedHtml: string;
    book: BookRecord;
  }): BookContextCache {
    const { bookId, chunkNumber, englishText, translatedHtml, book } = params;

    let cache = this.getCache(bookId);
    if (!cache) {
      cache = {
        bookId,
        totalChunksTranslated: 0,
        lastChunkNumber: chunkNumber,
        runningNarrativeSummary: '',
        establishedTerminology: [],
        updatedAt: Date.now(),
        tokensSavedEstimate: 0,
      };
    }

    const plainPersian = stripHtml(translatedHtml);
    const plainEnglish = stripHtml(englishText);

    // 1. Extract the rhythm anchor (last 1-2 sentences)
    const lastEndingSentence = extractLastEndingSentences(plainPersian);
    if (lastEndingSentence) {
      cache.lastEndingSentence = lastEndingSentence;
    }

    // 2. Extract and merge established terms
    const newTerms = extractKeyTerms(plainEnglish, plainPersian);
    const existingMap = new Map(cache.establishedTerminology.map(t => [t.en.toLowerCase(), t]));
    
    // Also include book's permanent glossary in established terminology
    if (Array.isArray(book.glossary)) {
      book.glossary.forEach(g => {
        if (g.en && g.fa) {
          existingMap.set(g.en.toLowerCase(), { en: g.en, fa: g.fa, category: 'واژه‌نامه کتاب' });
        }
      });
    }

    newTerms.forEach(t => {
      if (!existingMap.has(t.en.toLowerCase()) && existingMap.size < 20) {
        existingMap.set(t.en.toLowerCase(), t);
      }
    });

    cache.establishedTerminology = Array.from(existingMap.values());

    // 3. Compact running narrative thread
    // We synthesize a high-density, concise summary of progressive milestones without consuming extra tokens
    const chapterName = book.chunks.find(c => c.chunkNumber === chunkNumber)?.chapterTitle || `بخش ${chunkNumber}`;
    const cleanSentences = plainPersian
      .split(/(?<=[.!?؟\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    const firstSentence = cleanSentences[0] || '';
    const midSentence = cleanSentences[Math.floor(cleanSentences.length / 2)] || '';
    
    // Add compact takeaway for this chunk
    const chunkMilestone = `${chapterName}: ${firstSentence.slice(0, 100)} ... ${midSentence.slice(0, 100)}`.replace(/\s+/g, ' ');

    if (!cache.runningNarrativeSummary) {
      cache.runningNarrativeSummary = chunkMilestone;
    } else {
      // Keep running narrative under 150 words by taking key rolling segments
      const existingParts = cache.runningNarrativeSummary.split(' | ');
      if (existingParts.length >= 3) {
        existingParts.shift(); // keep sliding window of recent chapter themes
      }
      existingParts.push(chunkMilestone);
      cache.runningNarrativeSummary = existingParts.join(' | ');
    }

    cache.totalChunksTranslated += 1;
    cache.lastChunkNumber = chunkNumber;
    cache.updatedAt = Date.now();

    // Estimate tokens saved: Instead of injecting 1500 tokens of raw previous chapter text,
    // this compact dedicated cache takes ~120 tokens, saving ~1380 tokens per chunk.
    const rawHistoryTokens = Math.min(3000, cache.totalChunksTranslated * 650);
    const compactCacheTokens = 120;
    cache.tokensSavedEstimate = Math.max(0, rawHistoryTokens - compactCacheTokens);

    // Save in memory
    memoryCache.set(bookId, cache);

    // Persist to database inside book record
    (book as any).contextCache = cache;
    db.saveBook(book);

    console.log(`[BookCacheManager] Updated dedicated cache for Book "${book.title}" (Chunk ${chunkNumber}, Total: ${cache.totalChunksTranslated}, Tokens Saved: ~${cache.tokensSavedEstimate})`);

    return cache;
  }

  /**
   * Clears cache for a book (e.g. if all chunks are reset or book is deleted)
   */
  public clearCache(bookId: string) {
    memoryCache.delete(bookId);
  }

  /**
   * Clears all in-memory context caches across books safely without affecting database records
   */
  public clearAllMemoryCache(): number {
    const count = memoryCache.size;
    memoryCache.clear();
    return count;
  }
}

export const bookCacheManager = new BookCacheManager();
