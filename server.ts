import './server/polyfills.ts';
import express from 'express';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

import fs from 'fs';
dns.setDefaultResultOrder('ipv4first');
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Document, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Packer, BorderStyle, Header, Footer, PageNumber } from 'docx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { BOOK_THEMES } from './src/constants/themes.ts';
import { setupSaasRoutes } from './server/saasRoutes.ts';
import { db } from './server/db.ts';
import { bookCacheManager } from './server/bookCacheManager.ts';
import { getOrAssignDedicatedKeyForBook, releaseBookDedicatedKey } from './server/queue.ts';
import {
  markGemini35HighDemand,
  isGemini35InHighDemand,
  clearGemini35HighDemand,
  resolveGeminiCandidateModels,
  startModelHealthRecoveryScheduler,
} from './server/modelHealth.ts';

function cleanChapterTitle(title: string): string {
  if (!title) return 'فصل کتاب';
  let cleaned = title
    .replace(/\s*[\(\[\{]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]/gi, '')
    .replace(/\s*[-–—|:]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+/gi, '')
    .replace(/\s+بخش\s+[0-9۰-۹IVXLCDMivxlcdm]+$/gi, '')
    .replace(/\s*[\(\[\{]\s*(?:Part|Section|Chunk)\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]/gi, '')
    .replace(/\s*[-–—|:]\s*(?:Part|Section|Chunk)\s*[0-9۰-۹IVXLCDMivxlcdm]+/gi, '')
    .trim();
  return cleaned || 'فصل کتاب';
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
    .replace(/<span[^>]*style=["'][^"']*#(?:9b2c2c|c53030|e53e3e)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<span[^>]*class=["'][^"']*highlight[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<h[1-3][^>]*>\s*مقدمه و بخش نخست\s*(?:\([^\)]*\))?\s*<\/h[1-3]>/gi, '')
    .replace(/<h[1-3][^>]*>[^<]*[\(\[\{]\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}][^<]*<\/h[1-3]>/gi, '')
    .replace(/<p[^>]*>\s*[\(\[\{]?\s*بخش\s*[0-9۰-۹IVXLCDMivxlcdm]+\s*[\)\]\}]?\s*<\/p>/gi, '')
    // Strip accidental inline horizontal margins, paddings or text-indent that cause text overflow or right-edge clipping
    .replace(/(?:margin-right|margin-left|padding-right|padding-left|text-indent)\s*:\s*[^;"]+;?/gi, '')
    .trim();

  // Enhance footnotes or notes paragraphs with distinct publication styling
  clean = clean.replace(
    /<p([^>]*)>\s*(\[[0-9۰-۹IVXLCDMivxlcdm]+\]|\([0-9۰-۹IVXLCDMivxlcdm]+\)|(?:پانویس|پاورقی|پی‌نوشت|یادداشت)\s*[:：]|\b[0-9۰-۹]+\s*[-–.]\s*)([\s\S]*?)<\/p>/gi,
    (match, attrs, num, content) => {
      return `<div class="book-footnote"><span class="book-footnote-badge">${num}</span> <span class="book-footnote-text">${content}</span></div>`;
    }
  );

  // If text doesn't contain any <p>, <h1>, <h2>, <figure> tags at all, wrap distinct blocks into <p>
  if (!/<(p|h[1-3]|blockquote|div|figure|img)[\s>]/i.test(clean)) {
    const rawParagraphs = clean
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    return rawParagraphs
      .map(p => {
        const textWithBreaks = p.replace(/\n/g, '<br/>');
        return `<p style="line-height: 2.2; font-size: 12.5pt; text-align: justify; margin-bottom: 24px;">${textWithBreaks}</p>`;
      })
      .join('\n\n');
  }

  // If single <p> tags contain multiple consecutive <br><br> or linebreaks, break them into separate paragraphs
  clean = clean.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
    if (/<br\s*[\/]?>\s*<br\s*[\/]?>|\n\s*\n/i.test(content)) {
      const parts = content
        .split(/<br\s*[\/]?>\s*<br\s*[\/]?>|\n\s*\n/i)
        .map((part: string) => part.trim())
        .filter(Boolean);

      return parts
        .map((part: string) => `<p${attrs || ' style="line-height: 2.2; font-size: 12.5pt; text-align: justify; margin-bottom: 24px;"'}>${part}</p>`)
        .join('\n\n');
    }
    return match;
  });

  return clean;
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction && process.env.PORT ? process.env.PORT : 3000;

// Enable Gzip/Brotli compression for all HTTP responses (reduces asset payload by up to 85%)
app.use(compression());

// Enable CORS so client browsers connecting from any IP or origin can access /api/*
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Mount Commercial SaaS API Routes (Auth, Background Queue, Pricing, Admin, Gateways)
setupSaasRoutes(app);

// --- Key Pool & Rate Limiter Architecture ---
interface KeyStatus {
  key: string;
  masked: string;
  status: 'active' | 'cooldown';
  cooldownUntil: number;
  rpmCount: number;
  totalRequests: number;
  lastUsed: number;
  errorCount: number;
}

// Gather keys from env
const rawKeys: string[] = [];
if (process.env.GEMINI_API_KEY) {
  rawKeys.push(process.env.GEMINI_API_KEY.trim());
}
if (process.env.GEMINI_API_KEY_POOL) {
  const pool = process.env.GEMINI_API_KEY_POOL.split(',').map(k => k.trim()).filter(Boolean);
  pool.forEach(k => {
    if (!rawKeys.includes(k)) rawKeys.push(k);
  });
}

const keyPool: KeyStatus[] = rawKeys.map(k => ({
  key: k,
  masked: k.length > 8 ? `${k.slice(0, 4)}...${k.slice(-4)}` : 'Key-***',
  status: 'active',
  cooldownUntil: 0,
  rpmCount: 0,
  totalRequests: 0,
  lastUsed: 0,
  errorCount: 0,
}));

// Fallback if no key found (still create dummy item to prevent crashes, will warn properly)
if (keyPool.length === 0) {
  keyPool.push({
    key: '',
    masked: 'Default-Env-Key',
    status: 'active',
    cooldownUntil: 0,
    rpmCount: 0,
    totalRequests: 0,
    lastUsed: 0,
    errorCount: 0,
  });
}

let currentKeyIndex = 0;
const safeDelayMs = 2800; // 2.8s safe interval between calls to avoid RPM spikes
let lastCallTimestamp = 0;

function syncDbKeysIntoPool() {
  try {
    const allDbKeys = db.getApiKeys();
    const dbGemini = allDbKeys.filter(k => k.isActive && !k.isSuspended && k.provider === 'gemini' && k.apiKey?.trim().length > 8);
    const disabledOrSuspendedKeys = new Set(
      allDbKeys.filter(k => !k.isActive || k.isSuspended).map(k => k.apiKey.trim())
    );

    // Disable any keys that were suspended or deactivated in DB
    keyPool.forEach(k => {
      if (disabledOrSuspendedKeys.has(k.key)) {
        k.status = 'cooldown';
        k.cooldownUntil = Date.now() + 86400000; // 24h
      }
    });

    for (const dbKey of dbGemini) {
      const cleanKey = dbKey.apiKey.trim();
      const existing = keyPool.find(k => k.key === cleanKey);
      if (!existing) {
        keyPool.push({
          key: cleanKey,
          masked: `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`,
          status: 'active',
          cooldownUntil: 0,
          rpmCount: 0,
          totalRequests: 0,
          lastUsed: 0,
          errorCount: 0,
        });
      } else if (existing.status === 'cooldown' && existing.cooldownUntil > Date.now() + 3600000 && !dbKey.isSuspended && dbKey.isActive) {
        // If DB key was reactivated by user, un-suspend in pool
        existing.status = 'active';
        existing.cooldownUntil = 0;
      }
    }
  } catch (e) {}
}

function getAvailableKey(): KeyStatus | null {
  syncDbKeysIntoPool();
  const now = Date.now();

  // Clean up expired cooldowns
  keyPool.forEach(k => {
    if (k.status === 'cooldown' && now >= k.cooldownUntil) {
      k.status = 'active';
      k.cooldownUntil = 0;
    }
  });

  const validKeys = keyPool.filter(k => Boolean(k.key));
  if (validKeys.length === 0) return null;

  // Try round-robin from current index to find an active key
  for (let i = 0; i < validKeys.length; i++) {
    const idx = (currentKeyIndex + i) % validKeys.length;
    const candidate = validKeys[idx];
    if (candidate.status === 'active') {
      currentKeyIndex = (idx + 1) % validKeys.length;
      return candidate;
    }
  }

  // If all are in cooldown, pick the one with earliest cooldown expiry
  const sorted = [...validKeys].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  return sorted[0] || null;
}

function markKeyCooldown(keyObj: KeyStatus, seconds = 90) {
  keyObj.status = 'cooldown';
  keyObj.cooldownUntil = Date.now() + seconds * 1000;
  keyObj.errorCount++;
  // Immediately advance index to next key so next call rotates
  currentKeyIndex = (currentKeyIndex + 1) % Math.max(1, keyPool.length);
}

// Start automatic Google Gemini 3.5 health recovery scheduler
startModelHealthRecoveryScheduler(() => {
  const k = getAvailableKey();
  return k?.key || process.env.GEMINI_API_KEY || null;
});

// Reset RPM counts every minute
setInterval(() => {
  keyPool.forEach(k => {
    k.rpmCount = 0;
  });
}, 60000);

async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastCallTimestamp;
  if (timeSinceLast < safeDelayMs) {
    const waitTime = safeDelayMs - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastCallTimestamp = Date.now();
}

// System prompt as specified in the brief + strict no-summarization & uncensored literary translation
const SYSTEM_INSTRUCTION_TRANSLATOR = `Role & Objective:
You are an elite, professional book translator and document formatter specializing in translating long-form English books into fluent, natural, and publication-ready Persian (Farsi).

Context & Input Processing:
- You will receive sections/chapters of a book along with project-specific metadata (Tone, Custom Glossary, Formatting Rules).
- If context caching is active, utilize previously cached terminology and narrative flow to maintain 100% voice and naming consistency.

Translation Principles:
1. Fluency & Natural Phrasing: Do not produce robotic or literal word-for-word translations. Rephrase idioms and sentences naturally into fluent, idiomatic, publication-grade Persian while strictly preserving the author's original meaning, subtlety, and intent.
2. Tone Adaptation: Adopt the exact specified tone for the book:
   - Spiritual / Philosophical: Reverent, deep, meditative, poetic yet crystal clear (e.g., using terms like «آگاهی»، «حضور»، «مشاهده‌گر»).
   - Novel / Narrative: Engaging, fluid, descriptive, preserving literary rhythm and dialogue dynamics.
   - Self-Help / Psychology: Clear, empowering, instructional, and modern Persian.
   - Academic / Technical: Precise, formal, and structured.
   - Candid & Direct (Secret Societies, Mysteries & Exposé): Completely direct, bold, fearless, and unfiltered Persian. Do NOT euphemize, censor, or dilute sensitive terms regarding secret societies, power cabals, esoteric rites, hidden agendas, and political mysteries. Translate with biting clarity, high impact, and investigative precision.
   - Romance, Relationships & Erotic (عاشقانه، روابط عاطفی و اروتیک - کاملاً بدون سانسور): Deeply passionate, intimate, sensual, emotional, direct, and completely unfiltered and explicit without prudish sanitization, moralizing, or puritanical censorship. Translate all romantic dialogues, sensual descriptions, emotional tensions, intimate physical encounters, relationship subtleties, and erotic scenes directly, boldly, and faithfully into vivid, natural, expressive, and publication-ready Persian.
3. Custom Glossary Priority & Natural Text Integration: Strictly prioritize the provided custom glossary mapping over default translations. Never translate proprietary terms inconsistently. CRITICAL: In the translated Persian text, treat glossary words just like all other normal words in the sentence. Do NOT change their color, do NOT wrap them in <span style="color: #9b2c2c">, and do NOT highlight them with any special color. They must blend seamlessly into the body text with regular styling.
4. Strict No-Summarization Guarantee: Under NO circumstances are you allowed to summarize, condense, abbreviate, skip, or omit any paragraph, sentence, metaphor, example, or dialogue. Every single paragraph and thought must be translated in full completeness.
5. Faithful & Uncensored Translation: This is an official literary and scholarly book translation. Translate all text faithfully, directly, and without censorship, puritanical sanitization, moralizing, or softening. Preserve the author's original voice, register, realism, and vocabulary completely.
6. Strict Chunk Cleanliness & Continuity (Zero Artificial Headers): Under NO circumstances are you allowed to output artificial chunk markers, part numbers, or invented headings such as «مقدمه و بخش نخست (بخش ۱)»، «بخش ۱»، «بخش ۲»، «(بخش ۱)»، "Part 1", "[Part 1]", etc., into the translation. Do NOT invent or inject a chapter heading unless the original English input text explicitly starts with an author's original title/heading. The chunks must flow together as seamless, continuous prose without artificial breaks.

7. Strict Subtitle & Timecode Alignment (Zero Time Drift / Exact Sync):
   If the input text contains subtitle cues, timecodes (e.g. "00:01:23,456 --> 00:01:28,789", "[01:23]", "01:23.450 --> 01:28.450"), or numbered subtitle blocks:
   - You MUST preserve every single timestamp and cue index EXACTLY and line-by-line as in the source.
   - Absolutely NEVER alter, shift, recalculate, merge, desynchronize, or omit any timecode.
   - The translated Persian line for each cue must correspond 1-to-1 to that exact time segment without merging timestamps or drifting in time.

8. Strict Paragraph Segmentation & Spacing (High Readability): Never dump translated sentences into a single continuous wall of text. Every distinct topic, logical transition, dialogue exchange, or author paragraph MUST be separated into its own individual <p> block with clear vertical spacing.

Formatting & Structural Rules (HTML / Rich Styling):
To allow seamless export to DOCX and PDF with color-coded typography:
- Enclose the output in clean, semantic HTML format:
  - Book / Chapter Titles: <h1 style="color: #1a365d; font-size: 24pt; margin-bottom: 22px; text-align: center;">...</h1>
  - Major Subheadings: <h2 style="color: #2b6cb0; font-size: 18pt; margin-top: 28px; margin-bottom: 14px;">...</h2>
  - Minor Sections: <h3 style="color: #2c5282; font-size: 14pt; margin-top: 18px; margin-bottom: 10px;">...</h3>
  - Body Paragraphs: <p style="line-height: 2.2; font-size: 12.5pt; text-align: justify; margin-bottom: 24px;">...</p>
  - Quotes / Callouts: <blockquote style="border-right: 4px solid #3182ce; padding: 12px 18px; margin: 18px 0; background: #f7fafc; color: #4a5568; font-style: italic;">...</blockquote>

Output Expectation:
Return ONLY the formatted, translated Persian text inside the specified HTML structure. Do not include conversational filler, introductory remarks, or concluding notes.`;

// API Routes
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const poolInfo = keyPool.map(k => ({
    masked: k.masked,
    label: (k as any).label || 'کلید پیش‌فرض',
    status: k.status === 'cooldown' && now < k.cooldownUntil ? 'cooldown' : 'active',
    secondsLeftInCooldown: Math.max(0, Math.ceil((k.cooldownUntil - now) / 1000)),
    rpmCount: k.rpmCount,
    totalRequests: k.totalRequests,
    errorCount: k.errorCount,
    lastLatencyMs: (k as any).lastLatencyMs || null,
  }));

  res.json({
    activeKeys: poolInfo.filter(k => k.status === 'active').length,
    totalKeys: poolInfo.length,
    rateLimitDelayMs: safeDelayMs,
    pool: poolInfo,
    systemInstructionReady: true,
    availableModels: [
      { id: 'gemini-4-argon', name: 'Gemini 4 Argon (نهایت عمق فلسفی، ادبی و استدلال پیشرفته)' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (پیش‌فرض هوشمند و فصیح ترجمه کتاب)', recommended: true },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (پرسرعت، سبک و روان)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (فوق سریع و کم‌مصرف)' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest (جدیدترین نسخه پایدار)' },
    ],
  });
});

// Add Key to In-Memory Pool
app.post('/api/keys/add', async (req, res) => {
  const { key, label } = req.body;
  if (!key || typeof key !== 'string' || key.trim().length < 8) {
    return res.status(400).json({ error: 'کلید وارد شده نامعتبر است (حداقل ۸ کاراکتر).' });
  }
  const cleanKey = key.trim();
  const existing = keyPool.find(k => k.key === cleanKey);
  if (existing) {
    return res.json({ success: true, message: 'این کلید قبلاً در استخر ثبت شده است.', key: { masked: existing.masked } });
  }

  const masked = `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`;
  const newKeyObj: KeyStatus & { label?: string; lastLatencyMs?: number } = {
    key: cleanKey,
    masked,
    label: label || `کلید کمکی ${keyPool.length + 1}`,
    status: 'active',
    cooldownUntil: 0,
    rpmCount: 0,
    totalRequests: 0,
    lastUsed: 0,
    errorCount: 0,
  };
  keyPool.push(newKeyObj);
  return res.json({ success: true, key: { masked, label: newKeyObj.label, status: 'active' } });
});

// Helper to normalize and auto-fix base URLs (prevent 404 HTML error pages)
function normalizeBaseUrl(provider: string, baseURL?: string): string {
  let url = (baseURL || '').trim().replace(/\/+$/, '');
  if (!url) {
    if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
    if (provider === 'deepseek') return 'https://api.deepseek.com/v1';
    if (provider === 'glm') return 'https://open.bigmodel.cn/api/paas/v4';
    if (provider === 'groq') return 'https://api.groq.com/openai/v1';
    return 'https://api.openai.com/v1';
  }

  // Strip trailing /chat/completions or /completions if the user pasted the full endpoint
  if (url.endsWith('/chat/completions')) {
    url = url.slice(0, -'/chat/completions'.length).replace(/\/+$/, '');
  } else if (url.endsWith('/completions')) {
    url = url.slice(0, -'/completions'.length).replace(/\/+$/, '');
  }

  // Auto-correct common missing /v1 suffixes
  if (provider === 'openrouter' || url.includes('openrouter.ai')) {
    if (url === 'https://openrouter.ai' || url === 'http://openrouter.ai') {
      return 'https://openrouter.ai/api/v1';
    }
    if (url.endsWith('/api')) {
      return `${url}/v1`;
    }
  } else if (provider === 'openai' || url.includes('openai.com')) {
    if (url === 'https://api.openai.com' || url === 'http://api.openai.com') {
      return 'https://api.openai.com/v1';
    }
  } else if (provider === 'deepseek' || url.includes('deepseek.com')) {
    if (url === 'https://api.deepseek.com' || url === 'http://api.deepseek.com') {
      return 'https://api.deepseek.com/v1';
    }
  }

  return url;
}

// Helper to safely parse responses and avoid "Unexpected token '<', <!doctype" syntax crashes
async function parseResponseSafely(response: Response): Promise<{ isJson: boolean; data: any; errorMessage?: string }> {
  let rawText = '';
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    return { isJson: false, data: null, errorMessage: `خطا در خواندن پاسخ سرور: ${readErr.message}` };
  }

  const trimmed = rawText.trim();
  try {
    const data = JSON.parse(rawText);
    return { isJson: true, data };
  } catch {
    // If response starts with HTML / doctype, create a human-friendly message
    if (trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype') || trimmed.toLowerCase().includes('<html')) {
      if (response.status === 404) {
        return {
          isJson: false,
          data: null,
          errorMessage: 'خطای ۴۰۴: آدرس سرور (Base URL) نامعتبر است و سرور ارائه‌دهنده صفحه ۴۰۴ وب ارسال کرد. لطفاً آدرس را در بخش ویرایش بررسی نمایید (مثلاً https://openrouter.ai/api/v1).',
        };
      }
      if (response.status === 502 || response.status === 504 || response.status === 520 || response.status === 524) {
        return {
          isJson: false,
          data: null,
          errorMessage: `خطای سرور ارائه‌دهنده (کد ${response.status}): ارتباط با سرور هوش مصنوعی به دلیل اختلال موقت ارائه‌دهنده یا کلودفلر متوقف شد.`,
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          isJson: false,
          data: null,
          errorMessage: `خطای احراز هویت (${response.status}): کلید API نامعتبر است یا توسط ارائه‌دهنده رد شد.`,
        };
      }
      return {
        isJson: false,
        data: null,
        errorMessage: `سرور ارائه‌دهنده به جای داده JSON، یک صفحه وب HTML با کد وضعیت ${response.status} برگرداند. احتمالاً آدرس Base URL یا مدل انتخاب شده اشتباه است.`,
      };
    }

    return {
      isJson: false,
      data: null,
      errorMessage: trimmed.slice(0, 250) || `پاسخ نامعتبر از سرور با کد ${response.status}`,
    };
  }
}

// Test Connection for a specific key / provider (ALWAYS EXECUTED ON THE BACKEND SERVER)
app.post('/api/keys/test', async (req, res) => {
  const { provider, apiKey, baseURL, model, masked } = req.body;

  // If testing a non-Gemini provider (OpenAI, OpenRouter, DeepSeek, GLM, Custom proxy)
  if (provider && provider !== 'gemini') {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'لطفاً کلید API معتبر برای این ارائه‌دهنده را وارد کنید.', testedByServerIp: true });
    }

    const cleanBaseUrl = normalizeBaseUrl(provider, baseURL);
    const targetUrl = `${cleanBaseUrl.replace(/\/+$/, '')}/chat/completions`;
    const testModel = model || (provider === 'openrouter' ? 'deepseek/deepseek-r1' : 'gpt-4o-mini');
    const t0 = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 22000); // 22s timeout

      const response = await fetch(targetUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PersianBookTranslator/1.0',
          ...(provider === 'openrouter' || cleanBaseUrl.includes('openrouter.ai') ? {
            'HTTP-Referer': 'https://openrouter.ai',
            'X-Title': 'Persian Book Translator'
          } : {})
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: 'Reply with exact single word: PONG_OK' }],
          max_tokens: 10,
        }),
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - t0;
      const parseResult = await parseResponseSafely(response);

      if (!parseResult.isJson) {
        return res.json({
          success: false,
          latencyMs,
          error: parseResult.errorMessage || 'پاسخ دریافتی نامعتبر بود و قالب JSON نداشت.',
          testedByServerIp: true,
        });
      }

      const data = parseResult.data;
      if (!response.ok) {
        return res.json({
          success: false,
          latencyMs,
          error: data?.error?.message || `خطای سرور HTTP ${response.status}: ${response.statusText}`,
          testedByServerIp: true,
        });
      }

      const answer = data.choices?.[0]?.message?.content?.trim() || 'PONG_OK';
      return res.json({
        success: true,
        latencyMs,
        masked: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
        response: answer,
        modelUsed: testModel,
        testedByServerIp: true,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - t0;
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
      return res.json({
        success: false,
        latencyMs,
        error: isTimeout
          ? 'پایان مهلت زمان اتصال (Timeout پس از ۲۲ ثانیه). وضعیت اینترنت یا فیلترینگ سرور را بررسی نمایید.'
          : (err?.message || 'خطا در ارتباط با سرور ارائه‌دهنده از طریق سرور'),
        testedByServerIp: true,
      });
    }
  }

  // Gemini Key Test
  let testKey = (apiKey && typeof apiKey === 'string' && apiKey.length > 8) ? apiKey.trim() : '';
  const matchedPoolKey = masked ? keyPool.find(k => k.masked === masked) : null;

  if (!testKey && matchedPoolKey?.key && matchedPoolKey.key.length > 8) {
    testKey = matchedPoolKey.key;
  }

  if (!testKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 8) {
    testKey = process.env.GEMINI_API_KEY.trim();
  }

  // Also check database persistent keys saved by admin
  if (!testKey) {
    const dbGeminiKeys = db.getApiKeys().filter(k => k.isActive && k.provider === 'gemini' && k.apiKey?.trim().length > 8);
    if (dbGeminiKeys.length > 0) {
      testKey = dbGeminiKeys[0].apiKey.trim();
    }
  }

  if (!testKey) {
    return res.json({
      success: false,
      latencyMs: 0,
      error: 'کلید دسترسی Gemini API در سرور یافت نشد. لطفاً در پنل مدیریت یا فایل .env کلید معتبر وارد نمایید.',
      testedByServerIp: true,
    });
  }

  const requestedModel = model || 'gemini-3.5-flash-lite';
  const candidateModels = resolveGeminiCandidateModels(requestedModel, true);

  const t0 = Date.now();
  let lastGeminiError: any = null;
  let successfulResult: any = null;
  let modelThatWorked = candidateModels[0];

  for (const candModel of candidateModels) {
    try {
      const ai = new GoogleGenAI({
        apiKey: testKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
          timeout: 35000, // 35s timeout to prevent premature aborts on cloud servers
        },
      });
      const result = await ai.models.generateContent({
        model: candModel,
        contents: 'Ping test. Reply with: PONG_OK',
        config: {
          maxOutputTokens: 20,
          thinkingConfig: {
            thinkingLevel: candModel.includes('lite') ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
          },
        },
      });

      successfulResult = result;
      modelThatWorked = candModel;
      break;
    } catch (candErr: any) {
      lastGeminiError = candErr;
      const errMsg = String(candErr?.message || candErr);
      const isTransient =
        errMsg.includes('504') ||
        errMsg.includes('DEADLINE_EXCEEDED') ||
        errMsg.includes('Deadline expired') ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('404') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('timeout') ||
        errMsg.includes('ETIMEDOUT') ||
        errMsg.includes('ECONNRESET');

      if (isTransient) {
        if ((errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) && candModel.includes('3.5')) {
          markGemini35HighDemand();
        }
        console.warn(`[API Test] Transient/high demand on ${candModel}: ${errMsg.slice(0, 100)}. Trying fallback candidate...`);
        await new Promise(r => setTimeout(r, 400));
        continue;
      } else {
        break;
      }
    }
  }

  const latencyMs = Date.now() - t0;
  if (successfulResult) {
    if (matchedPoolKey) {
      (matchedPoolKey as any).lastLatencyMs = latencyMs;
      matchedPoolKey.status = 'active';
      matchedPoolKey.cooldownUntil = 0;
    }
    const cleanKey = testKey.trim();
    const existing = keyPool.find(k => k.key === cleanKey);
    if (!existing) {
      keyPool.push({
        key: cleanKey,
        masked: `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`,
        status: 'active',
        cooldownUntil: 0,
        rpmCount: 0,
        totalRequests: 1,
        lastUsed: Date.now(),
        errorCount: 0,
      });
    } else {
      existing.status = 'active';
      existing.cooldownUntil = 0;
    }

    const isFallback = modelThatWorked !== requestedModel;
    return res.json({
      success: true,
      latencyMs,
      masked: `${testKey.slice(0, 4)}...${testKey.slice(-4)}`,
      response: successfulResult.text?.trim() || 'PONG_OK',
      modelUsed: modelThatWorked,
      fallbackActive: isFallback,
      note: isFallback
        ? `کلید کاملاً معتبر است و پاسخ داد. با توجه به شلوغی موقت سرور گوگل روی مدل ${requestedModel}، سیستم به طور خودکار به مدل پایدار ${modelThatWorked} متصل شد.`
        : undefined,
      testedByServerIp: true,
    });
  }

  let formattedError = lastGeminiError?.message || 'خطا در برقراری ارتباط با مدل هوش مصنوعی از طریق سرور';
  if (
    formattedError.includes('504') ||
    formattedError.includes('DEADLINE_EXCEEDED') ||
    formattedError.includes('Deadline expired')
  ) {
    formattedError =
      'پایان مهلت زمان اتصال گیت‌وی (کد ۵۰۴ - DEADLINE_EXCEEDED): پاسخ از سمت سرور جمینای در مهلت تعیین‌شده دریافت نشد. این خطا ناشی از ترافیک موقت شبکه یا پردازش سنگین سرور گوگل است. زمان مهلت افزایش یافت، لطفاً لحظاتی دیگر مجدداً تست فرمایید یا مدل سریع‌تر مانند gemini-3.1-flash-lite را برگزینید.';
  } else if (formattedError.includes('503') || formattedError.includes('high demand') || formattedError.includes('UNAVAILABLE')) {
    formattedError =
      'ترافیک موقت بالای سرورهای هوش مصنوعی (کد ۵۰۳). لطفاً لحظاتی دیگر تست فرمایید.';
  }

  return res.json({
    success: false,
    latencyMs,
    error: formattedError,
    masked: `${testKey.slice(0, 4)}...${testKey.slice(-4)}`,
    testedByServerIp: true,
  });
});

// Remove a custom key
app.delete('/api/keys/:masked', (req, res) => {
  const { masked } = req.params;
  const idx = keyPool.findIndex(k => k.masked === masked);
  if (idx !== -1 && keyPool.length > 1) {
    keyPool.splice(idx, 1);
    return res.json({ success: true });
  }
  return res.status(400).json({ error: 'امکان حذف کلید اصلی سیستم وجود ندارد.' });
});

// Calculate token and quota estimates
app.post('/api/calculate-tokens', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.json({
      words: 0,
      characters: 0,
      paragraphs: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      totalTokens: 0,
      estimatedChunks: 0,
      estimatedSeconds: 0,
    });
  }

  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean).length;
  const characters = clean.length;
  const paragraphs = clean.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const estimatedInputTokens = Math.ceil(words * 1.35);
  const estimatedOutputTokens = Math.ceil(words * 1.65);
  const totalTokens = estimatedInputTokens + estimatedOutputTokens;
  const estimatedChunks = Math.max(1, Math.ceil(words / 700));
  const estimatedSeconds = Math.round(estimatedChunks * 4.5);

  return res.json({
    words,
    characters,
    paragraphs,
    estimatedInputTokens,
    estimatedOutputTokens,
    totalTokens,
    estimatedChunks,
    estimatedSeconds,
  });
});

// Helper to restore high-resolution embedded images into translated Persian HTML
// Helper to restore high-resolution embedded images into translated Persian HTML with strict deduplication
function restoreImages(html: string, imageMap: Map<string, string>): string {
  if (imageMap.size === 0) return html;
  let restored = html;

  for (const [token, fullTag] of imageMap.entries()) {
    // Extract index from token like [[IMAGE_PRESERVED_SLOT_0]]
    const idxMatch = token.match(/_(\d+)\]\]/);
    const slotIdx = idxMatch ? idxMatch[1] : null;

    // Flexible regex matching [[IMAGE_PRESERVED_SLOT_0]], [IMAGE_PRESERVED_SLOT_0], or spaced variants
    const tokenRegex = slotIdx !== null
      ? new RegExp(`\\[{1,2}\\s*IMAGE_PRESERVED_SLOT_${slotIdx}\\s*\\]{1,2}`, 'gi')
      : new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

    let replaced = false;
    if (tokenRegex.test(restored)) {
      // Reset regex index and replace ONLY the first occurrence; remove any accidental duplicate tokens generated by the AI
      tokenRegex.lastIndex = 0;
      restored = restored.replace(tokenRegex, () => {
        if (!replaced) {
          replaced = true;
          return `<div class="book-illustration-wrap my-4 text-center">${fullTag}</div>`;
        }
        return '';
      });
    }

    // If the token was not preserved by the AI, append only if the image is not already present in the HTML
    if (!replaced) {
      const srcMatch = fullTag.match(/src=["']([^"']+)["']/i);
      const src = srcMatch ? srcMatch[1] : '';
      const srcSnippet = src.length > 50 ? src.slice(0, 50) : src;
      const alreadyInHtml = srcSnippet && restored.includes(srcSnippet);
      if (!alreadyInHtml) {
        restored += `\n<div class="book-illustration-wrap my-4 text-center">${fullTag}</div>\n`;
      }
    }
  }

  // Final Strict Deduplication Pass: Ensure no identical image tag/src appears more than once in the translated chunk
  const seenImageSrcs = new Set<string>();
  restored = restored.replace(
    /(?:<div[^>]*class="[^"]*book-illustration-wrap[^"]*"[^>]*>[\s\S]*?<img\s+[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/div>|<figure[^>]*>[\s\S]*?<img\s+[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/figure>|<img\s+[^>]*src=["']([^"']+)["'][^>]*>)/gi,
    (wholeMatch, src1, src2, src3) => {
      const src = src1 || src2 || src3;
      if (!src) return wholeMatch;
      const fingerprint = src.length > 250 ? src.slice(0, 250) : src;
      if (seenImageSrcs.has(fingerprint)) {
        // Redundant duplicate image eliminated!
        return '';
      }
      seenImageSrcs.add(fingerprint);
      return wholeMatch;
    }
  );

  return restored;
}

app.post('/api/translate', async (req, res) => {
  const { chunkId, englishText, tone, glossary, previousSummary, chapterTitle, model, provider, apiKey, baseURL, serverPool, bookId, chunkNumber, sourceLanguage, targetLanguage } = req.body;

  if (!englishText || typeof englishText !== 'string') {
    return res.status(400).json({ error: 'متن برای ترجمه الزامی است.' });
  }

  // Resolve target book for dedicated context caching
  let resolvedBookId = bookId;
  let targetBook: any = null;
  if (resolvedBookId) {
    targetBook = db.getBookById(resolvedBookId);
  } else if (chunkId) {
    targetBook = db.getBooks().find(b => b.chunks?.some(c => c.id === chunkId)) || null;
    if (targetBook) resolvedBookId = targetBook.id;
  }

  // Dynamic language resolution
  const resolvedSourceLang = sourceLanguage || targetBook?.sourceLanguage || 'en';
  const resolvedTargetLang = targetLanguage || targetBook?.targetLanguage || 'fa';
  const sourceLangName = resolvedSourceLang === 'de' ? 'German' : resolvedSourceLang === 'fr' ? 'French' : resolvedSourceLang === 'ar' ? 'Arabic' : resolvedSourceLang === 'tr' ? 'Turkish' : resolvedSourceLang === 'es' ? 'Spanish' : resolvedSourceLang === 'ru' ? 'Russian' : 'English';
  const targetLangName = resolvedTargetLang === 'en' ? 'English' : resolvedTargetLang === 'ar' ? 'Arabic' : resolvedTargetLang === 'tr' ? 'Turkish' : resolvedTargetLang === 'fr' ? 'French' : resolvedTargetLang === 'de' ? 'German' : 'Persian (Farsi)';

  // Retrieve dedicated book context cache (compact narrative thread, terminology, and rhythm anchor)
  const dedicatedCachePrompt = resolvedBookId ? bookCacheManager.formatPromptContext(resolvedBookId, chapterTitle, tone) : '';

  // 0. Image preservation: replace heavy base64 images with lightweight tokens for the AI prompt
  // Deduplicate identical images within the input chunk so each distinct image receives exactly one placeholder
  const imagePlaceholderMap = new Map<string, string>();
  const seenInputSrcs = new Set<string>();
  let cleanEnglishText = englishText;

  const imgRegex = /<img\s+[^>]*src=["'](data:[^"']+)["'][^>]*>/gi;
  let imgIndex = 0;
  cleanEnglishText = englishText.replace(imgRegex, (fullImgTag, srcData) => {
    const fingerprint = srcData ? srcData.slice(0, 250) : fullImgTag;
    if (seenInputSrcs.has(fingerprint)) {
      // Skip redundant duplicate image tag in source input
      return '';
    }
    seenInputSrcs.add(fingerprint);
    const placeholderToken = `[[IMAGE_PRESERVED_SLOT_${imgIndex}]]`;
    imagePlaceholderMap.set(placeholderToken, fullImgTag);
    imgIndex++;
    return `\n${placeholderToken}\n`;
  });

  const hasImages = imagePlaceholderMap.size > 0;
  const targetModel = model || 'gemini-3.5-flash-lite';

  // Format glossary items
  let glossaryText = 'واژه‌نامه عمومی';
  if (Array.isArray(glossary) && glossary.length > 0) {
    glossaryText = glossary
      .map((item: { en: string; fa: string }) => `  * ${item.en} -> ${item.fa}`)
      .join('\n');
  } else if (typeof glossary === 'string' && glossary.trim()) {
    glossaryText = glossary;
  }

  // Build the User Prompt with dedicated book cache and zero-summarization guarantee
  const userPrompt = `[CONFIGURATION]
- Language Direction: ${sourceLangName} -> ${targetLangName} (Default & Core Reference: English to publication-grade Persian)
- Book Tone: ${tone || 'معنوی و خودشناسی'}
- Chapter / Section Context: ${cleanChapterTitle(chapterTitle || 'بخش جاری کتاب')}
- Glossary / واژه‌نامه اختصاصی:
${glossaryText}
${dedicatedCachePrompt ? `\n${dedicatedCachePrompt}` : (previousSummary ? `\n[PREVIOUS SUMMARY / CONTEXT]\n${previousSummary}\n` : '')}
${hasImages ? `\n[IMAGE PRESERVATION INSTRUCTION]\nThis text contains image placeholders like [[IMAGE_PRESERVED_SLOT_0]]. You MUST preserve every placeholder intact at its exact corresponding position between the translated paragraphs in Persian. Do NOT remove or modify image placeholders.\n` : ''}
[CRITICAL INSTRUCTION]
1. Do NOT summarize. Translate every single sentence, dialogue, nuance, and paragraph verbatim from ${sourceLangName} into fluent, natural ${targetLangName} without omission or censorship.
2. Do NOT invent, add, or output artificial chunk numbers, section labels, or headers such as "بخش ۱", "بخش ۲", "(بخش ۱)", "Part 1", etc. Translate only the actual text content.
3. Do NOT output raw website URLs or internet hyperlinks (e.g. https://... or www....). Book printing strictly prohibits raw URL clutter. If reference notes mention a website or online source, state only the source name without raw URLs.
${dedicatedCachePrompt ? '4. Maintain 100% naming, stylistic, and rhythmic continuity with the dedicated book context cache provided above.' : ''}

[INPUT TEXT TO TRANSLATE]
${cleanEnglishText}`;

  // Helper to persist to dedicated book context cache on successful translation
  const saveCacheIfApplicable = (html: string) => {
    if (resolvedBookId && targetBook) {
      try {
        bookCacheManager.updateCacheAfterChunk({
          bookId: resolvedBookId,
          chunkNumber: Number(chunkNumber) || 1,
          englishText,
          translatedHtml: html,
          book: targetBook,
        });
      } catch (cErr) {
        console.warn('[BookCacheManager] Cache update error:', cErr);
      }
    }
  };

  // 1. MULTI-SERVER FAILOVER POOL: If user has configured an active pool of servers/endpoints
  if (Array.isArray(serverPool) && serverPool.length > 0) {
    const activeServers = serverPool.filter((s: any) => s.isEnabled !== false);
    const failedServerDetails: string[] = [];

    for (let sIdx = 0; sIdx < activeServers.length; sIdx++) {
      const server = activeServers[sIdx];
      console.log(`[Auto-Switching Engine] Attempting Server ${sIdx + 1}/${activeServers.length}: "${server.name}" (${server.providerType} / ${server.model})...`);

      try {
        await enforceRateLimit();

      if (server.providerType === 'gemini') {
        const rawKeys = (server.apiKey || '').split(/[,\n]/).map((k: string) => k.trim()).filter(Boolean);
        if (rawKeys.length === 0) {
          const avail = keyPool.map(k => k.key).filter(Boolean);
          if (process.env.GEMINI_API_KEY && !avail.includes(process.env.GEMINI_API_KEY.trim())) {
            avail.unshift(process.env.GEMINI_API_KEY.trim());
          }
          const dbGemini = db.getApiKeys().filter(k => k.isActive && !k.isSuspended && k.provider === 'gemini' && k.apiKey?.trim().length > 8);
          dbGemini.forEach(k => {
            if (!avail.includes(k.apiKey.trim())) avail.push(k.apiKey.trim());
          });
          rawKeys.push(...avail);
        }

        if (rawKeys.length === 0) {
          failedServerDetails.push(`سرور «${server.name}»: کلید معتبری برای Gemini تنظیم نشده است.`);
          continue;
        }

        let serverSuccess = false;
        for (let kIdx = 0; kIdx < rawKeys.length; kIdx++) {
          const sKey = rawKeys[kIdx];
          const isSwitch = sIdx > 0 || kIdx > 0;
          try {
            await enforceRateLimit();
            const ai = new GoogleGenAI({
              apiKey: sKey,
              httpOptions: {
                headers: { 'User-Agent': 'aistudio-build' },
                timeout: 50000,
              },
            });

            const allowAutoSwitch = db.getSettings().keyPoolSettings?.allowAutoSwitchOnTranslationFailure !== false;
            const primaryModel = server.model || 'gemini-3.8-flash';
            const candidateModels = allowAutoSwitch
              ? Array.from(new Set([
                  primaryModel,
                  'gemini-3.8-flash',
                  'gemini-3.1-flash-lite',
                  'gemini-3.5-flash-lite',
                  'gemini-4-argon',
                  'gemini-flash-latest',
                ]))
              : [primaryModel];

            let lastCandErr: any = null;
            for (const candModel of candidateModels) {
              try {
                const thinkingLevel =
                  candModel.includes('lite')
                    ? ThinkingLevel.MINIMAL
                    : ThinkingLevel.LOW;

                const response = await ai.models.generateContent({
                  model: candModel,
                  contents: userPrompt,
                  config: {
                    systemInstruction: SYSTEM_INSTRUCTION_TRANSLATOR,
                    temperature: 0.35,
                    topP: 0.95,
                    thinkingConfig: { thinkingLevel },
                  },
                });

                let cleanHtml = (response.text || '').trim();
                if (cleanHtml.startsWith('```html')) {
                  cleanHtml = cleanHtml.replace(/^```html\s*/i, '').replace(/\s*```$/, '');
                } else if (cleanHtml.startsWith('```')) {
                  cleanHtml = cleanHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                cleanHtml = sanitizeTranslatedHtml(cleanHtml);

                console.log(`[Auto-Switching Engine] Success via Server "${server.name}" (Model: ${candModel}) using Key ${sKey.slice(0, 4)}...${sKey.slice(-4)}`);
                saveCacheIfApplicable(cleanHtml);
                return res.json({
                  chunkId,
                  translatedHtml: restoreImages(cleanHtml, imagePlaceholderMap),
                  serverUsed: `${server.name}${isSwitch ? ' (سوئیچ خودکار)' : ''}`,
                  serverId: server.id,
                  model: candModel,
                  provider: 'gemini',
                  keyUsed: `${sKey.slice(0, 4)}...${sKey.slice(-4)}`,
                  switchOccurred: isSwitch || candModel !== primaryModel,
                  success: true,
                });
              } catch (mErr: any) {
                lastCandErr = mErr;
                const mMsg = String(mErr?.message || mErr);
                const isTransientOrQuota =
                  mMsg.includes('504') ||
                  mMsg.includes('DEADLINE_EXCEEDED') ||
                  mMsg.includes('Deadline expired') ||
                  mMsg.includes('503') ||
                  mMsg.includes('high demand') ||
                  mMsg.includes('UNAVAILABLE') ||
                  mMsg.includes('404') ||
                  mMsg.includes('timeout') ||
                  mMsg.includes('ETIMEDOUT') ||
                  mMsg.includes('429') ||
                  mMsg.includes('RESOURCE_EXHAUSTED') ||
                  mMsg.includes('Quota exceeded') ||
                  mMsg.includes('limit: 500') ||
                  mMsg.includes('limit exceeded') ||
                  mMsg.includes('rate-limits');
                if (isTransientOrQuota) {
                  console.warn(`[Auto-Switching Engine] Quota/Transient error (${mMsg.slice(0, 100)}) on ${candModel}. Automatically trying fallback candidate model...`);
                  await new Promise(r => setTimeout(r, 1000));
                  continue;
                }
                throw mErr;
              }
            }
            if (lastCandErr) throw lastCandErr;
          } catch (keyErr: any) {
            console.warn(`[Auto-Switching Engine] Server "${server.name}" key ${kIdx + 1} failed: ${keyErr.message}. Switching to next key/server...`);
            failedServerDetails.push(`سرور «${server.name}» (کلید ${sKey.slice(0, 4)}...): ${keyErr.message}`);
          }
        }
      } else {
        // OpenAI-Compatible Server (OpenRouter, OpenAI, DeepSeek, GLM, Groq, Custom proxy)
        const rawKeys = (server.apiKey || '').split(/[,\n]/).map((k: string) => k.trim()).filter(Boolean);
        if (rawKeys.length === 0) {
          failedServerDetails.push(`سرور «${server.name}»: کلید API تنظیم نشده است.`);
          continue;
        }

        const cleanBaseUrl = normalizeBaseUrl(server.providerType, server.baseURL);
        const targetUrl = `${cleanBaseUrl.replace(/\/+$/, '')}/chat/completions`;

        for (let kIdx = 0; kIdx < rawKeys.length; kIdx++) {
          const currentApiKey = rawKeys[kIdx];
          const isSwitch = sIdx > 0 || kIdx > 0;
          try {
            await enforceRateLimit();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 35000);

            const response = await fetch(targetUrl, {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentApiKey}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PersianBookTranslator/1.0',
                ...(server.providerType === 'openrouter' || cleanBaseUrl.includes('openrouter.ai') ? {
                  'HTTP-Referer': 'https://openrouter.ai',
                  'X-Title': 'Persian Book Translator'
                } : {})
              },
              body: JSON.stringify({
                model: server.model,
                messages: [
                  { role: 'system', content: SYSTEM_INSTRUCTION_TRANSLATOR },
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.35,
                top_p: 0.95
              })
            });
            clearTimeout(timeoutId);

            const parseResult = await parseResponseSafely(response);
            if (!parseResult.isJson) {
              throw new Error(parseResult.errorMessage || `خطا در دریافت خروجی از سرور ${server.name}`);
            }

            const data = parseResult.data;
            if (!response.ok) {
              throw new Error(data?.error?.message || `خطای HTTP ${response.status}: ${response.statusText}`);
            }

            let cleanHtml = (data.choices?.[0]?.message?.content || '').trim();
            if (cleanHtml.startsWith('```html')) {
              cleanHtml = cleanHtml.replace(/^```html\s*/i, '').replace(/\s*```$/, '');
            } else if (cleanHtml.startsWith('```')) {
              cleanHtml = cleanHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            cleanHtml = sanitizeTranslatedHtml(cleanHtml);

            console.log(`[Auto-Switching Engine] Success via Server "${server.name}" using Key ${currentApiKey.slice(0, 4)}...`);
            saveCacheIfApplicable(cleanHtml);
            return res.json({
              chunkId,
              translatedHtml: restoreImages(cleanHtml, imagePlaceholderMap),
              serverUsed: `${server.name}${isSwitch ? ' (سوئیچ خودکار)' : ''}`,
              serverId: server.id,
              model: server.model,
              provider: server.providerType,
              keyUsed: `${currentApiKey.slice(0, 4)}...${currentApiKey.slice(-4)}`,
              switchOccurred: isSwitch,
              success: true,
            });
          } catch (keyErr: any) {
            const isTimeout = keyErr?.name === 'AbortError' || keyErr?.message?.includes('aborted');
            const reason = isTimeout ? 'پایان مهلت زمانی ۳۵ ثانیه (Timeout)' : (keyErr.message || 'خطای اتصال');
            console.warn(`[Auto-Switching Engine] Server "${server.name}" key ${kIdx + 1} failed: ${reason}. Switching to next key/server...`);
            failedServerDetails.push(`سرور «${server.name}» (کلید ${currentApiKey.slice(0, 4)}...): ${reason}`);
          }
        }
      }
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
        const reason = isTimeout ? 'پایان مهلت زمانی ۳۵ ثانیه (Timeout)' : (err.message || 'خطای اتصال');
        console.warn(`[Auto-Switching Engine] Server "${server.name}" failed: ${reason}.`);
        failedServerDetails.push(`سرور «${server.name}» (${server.model}): ${reason}`);
        // Continue to next server in activeServers!
      }
    }
    console.warn('[Auto-Switching Engine] Custom servers completed. Failed list:', failedServerDetails);
    
    // If all custom servers failed and no system Gemini key is present, report exact errors immediately
    const hasDefaultGemini = Boolean(process.env.GEMINI_API_KEY) || keyPool.length > 0;
    if (!hasDefaultGemini && failedServerDetails.length > 0) {
      return res.status(502).json({
        success: false,
        error: `اتصال به سرورهای تعریف‌شده ناموفق بود:\n` + failedServerDetails.join('\n') + `\nلطفاً در بخش ویرایش API کلید یا مدل را بررسی فرمایید.`,
      });
    }
  }

  // 2. SINGLE NON-GEMINI PROVIDER FALLBACK
  if (provider && provider !== 'gemini') {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 4) {
      return res.status(400).json({ error: `کلید API برای ارائه‌دهنده ${provider} وارد نشده است.` });
    }

    const cleanBaseUrl = normalizeBaseUrl(provider, baseURL);
    const targetUrl = `${cleanBaseUrl.replace(/\/+$/, '')}/chat/completions`;
    try {
      await enforceRateLimit();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      const response = await fetch(targetUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PersianBookTranslator/1.0',
          ...(provider === 'openrouter' || cleanBaseUrl.includes('openrouter.ai') ? {
            'HTTP-Referer': 'https://openrouter.ai',
            'X-Title': 'Persian Book Translator'
          } : {})
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION_TRANSLATOR },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.35,
          top_p: 0.95
        })
      });
      clearTimeout(timeoutId);

      const parseResult = await parseResponseSafely(response);
      if (!parseResult.isJson) {
        throw new Error(parseResult.errorMessage || `خطا در دریافت پاسخ از ${provider}`);
      }

      const data = parseResult.data;
      if (!response.ok) {
        throw new Error(data?.error?.message || `خطای سرور ${response.status}`);
      }

      let cleanHtml = (data.choices?.[0]?.message?.content || '').trim();
      if (cleanHtml.startsWith('```html')) {
        cleanHtml = cleanHtml.replace(/^```html\s*/i, '').replace(/\s*```$/, '');
      } else if (cleanHtml.startsWith('```')) {
        cleanHtml = cleanHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      cleanHtml = sanitizeTranslatedHtml(cleanHtml);
      saveCacheIfApplicable(cleanHtml);

      return res.json({
        chunkId,
        translatedHtml: restoreImages(cleanHtml, imagePlaceholderMap),
        keyUsed: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
        model: targetModel,
        provider,
        success: true,
      });
    } catch (err: any) {
      console.error(`Provider ${provider} translation error:`, err);
      return res.status(500).json({
        error: `خطا در ترجمه با ${provider}: ${err?.message || 'مشکل در برقراری ارتباط'}`,
      });
    }
  }

  const allowAutoSwitch = db.getSettings().keyPoolSettings?.allowAutoSwitchOnTranslationFailure !== false;
  const modelCandidates = resolveGeminiCandidateModels(targetModel, allowAutoSwitch);

  let lastError: any = null;
  let successfulHtml = '';
  let successfulModel = targetModel;
  let keyUsedName = 'Primary-Key';

  modelLoop: for (let mIdx = 0; mIdx < modelCandidates.length; mIdx++) {
    const currentModelCandidate = modelCandidates[mIdx];
    const maxRetriesPerModel = Math.max(2, keyPool.length);

    for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
      let keyObj: any = null;
      if (resolvedBookId) {
        const dedicated = getOrAssignDedicatedKeyForBook(resolvedBookId);
        if (dedicated) {
          keyObj = {
            key: dedicated.apiKey.trim(),
            masked: `${dedicated.apiKey.trim().slice(0, 4)}...${dedicated.apiKey.trim().slice(-4)}`,
            status: 'active',
            cooldownUntil: dedicated.cooldownUntil || 0,
            rpmCount: dedicated.rpmCount || 0,
            totalRequests: dedicated.totalRequests || 0,
            lastUsed: dedicated.lastUsed || 0,
            errorCount: dedicated.failedRequests || 0,
          };
        }
      }
      if (!keyObj) {
        keyObj = getAvailableKey();
      }
      const apiKey = keyObj?.key || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: 'کلید دسترسی Gemini API تعریف نشده است. لطفاً متغیر GEMINI_API_KEY را بررسی کنید.',
        });
      }

      try {
        await enforceRateLimit();

        if (keyObj) {
          keyObj.rpmCount++;
          keyObj.totalRequests++;
          keyObj.lastUsed = Date.now();
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
            timeout: 50000,
          },
        });

        // Use appropriate thinking level for model (MINIMAL only on lite models; LOW on 3.8 and 4)
        const thinkingLevel =
          currentModelCandidate.includes('lite')
            ? ThinkingLevel.MINIMAL
            : ThinkingLevel.LOW;

        const response = await ai.models.generateContent({
          model: currentModelCandidate,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_TRANSLATOR,
            temperature: 0.35,
            topP: 0.95,
            thinkingConfig: { thinkingLevel },
          },
        });

        const translatedHtml = response.text || '';

        // Clean up any markdown code block wrapper if model outputted ```html ... ```
        let cleanHtml = translatedHtml.trim();
        if (cleanHtml.startsWith('```html')) {
          cleanHtml = cleanHtml.replace(/^```html\s*/i, '').replace(/\s*```$/, '');
        } else if (cleanHtml.startsWith('```')) {
          cleanHtml = cleanHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        successfulHtml = cleanHtml;
        successfulModel = currentModelCandidate;
        keyUsedName = keyObj ? keyObj.masked : 'Primary-Key';

        // Accurately record today's token usage and successful request in DB
        if (keyObj) {
          try {
            const approxTokens = Math.max(80, Math.round((cleanEnglishText.length + cleanHtml.length) / 3));
            const dbKey = db.getApiKeys().find(k => k.apiKey.trim() === keyObj.key.trim());
            if (dbKey) {
              const todayStr = new Date().toISOString().slice(0, 10);
              if (dbKey.todayDate !== todayStr) {
                dbKey.todayDate = todayStr;
                dbKey.todayTokensUsed = approxTokens;
              } else {
                dbKey.todayTokensUsed = (dbKey.todayTokensUsed || 0) + approxTokens;
              }
              dbKey.totalTokensUsed = (dbKey.totalTokensUsed || 0) + approxTokens;
              dbKey.successfulRequests = (dbKey.successfulRequests || 0) + 1;
              dbKey.lastUsed = Date.now();
              dbKey.lastError = undefined;
              db.saveApiKey(dbKey);
            }
          } catch (tokErr) {}
        }
        break modelLoop;
      } catch (err: any) {
        lastError = err;
        const errorMessage = String(err?.message || err);
        console.warn(`Model ${currentModelCandidate} attempt ${attempt + 1} failed:`, errorMessage.slice(0, 120));

        const isSuspendedOrInvalid =
          errorMessage.includes('CONSUMER_SUSPENDED') ||
          errorMessage.includes('has been suspended') ||
          errorMessage.includes('PERMISSION_DENIED') ||
          errorMessage.includes('API_KEY_INVALID') ||
          errorMessage.includes('API_KEY_SERVICE_BLOCKED');

        const isQuotaExceeded =
          errorMessage.includes('429') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('Quota exceeded') ||
          errorMessage.includes('limit: 500') ||
          errorMessage.includes('limit exceeded') ||
          errorMessage.includes('rate-limits');

        const isTransientOrTimeout =
          errorMessage.includes('504') ||
          errorMessage.includes('DEADLINE_EXCEEDED') ||
          errorMessage.includes('Deadline expired') ||
          errorMessage.includes('503') ||
          errorMessage.includes('high demand') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ECONNRESET');

        if (keyObj && isSuspendedOrInvalid) {
          keyObj.status = 'cooldown';
          keyObj.cooldownUntil = Date.now() + 86400000; // 24h
          console.error(`[Server API] Key ${keyObj.masked} is SUSPENDED by Google. Moving to end of queue and disabling.`);
          try {
            const dbKey = db.getApiKeys().find(k => k.apiKey.trim() === keyObj.key.trim());
            if (dbKey) {
              dbKey.isSuspended = true;
              dbKey.isActive = false;
              dbKey.cooldownUntil = Date.now() + 86400000;
              dbKey.lastError = 'پروژه گوگل معلق شده است (Consumer Suspended)';
              dbKey.failedRequests = (dbKey.failedRequests || 0) + 1;
              db.saveApiKey(dbKey);
            }
          } catch (dbErr) {}
        } else if (keyObj && (isQuotaExceeded || isTransientOrTimeout)) {
          markKeyCooldown(keyObj, 90);
          console.warn(`Key ${keyObj.masked} moved to cooldown for 90s.`);
          try {
            const dbKey = db.getApiKeys().find(k => k.apiKey.trim() === keyObj.key.trim());
            if (dbKey) {
              dbKey.failedRequests = (dbKey.failedRequests || 0) + 1;
              dbKey.lastError = errorMessage.slice(0, 150);
              db.saveApiKey(dbKey);
            }
          } catch (dbErr) {}
        }

        if (isTransientOrTimeout && currentModelCandidate.includes('3.5')) {
          markGemini35HighDemand();
        }

        // If transient or quota exceeded error, switch immediately to next candidate model
        if ((isTransientOrTimeout || isQuotaExceeded) && mIdx < modelCandidates.length - 1) {
          console.warn(`Quota or Transient error detected on ${currentModelCandidate}. Automatically switching to fallback model ${modelCandidates[mIdx + 1]}...`);
          await new Promise(r => setTimeout(r, 600));
          break; // Exit inner loop and try next model in modelCandidates
        }

        // Small backoff before retrying next key
        await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
      }
    }
  }

  if (successfulHtml) {
    const sanitized = sanitizeTranslatedHtml(successfulHtml);
    saveCacheIfApplicable(sanitized);
    return res.json({
      chunkId,
      translatedHtml: restoreImages(sanitized, imagePlaceholderMap),
      keyUsed: keyUsedName,
      model: successfulModel,
      fallbackUsed: successfulModel !== targetModel,
      success: true,
    });
  }

  const errText = String(lastError?.message || lastError);
  let friendlyError = 'مشکل در برقراری ارتباط با مدل هوش مصنوعی';
  if (errText.includes('504') || errText.includes('DEADLINE_EXCEEDED') || errText.includes('Deadline expired')) {
    friendlyError = 'پایان مهلت زمان اتصال به سرور جمینای (خطای ۵۰۴ - DEADLINE_EXCEEDED). این مورد ناشی از کندی موقت گیت‌وی است؛ سامانه به صورت خودکار با مدل‌های سریع‌تر جایگزین را امتحان می‌کند.';
  } else if (errText.includes('503') || errText.includes('high demand') || errText.includes('UNAVAILABLE')) {
    friendlyError = 'سرورهای هوش مصنوعی در حال حاضر دچار ترافیک بالای موقت (کد ۵۰۳) هستند. لطفاً لحظاتی دیگر مجدداً تلاش فرمایید یا مدل دیگری را از بالای صفحه انتخاب نمایید.';
  } else if (errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota exceeded') || errText.includes('limit: 500')) {
    friendlyError = 'سقف سهمیه درخواست روزانه این مدل در اکانت رایگان پر شده است (429 Quota Exceeded). سامانه مدل‌های جایگزین را نیز بررسی نمود. با کلیک بر روی «ترجمه مجدد صفحات خطادار» می‌توانید دقایقی دیگر مجدداً تلاش فرمایید یا کلید جدید اضافه نمایید.';
  }

  return res.status(500).json({
    error: `خطا در ترجمه: ${friendlyError}`,
  });
});

// Quick term extraction for custom glossary builder
app.post('/api/extract-glossary', async (req, res) => {
  const { sampleText, tone } = req.body;
  if (!sampleText || typeof sampleText !== 'string') {
    return res.status(400).json({ error: 'متن نمونه برای استخراج واژگان الزامی است.' });
  }

  const keyObj = getAvailableKey();
  const apiKey = keyObj?.key || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'کلید Gemini API یافت نشد.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const prompt = `Analyze this excerpt from an English book (Tone: ${tone || 'Spiritual / Philosophical / Literature'}).
Extract 10 to 15 key technical, philosophical, or recurring thematic terms/idioms that must have precise, uniform Persian translations.
Return ONLY valid JSON array with objects shaped: {"en": "English Term", "fa": "ترجمه دقیق و فصیح فارسی", "note": "توضیح کوتاه کاربرد در متن"}.

Text excerpt:
${sampleText.slice(0, 4000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({ glossary: parsed });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'خطا در استخراج واژه‌نامه' });
  }
});

// Endpoint for importing DOCX, PDF, and TXT files with full text and image extraction
app.post('/api/import/file', async (req, res) => {
  try {
    const { fileName, fileData, fileType, maxWordsPerChunk = 700 } = req.body;
    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ error: 'محتوای باینری فایل (base64) ارسال نشده است.' });
    }

    const buffer = Buffer.from(fileData, 'base64');
    const detectedType = fileType || (fileName?.endsWith('.docx') ? 'docx' : fileName?.endsWith('.pdf') ? 'pdf' : fileName?.toLowerCase()?.endsWith('.epub') ? 'epub' : fileName?.toLowerCase()?.endsWith('.srt') ? 'srt' : fileName?.toLowerCase()?.endsWith('.vtt') ? 'vtt' : 'txt');

    const cleanBaseName = (fileName || 'کتاب جدید').replace(/\.[^/.]+$/, '');
    let title = cleanBaseName;
    let originalTitle = cleanBaseName;
    let author = 'نامشخص';
    const chunks: any[] = [];
    let totalImagesCount = 0;

    if (detectedType === 'docx') {
      let imageIdx = 0;
      const options = {
        convertImage: mammoth.images.imgElement((image: any) => {
          imageIdx++;
          totalImagesCount++;
          return image.read('base64').then((imageBuffer: string) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
              class: 'book-embedded-image rounded-xl shadow-md my-4 max-w-full mx-auto block border border-slate-300',
              alt: `تصویر شماره ${imageIdx} کتاب`,
            };
          });
        }),
      };

      const result = await mammoth.convertToHtml({ buffer }, options);
      const html = result.value;

      // Extract sections based on h1, h2, or paragraph flow
      const rawBlocks = html.split(/(?=<h[1-3][^>]*>)/gi).filter(b => b.trim().length > 0);
      let globalChunkCounter = 1;

      if (rawBlocks.length === 0) {
        rawBlocks.push(`<p>${html}</p>`);
      }

      rawBlocks.forEach((block, bIdx) => {
        const headingMatch = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(block);
        const chapterTitle = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : `فصل ${bIdx + 1}`;

        // Split paragraphs and inline images
        const paragraphs = block.split(/(?=<p[^>]*>)|(?=<img[^>]*>)/gi).filter(p => p.trim().length > 0);
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
            chapterNumber: bIdx + 1,
            chapterTitle,
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

        paragraphs.forEach(p => {
          const pWords = p.replace(/<img[^>]*>/gi, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
          if (currentWordCount + pWords > maxWordsPerChunk && currentWordCount > 200) {
            commitSubChunk();
          }
          currentChunkHtml.push(p);
          currentWordCount += pWords;
        });

        commitSubChunk();
      });

    } else if (detectedType === 'pdf') {
      let pdfParsedSuccessfully = false;

      // Professional, uncropped PDF image extraction & page mapping
      const latinText = buffer.toString('latin1');
      const objMap = new Map<number, string>();
      const allExtractedImages: string[] = [];
      const pageImageMap = new Map<number, string[]>();

      // 1. Extract intact Image XObjects using declared stream /Length
      const objRegex = /(\d+)\s+0\s+obj\s*<<([\s\S]*?\/Subtype\s*\/Image[\s\S]*?)>>\s*stream[\r\n]+/g;
      let m: RegExpExecArray | null;
      while ((m = objRegex.exec(latinText)) !== null) {
        const objId = parseInt(m[1], 10);
        const dict = m[2];
        const streamStart = m.index + m[0].length;
        const lenMatch = dict.match(/\/Length\s+(\d+)/);

        if (lenMatch) {
          const len = parseInt(lenMatch[1], 10);
          if (len > 3500 && streamStart + len <= buffer.length) {
            const slice = buffer.subarray(streamStart, streamStart + len);
            if (dict.includes('/DCTDecode') && slice[0] === 0xFF && slice[1] === 0xD8) {
              const dataUrl = 'data:image/jpeg;base64,' + slice.toString('base64');
              objMap.set(objId, dataUrl);
              allExtractedImages.push(dataUrl);
            }
          }
        }
      }

      // 2. Safe SOS-aware JPEG scanner for standalone embedded JPEGs (never cuts midway through image)
      let offset = 0;
      while (offset < buffer.length - 16) {
        if (buffer[offset] === 0xFF && buffer[offset + 1] === 0xD8 && buffer[offset + 2] === 0xFF) {
          let cur = offset + 2;
          let valid = false;
          while (cur < buffer.length - 4) {
            if (buffer[cur] === 0xFF) {
              const marker = buffer[cur + 1];
              if (marker === 0xD9) { // Genuine EOI
                cur += 2;
                valid = true;
                break;
              } else if (marker === 0xDA) { // SOS (Start of Scan) - step through scan data
                cur += 2;
                const sosLen = (buffer[cur] << 8) | buffer[cur + 1];
                cur += sosLen;
                while (cur < buffer.length - 1) {
                  if (buffer[cur] === 0xFF) {
                    if (buffer[cur + 1] === 0xD9) {
                      cur += 2;
                      valid = true;
                      break;
                    } else if (buffer[cur + 1] === 0x00 || (buffer[cur + 1] >= 0xD0 && buffer[cur + 1] <= 0xD7)) {
                      cur += 2;
                    } else {
                      cur++;
                    }
                  } else {
                    cur++;
                  }
                }
                break;
              } else if (marker !== 0x00 && marker !== 0xFF) {
                const segLen = (buffer[cur + 2] << 8) | buffer[cur + 3];
                cur += 2 + segLen;
              } else {
                cur++;
              }
            } else {
              cur++;
            }
          }
          if (valid && (cur - offset) > 4000) {
            const slice = buffer.subarray(offset, cur);
            const dataUrl = 'data:image/jpeg;base64,' + slice.toString('base64');
            if (!allExtractedImages.includes(dataUrl)) {
              allExtractedImages.push(dataUrl);
            }
            offset = cur;
            continue;
          }
        }
        offset++;
      }

      // 3. Map page XObjects to exact page numbers
      const pageRegex = /\/Type\s*\/Page\b[\s\S]*?>>/g;
      let pIdx = 1;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = pageRegex.exec(latinText)) !== null) {
        const pageDict = pMatch[0];
        const xMatches = pageDict.match(/\/([A-Za-z0-9_]+)\s+(\d+)\s+0\s+R/g);
        if (xMatches) {
          const pageImgs: string[] = [];
          const seenIds = new Set<number>();
          for (const xm of xMatches) {
            const numM = xm.match(/\s+(\d+)\s+0\s+R/);
            if (numM) {
              const id = parseInt(numM[1], 10);
              if (objMap.has(id) && !seenIds.has(id)) {
                seenIds.add(id);
                const dataUrl = objMap.get(id)!;
                if (!pageImgs.includes(dataUrl)) {
                  pageImgs.push(dataUrl);
                }
              }
            }
          }
          if (pageImgs.length > 0) {
            pageImageMap.set(pIdx, pageImgs);
          }
        }
        pIdx++;
      }

      totalImagesCount = allExtractedImages.length;
      let globalChunkCounter = 1;
      let fallbackImgIdx = 0;
      let numPages = 0;

      // Helper to render figure HTML for embedded images
      const formatImageFigure = (imgSrc: string, pageNum: number, imgNum: number) => {
        return `\n<figure class="book-illustration-figure my-8 text-center" style="page-break-inside: avoid; break-inside: avoid;">
  <div class="inline-block p-2.5 rounded-2xl bg-white shadow-md border border-slate-200 max-w-full">
    <img src="${imgSrc}" class="book-embedded-image rounded-xl max-h-[500px] max-w-full mx-auto object-contain block" alt="تصویر صفحه ${pageNum} کتاب" />
  </div>
  <figcaption class="text-xs text-slate-500 mt-2 font-medium">تصویر ${imgNum} - صفحه ${pageNum}</figcaption>
</figure>`;
      };

      // Method 1: pdfjs-dist via dynamic import
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Data,
          useSystemFonts: true,
          disableFontFace: true,
        });
        const pdfDoc = await loadingTask.promise;
        numPages = pdfDoc.numPages;

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          try {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageLines: string[] = [];
            let currentLine = '';
            let lastY: number | null = null;

            for (const item of textContent.items as any[]) {
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                if (currentLine.trim()) pageLines.push(currentLine.trim());
                currentLine = item.str;
              } else {
                currentLine += (currentLine ? ' ' : '') + item.str;
              }
              lastY = item.transform[5];
            }
            if (currentLine.trim()) pageLines.push(currentLine.trim());

            const pageText = pageLines.join('\n\n');
            const words = pageText.split(/\s+/).filter(Boolean).length;

            // Resolve images for this exact page with strict deduplication
            const rawPageImages = pageImageMap.get(pageNum) || [];
            if (rawPageImages.length === 0 && pageImageMap.size === 0 && fallbackImgIdx < allExtractedImages.length) {
              rawPageImages.push(allExtractedImages[fallbackImgIdx++]);
            }
            const thisPageImages = Array.from(new Set(rawPageImages));

            if (words === 0 && thisPageImages.length === 0) continue;

            let pageHtml = pageLines.map(l => `<p>${l}</p>`).join('\n');
            thisPageImages.forEach((img, iIdx) => {
              pageHtml += formatImageFigure(img, pageNum, iIdx + 1);
            });

            chunks.push({
              id: `chk_${Date.now()}_${globalChunkCounter}`,
              chapterNumber: pageNum,
              chapterTitle: `صفحه ${pageNum}`,
              chunkNumber: 1,
              englishText: pageHtml,
              wordCount: Math.max(1, words),
              estimatedTokens: Math.ceil(words * 1.35),
              status: 'idle',
              hasImages: thisPageImages.length > 0,
              imageCount: thisPageImages.length,
            });
            globalChunkCounter++;
          } catch (pageErr) {
            console.warn(`Error extracting text from PDF page ${pageNum}:`, pageErr);
          }
        }
        pdfParsedSuccessfully = true;
      } catch (pdfjsErr: any) {
        console.warn('pdfjs-dist processing failed, falling back to pdf-parse:', pdfjsErr?.message);
      }

      // Method 2: Robust Fallback with pdf-parse if pdfjs-dist failed
      if (!pdfParsedSuccessfully || chunks.length === 0) {
        try {
          const pdfParseModule = await import('pdf-parse');
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const parsed = await pdfParse(buffer);
          numPages = parsed.numpages || 1;
          const fullText = parsed.text || '';

          if (fullText.trim()) {
            const rawPages = fullText.split(/\f|\n{4,}/).filter((p: string) => p.trim().length > 0);
            const actualPages = rawPages.length > 0 ? rawPages : [fullText];
            numPages = Math.max(numPages, actualPages.length);

            actualPages.forEach((pageContent: string, pIdx: number) => {
              const pageNum = pIdx + 1;
              const lines = pageContent.split('\n').map((l: string) => l.trim()).filter(Boolean);
              const words = lines.join(' ').split(/\s+/).filter(Boolean).length;

              const thisPageImages = pageImageMap.get(pageNum) || [];
              if (thisPageImages.length === 0 && pageImageMap.size === 0 && fallbackImgIdx < allExtractedImages.length) {
                thisPageImages.push(allExtractedImages[fallbackImgIdx++]);
              }

              if (words === 0 && thisPageImages.length === 0) return;

              let pageHtml = lines.map((l: string) => `<p>${l}</p>`).join('\n');
              thisPageImages.forEach((img, iIdx) => {
                pageHtml += formatImageFigure(img, pageNum, iIdx + 1);
              });

              chunks.push({
                id: `chk_${Date.now()}_${globalChunkCounter}`,
                chapterNumber: pageNum,
                chapterTitle: `صفحه ${pageNum}`,
                chunkNumber: 1,
                englishText: pageHtml,
                wordCount: Math.max(1, words),
                estimatedTokens: Math.ceil(words * 1.35),
                status: 'idle',
                hasImages: thisPageImages.length > 0,
                imageCount: thisPageImages.length,
              });
              globalChunkCounter++;
            });
            pdfParsedSuccessfully = true;
          }
        } catch (fallbackErr: any) {
          console.error('pdf-parse fallback error:', fallbackErr?.message);
          throw new Error(`خطا در پردازش فایل PDF: ${fallbackErr?.message || 'قالب PDF نامعتبر است'}`);
        }
      }

      // تشخیص هوشمند فایل‌های PDF اسکن‌شده (Scanned PDF Detection)
      const totalPdfExtractedWords = chunks.reduce((sum, c) => sum + (c.wordCount || 0), 0);
      if (numPages >= 1 && (chunks.length === 0 || totalPdfExtractedWords < Math.min(25, numPages * 3))) {
        return res.status(400).json({
          success: false,
          isScannedPdf: true,
          numPages: numPages,
          totalWords: totalPdfExtractedWords,
          error: `فایل PDF انتخابی شما به صورت «اسکن تصویری» (عکس بدون لایه متنی دیجیتال) تشخیص داده شد! در تمامی ${numPages} صفحه این سند هیچ متن قابل انتخابی یافت نشد. موتور ترجمه سامانه برای جلوگیری از اتلاف اعتبار شما و تضمین کیفیت ترجمه، فقط فایل‌های PDF متنی استاندارد، Word (.docx) یا EPUB را پردازش می‌کند. لطفاً فایل متنی کتاب را آپلود فرمایید.`,
        });
      }
    } else if (detectedType === 'epub') {
      const zip = await JSZip.loadAsync(buffer);
      const containerXml = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) {
        throw new Error('فایل EPUB فاقد ساختار استاندارد است (container.xml یافت نشد).');
      }

      const opfPathMatch = /full-path=["']([^"']+\.opf)["']/i.exec(containerXml);
      if (!opfPathMatch) {
        throw new Error('مسیر فایل پکیج (.opf) در فایل EPUB یافت نشد.');
      }

      const opfPath = opfPathMatch[1];
      const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
      const opfContent = await zip.file(opfPath)?.async('text');
      if (!opfContent) {
        throw new Error(`فایل پکیج EPUB در مسیر ${opfPath} یافت نشد.`);
      }

      const tMatch = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opfContent);
      if (tMatch && tMatch[1].trim()) title = tMatch[1].replace(/<[^>]+>/g, '').trim();

      const aMatch = /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opfContent);
      if (aMatch && aMatch[1].trim()) author = aMatch[1].replace(/<[^>]+>/g, '').trim();

      const manifestMap = new Map<string, { href: string; mediaType: string; zipPath: string }>();
      const itemRegex = /<item\s+[^>]*>/gi;
      let m;
      while ((m = itemRegex.exec(opfContent)) !== null) {
        const itemTag = m[0];
        const idM = /id=["']([^"']+)["']/i.exec(itemTag);
        const hrefM = /href=["']([^"']+)["']/i.exec(itemTag);
        const mediaM = /media-type=["']([^"']+)["']/i.exec(itemTag);
        if (idM && hrefM) {
          const href = decodeURIComponent(hrefM[1]);
          const zipPath = opfDir ? `${opfDir}/${href}`.replace(/\/+/g, '/') : href;
          manifestMap.set(idM[1], {
            href,
            mediaType: mediaM ? mediaM[1].toLowerCase() : '',
            zipPath,
          });
        }
      }

      const imageMap = new Map<string, string>();
      for (const item of manifestMap.values()) {
        if (item.mediaType.startsWith('image/')) {
          const imgFile = zip.file(item.zipPath);
          if (imgFile) {
            try {
              const b64 = await imgFile.async('base64');
              const dataUrl = `data:${item.mediaType};base64,${b64}`;
              imageMap.set(item.zipPath, dataUrl);
              const bName = item.zipPath.split('/').pop() || '';
              if (bName) imageMap.set(bName, dataUrl);
              totalImagesCount++;
            } catch (e) {}
          }
        }
      }

      const spineIds: string[] = [];
      const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*>/gi;
      while ((m = itemrefRegex.exec(opfContent)) !== null) {
        spineIds.push(m[1]);
      }
      if (spineIds.length === 0) {
        manifestMap.forEach((it, k) => {
          if (it.mediaType.includes('xhtml') || it.mediaType.includes('html')) spineIds.push(k);
        });
      }

      let globalChunkCounter = 1;
      let chapterIdx = 1;

      for (const sId of spineIds) {
        const it = manifestMap.get(sId);
        if (!it) continue;
        const cFile = zip.file(it.zipPath);
        if (!cFile) continue;
        const xhtml = await cFile.async('text');

        let cTitle = `فصل ${chapterIdx}`;
        const headM = /<(?:h[1-3]|title)[^>]*>([\s\S]*?)<\/(?:h[1-3]|title)>/i.exec(xhtml);
        if (headM && headM[1].replace(/<[^>]+>/g, '').trim()) {
          cTitle = headM[1].replace(/<[^>]+>/g, '').trim();
        }

        let modHtml = xhtml;
        for (const [p, dUrl] of imageMap.entries()) {
          const fn = p.split('/').pop() || '';
          modHtml = modHtml.replace(
            new RegExp(`src=["'][^"']*${fn}["']`, 'gi'),
            `src="${dUrl}" class="book-embedded-image rounded-xl shadow-md my-4 max-w-full mx-auto block border border-slate-300"`
          );
        }

        const blocks = modHtml.match(/<(?:p|h[1-3]|blockquote|figure)[^>]*>[\s\S]*?<\/(?:p|h[1-3]|blockquote|figure)>/gi) || [modHtml];
        let curChunkHtml: string[] = [];
        let curWordCount = 0;
        let subChunk = 1;

        const commitChunk = () => {
          if (curChunkHtml.length === 0) return;
          const chunkStr = curChunkHtml.join('\n');
          const plain = chunkStr.replace(/<img[^>]*>/gi, '').replace(/<[^>]+>/g, ' ').trim();
          const words = plain.split(/\s+/).filter(Boolean).length;
          const hasImg = /<img[^>]*>/i.test(chunkStr);
          const imgCount = (chunkStr.match(/<img[^>]*>/gi) || []).length;

          chunks.push({
            id: `chk_${Date.now()}_${globalChunkCounter}`,
            chapterNumber: chapterIdx,
            chapterTitle: cTitle,
            chunkNumber: subChunk,
            englishText: chunkStr,
            wordCount: Math.max(1, words),
            estimatedTokens: Math.ceil(words * 1.35),
            status: 'idle',
            hasImages: hasImg,
            imageCount: imgCount,
          });
          globalChunkCounter++;
          subChunk++;
          curChunkHtml = [];
          curWordCount = 0;
        };

        for (const b of blocks) {
          const bWords = b.replace(/<img[^>]*>/gi, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
          if (curWordCount + bWords > maxWordsPerChunk && curWordCount > 200) {
            commitChunk();
          }
          curChunkHtml.push(b);
          curWordCount += bWords;
        }
        commitChunk();
        chapterIdx++;
      }
    } else if (detectedType === 'srt' || detectedType === 'vtt' || fileName?.toLowerCase()?.endsWith('.srt') || fileName?.toLowerCase()?.endsWith('.vtt')) {
      const rawText = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const cueBlocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

      let currentCueGroup: string[] = [];
      let currentWordCount = 0;
      let subChunkIndex = 1;
      let globalChunkCounter = 1;

      const commitSubtitleChunk = () => {
        if (currentCueGroup.length === 0) return;
        const chunkContent = currentCueGroup.join('\n\n');
        const words = chunkContent.split(/\s+/).filter(Boolean).length;

        // Extract first and last timecode in group for readable chapter title
        const timeMatches = chunkContent.match(/\d{2}:\d{2}[:\d,\.]{0,8}\s*-->\s*\d{2}:\d{2}[:\d,\.]{0,8}/g);
        const firstTime = timeMatches ? timeMatches[0].split('-->')[0].trim() : '';
        const lastTime = timeMatches ? timeMatches[timeMatches.length - 1].split('-->')[1].trim() : '';
        const titleRange = firstTime && lastTime ? `زیرنویس (${firstTime} الی ${lastTime})` : `بخش زیرنویس ${subChunkIndex}`;

        chunks.push({
          id: `chk_${Date.now()}_${globalChunkCounter}`,
          chapterNumber: 1,
          chapterTitle: titleRange,
          chunkNumber: subChunkIndex,
          englishText: chunkContent,
          wordCount: Math.max(1, words),
          estimatedTokens: Math.ceil(words * 1.35),
          status: 'idle',
          hasImages: false,
          imageCount: 0,
        });
        globalChunkCounter++;
        subChunkIndex++;
        currentCueGroup = [];
        currentWordCount = 0;
      };

      for (const cue of cueBlocks) {
        if (cue === 'WEBVTT' || cue.startsWith('NOTE')) continue;
        const cueWords = cue.split(/\s+/).filter(Boolean).length;
        if (currentWordCount + cueWords > maxWordsPerChunk && currentWordCount > 180) {
          commitSubtitleChunk();
        }
        currentCueGroup.push(cue);
        currentWordCount += cueWords;
      }
      commitSubtitleChunk();
    } else {
      // Plain text fallback
      const rawText = buffer.toString('utf-8');
      chunks.push({
        id: `chk_${Date.now()}_1`,
        chapterNumber: 1,
        chapterTitle: 'متن اصلی کتاب',
        chunkNumber: 1,
        englishText: rawText,
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        estimatedTokens: Math.ceil(rawText.split(/\s+/).filter(Boolean).length * 1.35),
        status: 'idle',
        hasImages: false,
        imageCount: 0,
      });
    }

    return res.json({
      success: true,
      title,
      originalTitle,
      author,
      chunks,
      totalImagesCount,
    });
  } catch (err: any) {
    console.error('File import error:', err);
    return res.status(500).json({ error: `خطا در پردازش فایل: ${err?.message || 'مشکل در خواندن فایل'}` });
  }
});

// Helper to standardize font name and generate proper multi-script font definition for Word
function cleanFontFamily(fontName: string = 'Vazirmatn'): string {
  if (!fontName) return 'Vazirmatn';
  return fontName.replace(/\s+(Medium|Regular|Bold|Light|SemiBold|Black)$/i, '').trim() || 'Vazirmatn';
}

function createFontDef(fontName: string = 'Vazirmatn') {
  const family = cleanFontFamily(fontName);
  return {
    name: family,
    cs: family,       // Complex script for Persian in Word
    ascii: family,
    hAnsi: family,
    eastAsia: family,
  };
}

// Helper to preserve color-coded glossary terms (#9b2c2c) and styling in Word TextRuns
function parseHtmlToTextRuns(html: string, fontName: string = 'Vazirmatn Medium'): TextRun[] {
  const runs: TextRun[] = [];
  const fontDef = createFontDef(fontName);
  const regex = /<span style="[^"]*#9b2c2c[^"]*"[^>]*>([\s\S]*?)<\/span>|<b[^>]*>([\s\S]*?)<\/b>|<strong[^>]*>([\s\S]*?)<\/strong>|<i[^>]*>([\s\S]*?)<\/i>|<em[^>]*>([\s\S]*?)<\/em>|([^<]+)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      // Glossary term treated with standard body styling (no crimson highlight)
      runs.push(
        new TextRun({
          text: match[1].replace(/<[^>]+>/g, ''),
          font: fontDef,
          size: 24,
          color: '2D3748',
          rightToLeft: true,
        })
      );
    } else if (match[2] || match[3]) {
      // Bold text
      runs.push(
        new TextRun({
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
        new TextRun({
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
        new TextRun({
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
      new TextRun({
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

// Generate DOCX export from translated sections
app.post('/api/export/docx', async (req, res) => {
  try {
    const { title, author, translator, chapters, designConfig } = req.body;
    const fontFamily = designConfig?.fontFamily || 'Vazirmatn Medium';
    const fontDef = createFontDef(fontFamily);

    const themeKey = (designConfig?.themeId || 'spiritual') as keyof typeof BOOK_THEMES;
    const theme = BOOK_THEMES[themeKey] || BOOK_THEMES.spiritual;
    const customColors = designConfig?.customColors || {};

    const h1Color = (customColors.heading1Color || theme.headingColor || '1A365D').replace('#', '');
    const h2Color = (customColors.heading2Color || theme.headingColor || '2B6CB0').replace('#', '');
    const h3Color = (customColors.heading3Color || theme.accentColor || '2C5282').replace('#', '');
    const headerColor = (customColors.headerColor || '718096').replace('#', '');
    const footerColor = (customColors.footerColor || '718096').replace('#', '');
    const textColor = (customColors.textColor || theme.textColor || '2D3748').replace('#', '');
    const accentColor = (customColors.accentColor || theme.accentColor || '3182CE').replace('#', '');
    const pageBgColor = (customColors.pageBgColor || theme.pageBgColor || 'fbf6ea').replace('#', '');

    const pSpacing = designConfig?.paragraphSpacing || 'normal';
    const pSpacingAfter = pSpacing === 'compact' ? 160 : pSpacing === 'generous' ? 440 : pSpacing === 'relaxed' ? 320 : 240;

    // Only include header if showHeader is explicitly true AND text is non-empty
    const showHeader = designConfig?.showHeader === true && Boolean(designConfig?.headerText?.trim());
    const headerText = showHeader ? (designConfig?.headerText?.trim() || '') : '';

    // Only include footer if showFooter is true OR showPageNumbers is true
    const showFooter = designConfig?.showFooter === true && Boolean(designConfig?.footerText?.trim());
    const footerText = showFooter ? (designConfig?.footerText?.trim() || '') : '';
    const showPageNumbers = designConfig?.showPageNumbers !== false;

    const docChildren: Paragraph[] = [];

    // Title Page
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 400 },
        bidirectional: true,
        children: [
          new TextRun({
            text: title || 'کتاب ترجمه شده',
            font: fontDef,
            size: 48, // 24pt
            bold: true,
            color: h1Color,
            rightToLeft: true,
          }),
        ],
      })
    );

    if (author) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          bidirectional: true,
          children: [
            new TextRun({
              text: `نویسنده: ${author}`,
              font: fontDef,
              size: 26,
              color: '4A5568',
              rightToLeft: true,
            }),
          ],
        })
      );
    }

    if (translator) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          bidirectional: true,
          children: [
            new TextRun({
              text: `ترجمه و ویرایش: ${translator}`,
              font: fontDef,
              size: 24,
              italics: true,
              color: '718096',
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

    // Parse chapters HTML into DOCX elements
    if (Array.isArray(chapters)) {
      chapters.forEach((ch: { title?: string; htmlContent?: string }, chIdx: number) => {
        if (chIdx > 0) {
          if (designConfig?.continuousFlow === false) {
            docChildren.push(new Paragraph({ pageBreakBefore: true }));
          } else {
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

        // Parse paragraphs, blockquotes, headings, divs, and embedded images from HTML
        const html = ch.htmlContent || '';
        const blockRegex = /<(h[1-3]|p|blockquote|div|figure)[^>]*>([\s\S]*?)<\/\1>|<img\s+[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi;
        let match;
        let foundAny = false;

        while ((match = blockRegex.exec(html)) !== null) {
          foundAny = true;

          // If standalone image was matched
          if (match[3]) {
            const dataUrl = match[3];
            const commaIdx = dataUrl.indexOf(',');
            if (commaIdx !== -1) {
              try {
                const base64Data = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
                const imgBuffer = Buffer.from(base64Data, 'base64');
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

          // Check if block contains any embedded images (e.g. inside div, figure, or p)
          const embeddedImgRegex = /<img\s+[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi;
          let imgMatch;
          while ((imgMatch = embeddedImgRegex.exec(innerHtml)) !== null) {
            try {
              const dataUrl = imgMatch[1];
              const commaIdx = dataUrl.indexOf(',');
              if (commaIdx !== -1) {
                const base64Data = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
                const imgBuffer = Buffer.from(base64Data, 'base64');
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
                    size: 34,
                    bold: true,
                    color: h1Color,
                    rightToLeft: true,
                  }),
                ],
              })
            );
          } else if (tag === 'h2') {
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
                    size: 28,
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
                    size: 24,
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
                    color: accentColor,
                    size: 24,
                    style: BorderStyle.SINGLE,
                  },
                },
                children: [
                  new TextRun({
                    text: '« ',
                    font: fontDef,
                    size: 22,
                    color: accentColor,
                    rightToLeft: true,
                  }),
                  ...parseHtmlToTextRuns(innerHtml, fontFamily),
                  new TextRun({
                    text: ' »',
                    font: fontDef,
                    size: 22,
                    color: accentColor,
                    rightToLeft: true,
                  }),
                ],
              })
            );
          } else {
            // Standard paragraph with natural RTL alignment (prevents stretched words in Word)
            const paraAlignment = designConfig?.textAlignment === 'both' ? AlignmentType.BOTH : AlignmentType.RIGHT;
            docChildren.push(
              new Paragraph({
                alignment: paraAlignment,
                spacing: { line: 380, before: 120, after: pSpacingAfter },
                bidirectional: true,
                children: parseHtmlToTextRuns(innerHtml, fontFamily),
              })
            );
          }
        }

        // If no HTML tags were matched, output clean text lines
        if (!foundAny) {
          const lines = html.replace(/<[^>]+>/g, '').split('\n').map(l => l.trim()).filter(Boolean);
          const paraAlignment = designConfig?.textAlignment === 'both' ? AlignmentType.BOTH : AlignmentType.RIGHT;
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
      });
    }

    const doc = new Document({
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
              spacing: { line: 380, after: pSpacingAfter },
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
                top: 1440, // 1 inch / 2.54 cm
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

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || 'book-translated')}.docx"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('DOCX Export error:', err);
    res.status(500).json({ error: 'خطا در ایجاد فایل Word' });
  }
});

// Fallback 404 for any unhandled /api/* endpoints (prevents falling through to Vite)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `مسیر API یافت نشد: ${req.method} ${req.path}` });
});

// Setup Vite or static serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = [
      path.resolve(process.cwd(), 'dist'),
      path.resolve(__dirname, 'dist'),
    ].find(p => fs.existsSync(path.resolve(p, 'index.html'))) || path.resolve(__dirname, 'dist');

    // High performance caching for static production assets
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(woff2?|ttf|eot|otf|svg|png|jpg|jpeg|webp|js|css)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Book Translator server listening on 0.0.0.0:${PORT} (mode: ${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer();
