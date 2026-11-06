import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Download,
  Upload,
  BookMarked,
  RotateCcw,
  Check,
  AlertCircle,
  ListPlus,
  FileText
} from 'lucide-react';
import { GlossaryItem, BookProject } from '../types.ts';
import { DEFAULT_GLOSSARIES } from '../constants/tones.ts';
import { resolveApiUrl } from '../utils/aiClient.ts';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  onUpdateGlossary: (glossary: GlossaryItem[]) => void;
  isAdmin?: boolean;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateGlossary,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [newEn, setNewEn] = useState('');
  const [newFa, setNewFa] = useState('');
  const [newNote, setNewNote] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<{ en: string; fa: string; note?: string }[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Helper to parse colon-separated bulk text (e.g. hi:سلام:برای احوال پرسی استفاده میشود)
  const parseBulkInput = (raw: string) => {
    if (!raw || !raw.trim()) return [];
    const lines = raw.split('\n');
    const parsed: { en: string; fa: string; note?: string }[] = [];
    for (const l of lines) {
      const line = l.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      let parts: string[] = [];
      if (line.includes(':')) {
        parts = line.split(':');
      } else if (line.includes('：')) {
        parts = line.split('：');
      } else if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',');
      }

      if (parts.length >= 2) {
        const en = parts[0].trim();
        const fa = parts[1].trim();
        const note = parts.slice(2).join(':').trim() || undefined;
        if (en && fa) {
          parsed.push({ en, fa, note });
        }
      }
    }
    return parsed;
  };

  const handleAddBulkTerms = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBulkInput(bulkText);
    if (parsed.length === 0) {
      alert('هیچ واژه معتبری در متن واردشده یافت نشد. لطفاً از فرمت «انگلیسی:فارسی:توضیحات» استفاده فرمایید.');
      return;
    }

    const currentList = Array.isArray(project.glossary) ? [...project.glossary] : [];
    let addedCount = 0;
    let updatedCount = 0;

    parsed.forEach(item => {
      const existingIndex = currentList.findIndex(x => x.en.toLowerCase() === item.en.toLowerCase());
      if (existingIndex !== -1) {
        currentList[existingIndex] = {
          ...currentList[existingIndex],
          fa: item.fa,
          note: item.note || currentList[existingIndex].note,
        };
        updatedCount++;
      } else {
        currentList.push({
          id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${addedCount}`,
          en: item.en,
          fa: item.fa,
          note: item.note,
        });
        addedCount++;
      }
    });

    onUpdateGlossary(currentList);
    setBulkText('');
    setStatusMessage(`با موفقیت ${addedCount} واژه جدید افزوده شد${updatedCount > 0 ? ` و ${updatedCount} واژه به‌روزرسانی گردید` : ''}.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  if (!isOpen) return null;

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEn.trim() || !newFa.trim()) return;

    const newItem: GlossaryItem = {
      id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      en: newEn.trim(),
      fa: newFa.trim(),
      note: newNote.trim() || undefined,
    };

    onUpdateGlossary([...project.glossary, newItem]);
    setNewEn('');
    setNewFa('');
    setNewNote('');
    setStatusMessage('واژه با موفقیت افزوده شد.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteTerm = (id: string) => {
    onUpdateGlossary(project.glossary.filter(item => item.id !== id));
  };

  const handleResetDefaults = () => {
    const defaultList = DEFAULT_GLOSSARIES[project.tone] || DEFAULT_GLOSSARIES.spiritual;
    if (confirm('آیا مایلید واژه‌نامه به اصطلاحات پیش‌فرض این لحن بازنشانی شود؟')) {
      onUpdateGlossary([...defaultList]);
      setStatusMessage('واژه‌نامه به حالت پیش‌فرض بازگردانی شد.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleAutoExtract = async () => {
    setIsExtracting(true);
    setStatusMessage(null);
    try {
      const safeChunks = Array.isArray(project.chunks) ? project.chunks : [];
      if (safeChunks.length === 0) {
        alert('متنی در این کتاب برای استخراج واژگان یافت نشد.');
        setIsExtracting(false);
        return;
      }

      const sampleText = safeChunks
        .slice(0, 3)
        .map(c => c.englishText || '')
        .join('\n\n')
        .slice(0, 3500);

      const res = await fetch(resolveApiUrl('/api/extract-glossary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleText,
          tone: project.tone,
        }),
      });

      if (!res.ok) throw new Error('خطا در استخراج خودکار واژگان');
      const data = await res.json();
      if (Array.isArray(data.glossary)) {
        setExtractedItems(data.glossary);
      }
    } catch (err: any) {
      alert(err.message || 'خطا در استخراج هوشمند واژگان');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddExtracted = (item: { en: string; fa: string; note?: string }) => {
    const safeGlossary = Array.isArray(project.glossary) ? project.glossary : [];
    const newItem: GlossaryItem = {
      id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      en: item.en,
      fa: item.fa,
      note: item.note,
    };
    onUpdateGlossary([...safeGlossary, newItem]);
    setExtractedItems(prev => prev.filter(x => x.en !== item.en));
    setStatusMessage(`واژه «${item.en}» در دانشنامه ذخیره شد.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleAddAllExtracted = () => {
    const safeGlossary = Array.isArray(project.glossary) ? project.glossary : [];
    const newItems: GlossaryItem[] = extractedItems.map(item => ({
      id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      en: item.en,
      fa: item.fa,
      note: item.note,
    }));
    onUpdateGlossary([...safeGlossary, ...newItems]);
    setExtractedItems([]);
    setStatusMessage('تمام واژگان پیشنهادی در دانشنامه ذخیره شدند.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const safeGlossary = Array.isArray(project.glossary) ? project.glossary : [];
  const filteredGlossary = safeGlossary.filter(
    item =>
      item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fa.includes(searchTerm) ||
      (item.note && item.note.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">دانشنامه و واژه‌نامه تخصصی کتاب</h2>
              <p className="text-xs text-slate-400">
                این اصطلاحات در تمام طول کتاب حفظ شده و با هر رفرش در دیتابیس محفوظ باقی می‌مانند.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Status Alert */}
          {statusMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Quick Actions & AI Extractor (Shown ONLY for Admins to avoid token drain) */}
          {isAdmin ? (
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>استخراج خودکار واژگان کلیدی از متن کتاب (ویژه مدیر)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  آنالیز متن انگلیسی برای استخراج اصطلاحات تخصصی کتاب (مصرف بالای توکن هوش مصنوعی).
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={handleAutoExtract}
                  disabled={isExtracting}
                  className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-1.5"
                >
                  {isExtracting ? (
                    <>در حال آنالیز متن...</>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>آنالیز و استخراج</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleResetDefaults}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition flex items-center gap-1.5"
                  title="بارگذاری کلمات پیش‌فرض لحن"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>پیش‌فرض</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
              <span className="text-xs text-slate-300">
                واژگان تخصصی دانشنامه برای حفظ یکپارچگی ترجمه در دیتابیس پایدار ذخیره می‌شوند.
              </span>
              <button
                onClick={handleResetDefaults}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                title="بارگذاری کلمات پیشنهادی لحن"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>بارگذاری واژگان پیشنهادی لحن</span>
              </button>
            </div>
          )}

          {/* Extracted Suggestions List (if any) */}
          {extractedItems.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  واژگان پیشنهادی هوش مصنوعی ({extractedItems.length} مورد):
                </span>
                <button
                  onClick={handleAddAllExtracted}
                  className="text-xs text-amber-300 hover:text-white underline font-medium"
                >
                  افزودن همه به واژه‌نامه
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {extractedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/80 p-2.5 rounded-lg border border-amber-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-amber-200 font-semibold">{item.en}</span>
                      <span className="mx-2 text-slate-500">←</span>
                      <span className="font-medium text-white">{item.fa}</span>
                      {item.note && <div className="text-[10px] text-slate-400 mt-0.5">{item.note}</div>}
                    </div>
                    <button
                      onClick={() => handleAddExtracted(item)}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-slate-950 font-bold transition text-[11px]"
                    >
                      افزودن
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Term Form (Single or Bulk) */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3">
            {/* Mode Selector Tabs */}
            <div className="flex items-center justify-between border-b border-slate-750 pb-2.5">
              <div className="text-xs font-bold text-slate-300">افزودن واژگان به دانشنامه:</div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-750 text-xs">
                <button
                  type="button"
                  onClick={() => setEntryMode('single')}
                  className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                    entryMode === 'single'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>ورود تکی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('bulk')}
                  className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                    entryMode === 'bulk'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListPlus className="w-3 h-3" />
                  <span>ورود دسته‌جمعی (لیست با :)</span>
                </button>
              </div>
            </div>

            {entryMode === 'single' ? (
              <form onSubmit={handleAddTerm} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کلمه انگلیسی (English Term):</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newEn}
                      onChange={e => setNewEn(e.target.value)}
                      placeholder="e.g. Awareness"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ترجمه دقیق فارسی:</label>
                    <input
                      type="text"
                      value={newFa}
                      onChange={e => setNewFa(e.target.value)}
                      placeholder="مثلاً: آگاهی ناب"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">توضیح یا یادداشت برای هوش مصنوعی (اختیاری):</label>
                    <input
                      type="text"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="مثلاً: فقط در زمینه خودشناسی"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت واژه در فرهنگ لغت</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddBulkTerms} className="space-y-3">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750 text-xs space-y-1.5">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5 text-amber-300">
                    <FileText className="w-3.5 h-3.5" />
                    <span>فرمت ورود دسته‌جمعی واژگان (تفکیک با دو نقطه :):</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    در هر خط یک اصطلاح را به فرمت <strong className="text-white font-mono" dir="ltr">انگلیسی:فارسی:توضیحات</strong> وارد نمایید (بخش توضیحات اختیاری است).
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg text-[11px] text-slate-300 font-mono space-y-1 border border-slate-800" dir="ltr">
                    <div>hi:سلام:برای احوال پرسی استفاده میشود</div>
                    <div>awareness:آگاهی ناب:در زمینه فلسفه ذهن</div>
                    <div>soul:روح</div>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={`hi:سلام:برای احوال پرسی استفاده میشود\nawareness:آگاهی:در زمینه فلسفه ذهن\nsoul:روح\nmind:ذهن`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono leading-relaxed placeholder:text-slate-600"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-400 w-full sm:w-auto text-right">
                    {bulkText.trim() ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>{parseBulkInput(bulkText).length} واژه معتبر در متن شناسایی شد</span>
                      </span>
                    ) : (
                      <span>می‌توانید لیست کلمات خود را از اکسل یا فایل متنی کپی و اینجا پیست کنید.</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={parseBulkInput(bulkText).length === 0}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>افزودن دسته‌جمعی به دانشنامه ({parseBulkInput(bulkText).length} واژه)</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Search & Terms Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="جستجو در واژگان..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <span className="text-xs text-slate-400">
                مجموع: <strong className="text-white font-mono">{project.glossary.length}</strong> واژه
              </span>
            </div>

            {/* Table */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-4 font-semibold">واژه لاتین (Source)</th>
                    <th className="py-2.5 px-4 font-semibold">ترجمه فارسی مصوب (Target)</th>
                    <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">توضیحات و زمینه کاربرد</th>
                    <th className="py-2.5 px-4 text-center font-semibold w-16">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredGlossary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                        هیچ واژه‌ای یافت نشد. می‌توانید با فرم بالا واژه جدید اضافه کنید یا دکمه «پیش‌فرض» را بزنید.
                      </td>
                    </tr>
                  ) : (
                    filteredGlossary.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/60 transition group">
                        <td className="py-2.5 px-4 font-mono font-medium text-blue-300" dir="ltr">
                          {item.en}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-400">
                          {item.fa}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 hidden sm:table-cell text-[11px]">
                          {item.note || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteTerm(item.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="حذف واژه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition"
          >
            بستن و ذخیره
          </button>
        </div>

      </div>
    </div>
  );
};
