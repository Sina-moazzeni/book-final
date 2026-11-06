import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Image as ImageIcon,
  FileText,
  Upload,
  AlignLeft,
  Heading,
  Quote,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowDown,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { BookChunk } from '../types.ts';

export interface AddPagePayload {
  chapterTitle: string;
  englishText?: string;
  translatedHtml?: string;
  insertPosition: 'start' | 'end' | 'before' | 'after';
  targetChunkId?: string;
  imageUrl?: string;
  imageCaption?: string;
  imagePlacement?: 'top' | 'bottom' | 'standalone';
}

interface AddPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddPagePayload) => Promise<boolean | void>;
  chunks: BookChunk[];
  activeChunkId?: string | null;
  defaultPosition?: 'start' | 'end' | 'before' | 'after';
}

export const AddPageModal: React.FC<AddPageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  chunks = [],
  activeChunkId,
  defaultPosition = 'after',
}) => {
  const [title, setTitle] = useState('');
  const [insertPosition, setInsertPosition] = useState<'start' | 'end' | 'before' | 'after'>(
    activeChunkId ? defaultPosition : 'end'
  );
  const [targetChunkId, setTargetChunkId] = useState<string>(activeChunkId || chunks[0]?.id || '');
  const [persianText, setPersianText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [showEnglishInput, setShowEnglishInput] = useState(false);

  // Image attachment state
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imagePlacement, setImagePlacement] = useState<'top' | 'bottom' | 'standalone'>('top');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeChunkId) {
        setTargetChunkId(activeChunkId);
        setInsertPosition('after');
      } else {
        setInsertPosition('end');
      }
    }
  }, [isOpen, activeChunkId]);

  if (!isOpen) return null;

  const currentTargetChunk = chunks.find(c => c.id === targetChunkId);

  // Handle local image file upload & convert to Base64 Data URL
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری معتبر (JPG, PNG, WebP) انتخاب نمایید.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUrl(result);
      if (!imageCaption && file.name) {
        setImageCaption(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickInsert = (prefix: string, suffix: string = '') => {
    setPersianText(prev => prev ? `${prev}\n\n${prefix}${suffix}` : `${prefix}${suffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !persianText.trim() && !imageUrl.trim() && !englishText.trim()) {
      alert('لطفاً حداقل عنوان، متن یا تصویری برای صفحه جدید وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        chapterTitle: title.trim() || 'صفحه جدید',
        englishText: englishText.trim(),
        translatedHtml: persianText.trim(),
        insertPosition,
        targetChunkId: (insertPosition === 'before' || insertPosition === 'after') ? targetChunkId : undefined,
        imageUrl: imageUrl.trim() || undefined,
        imageCaption: imageCaption.trim() || undefined,
        imagePlacement,
      });
      // Reset form
      setTitle('');
      setPersianText('');
      setEnglishText('');
      setImageUrl('');
      setImageCaption('');
      onClose();
    } catch (err: any) {
      alert(`خطا در ایجاد صفحه: ${err?.message || 'نامشخص'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">افزودن صفحه یا بخش جدید به کتاب</h3>
              <p className="text-xs text-slate-400 mt-0.5">درج صفحه با متن دلخواه، تیتر، تصویر و جای‌گذاری در هر قسمت از کتاب</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          
          {/* Position Selector */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>محل قرارگیری صفحه جدید در کتاب:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInsertPosition('end')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  insertPosition === 'end'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                در پایان کتاب
              </button>

              <button
                type="button"
                onClick={() => setInsertPosition('after')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  insertPosition === 'after'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                بعد از صفحه جاری
              </button>

              <button
                type="button"
                onClick={() => setInsertPosition('before')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  insertPosition === 'before'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                قبل از صفحه جاری
              </button>

              <button
                type="button"
                onClick={() => setInsertPosition('start')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  insertPosition === 'start'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                در ابتدای کتاب
              </button>
            </div>

            {/* Target Chunk Picker (when 'before' or 'after' selected) */}
            {(insertPosition === 'before' || insertPosition === 'after') && chunks.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  انتخاب صفحه مبنا ({insertPosition === 'after' ? 'درج بعد از:' : 'درج قبل از:'}):
                </label>
                <select
                  value={targetChunkId}
                  onChange={(e) => setTargetChunkId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {chunks.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      بخش {idx + 1}: {c.chapterTitle || 'بدون عنوان'} ({c.wordCount || 0} کلمه)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              عنوان صفحه یا فصل:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مقدمه مترجم، یادداشت نویسنده، فصل اول: سرآغاز، فهرست تصاویر..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>

          {/* Persian Text Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-200">
                متن صفحه (فارسی / ترجمه شده):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickInsert('📜 «متن نقل‌قول یا سخن تاثیرگذار»')}
                  title="درج نقل‌قول"
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  نقل‌قول
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickInsert('💡 نکته کلیدی: [متن نکته مهم]')}
                  title="درج نکته"
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  نکته
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickInsert('---')}
                  title="جداکننده تزئینی"
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  جداکننده
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              value={persianText}
              onChange={(e) => setPersianText(e.target.value)}
              placeholder="متن محتوای این صفحه را در اینجا بنویسید یا الصاق کنید..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500 leading-relaxed font-sans"
            />
          </div>

          {/* Image Upload Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>افزودن تصویر / عکس به صفحه (اختیاری):</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => { setImageUrl(''); setImageCaption(''); }}
                  className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف تصویر</span>
                </button>
              )}
            </div>

            {!imageUrl ? (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 p-4 rounded-xl text-center cursor-pointer transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-white font-medium">
                      کلیک کنید تا عکس از رایانه یا گوشی انتخاب شود
                    </span>
                    <span className="text-[10px] text-slate-500">
                      پشتیبانی از JPG، PNG، SVG و WebP تا سقف ۱۰ مگابایت
                    </span>
                  </div>
                </div>

                {/* Or URL input */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="یا لینک اینترنتی تصویر را در اینجا وارد کنید (https://...)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Image Preview */}
                <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-48 bg-slate-950 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt={imageCaption || 'پیش‌نمایش تصویر'}
                    className="max-h-48 object-contain rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">زیرنویس یا توضیح تصویر:</label>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder="مثال: شکل ۱-۲: نمودار جریان کار"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">موقعیت تصویر در صفحه:</label>
                    <select
                      value={imagePlacement}
                      onChange={(e) => setImagePlacement(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="top">بالای متن صفحه</option>
                      <option value="bottom">پایین متن صفحه</option>
                      <option value="standalone">فقط تصویر (بدون متن)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional English Source Text Accordion */}
          <div className="border border-slate-800/80 rounded-2xl p-3 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowEnglishInput(!showEnglishInput)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition"
            >
              <span className="font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>متن مبدأ / انگلیسی صفحه (اختیاری)</span>
              </span>
              <span className="text-[11px] text-indigo-400">
                {showEnglishInput ? 'بستن کادر' : '+ افزودن متن انگلیسی جهت ترجمه هوشمند'}
              </span>
            </button>

            {showEnglishInput && (
              <div className="mt-3 pt-3 border-t border-slate-800/60">
                <textarea
                  rows={4}
                  value={englishText}
                  onChange={(e) => setEnglishText(e.target.value)}
                  dir="ltr"
                  placeholder="Original English text (optional)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-mono"
                />
              </div>
            )}
          </div>

        </form>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>در حال ایجاد صفحه...</span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>افزودن صفحه به کتاب</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
