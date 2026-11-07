import { db, type TranslationJob, type BookRecord, type ApiKeyConfig } from './db.ts';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { bookCacheManager } from './bookCacheManager.ts';
import { resolveGeminiCandidateModels, markGemini35HighDemand } from './modelHealth.ts';

// System prompt as specified in the brief + strict no-summarization & continuity
const SYSTEM_INSTRUCTION_TRANSLATOR = `Role & Objective:
You are an elite, professional book translator and document formatter specializing in translating long-form English books into fluent, natural, and publication-ready Persian (Farsi).

Context & Input Processing:
- You will receive sections/chapters of a book along with project-specific metadata (Tone, Custom Glossary, Formatting Rules).

Translation Principles:
1. Fluency & Natural Phrasing: Do not produce robotic or literal word-for-word translations. Rephrase idioms and sentences naturally into fluent, idiomatic, publication-grade Persian while strictly preserving the author's original meaning, subtlety, and intent.
2. Tone Adaptation: Adopt the exact specified tone for the book:
   - Spiritual / Philosophical: Reverent, deep, meditative, poetic yet crystal clear (e.g. «آگاهی»، «حضور»، «مشاهده‌گر»).
   - Novel / Narrative: Engaging, fluid, descriptive, preserving literary rhythm and dialogue dynamics.
   - Self-Help / Psychology: Clear, empowering, instructional, and modern Persian.
   - Academic / Technical / Mathematics / Aerospace: Precise, formal, and rigorously structured.
   - Economics / Business: Analytical, professional, and standard terminology.
   - Candid & Direct (Secret Societies, Mysteries & Exposé): Completely direct, bold, fearless, and unfiltered Persian. Do NOT euphemize, censor, or dilute sensitive terms regarding secret societies, power cabals, esoteric rites, hidden agendas, and political mysteries. Translate with biting clarity, high impact, and investigative precision.
   - Romance, Relationships & Erotic (عاشقانه، روابط عاطفی و اروتیک - کاملاً بدون سانسور): Deeply passionate, intimate, sensual, emotional, direct, and completely unfiltered and explicit without prudish sanitization, moralizing, or puritanical censorship. Translate all romantic dialogues, sensual descriptions, emotional tensions, intimate physical encounters, relationship subtleties, and erotic scenes directly, boldly, and faithfully into vivid, natural, expressive, and publication-ready Persian.
3. Custom Glossary Priority & Natural Text Integration: Strictly prioritize the provided custom glossary mapping over default translations. Never translate proprietary terms inconsistently. CRITICAL: In the translated Persian text, treat glossary words just like all other normal words in the sentence. Do NOT change their color, do NOT wrap them in <span style="color: #9b2c2c">, and do NOT highlight them with any special red color. They must blend seamlessly into the body text with regular styling and standard black/dark color.
4. Strict No-Summarization Guarantee: Under NO circumstances are you allowed to summarize, condense, abbreviate, skip, or omit any paragraph, sentence, metaphor, example, or dialogue. Every single paragraph and thought must be translated in full completeness.
5. Faithful & Direct Translation: Translate all text faithfully, directly, and without censorship, puritanical sanitization, moralizing, or softening.
6. Strict Chunk Cleanliness & Continuity (Zero Artificial Headers): Under NO circumstances are you allowed to output artificial chunk markers or part numbers such as «مقدمه و بخش نخست (بخش ۱)»، «بخش ۱»، «بخش ۲»، «(بخش ۱)», etc.

Formatting & Structural Rules (HTML / Rich Styling):
- Enclose the output in clean, semantic HTML format:
  - Major Titles: <h1 style="color: #1a365d; font-size: 24pt; margin-bottom: 20px; text-align: center;">...</h1>
  - Major Subheadings: <h2 style="color: #2b6cb0; font-size: 18pt; margin-top: 25px; margin-bottom: 12px;">...</h2>
  - Minor Sections: <h3 style="color: #2c5282; font-size: 14pt; margin-top: 15px; margin-bottom: 8px;">...</h3>
  - Body Paragraphs: <p style="line-height: 1.9; font-size: 12pt; text-align: justify; margin-bottom: 14px;">...</p>
  - Quotes / Callouts: <blockquote style="border-right: 4px solid #3182ce; padding: 10px 18px; margin: 15px 0; background: #f7fafc; color: #4a5568; font-style: italic;">...</blockquote>

Output Expectation:
Return ONLY the formatted, translated Persian text inside the specified HTML structure. Do not include conversational filler, introductory remarks, or concluding notes.`;

function cleanChapterTitle(title: string): string {
  if (!title) return 'فصل کتاب';
  return title
    .replace(/\s*[\(\[\{]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]/gi, '')
    .replace(/\s*[-–—|:]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+/gi, '')
    .replace(/\s+بخش\s+[0-9۰-۹IVXLCDMivxlcdm]+$/gi, '')
    .trim() || 'فصل کتاب';
}

function stripBookUrls(html: string): string {
  if (!html) return '';
  let cleaned = html;
  cleaned = cleaned.replace(/<a\s+[^>]*href=["'][^"']*["'][^>]*>\s*https?:\/\/[^\s<]+<\/a>/gi, '');
  cleaned = cleaned.replace(/<a\s+[^>]*href=["'][^"']*["'][^>]*>\s*www\.[^\s<]+<\/a>/gi, '');
  cleaned = cleaned.replace(/<a\s+[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');
  cleaned = cleaned.replace(/https?:\/\/[^\s<>"'\)]+/gi, '');
  cleaned = cleaned.replace(/(?:^|\s)(?:www\.)[a-z0-9\-]+(?:\.[a-z0-9\-]+)+(?:\/[^\s<>"'\)]*)?/gi, ' ');
  cleaned = cleaned.replace(/\(\s*\)/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  return cleaned.trim();
}

function sanitizeTranslatedHtml(html: string): string {
  if (!html) return '';
  let clean = stripBookUrls(html)
    .replace(/<span style="[^"]*#9b2c2c[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<h[1-3][^>]*>\s*مقدمه و بخش نخست\s*(?:\([^\)]*\))?\s*<\/h[1-3]>/gi, '')
    .replace(/<h[1-3][^>]*>[^<]*[\(\[\{]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}][^<]*<\/h[1-3]>/gi, '')
    .replace(/<p[^>]*>\s*[\(\[\{]?\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]?\s*<\/p>/gi, '')
    .trim();

  // Enhance footnotes or notes paragraphs
  clean = clean.replace(
    /<p([^>]*)>\s*(\[[0-9۰-۹IVXLCDMivxlcdm]+\]|\([0-9۰-۹IVXLCDMivxlcdm]+\)|(?:پانویس|پاورقی|پی‌نوشت|یادداشت)\s*[:：]|\b[0-9۰-۹]+\s*[-–.]\s*)([\s\S]*?)<\/p>/gi,
    (match, attrs, num, content) => {
      return `<div class="book-footnote"><span class="book-footnote-badge">${num}</span> <span class="book-footnote-text">${content}</span></div>`;
    }
  );

  return clean;
}

// ============================================================================
// BOOK-DEDICATED KEY LOCKS & EXCLUSIVE MUTUAL EXCLUSION
// ============================================================================
// Rule 1: Every book being translated is locked to ONE dedicated API key.
// Rule 2: Keys in use by other books CANNOT be taken until those books finish.
// Rule 3: Only when the assigned key is completely exhausted (daily quota) or suspended does the book switch to the next available unlocked key.
export const bookDedicatedKeys = new Map<string, string>(); // bookId -> keyId
export const keyExclusiveBookLocks = new Map<string, string>(); // keyId -> bookId
export const userKeyAssignments = new Map<string, string>();

const activeFailoverReserveKeys = new Set<string>();
let roundRobinKeyIndex = 0;

// ============================================================================
// PER-KEY RATE LIMITING & RPM SAFETY ENGINE
// ============================================================================
// Track request timestamps for each API key in a 60-second sliding window
const keyRequestTimestamps = new Map<string, number[]>();
const keyLastRequestTime = new Map<string, number>();

// Safe ceiling: Google Gemini Free tier limit is 15 RPM.
// 10 RPM provides a safe 33% headroom to strictly prevent ANY 429 errors or quota suspensions.
const MAX_SAFE_RPM_PER_KEY = 10;
const MIN_GAP_SAME_KEY_MS = 3200; // at least 3.2s between consecutive calls to the SAME key

export function getKeyRpm(keyId: string): number {
  const now = Date.now();
  const times = keyRequestTimestamps.get(keyId) || [];
  const valid = times.filter((t) => now - t < 60000);
  keyRequestTimestamps.set(keyId, valid);
  return valid.length;
}

export function recordKeyRequest(keyId: string) {
  const now = Date.now();
  const times = keyRequestTimestamps.get(keyId) || [];
  times.push(now);
  const valid = times.filter((t) => now - t < 60000);
  keyRequestTimestamps.set(keyId, valid);
  keyLastRequestTime.set(keyId, now);
}

/**
 * Assigns or retrieves the dedicated API Key for a book with strict mutual exclusion.
 * - If this book already has an assigned key that is healthy, returns that exact key.
 * - Other books are prohibited from using this key.
 */
export function getOrAssignDedicatedKeyForBook(bookId: string, preferredKeyId?: string): ApiKeyConfig | null {
  const allKeys = db.getApiKeys();
  const now = Date.now();

  // 1. If this book already has an assigned dedicated key, stick with it
  const existingKeyId = preferredKeyId || bookDedicatedKeys.get(bookId);
  if (existingKeyId) {
    const existingKey = allKeys.find((k) => k.id === existingKeyId);
    if (existingKey && existingKey.isActive && !existingKey.isSuspended) {
      // If key is not in long daily quota cooldown (cooldown < 30s), it remains locked to this book!
      if (existingKey.cooldownUntil <= now + 30000) {
        bookDedicatedKeys.set(bookId, existingKey.id);
        keyExclusiveBookLocks.set(existingKey.id, bookId);
        return existingKey;
      }
    }
    // Key was suspended or daily quota exhausted: release lock so book can advance to next key
    keyExclusiveBookLocks.delete(existingKeyId);
    bookDedicatedKeys.delete(bookId);
  }

  // 2. Select next available active key that is NOT locked by ANY other book
  const usable = allKeys.filter((k) => k.isActive && !k.isSuspended);
  if (usable.length === 0) return null;

  // Mutual exclusion: exclude keys currently locked by other books
  const unlocked = usable.filter((k) => {
    const lockedBy = keyExclusiveBookLocks.get(k.id);
    return !lockedBy || lockedBy === bookId;
  });

  const candidatePool = unlocked.length > 0 ? unlocked : usable;

  // Prefer ready keys (not in cooldown)
  const ready = candidatePool.filter((k) => k.cooldownUntil <= now);
  let selected: ApiKeyConfig;

  if (ready.length > 0) {
    ready.sort((a, b) => {
      const rpmA = getKeyRpm(a.id);
      const rpmB = getKeyRpm(b.id);
      if (rpmA !== rpmB) return rpmA - rpmB;
      return (keyLastRequestTime.get(a.id) || 0) - (keyLastRequestTime.get(b.id) || 0);
    });
    selected = ready[0];
  } else {
    // Pick the key whose cooldown expires soonest
    candidatePool.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    selected = candidatePool[0];
  }

  // Lock this key exclusively to this book
  bookDedicatedKeys.set(bookId, selected.id);
  keyExclusiveBookLocks.set(selected.id, bookId);
  console.log(`[KeyLock] Assigned dedicated key "${selected.name}" exclusively to book "${bookId}"`);
  return selected;
}

export function releaseBookDedicatedKey(bookId: string) {
  const keyId = bookDedicatedKeys.get(bookId);
  if (keyId) {
    keyExclusiveBookLocks.delete(keyId);
    bookDedicatedKeys.delete(bookId);
    console.log(`[KeyLock] Released key "${keyId}" from book "${bookId}"`);
  }
}

/**
 * Builds an intelligently sorted candidate queue of API keys for general queries.
 */
export function getCandidateKeysQueue(allKeys: ApiKeyConfig[], preferredKeyId?: string, excludeLockedByOtherBooks: boolean = true): ApiKeyConfig[] {
  const now = Date.now();

  // Filter out permanently suspended or manually turned-off keys
  let usable = allKeys.filter((k) => k.isActive && !k.isSuspended);
  if (usable.length === 0) {
    return [];
  }

  if (excludeLockedByOtherBooks) {
    const unlocked = usable.filter((k) => !keyExclusiveBookLocks.has(k.id));
    if (unlocked.length > 0) {
      usable = unlocked;
    }
  }

  const readyKeys: ApiKeyConfig[] = [];
  const rpmBusyKeys: ApiKeyConfig[] = [];
  const coolingKeys: ApiKeyConfig[] = [];

  for (const k of usable) {
    if (k.cooldownUntil > now) {
      coolingKeys.push(k);
    } else if (getKeyRpm(k.id) >= MAX_SAFE_RPM_PER_KEY) {
      rpmBusyKeys.push(k);
    } else {
      readyKeys.push(k);
    }
  }

  // Sort ready keys: lowest RPM and least recently used first for smooth load balancing
  readyKeys.sort((a, b) => {
    const rpmA = getKeyRpm(a.id);
    const rpmB = getKeyRpm(b.id);
    if (rpmA !== rpmB) return rpmA - rpmB;
    const lastA = keyLastRequestTime.get(a.id) || 0;
    const lastB = keyLastRequestTime.get(b.id) || 0;
    return lastA - lastB;
  });

  // If a preferred key is in ready keys and has safe RPM remaining, place it first
  if (preferredKeyId) {
    const prefIdx = readyKeys.findIndex((k) => k.id === preferredKeyId);
    if (prefIdx > 0 && getKeyRpm(preferredKeyId) < MAX_SAFE_RPM_PER_KEY - 2) {
      const [pref] = readyKeys.splice(prefIdx, 1);
      readyKeys.unshift(pref);
    }
  }

  // Sort cooling keys: earliest cooldown expiry first
  coolingKeys.sort((a, b) => a.cooldownUntil - b.cooldownUntil);

  return [...readyKeys, ...rpmBusyKeys, ...coolingKeys];
}

export interface PoolPartitionResult {
  totalConnectedServers: number;
  activeSlotsLimit: number; // 70% active translation capacity
  reserveSlotsLimit: number; // 30% held in reserve
  primaryKeys: ApiKeyConfig[];
  reserveKeys: ApiKeyConfig[];
  activeSlotsRatioPercent: number;
  reserveSlotsRatioPercent: number;
}

export class QueueManager {
  private isProcessing = false;
  private activeJobIds = new Set<string>();

  constructor() {
    this.startWorker();
  }

  public startWorker() {
    setInterval(() => {
      this.tick().catch((err) => console.error('[QueueWorker] Tick error:', err));
    }, 3500);
  }

  /**
   * 70/30 Distribution Architecture:
   * Dynamically partitions available connected API servers:
   * - 70% of available slots actively process jobs
   * - 30% of slots are strictly held in reserve to ensure service stability and token exhaustion failover
   */
  public getPoolPartition(): PoolPartitionResult {
    const allActiveKeys = db.getApiKeys().filter((k) => k.isActive && !k.isSuspended);

    if (allActiveKeys.length === 0) {
      const fallbackKey = process.env.GEMINI_API_KEY
        ? [{
            id: 'env_fallback_key',
            name: 'Environment Gemini Key',
            provider: 'gemini' as const,
            apiKey: process.env.GEMINI_API_KEY.trim(),
            model: 'gemini-3.5-flash-lite',
            isActive: true,
            priority: 1,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTokensUsed: 0,
            todayTokensUsed: 0,
            rpmCount: 0,
            cooldownUntil: 0,
          }]
        : [];

      return {
        totalConnectedServers: fallbackKey.length,
        activeSlotsLimit: fallbackKey.length > 0 ? 1 : 1,
        reserveSlotsLimit: 0,
        primaryKeys: fallbackKey,
        reserveKeys: [],
        activeSlotsRatioPercent: 70,
        reserveSlotsRatioPercent: 30,
      };
    }

    const total = allActiveKeys.length;

    let activeSlotsLimit = Math.max(1, Math.floor(total * 0.70));
    if (total === 1) {
      activeSlotsLimit = 1;
    }
    const reserveSlotsLimit = Math.max(0, total - activeSlotsLimit);

    const primaryKeys = allActiveKeys.slice(0, activeSlotsLimit);
    const reserveKeys = allActiveKeys.slice(activeSlotsLimit);

    return {
      totalConnectedServers: total,
      activeSlotsLimit,
      reserveSlotsLimit,
      primaryKeys,
      reserveKeys,
      activeSlotsRatioPercent: 70,
      reserveSlotsRatioPercent: 30,
    };
  }

  public getStats() {
    const allJobs = db.getActiveJobs();
    const partition = this.getPoolPartition();
    const queuedJobs = allJobs.filter((j) => j.status === 'queued');
    const processingJobs = allJobs.filter((j) => j.status === 'processing');

    return {
      totalConnectedServers: partition.totalConnectedServers,
      activeSlotsLimit: partition.activeSlotsLimit,
      reserveSlotsLimit: partition.reserveSlotsLimit,
      activeProcessingCount: this.activeJobIds.size,
      availableActiveSlots: Math.max(0, partition.activeSlotsLimit - this.activeJobIds.size),
      queuedJobsCount: queuedJobs.length,
      processingJobsCount: processingJobs.length,
      totalActiveJobs: allJobs.length,
      reserveSlotsInFailoverCount: activeFailoverReserveKeys.size,
      isWorkerRunning: true,
      lastTickAt: Date.now(),
      rule: {
        ratio: '70/30',
        activePercent: 70,
        reservePercent: 30,
        name: 'قانون توزیع ۷۰/۳۰ هوشمند صف سرور',
        description: '۷۰٪ از کلیدهای متصل به عنوان درگاه‌های فعال پردازش همزمان کتاب‌ها عمل می‌کنند و ۳۰٪ به عنوان ظرفیت رزرو پشتیبان جهت جلوگیری از اتمام توکن و پایداری شبکه نگهداری می‌شوند.',
      },
      slots: {
        primary: partition.primaryKeys.map((k, idx) => ({
          slotIndex: idx + 1,
          id: k.id,
          name: k.name,
          provider: k.provider,
          model: k.model,
          isBusy: keyExclusiveBookLocks.has(k.id) || Array.from(userKeyAssignments.values()).includes(k.id),
          isCooldown: k.cooldownUntil > Date.now(),
          latencyMs: k.lastLatencyMs || 0,
        })),
        reserve: partition.reserveKeys.map((k, idx) => ({
          slotIndex: partition.activeSlotsLimit + idx + 1,
          id: k.id,
          name: k.name,
          provider: k.provider,
          model: k.model,
          isFailoverActive: activeFailoverReserveKeys.has(k.id),
          isCooldown: k.cooldownUntil > Date.now(),
          latencyMs: k.lastLatencyMs || 0,
        })),
      },
    };
  }

  // Get or assign a primary API key prioritizing non-cooldown, non-suspended keys
  private getKeyForUser(userId: string): ApiKeyConfig | null {
    const allActive = db.getApiKeys().filter((k) => k.isActive && !k.isSuspended);
    const assignedKeyId = userKeyAssignments.get(userId);
    const candidates = getCandidateKeysQueue(allActive, assignedKeyId);

    if (candidates.length > 0) {
      const selected = candidates[0];
      userKeyAssignments.set(userId, selected.id);
      return selected;
    }

    // Fallback to process.env.GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY) {
      return {
        id: 'env_fallback_key',
        name: 'Environment Gemini Key',
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY.trim(),
        model: 'gemini-3.5-flash-lite',
        isActive: true,
        priority: 1,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensUsed: 0,
        todayTokensUsed: 0,
        rpmCount: 0,
        cooldownUntil: 0,
      };
    }

    return null;
  }

  /**
   * Switch to a Backup API Key (from the 30% Reserve Standby Pool)
   * Triggered when token exhaustion, 429 quota, or rate-limiting occurs
   */
  private switchUserToBackupKey(userId: string, currentKeyId: string): ApiKeyConfig | null {
    const allActive = db.getApiKeys().filter((k) => k.isActive && !k.isSuspended && k.id !== currentKeyId);
    const now = Date.now();
    const currentKey = db.getApiKeys().find((k) => k.id === currentKeyId);

    // 1. Prioritize switching to another healthy key with the EXACT SAME MODEL
    const sameModelKeys = allActive.filter((k) => k.cooldownUntil <= now && (!currentKey || k.model === currentKey.model));
    if (sameModelKeys.length > 0) {
      const nextKey = sameModelKeys[0];
      userKeyAssignments.set(userId, nextKey.id);
      console.log(`[QueueWorker] Seamless Key Failover: Switched user ${userId} to next key "${nextKey.name}" keeping SAME model (${nextKey.model})`);
      return nextKey;
    }

    // 2. Fallback: Next available healthy key
    const otherHealthyKeys = allActive.filter((k) => k.cooldownUntil <= now);
    if (otherHealthyKeys.length > 0) {
      const nextKey = otherHealthyKeys[0];
      userKeyAssignments.set(userId, nextKey.id);
      activeFailoverReserveKeys.add(nextKey.id);
      console.log(`[QueueWorker] Model Pool Exhaustion: Switched user ${userId} to next available key "${nextKey.name}" with its model (${nextKey.model})`);
      return nextKey;
    }

    // 3. Fallback: Key with earliest cooldown expiration
    if (allActive.length > 0) {
      const sorted = [...allActive].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
      const nextKey = sorted[0];
      userKeyAssignments.set(userId, nextKey.id);
      return nextKey;
    }

    return null;
  }

  private async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const partition = this.getPoolPartition();
      const maxConcurrent = partition.activeSlotsLimit;
      const queuedJobs = db.getActiveJobs();

      for (const job of queuedJobs) {
        if (this.activeJobIds.size >= maxConcurrent) {
          break;
        }
        if (this.activeJobIds.has(job.id)) {
          continue;
        }

        this.activeJobIds.add(job.id);
        this.processJob(job).finally(() => {
          this.activeJobIds.delete(job.id);
          releaseBookDedicatedKey(job.bookId);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Translates a single text chunk with strict Book-to-Key dedicated mutual exclusion:
   * Rule 1: Every book gets assigned ONE dedicated key and sticks to it.
   * Rule 2: Keys locked by other books CANNOT be taken by this book.
   * Rule 3: If temporary RPM 429/503 occurs, wait and retry on the SAME KEY (do not burn other keys!).
   * Rule 4: ONLY when the key's daily quota is genuinely exhausted or suspended does it advance to the next available unlocked key.
   */
  public async translateChunkWithFailover(options: {
    englishText: string;
    book: BookRecord;
    userId?: string;
    chunkNumber?: number;
    specificKeyId?: string;
  }): Promise<{
    translatedHtml: string;
    keyUsed: string;
    modelUsed: string;
    switchOccurred: boolean;
  }> {
    const bookId = options.book.id;
    let switchOccurred = false;
    let lastError: any = null;

    const usableKeysCount = db.getApiKeys().filter((k) => k.isActive && !k.isSuspended).length;
    const maxKeySwitches = Math.max(3, usableKeysCount);

    for (let keySwitchAttempt = 0; keySwitchAttempt < maxKeySwitches; keySwitchAttempt++) {
      // 1. Get or assign the dedicated key for this book (with mutual exclusion)
      let currentKey = getOrAssignDedicatedKeyForBook(bookId, keySwitchAttempt === 0 ? options.specificKeyId : undefined);

      if (!currentKey && process.env.GEMINI_API_KEY) {
        currentKey = {
          id: 'env_fallback_key',
          name: 'Environment Gemini Key',
          provider: 'gemini',
          apiKey: process.env.GEMINI_API_KEY.trim(),
          model: 'gemini-3.1-flash-lite',
          isActive: true,
          priority: 1,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokensUsed: 0,
          todayTokensUsed: 0,
          rpmCount: 0,
          cooldownUntil: 0,
        };
      }

      if (!currentKey) {
        throw new Error('هیچ کلید هوش مصنوعی فعال یا بدون استفاده در سرور یافت نشد. لطفاً در پنل مدیریت کلید جدید اضافه فرمایید.');
      }

      if (keySwitchAttempt > 0) {
        switchOccurred = true;
      }

      // Try translating on this dedicated key.
      // If temporary 429 / 503 occurs, WE WAIT ON THIS SAME KEY and retry up to 3 times!
      // We do NOT jump to another key on a 1-minute rate limit!
      const maxRetriesOnSameKey = 3;
      let shouldSwitchKey = false;

      for (let retry = 0; retry < maxRetriesOnSameKey; retry++) {
        try {
          // A. Enforce RPM limit on this dedicated key (sliding window)
          const currentRpm = getKeyRpm(currentKey.id);
          if (currentRpm >= MAX_SAFE_RPM_PER_KEY) {
            const timestamps = keyRequestTimestamps.get(currentKey.id) || [];
            const oldestReq = timestamps[0] || (Date.now() - 60000);
            const waitMs = Math.max(1200, 60000 - (Date.now() - oldestReq) + 1000);
            console.log(`[RateLimiter] Dedicated key "${currentKey.name}" at safe RPM ceiling (${currentRpm}/${MAX_SAFE_RPM_PER_KEY}). Pausing ${Math.ceil(waitMs / 1000)}s on same key...`);
            await new Promise((r) => setTimeout(r, waitMs));
          }

          // B. Enforce minimum gap between consecutive calls on this same key
          const lastUsedTime = keyLastRequestTime.get(currentKey.id) || 0;
          const gap = Date.now() - lastUsedTime;
          if (gap < MIN_GAP_SAME_KEY_MS) {
            const waitMs = MIN_GAP_SAME_KEY_MS - gap;
            await new Promise((r) => setTimeout(r, waitMs));
          }
          recordKeyRequest(currentKey.id);

          const t0 = Date.now();
          console.log(`[DedicatedWorker] Translating chunk ${options.chunkNumber || 1} of "${options.book.title}" with dedicated key "${currentKey.name}" (${currentKey.model || 'gemini-3.1-flash-lite'})...`);

          const translatedHtml = await this.translateChunkWithAi(
            options.englishText,
            options.book,
            currentKey,
            options.chunkNumber || 1
          );

          if (!translatedHtml || translatedHtml.trim().length === 0) {
            throw new Error('پاسخ دریافت شده از مدل هوش مصنوعی خالی بود.');
          }

          const latency = Date.now() - t0;
          const wordCount = Math.max(1, options.englishText.split(/\s+/).length);
          const approxTokens = Math.max(100, Math.round(wordCount * 1.8) + Math.round((translatedHtml.length / 4)));

          currentKey.totalRequests = (currentKey.totalRequests || 0) + 1;
          currentKey.successfulRequests = (currentKey.successfulRequests || 0) + 1;
          currentKey.lastLatencyMs = latency;
          currentKey.lastUsed = Date.now();
          currentKey.totalTokensUsed = (currentKey.totalTokensUsed || 0) + approxTokens;

          const todayStr = new Date().toISOString().slice(0, 10);
          if (currentKey.todayDate !== todayStr) {
            currentKey.todayDate = todayStr;
            currentKey.todayTokensUsed = approxTokens;
          } else {
            currentKey.todayTokensUsed = (currentKey.todayTokensUsed || 0) + approxTokens;
          }

          currentKey.status = 'active';
          currentKey.cooldownUntil = 0; // healthy
          currentKey.lastError = undefined;
          db.saveApiKey(currentKey);

          // Update cache
          bookCacheManager.updateCacheAfterChunk({
            bookId: options.book.id,
            chunkNumber: options.chunkNumber || 1,
            englishText: options.englishText,
            translatedHtml,
            book: options.book,
          });

          return {
            translatedHtml,
            keyUsed: currentKey.name,
            modelUsed: currentKey.model || 'gemini-3.1-flash-lite',
            switchOccurred,
          };
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);
          const errCode = (err?.status || err?.code || err?.error?.code || '');
          console.warn(`[DedicatedWorker] ❌ Key "${currentKey.name}" error (attempt ${retry + 1}/${maxRetriesOnSameKey}): ${errMsg}`);

          currentKey.failedRequests = (currentKey.failedRequests || 0) + 1;
          currentKey.lastError = errMsg.slice(0, 250);

          // 1. Permanent Failure: Google Suspended Project / Permission Denied / Invalid Key
          const isSuspendedOrInvalid =
            errMsg.includes('CONSUMER_SUSPENDED') ||
            errMsg.includes('has been suspended') ||
            errMsg.includes('PERMISSION_DENIED') ||
            errMsg.includes('API_KEY_INVALID') ||
            errMsg.includes('API_KEY_SERVICE_BLOCKED') ||
            errMsg.includes('BILLING_DISABLED') ||
            errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
            errCode === 403 ||
            errCode === 401;

          // 2. Daily quota exhausted
          const isDailyQuotaExhausted =
            errMsg.includes('limit: 0') ||
            errMsg.includes('FreeTier daily quota') ||
            errMsg.includes('PerDay') ||
            errMsg.includes('daily limit exceeded');

          if (isSuspendedOrInvalid) {
            console.error(`[DedicatedWorker] 🚫 Key "${currentKey.name}" is SUSPENDED by Google. Disabling and switching to next key...`);
            currentKey.isSuspended = true;
            currentKey.isActive = false;
            currentKey.cooldownUntil = Date.now() + 86400000;
            currentKey.lastError = 'پروژه گوگل معلق شده است (Consumer Suspended)';
            db.saveApiKey(currentKey);
            shouldSwitchKey = true;
            break;
          }

          if (isDailyQuotaExhausted) {
            console.warn(`[DedicatedWorker] ⏳ Key "${currentKey.name}" daily quota exhausted. Switching to next key...`);
            currentKey.cooldownUntil = Date.now() + 6 * 3600 * 1000;
            currentKey.lastError = 'سهمیه روزانه این توکن به پایان رسید (Daily Quota Exceeded)';
            db.saveApiKey(currentKey);
            shouldSwitchKey = true;
            break;
          }

          const is503Overload =
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('The model is overloaded') ||
            errMsg.includes('overloaded');

          if (is503Overload) {
            markGemini35HighDemand();
            console.warn(`[DedicatedWorker] ⚠️ Google Model 503 Overload on "${currentKey.name}". Key is healthy, model traffic is high.`);
            currentKey.lastError = 'ترافیک بالای موقت سرور گوگل (503 Overloaded - سوئیچ هوشمند به مدل فعال)';
            currentKey.cooldownUntil = 0; // Key is healthy, do NOT lock into cooldown!
            db.saveApiKey(currentKey);
            if (retry < maxRetriesOnSameKey - 1) {
              await new Promise((r) => setTimeout(r, 1500));
              continue;
            } else {
              shouldSwitchKey = true;
              break;
            }
          }

          // Temporary rate limit (429) or transient 504/timeout
          if (retry < maxRetriesOnSameKey - 1) {
            const backoffDelay = (retry + 1) * 8000; // 8s, 16s
            console.log(`[DedicatedWorker] Key "${currentKey.name}" temporary rate limit. Pausing ${backoffDelay / 1000}s on SAME key...`);
            currentKey.cooldownUntil = Date.now() + backoffDelay;
            currentKey.lastError = 'محدودیت تعداد درخواست در دقیقه (Rate Limit 429)';
            db.saveApiKey(currentKey);
            await new Promise((r) => setTimeout(r, backoffDelay));
          } else {
            // Failed all 3 retries on this key, mark temporary cooldown and switch
            console.warn(`[DedicatedWorker] Key "${currentKey.name}" failed ${maxRetriesOnSameKey} retries. Switching to next key...`);
            currentKey.cooldownUntil = Date.now() + 60000;
            currentKey.lastError = 'محدودیت تعداد درخواست در دقیقه (Rate Limit 429)';
            db.saveApiKey(currentKey);
            shouldSwitchKey = true;
          }
        }
      }

      if (shouldSwitchKey) {
        console.warn(`[DedicatedWorker] Releasing key "${currentKey.name}" and switching book "${options.book.title}" to next available key...`);
        keyExclusiveBookLocks.delete(currentKey.id);
        bookDedicatedKeys.delete(bookId);
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
    }

    const errDetail = lastError?.message || 'خطای اتصال به سرور هوش مصنوعی';
    throw new Error(`ترجمه این بخش با تمام توکن‌های هوش مصنوعی فعال با خطا مواجه شد (${errDetail}). لطفاً توکن جدید در پنل مدیریت اضافه نمایید یا پس از پایان محدودیت مجدداً ادامه ترجمه را بزنید.`);
  }

  private async processJob(job: TranslationJob) {
    const book = db.getBookById(job.bookId);
    if (!book) {
      job.status = 'failed';
      job.error = 'کتاب مرتبط با این پردازش در پایگاه داده یافت نشد.';
      db.saveJob(job);
      return;
    }

    job.status = 'processing';
    book.status = 'translating';

    // Lock dedicated key for this book
    const initialDedicatedKey = getOrAssignDedicatedKeyForBook(book.id);
    if (initialDedicatedKey) {
      job.assignedKeyMasked = initialDedicatedKey.name;
    }

    db.saveJob(job);
    db.saveBook(book);

    console.log(`[QueueWorker] Processing Book "${book.title}" (Job: ${job.id}) with dedicated key: ${initialDedicatedKey?.name || 'Auto'}`);

    // Process chunks one by one
    for (let cIdx = 0; cIdx < book.chunks.length; cIdx++) {
      // Check if job was stopped or cancelled by user
      const freshJob = db.getJobById(job.id);
      if (!freshJob || freshJob.status === 'stopped') {
        console.log(`[QueueWorker] Job ${job.id} was stopped. Halting worker.`);
        releaseBookDedicatedKey(book.id);
        return;
      }

      const chunk = book.chunks[cIdx];

      // Skip already completed chunks with valid translatedHtml
      if (chunk.status === 'completed' && chunk.translatedHtml && chunk.translatedHtml.trim().length > 0) {
        continue;
      }

      job.currentChunkTitle = chunk.chapterTitle || `فصل ${chunk.chapterNumber}`;
      job.progressPercent = Math.round((cIdx / book.chunks.length) * 100);
      db.saveJob(job);

      try {
        const result = await this.translateChunkWithFailover({
          englishText: chunk.englishText,
          book,
          userId: job.userId,
          chunkNumber: chunk.chunkNumber,
        });

        chunk.status = 'completed';
        chunk.translatedHtml = result.translatedHtml;
        chunk.keyUsed = result.keyUsed;
        chunk.modelUsed = result.modelUsed;
        chunk.translatedAt = Date.now();
        chunk.errorMessage = undefined;

        job.assignedKeyMasked = result.keyUsed;
        job.completedChunks = book.chunks.filter(c => c.status === 'completed' && Boolean(c.translatedHtml && c.translatedHtml.trim().length > 0)).length;
        job.progressPercent = Math.round((job.completedChunks / book.chunks.length) * 100);
        db.saveJob(job);
        db.saveBook(book);

        // Safe interval between chunks to avoid hitting bursts
        await new Promise(r => setTimeout(r, 2200));
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        console.warn(`[QueueWorker] Chunk ${chunk.chunkNumber} failed: ${errMsg}`);
        chunk.status = 'error';
        chunk.errorMessage = errMsg;
        db.saveBook(book);
        job.error = `خطا در ترجمه بخش ${chunk.chunkNumber}: ${errMsg}`;
        db.saveJob(job);
      }
    }

    // --- AUTOMATIC RECOVERY PASS ---
    // If any chunks failed or ended up empty, retry them with next available tokens
    const failedChunks = book.chunks.filter(c => c.status !== 'completed' || !c.translatedHtml || c.translatedHtml.trim().length === 0);
    const freshJobState = db.getJobById(job.id);
    if (failedChunks.length > 0 && freshJobState?.status !== 'stopped') {
      console.log(`[QueueWorker] Automatic Recovery Pass: Retrying ${failedChunks.length} failed/empty chunks for book "${book.title}"...`);
      await new Promise(r => setTimeout(r, 2500));

      for (let rIdx = 0; rIdx < failedChunks.length; rIdx++) {
        const chunk = failedChunks[rIdx];
        const checkJob = db.getJobById(job.id);
        if (checkJob?.status === 'stopped') break;

        console.log(`[QueueWorker] Recovery attempt for chunk ${chunk.chunkNumber} (${chunk.chapterTitle})...`);
        try {
          const result = await this.translateChunkWithFailover({
            englishText: chunk.englishText,
            book,
            userId: job.userId,
            chunkNumber: chunk.chunkNumber,
          });

          if (result.translatedHtml && result.translatedHtml.trim().length > 0) {
            chunk.translatedHtml = result.translatedHtml;
            chunk.status = 'completed';
            chunk.keyUsed = result.keyUsed;
            chunk.modelUsed = result.modelUsed;
            chunk.errorMessage = undefined;
            chunk.translatedAt = Date.now();
            console.log(`[QueueWorker] Recovery SUCCESS for chunk ${chunk.chunkNumber}!`);
            db.saveBook(book);
          }
        } catch (recErr: any) {
          console.warn(`[QueueWorker] Recovery retry failed for chunk ${chunk.chunkNumber}:`, recErr.message);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // STRICT COMPLETION CHECK:
    // Only mark book & job as completed IF AND ONLY IF all chunks are truly completed with non-empty translatedHtml!
    const validCompletedChunks = book.chunks.filter(c => c.status === 'completed' && Boolean(c.translatedHtml && c.translatedHtml.trim().length > 0));
    const completedCount = validCompletedChunks.length;
    const totalCount = book.chunks.length;
    const allCompleted = completedCount === totalCount && totalCount > 0;

    if (allCompleted) {
      job.status = 'completed';
      job.progressPercent = 100;
      job.completedChunks = totalCount;
      job.completedAt = Date.now();
      job.error = undefined;
      book.status = 'completed';
      console.log(`[QueueWorker] Book "${book.title}" successfully completed! (100% - ${totalCount}/${totalCount} chunks)`);
      releaseBookDedicatedKey(book.id);
    } else if (completedCount > 0) {
      // Partially completed: DO NOT mark book.status as 'completed'!
      job.status = 'stopped';
      job.completedChunks = completedCount;
      job.progressPercent = Math.round((completedCount / totalCount) * 100);
      job.completedAt = Date.now();
      job.error = `${totalCount - completedCount} بخش به دلیل اتمام سهمیه توکن‌ها ترجمه نشدند. می‌توانید با زدن دکمه «ادامه ترجمه ناقص» آن را کامل کنید.`;
      book.status = 'draft';
      console.log(`[QueueWorker] Book "${book.title}" stopped at ${completedCount}/${totalCount} chunks (${job.progressPercent}%).`);
      releaseBookDedicatedKey(book.id);
    } else {
      job.status = 'failed';
      job.progressPercent = 0;
      job.completedChunks = 0;
      job.error = 'ترجمه به دلیل محدودیت سهمیه توکن‌ها یا خطای سرور متوقف شد.';
      book.status = 'draft';
      console.log(`[QueueWorker] Book "${book.title}" failed (0 chunks completed).`);
      releaseBookDedicatedKey(book.id);
    }

    db.saveJob(job);
    db.saveBook(book);
  }

  private async translateChunkWithAi(englishText: string, book: BookRecord, keyConfig: ApiKeyConfig, chunkNumber: number = 1): Promise<string> {
    const tone = book.tone || 'معنوی و خودشناسی';
    let glossaryText = 'واژه‌نامه تخصصی کتاب';
    if (Array.isArray(book.glossary) && book.glossary.length > 0) {
      glossaryText = book.glossary.map(g => `  * ${g.en} -> ${g.fa}`).join('\n');
    }

    // Retrieve dedicated context cache for this book (narrative continuity, established terms, ending rhythm anchor)
    const dedicatedCachePrompt = bookCacheManager.formatPromptContext(book.id, book.title, tone);

    // Preserve images
    const imageMap = new Map<string, string>();
    let cleanEnglish = englishText;
    const imgRegex = /<img\s+[^>]*src=["'](data:[^"']+)["'][^>]*>/gi;
    let imgIdx = 0;
    cleanEnglish = englishText.replace(imgRegex, (tag) => {
      const token = `[[IMAGE_SLOT_${imgIdx}]]`;
      imageMap.set(token, tag);
      imgIdx++;
      return `\n${token}\n`;
    });

    const sourceLangName = book.sourceLanguage === 'de' ? 'German' : book.sourceLanguage === 'fr' ? 'French' : book.sourceLanguage === 'ar' ? 'Arabic' : book.sourceLanguage === 'tr' ? 'Turkish' : book.sourceLanguage === 'es' ? 'Spanish' : book.sourceLanguage === 'ru' ? 'Russian' : 'English';
    const targetLangName = book.targetLanguage === 'en' ? 'English' : book.targetLanguage === 'ar' ? 'Arabic' : book.targetLanguage === 'tr' ? 'Turkish' : book.targetLanguage === 'fr' ? 'French' : book.targetLanguage === 'de' ? 'German' : 'Persian (Farsi)';

    const userPrompt = `[CONFIGURATION]
- Language Direction: ${sourceLangName} -> ${targetLangName}
- Book Tone: ${tone}
- Chapter Context: ${cleanChapterTitle(book.title)}
- Glossary:
${glossaryText}
${dedicatedCachePrompt ? `\n${dedicatedCachePrompt}` : ''}
[CRITICAL INSTRUCTION]
1. Translate every paragraph and dialogue in full from ${sourceLangName} into fluent, natural, and publication-ready ${targetLangName} without omission, censorship, or summary.
2. Do NOT invent or output artificial chunk numbers or section labels such as "بخش ۱", "بخش ۲", "(بخش ۱)", "Part 1", etc.
3. Do NOT output raw website URLs or internet hyperlinks (e.g. https://... or www....). Book printing strictly prohibits raw URL clutter.
${dedicatedCachePrompt ? '4. Maintain 100% naming, stylistic, and rhythmic continuity with the dedicated book context cache provided above.' : ''}

[INPUT TEXT TO TRANSLATE]
${cleanEnglish}`;

    let resultHtml = '';

    if (keyConfig.provider === 'gemini') {
      const ai = new GoogleGenAI({
        apiKey: keyConfig.apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' }, timeout: 55000 },
      });

      const requestedModel = keyConfig.model || 'gemini-3.1-flash-lite';
      // When 503 or transient overload occurs, ALWAYS resolve candidate models
      const candModels = resolveGeminiCandidateModels(requestedModel, true);

      let lastErr: any = null;
      for (const m of candModels) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: userPrompt,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION_TRANSLATOR,
              temperature: 0.35,
              topP: 0.95,
              thinkingConfig: { thinkingLevel: m.includes('lite') ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW },
            },
          });
          resultHtml = response.text || '';
          if (m !== requestedModel) {
            console.log(`[QueueWorker] ✨ Auto-Failover Success! Translated with ${m} instead of overloaded ${requestedModel}`);
          }
          break;
        } catch (mErr: any) {
          lastErr = mErr;
          const msg = String(mErr?.message || mErr);
          const is503 =
            msg.includes('503') ||
            msg.includes('high demand') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('The model is overloaded') ||
            msg.includes('overloaded');

          if (is503) {
            markGemini35HighDemand();
            console.warn(`[QueueWorker] ⚠️ Model ${m} is overloaded (503). Instantly trying next healthy candidate model on SAME key...`);
            await new Promise(r => setTimeout(r, 400));
            continue;
          }

          const isTransient =
            msg.includes('504') ||
            msg.includes('DEADLINE_EXCEEDED') ||
            msg.includes('Deadline expired') ||
            msg.includes('404') ||
            msg.includes('timeout') ||
            msg.includes('ETIMEDOUT') ||
            msg.includes('429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('Quota exceeded') ||
            msg.includes('limit: 500') ||
            msg.includes('limit exceeded') ||
            msg.includes('rate-limits');

          if (isTransient) {
            console.warn(`[QueueWorker] Transient error on ${m}: ${msg.slice(0, 100)}. Trying fallback candidate model...`);
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          throw mErr;
        }
      }

      if (!resultHtml && lastErr) throw lastErr;
    } else {
      // OpenAI / GLM (Zhipu AI) / MiniMax / OpenRouter / DeepSeek / Intermediary Proxy (OneAPI)
      let defaultBaseURL = 'https://openrouter.ai/api/v1';
      if (keyConfig.provider === 'glm') defaultBaseURL = 'https://open.bigmodel.cn/api/paas/v4';
      else if (keyConfig.provider === 'minimax') defaultBaseURL = 'https://api.minimax.chat/v1';
      else if (keyConfig.provider === 'openai') defaultBaseURL = 'https://api.openai.com/v1';
      else if (keyConfig.provider === 'deepseek') defaultBaseURL = 'https://api.deepseek.com';
      else if (keyConfig.provider === 'proxy') defaultBaseURL = 'https://api.oneapi.ir/v1';

      const baseURL = (keyConfig.baseURL && keyConfig.baseURL.trim()) || defaultBaseURL;
      const targetUrl = `${baseURL.replace(/\/+$/, '')}/chat/completions`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: keyConfig.model || 'deepseek/deepseek-r1',
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION_TRANSLATOR },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.35,
          top_p: 0.95,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      resultHtml = data.choices?.[0]?.message?.content || '';
    }

    // Re-insert preserved images
    imageMap.forEach((imgTag, token) => {
      resultHtml = resultHtml.split(token).join(imgTag);
    });

    return sanitizeTranslatedHtml(resultHtml);
  }

  public async translateStandalone(englishText: string, tone = 'spiritual', glossary: Array<{ en: string; fa: string }> = []): Promise<string> {
    const dummyBook: BookRecord = {
      id: 'preview',
      userId: 'system',
      title: 'نمونه کتاب',
      originalTitle: 'Sample Book',
      author: 'Author',
      translator: 'Translator',
      tone,
      wordCount: 500,
      estimatedCost: 0,
      status: 'draft',
      chunks: [],
      glossary,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const res = await this.translateChunkWithFailover({
      englishText,
      book: dummyBook,
      userId: 'system_preview',
    });
    return res.translatedHtml;
  }

  public async extractGlossaryTerms(englishText: string, tone = 'general'): Promise<Array<{ en: string; fa: string; note: string }>> {
    const settings = db.getSettings();
    const glossaryCfg = settings.aiGlossaryConfig || {
      enabled: true,
      maxSampleChars: 1200,
      maxTerms: 8,
      fallbackHeuristicEnabled: true,
    };

    // If glossary extraction is disabled in admin settings, return heuristic/empty immediately without calling AI
    if (glossaryCfg.enabled === false) {
      return [];
    }

    const key = this.getKeyForUser('system_glossary');
    if (!key) {
      if (glossaryCfg.fallbackHeuristicEnabled !== false) {
        // Return local heuristic terms without error
        const words = Array.from(new Set(
          englishText.match(/\b[A-Z][a-z]{3,}\b/g) || ['Presence', 'Mindfulness', 'Awareness', 'Consciousness']
        )).slice(0, glossaryCfg.maxTerms || 8);
        return words.map(w => ({
          en: w,
          fa: w === 'Presence' ? 'حضور در لحظه' : w === 'Mindfulness' ? 'ذهن‌آگاهی' : w === 'Awareness' ? 'آگاهی درونی' : 'واژه کلیدی متن',
          note: 'استخراج هوشمند بر مبنای واژگان پرتکرار فصل',
        }));
      }
      throw new Error('کلید هوش مصنوعی فعالی روی سرور یافت نشد.');
    }

    // High efficiency: limit sample to max 1,200 characters (~200 words max, only ~250 input tokens)
    const sampleLimit = Math.min(Math.max(400, glossaryCfg.maxSampleChars || 1200), 2000);
    const compactSample = englishText.slice(0, sampleLimit);
    const targetTermsCount = Math.min(Math.max(4, glossaryCfg.maxTerms || 8), 12);

    const prompt = `You are a professional lexicographer.
Extract strictly ${targetTermsCount} key domain concepts or specialized terminology from this excerpt (Tone: ${tone}):
Schema JSON only:
[{"en":"Presence","fa":"حضور در لحظه","note":"مفهوم کلیدی"}]

TEXT:
${compactSample}`;

    let raw = '';
    try {
      if (key.provider === 'gemini') {
        const ai = new GoogleGenAI({
          apiKey: key.apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' }, timeout: 20000 },
        });
        const resp = await ai.models.generateContent({
          model: key.model || 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 250, // strictly throttled output ~80 tokens max
          },
        });
        raw = resp.text || '';
      } else {
        let defaultBaseURL = 'https://openrouter.ai/api/v1';
        if (key.provider === 'glm') defaultBaseURL = 'https://open.bigmodel.cn/api/paas/v4';
        else if (key.provider === 'minimax') defaultBaseURL = 'https://api.minimax.chat/v1';
        else if (key.provider === 'openai') defaultBaseURL = 'https://api.openai.com/v1';
        else if (key.provider === 'deepseek') defaultBaseURL = 'https://api.deepseek.com';
        else if (key.provider === 'proxy') defaultBaseURL = 'https://api.oneapi.ir/v1';

        const baseURL = (key.baseURL && key.baseURL.trim()) || defaultBaseURL;
        const response = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key.apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: key.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 250, // strictly throttled output
          }),
        });
        const data = await response.json();
        raw = data.choices?.[0]?.message?.content || '';
      }

      // Record approximate minimal token usage (~250 in + ~80 out = ~330 tokens)
      const approxTokens = Math.ceil(compactSample.length / 4) + 120;
      key.totalTokensUsed = (key.totalTokensUsed || 0) + approxTokens;
      const todayDateStr = new Date().toISOString().slice(0, 10);
      if (key.todayDate !== todayDateStr) {
        key.todayDate = todayDateStr;
        key.todayTokensUsed = approxTokens;
      } else {
        key.todayTokensUsed = (key.todayTokensUsed || 0) + approxTokens;
      }
      key.totalRequests = (key.totalRequests || 0) + 1;
      key.successfulRequests = (key.successfulRequests || 0) + 1;
      db.saveApiKey(key);
    } catch (apiErr: any) {
      console.warn('[QueueManager] AI glossary extraction API error, using heuristic fallback:', apiErr.message);
      // Heuristic fallback for essential terms
      const words = Array.from(new Set(
        englishText.match(/\b[A-Z][a-z]{3,}\b/g) || ['Presence', 'Mindfulness', 'Awareness', 'Consciousness']
      )).slice(0, 8);

      return words.map(w => ({
        en: w,
        fa: w === 'Presence' ? 'حضور در لحظه' : w === 'Mindfulness' ? 'ذهن‌آگاهی' : w === 'Awareness' ? 'آگاهی درونی' : 'واژه تخصصی متن',
        note: 'استخراج هوشمند بر مبنای واژگان پرتکرار فصل',
      }));
    }

    try {
      const cleaned = raw.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          en: String(item.en || '').trim(),
          fa: String(item.fa || '').trim(),
          note: String(item.note || '').trim(),
        })).filter((item: any) => item.en && item.fa);
      }
    } catch (e) {
      console.warn('Failed to parse glossary JSON:', raw);
    }
    return [];
  }
}

export const queueManager = new QueueManager();
