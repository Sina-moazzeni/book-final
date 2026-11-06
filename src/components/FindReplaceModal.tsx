import React, { useState, useMemo } from 'react';
import {
  X,
  Replace,
  Search,
  Check,
  AlertCircle,
  Sparkles,
  BookMarked,
  FileText,
  ListPlus,
  ArrowRight,
  Eye,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BookProject, BookChunk, GlossaryItem } from '../types.ts';
import { cleanChapterTitle } from '../utils/exporter.ts';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  onUpdateChunks: (updatedChunks: BookChunk[]) => void;
  onUpdateGlossary?: (glossary: GlossaryItem[]) => void;
}

interface MatchOccurrence {
  chunkId: string;
  chunkNumber: number;
  chapterTitle: string;
  snippetBefore: string;
  matchedText: string;
  snippetAfter: string;
}

// Safely replaces text inside HTML without corrupting tags, styles, or attributes
export function safeReplaceInHtml(
  html: string,
  findText: string,
  replaceText: string,
  wholeWord: boolean = false
): { newHtml: string; count: number } {
  if (!html || !findText) return { newHtml: html, count: 0 };
  const parts = html.split(/(<[^>]+>)/g);
  let count = 0;

  const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = wholeWord
    ? new RegExp('(^|[^\\p{L}\\p{N}_])(' + escaped + ')([^\\p{L}\\p{N}_]|$)', 'gu')
    : new RegExp(escaped, 'gu');

  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      parts[i] = parts[i].replace(regex, (match, p1, p2, p3) => {
        count++;
        if (wholeWord) {
          return (p1 || '') + replaceText + (p3 || '');
        }
        return replaceText;
      });
    }
  }

  return { newHtml: parts.join(''), count };
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateChunks,
  onUpdateGlossary,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single mode state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [wholeWord, setWholeWord] = useState(false);
  const [addToGlossary, setAddToGlossary] = useState(true);
  const [englishTermForGlossary, setEnglishTermForGlossary] = useState('');
  const [showOccurrences, setShowOccurrences] = useState(false);

  // Batch mode state
  const [batchText, setBatchText] = useState('');
  const [batchWholeWord, setBatchWholeWord] = useState(false);
  const [batchAddToGlossary, setBatchAddToGlossary] = useState(true);

  // Status state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastReplacedCount, setLastReplacedCount] = useState<number | null>(null);

  const chunks = useMemo(() => project.chunks || [], [project.chunks]);

  // Live occurrences calculation for Single Mode
  const { totalMatches, occurrences } = useMemo(() => {
    if (!findText.trim()) return { totalMatches: 0, occurrences: [] };

    let total = 0;
    const list: MatchOccurrence[] = [];
    const escaped = findText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = wholeWord
      ? new RegExp('(^|[^\\p{L}\\p{N}_])(' + escaped + ')([^\\p{L}\\p{N}_]|$)', 'gu')
      : new RegExp(escaped, 'gu');

    chunks.forEach(chunk => {
      const html = chunk.translatedHtml || '';
      if (!html) return;

      // Extract text content only (ignoring HTML tags)
      const textParts = html.split(/<[^>]+>/g);
      textParts.forEach(segment => {
        if (!segment) return;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(segment)) !== null) {
          total++;
          if (list.length < 50) { // Limit preview to 50 items for performance
            const matchIndex = m.index + (wholeWord && m[1] ? m[1].length : 0);
            const start = Math.max(0, matchIndex - 35);
            const end = Math.min(segment.length, matchIndex + findText.length + 35);

            list.push({
              chunkId: chunk.id,
              chunkNumber: chunk.chunkNumber,
              chapterTitle: cleanChapterTitle(chunk.chapterTitle),
              snippetBefore: segment.slice(start, matchIndex),
              matchedText: segment.slice(matchIndex, matchIndex + findText.length),
              snippetAfter: segment.slice(matchIndex + findText.length, end),
            });
          }
        }
      });
    });

    return { totalMatches: total, occurrences: list };
  }, [chunks, findText, wholeWord]);

  // Batch parsing helper
  const parsedBatchItems = useMemo(() => {
    if (!batchText.trim()) return [];
    const lines = batchText.split('\n');
    const items: { find: string; replace: string; enKey?: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      let parts: string[] = [];
      if (line.includes(':')) {
        parts = line.split(':');
      } else if (line.includes('：')) {
        parts = line.split('：');
      } else if (line.includes('->') || line.includes('←')) {
        parts = line.split(/->|←/);
      } else if (line.includes('\t')) {
        parts = line.split('\t');
      }

      if (parts.length >= 2) {
        const f = parts[0].trim();
        const r = parts[1].trim();
        const enKey = parts[2]?.trim() || undefined;
        if (f && r) {
          items.push({ find: f, replace: r, enKey });
        }
      }
    }
    return items;
  }, [batchText]);

  if (!isOpen) return null;

  // Execute Single Replace All
  const handleExecuteSingleReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findText.trim()) return;

    let overallCount = 0;
    let modifiedChunksCount = 0;

    const updated = chunks.map(chunk => {
      const originalHtml = chunk.translatedHtml || '';
      if (!originalHtml) return chunk;

      const { newHtml, count } = safeReplaceInHtml(originalHtml, findText.trim(), replaceText, wholeWord);
      if (count > 0) {
        overallCount += count;
        modifiedChunksCount++;
        return {
          ...chunk,
          translatedHtml: newHtml,
        };
      }
      return chunk;
    });

    onUpdateChunks(updated);
    setLastReplacedCount(overallCount);

    // Optional: Add to Glossary for AI consistency in future translations
    if (addToGlossary && onUpdateGlossary && replaceText.trim()) {
      const safeGlossary = Array.isArray(project.glossary) ? [...project.glossary] : [];
      const termKey = englishTermForGlossary.trim() || findText.trim();
      const existingIdx = safeGlossary.findIndex(
        x => x.en.toLowerCase() === termKey.toLowerCase() || x.fa === replaceText.trim()
      );

      if (existingIdx !== -1) {
        safeGlossary[existingIdx] = {
          ...safeGlossary[existingIdx],
          fa: replaceText.trim(),
          note: `جایگزین‌شده از «${findText.trim()}»`,
        };
      } else {
        safeGlossary.push({
          id: `term_rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          en: termKey,
          fa: replaceText.trim(),
          note: `نام اصلاح‌شده شخصیت یا واژه کتاب (قبلاً: ${findText.trim()})`,
        });
      }
      onUpdateGlossary(safeGlossary);
    }

    setStatusMessage(`با موفقیت ${overallCount} مورد «${findText}» در ${modifiedChunksCount} بخش با «${replaceText}» جایگزین شد.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Execute Batch Replace All
  const handleExecuteBatchReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBatchItems.length === 0) return;

    let overallCount = 0;
    let modifiedChunksCount = 0;

    let currentChunks = [...chunks];

    for (const item of parsedBatchItems) {
      currentChunks = currentChunks.map(chunk => {
        const originalHtml = chunk.translatedHtml || '';
        if (!originalHtml) return chunk;

        const { newHtml, count } = safeReplaceInHtml(originalHtml, item.find, item.replace, batchWholeWord);
        if (count > 0) {
          overallCount += count;
          modifiedChunksCount++;
          return {
            ...chunk,
            translatedHtml: newHtml,
          };
        }
        return chunk;
      });
    }

    onUpdateChunks(currentChunks);
    setLastReplacedCount(overallCount);

    // Optional: Add batch items to glossary
    if (batchAddToGlossary && onUpdateGlossary) {
      const safeGlossary = Array.isArray(project.glossary) ? [...project.glossary] : [];
      parsedBatchItems.forEach(item => {
        const key = item.enKey || item.find;
        const existingIdx = safeGlossary.findIndex(
          x => x.en.toLowerCase() === key.toLowerCase() || x.fa === item.replace
        );
        if (existingIdx !== -1) {
          safeGlossary[existingIdx] = {
            ...safeGlossary[existingIdx],
            fa: item.replace,
            note: `جایگزین‌شده از «${item.find}»`,
          };
        } else {
          safeGlossary.push({
            id: `term_batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            en: key,
            fa: item.replace,
            note: `نام اصلاح‌شده شخصیت یا واژه (قبلاً: ${item.find})`,
          });
        }
      });
      onUpdateGlossary(safeGlossary);
    }

    setStatusMessage(`با موفقیت ${parsedBatchItems.length} عنوان و مجموعاً ${overallCount} تکرار در کل کتاب اصلاح و جایگزین گردید.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Replace className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>جستجو و جایگزینی سراسری در کل ترجمه کتاب</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {chunks.length} بخش فعال
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                اصلاح یکپارچه اسامی شخصیت‌ها، مکان‌ها و اصطلاحات در تمام فصول بدون تغییر کدهای سند
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('single')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'single'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>جایگزینی سریع تکی</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'batch'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>جایگزینی دسته‌جمعی اسامی (لیست با :)</span>
            {parsedBatchItems.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {parsedBatchItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Status Message Alert */}
          {statusMessage && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}

          {activeTab === 'single' ? (
            /* TAB 1: Single Replace Form */
            <form onSubmit={handleExecuteSingleReplace} className="space-y-4">
              
              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    کلمه یا عبارت فعلی (مورد جستجو):
                  </label>
                  <input
                    type="text"
                    value={findText}
                    onChange={e => setFindText(e.target.value)}
                    placeholder="مثلاً: دالی"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-inner font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    کلمه‌ای که در حال حاضر در ترجمه وجود دارد و قصد تعویض آن را دارید.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    کلمه یا عبارت جدید (جایگزین):
                  </label>
                  <input
                    type="text"
                    value={replaceText}
                    onChange={e => setReplaceText(e.target.value)}
                    placeholder="مثلاً: دولی"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-inner font-medium text-emerald-300"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    نام صحیح یا عبارت استانداردی که باید در کل کتاب قرار بگیرد.
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="text-slate-300 font-semibold mb-1">تنظیمات تطبیق و یکپارچگی:</div>
                
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={wholeWord}
                    onChange={e => setWholeWord(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span>تطبیق کلمه کامل (فقط کلمه مستقل جایگزین شود و در داخل کلمات مرکب دیگر تغییر نکند)</span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={addToGlossary}
                    onChange={e => setAddToGlossary(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-amber-300">
                      ثبت خودکار در دانشنامه تخصصی کتاب (Glossary)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      با فعال بودن این گزینه، هوش مصنوعی در ترجمه فصل‌های بعدی نیز این نام را به خاطر سپرده و یکپارچه ترجمه خواهد کرد.
                    </p>
                  </div>
                </label>

                {addToGlossary && (
                  <div className="pt-2 pr-6 border-t border-slate-800/80">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      نام اصلی لاتین در متن انگلیسی (اختیاری جهت تطبیق هوش مصنوعی):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={englishTermForGlossary}
                      onChange={e => setEnglishTermForGlossary(e.target.value)}
                      placeholder="e.g. Dolly"
                      className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Match Statistics & Preview Toggle */}
              {findText.trim() && (
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        تعداد تکرار در کل کتاب: <strong className="text-emerald-400 font-bold text-sm font-mono">{totalMatches}</strong> مورد
                      </span>
                    </div>

                    {totalMatches > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowOccurrences(!showOccurrences)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>{showOccurrences ? 'بستن پیش‌نمایش جملات' : 'مشاهده پیش‌نمایش جملات'}</span>
                        {showOccurrences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Occurrences List */}
                  {showOccurrences && occurrences.length > 0 && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {occurrences.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] flex flex-col gap-0.5"
                        >
                          <span className="text-slate-500 text-[10px] font-semibold">{item.chapterTitle}:</span>
                          <p className="text-slate-300 leading-relaxed" dir="rtl">
                            ...{item.snippetBefore}
                            <mark className="bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded font-bold">
                              {item.matchedText}
                            </mark>
                            {item.snippetAfter}...
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {totalMatches > 0
                    ? `آماده جایگزینی در کل فصول کتاب (${totalMatches} تکرار)`
                    : findText.trim() ? 'موردی برای جایگزینی در ترجمه‌ها یافت نشد.' : ''}
                </span>

                <button
                  type="submit"
                  disabled={totalMatches === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Replace className="w-4 h-4" />
                  <span>جایگزینی سراسری در تمام فصول ({totalMatches} مورد)</span>
                </button>
              </div>

            </form>
          ) : (
            /* TAB 2: Batch Replace Form */
            <form onSubmit={handleExecuteBatchReplace} className="space-y-4">
              
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-750 text-xs space-y-1.5">
                <div className="text-slate-200 font-semibold flex items-center gap-1.5 text-amber-300">
                  <FileText className="w-3.5 h-3.5" />
                  <span>فرمت ورود لیست اسامی و عبارات (تفکیک با دو نقطه :):</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  در هر خط، کلمه فعلی را نوشته و بعد از علامت دو نقطه (:) کلمه صحیح جایگزین را وارد فرمایید:
                </p>
                <div className="bg-slate-950 p-2.5 rounded-lg text-[11px] text-slate-300 font-mono space-y-1 border border-slate-800" dir="rtl">
                  <div>دالی:دولی</div>
                  <div>جان:جاناتان</div>
                  <div>آلیس:الیس</div>
                  <div>پروفسور براون:استاد براون:Professor Brown</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  لیست کلمات و اسامی جهت جایگزینی:
                </label>
                <textarea
                  rows={7}
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  placeholder={`دالی:دولی\nجان:جاناتان\nآلیس:الیس`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono leading-relaxed placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={batchWholeWord}
                    onChange={e => setBatchWholeWord(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span>تطبیق کلمه کامل برای تمام موارد لیست</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={batchAddToGlossary}
                    onChange={e => setBatchAddToGlossary(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-amber-300 font-medium">افزودن تمام موارد لیست به دانشنامه تخصصی کتاب (Glossary)</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400">
                  {parsedBatchItems.length > 0 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>{parsedBatchItems.length} جفت کلمه برای جایگزینی آماده است</span>
                    </span>
                  ) : (
                    <span>خطوط خالی یا نامعتبر نادیده گرفته می‌شوند.</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={parsedBatchItems.length === 0}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Replace className="w-4 h-4" />
                  <span>اجرای جایگزینی دسته‌جمعی ({parsedBatchItems.length} عبارت)</span>
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
