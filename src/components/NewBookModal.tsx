import React, { useState } from 'react';
import {
  X,
  Upload,
  BookOpen,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Calculator,
  ShieldCheck,
  Cpu,
  Image as ImageIcon,
  FileCode,
  CheckCircle2,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { BookProject, ToneId, BookChunk } from '../types.ts';
import { TONE_DEFINITIONS, DEFAULT_GLOSSARIES } from '../constants/tones.ts';
import { chunkBookText } from '../utils/chunker.ts';
import { resolveApiUrl } from '../utils/aiClient.ts';
import { parseEpubFile } from '../utils/epubParser.ts';
import { cleanChapterTitle } from '../utils/exporter.ts';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../constants/languages.ts';

interface NewBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: BookProject, startCloudTranslation?: boolean) => void;
  defaultModel: string;
  walletBalance?: number;
  costPerWord?: number;
  tierLabel?: string;
  discountPercent?: number;
  onOpenWallet?: () => void;
}

export const NewBookModal: React.FC<NewBookModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  defaultModel,
  walletBalance = 0,
  costPerWord = 45,
  tierLabel,
  discountPercent,
  onOpenWallet,
}) => {
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fa');
  const [tone, setTone] = useState<ToneId>('spiritual');
  const [model, setModel] = useState(defaultModel || 'gemini-3.5-flash-lite');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [maxWordsPerChunk, setMaxWordsPerChunk] = useState(700);

  // Advanced file import state for DOCX and PDF
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [preChunkedData, setPreChunkedData] = useState<BookChunk[] | null>(null);
  const [extractedImagesCount, setExtractedImagesCount] = useState<number>(0);
  const [detectedFileType, setDetectedFileType] = useState<'txt' | 'docx' | 'pdf' | 'epub' | 'json'>('txt');
  const [scannedPdfError, setScannedPdfError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Live calculation
  const wordsCount = preChunkedData
    ? preChunkedData.reduce((acc, c) => acc + c.wordCount, 0)
    : rawText.replace(/<img[^>]*>/gi, '').split(/\s+/).filter(Boolean).length;

  const estimatedInputTokens = Math.ceil(wordsCount * 1.35);
  const estimatedOutputTokens = Math.ceil(wordsCount * 1.65);
  const totalTokens = estimatedInputTokens + estimatedOutputTokens;
  const estimatedChunks = preChunkedData
    ? preChunkedData.length
    : Math.max(1, Math.ceil(wordsCount / maxWordsPerChunk));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreChunkedData(null);
    setExtractedImagesCount(0);

    // 1. JSON Project Backup
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.chunks && Array.isArray(parsed.chunks)) {
            onCreateProject(parsed);
            onClose();
          } else {
            alert('فرمت فایل پشتیبان JSON معتبر نیست.');
          }
        } catch (err) {
          alert('خطا در خواندن فایل JSON');
        }
      };
      reader.readAsText(file);
      return;
    }

    // 2. EPUB Book (.epub)
    if (file.name.toLowerCase().endsWith('.epub')) {
      setDetectedFileType('epub');
      setIsProcessingFile(true);
      setProcessingStatus('در حال استخراج فصول، متن و تصاویر از کتاب الکترونیکی EPUB...');

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const parsed = await parseEpubFile(arrayBuffer, file.name, maxWordsPerChunk);

          setPreChunkedData(parsed.chunks);
          setExtractedImagesCount(parsed.totalImagesCount || 0);

          if (parsed.title && !title) setTitle(parsed.title);
          if (parsed.originalTitle && !originalTitle) setOriginalTitle(parsed.originalTitle);
          if (parsed.author && parsed.author !== 'نامشخص' && !author) setAuthor(parsed.author);

          // Build a readable preview without artificial chunk numbers
          const combinedPreview = parsed.chunks
            .map(
              (c: any) =>
                `### ${cleanChapterTitle(c.chapterTitle)}\n\n${c.englishText
                  .replace(/<img[^>]*>/gi, '[🖼️ تصویر کتاب]')
                  .replace(/<[^>]+>/g, ' ')
                  .trim()}`
            )
            .join('\n\n-----------------------------------------\n\n');

          setRawText(combinedPreview);
        } catch (err: any) {
          console.error('EPUB Import error:', err);
          alert(`خطا در پردازش فایل EPUB: ${err.message}`);
        } finally {
          setIsProcessingFile(false);
          setProcessingStatus(null);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // 3. Word (.docx) or PDF (.pdf) with full text and image extraction
    if (file.name.endsWith('.docx') || file.name.endsWith('.pdf')) {
      const type = file.name.endsWith('.docx') ? 'docx' : 'pdf';
      setDetectedFileType(type);
      setIsProcessingFile(true);
      setProcessingStatus(
        type === 'docx'
          ? 'در حال استخراج متن، ساختار فصل‌ها و تصاویر از سند Word...'
          : 'در حال استخراج صفحات، متن و تصاویر از سند PDF...'
      );

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          const base64Data = dataUrl.split(',')[1];

          const res = await fetch(resolveApiUrl('/api/import/file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data,
              fileType: type,
              maxWordsPerChunk,
            }),
          });

          let data: any;
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            data = await res.json();
          } else {
            const rawHtml = await res.text();
            if (res.status === 413 || rawHtml.includes('413 Request Entity Too Large')) {
              throw new Error('حجم فایل ارسالی بیشتر از حد مجاز سرور Nginx است (خطای 413). لطفاً عبارت «client_max_body_size 100M;» را در کانفیگ Nginx سرور اوبونتو قرار دهید.');
            }
            if (res.status === 502 || res.status === 504) {
              throw new Error(`خطای وب‌سرور (${res.status}): پردازش فایل PDF طول کشید یا وب‌سرور قطع شد. مقادیر proxy_read_timeout و proxy_send_timeout را در Nginx افزایش دهید.`);
            }
            throw new Error(`پاسخ وب‌سرور (${res.status}): ${rawHtml.slice(0, 100)}`);
          }

          if (!res.ok || !data.success) {
            if (data.isScannedPdf) {
              setScannedPdfError(data.error);
              setFileName(null);
              setRawText('');
              setPreChunkedData(null);
              return;
            }
            throw new Error(data.error || 'خطا در پردازش فایل');
          }

          setScannedPdfError(null);
          setPreChunkedData(data.chunks);
          setExtractedImagesCount(data.totalImagesCount || 0);

          if (data.title && !title) setTitle(data.title);
          if (data.originalTitle && !originalTitle) setOriginalTitle(data.originalTitle);
          if (data.author && data.author !== 'نامشخص' && !author) setAuthor(data.author);

          // Build a readable preview for the textarea without artificial (بخش X)
          const combinedPreview = data.chunks
            .map(
              (c: any) =>
                `### ${cleanChapterTitle(c.chapterTitle)}\n\n${c.englishText
                  .replace(/<img[^>]*>/gi, '[🖼️ تصویر کتاب]')
                  .replace(/<[^>]+>/g, ' ')
                  .trim()}`
            )
            .join('\n\n-----------------------------------------\n\n');

          setRawText(combinedPreview);
        } catch (err: any) {
          console.error('Import error:', err);
          alert(`خطا در خواندن فایل: ${err.message}`);
        } finally {
          setIsProcessingFile(false);
          setProcessingStatus(null);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. Plain Text (.txt / .md)
    setDetectedFileType('txt');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      if (!originalTitle) {
        setOriginalTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const toneMultiplier = (tone === 'academic' || tone === 'aerospace' || tone === 'mathematics') ? 1.25 : 1.0;
  const rawUnitCost = Math.round(costPerWord * toneMultiplier);
  const discount = discountPercent ? Math.min(100, Math.max(0, discountPercent)) : 0;
  const unitCost = discount > 0 ? Math.round(rawUnitCost * (1 - discount / 100)) : rawUnitCost;
  const totalTranslationCost = Math.round(wordsCount * unitCost);
  const hasEnoughBalance = walletBalance >= totalTranslationCost;

  const handleExecute = (startCloud: boolean) => {
    if (!preChunkedData && !rawText.trim()) {
      alert('لطفاً یک فایل (Word، PDF یا Text) انتخاب کنید یا متن کتاب را در کادر وارد نمایید.');
      return;
    }

    if (!hasEnoughBalance && totalTranslationCost > 0) {
      alert(`موجودی کیف پول شما برای این کتاب کافی نیست. مبلغ کسری: ${(totalTranslationCost - walletBalance).toLocaleString('en-US')} تومان است. لطفاً ابتدا کیف پول خود را شارژ نمایید تا بتوانید وارد ویرایشگر شوید.`);
      if (onOpenWallet) onOpenWallet();
      return;
    }

    // If file was pre-chunked with embedded images, use those chunks directly!
    const chunks = preChunkedData && preChunkedData.length > 0
      ? preChunkedData
      : chunkBookText(rawText, { maxWordsPerChunk });

    const defaultGlossary = DEFAULT_GLOSSARIES[tone] || DEFAULT_GLOSSARIES.spiritual;

    const newProject: BookProject = {
      id: `proj_${Date.now()}`,
      title: title.trim() || originalTitle.trim() || 'کتاب جدید',
      originalTitle: originalTitle.trim() || 'Untitled Book',
      author: author.trim() || 'نامشخص',
      translator: translator.trim() || 'سامانه هوشمند ترجمه کتاب',
      tone,
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage: targetLanguage || 'fa',
      providerId: 'prov_gemini',
      model,
      glossary: [...defaultGlossary],
      chunks,
      sourceFileType: detectedFileType,
      totalImagesCount: extractedImagesCount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreateProject(newProject, startCloud);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecute(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>آپلود کتاب انگلیسی و استخراج خودکار متن و تصاویر</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  پشتیبانی از Word و PDF
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                پشتیبانی از فایل‌های Word (.docx)، PDF (.pdf) و Text با استخراج خودکار تصاویر، قطعه‌بندی و حفظ موقعیت تصاویر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Scanned PDF Critical Alert Banner (shown when a scanned/image PDF is uploaded) */}
          {scannedPdfError && (
            <div className="bg-rose-500/15 border-2 border-rose-500/50 p-4 rounded-2xl flex items-start justify-between gap-3 text-xs text-rose-200 animate-in fade-in shadow-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <strong className="text-rose-300 font-bold block text-sm">
                    🚫 خطا: فایل ارسالی یک PDF اسکن‌شده (عکس از صفحات کتاب) است!
                  </strong>
                  <p className="leading-relaxed text-[11px] text-slate-200">
                    {scannedPdfError}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/30 font-medium">
                      راهکار: فایل Word (.docx) یا نسخه PDF متنی کتاب را آپلود نمایید.
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedPdfError(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 shrink-0 transition"
                title="بستن اخطار"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Permanent Guidance for Text PDF vs Scanned PDF */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/20 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-amber-300 text-xs flex flex-wrap items-center gap-2">
                <span>توجه الزامی: لطفاً فقط فایل PDF متنی (تایپ‌شده دیجیتال) ارسال فرمایید</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-semibold">
                  نه اسکن تصویری
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                کتاب‌هایی که به‌صورت <strong>اسکن تصویری</strong> (عکس از صفحات کتاب کاغذی) هستند، فاقد لایه متن دیجیتال بوده و موتور ترجمه نمی‌تواند متون را شناسایی کند و استخراج متن در آن‌ها ناقص یا ناممکن خواهد بود. لطفاً از <strong>PDF متنی استاندارد، فایل Word (.docx) یا EPUB</strong> استفاده نمایید.
              </p>
              <div className="text-[10px] text-emerald-300/90 font-mono pt-0.5">
                💡 نحوه تشخیص سریع: با ماوس روی کلمات کتاب بکشید؛ اگر متن آبی شد و توانستید آن را کپی کنید، متنی است و ترجمه بی‌نقص انجام خواهد شد!
              </div>
            </div>
          </div>

          {/* File Upload Box supporting DOCX, PDF, TXT, JSON */}
          <div className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-slate-950/60 p-5 rounded-2xl text-center transition group">
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 group-hover:bg-indigo-600/30 text-indigo-400 flex items-center justify-center transition">
                {isProcessingFile ? (
                  <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              <div>
                <span className="text-sm font-bold text-white block">
                  {isProcessingFile
                    ? processingStatus
                    : fileName
                    ? `فایل انتخاب شده: ${fileName}`
                    : 'کلیک کنید یا فایل کتاب را اینجا رها کنید (EPUB، Word، PDF یا Text)'}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                    کتاب استاندارد (.epub)
                  </span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                    سند ورد (.docx)
                  </span>
                  <span className="text-[10px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 font-semibold">
                    کتاب الکترونیک (.pdf متنی)
                  </span>
                  <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600 font-semibold">
                    متن ساده (.txt)
                  </span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                    پشتیبان کامل (.json)
                  </span>
                </div>
              </div>

              <input
                type="file"
                accept=".docx,.pdf,.epub,.txt,.md,.json,application/epub+zip"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Success Banner when DOCX / PDF with Images is Processed */}
          {preChunkedData && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block text-white">
                    فایل با موفقیت خوانده و به {preChunkedData.length} بخش قطعه‌بندی شد
                  </span>
                  <span className="text-[11px] opacity-80">
                    تمام متن اصلی، پاراگراف‌ها و سرفصل‌ها شناسایی شدند.
                  </span>
                </div>
              </div>

              {extractedImagesCount > 0 ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-xl text-emerald-200 font-bold border border-emerald-500/30">
                  <ImageIcon className="w-4 h-4 text-emerald-300" />
                  <span>تعداد {extractedImagesCount} تصویر استخراج شد و در صفحات قرار گرفت</span>
                </div>
              ) : (
                <span className="text-[11px] opacity-70">فاقد تصویر جاسازی‌شده</span>
              )}
            </div>
          )}

          {/* Prominent High-Visibility Book Translation Cost Card */}
          {wordsCount > 0 && (
            <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-indigo-950/40 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-amber-500/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>هزینه رسمی ترجمه این کتاب</span>
                  </div>
                  <div className="text-slate-300 text-xs">
                    محاسبه شده بر اساس نرخ مصوب سیستم • پرداخت قطعی به ازای کل متن
                  </div>
                </div>

                <div className="text-left sm:text-left bg-slate-950/90 px-5 py-3 rounded-2xl border border-amber-500/40">
                  <div className="text-[11px] text-amber-300/90 font-medium mb-0.5">مبلغ کل قابل پرداخت:</div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-tight flex items-baseline justify-end gap-1.5">
                    <span>{totalTranslationCost.toLocaleString('en-US')}</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-200">تومان</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">تعداد کلمات کتاب:</span>
                  <strong className="text-white font-mono text-base">{wordsCount.toLocaleString('en-US')}</strong>
                  <span className="text-[10px] text-slate-500 block">کلمه انگلیسی</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">تعرفه هر کلمه:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <strong className="text-amber-400 font-mono text-base">{unitCost.toLocaleString('en-US')}</strong>
                    <span className="text-[10px] text-slate-500">تومان</span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 block mt-0.5 truncate">
                    {tierLabel || 'نرخ رسمی سیستم'}
                    {discount > 0 && <span className="mr-1 text-emerald-400 font-bold">({discount}٪ تخفیف)</span>}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">بخش‌های ترجمه (چانک):</span>
                  <strong className="text-indigo-300 font-mono text-base">{estimatedChunks} بخش</strong>
                  <span className="text-[10px] text-slate-500 block">پردازش خودکار</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">موجودی کیف پول شما:</span>
                  <strong className={`font-mono text-base ${hasEnoughBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {walletBalance.toLocaleString('en-US')}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">تومان</span>
                </div>
              </div>

              {/* Wallet Status Banner */}
              {hasEnoughBalance ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>موجودی کیف پول شما برای ترجمه کامل این کتاب کافی است.</span>
                </div>
              ) : (
                <div className="bg-rose-500/15 border border-rose-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <strong className="text-rose-300 font-bold block">موجودی کیف پول شما کافی نیست</strong>
                      <span>کسری موجودی برای ترجمه این کتاب: <strong className="text-white font-mono">{(totalTranslationCost - walletBalance).toLocaleString('en-US')} تومان</strong></span>
                    </div>
                  </div>
                  {onOpenWallet && (
                    <button
                      type="button"
                      onClick={onOpenWallet}
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shrink-0 shadow"
                    >
                      افزایش فوری موجودی
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                عنوان فارسی کتاب:
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثلاً: عادت‌های اتمی یا نیروی حال"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                عنوان اصلی انگلیسی:
              </label>
              <input
                type="text"
                dir="ltr"
                value={originalTitle}
                onChange={e => setOriginalTitle(e.target.value)}
                placeholder="e.g. The Power of Now"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                نام نویسنده:
              </label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="مثلاً: Eckhart Tolle"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                نام مترجم / تیم ترجمه:
              </label>
              <input
                type="text"
                value={translator}
                onChange={e => setTranslator(e.target.value)}
                placeholder="نام شما یا سامانه ترجمه"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Language Selection Row (English to Persian is Default and Reference) */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>🌐 جهت ترجمه کتاب:</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  مرجع و دیفالت: انگلیسی به فارسی
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const prevSrc = sourceLanguage === 'auto' ? 'en' : sourceLanguage;
                  const prevTgt = targetLanguage;
                  setSourceLanguage(prevTgt);
                  setTargetLanguage(prevSrc);
                }}
                title="جابجایی زبان مبدأ و مقصد"
                className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
              >
                <span>⇄ جابجایی زبان‌ها</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  زبان مبدأ (متن کتاب):
                </label>
                <select
                  value={sourceLanguage}
                  onChange={e => setSourceLanguage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {SOURCE_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} {lang.isDefault ? ' (پیش‌فرض)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  زبان مقصد (ترجمه نهایی):
                </label>
                <select
                  value={targetLanguage}
                  onChange={e => setTargetLanguage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {TARGET_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} {lang.isDefault ? ' (پیش‌فرض)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tone Selection Row */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                لحن و زمینه کتاب:
              </label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value as ToneId)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {TONE_DEFINITIONS.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Textarea preview / fallback */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                پیش‌نمایش محتوای کتاب:
              </label>
              {extractedImagesCount > 0 && (
                <span className="text-[10px] text-amber-300 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-amber-400" />
                  <span>تصاویر کتاب استخراج شده و در چانک‌ها درج شده‌اند</span>
                </span>
              )}
            </div>
            <textarea
              dir="ltr"
              value={rawText}
              onChange={e => {
                setRawText(e.target.value);
                setPreChunkedData(null);
              }}
              placeholder="متن انگلیسی کتاب را اینجا بچسبانید یا فایل Word (.docx)، PDF (.pdf) یا Text (.txt) را از بالا آپلود کنید..."
              rows={5}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              required={!preChunkedData}
            />
          </div>

          {/* Guarantees Box */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                قوانین فعال: <strong>حفظ کامل موقعیت تصاویر</strong> • <strong>بدون خلاصه‌سازی (Verbatim)</strong> و <strong>بدون سانسور</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">۱۰۰٪ تضمین ترجمه کامل کتاب</span>
          </div>

          {/* Pricing & Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300 w-full sm:w-auto">
              هزینه کل ترجمه: <span className="text-amber-400 font-black text-base sm:text-lg font-mono mx-1">{totalTranslationCost.toLocaleString('en-US')} تومان</span>
              <span className="text-slate-400 mr-2 font-mono">({wordsCount.toLocaleString('en-US')} کلمه • نرخ کلمه‌ای: {unitCost} ت)</span>
              {!hasEnoughBalance && totalTranslationCost > 0 && (
                <span className="text-rose-400 font-bold block sm:inline sm:mr-2">
                  (کسری کیف پول: {(totalTranslationCost - walletBalance).toLocaleString('en-US')} تومان)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
              >
                انصراف
              </button>
              {!hasEnoughBalance && totalTranslationCost > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleExecute(false)}
                    disabled={isProcessingFile}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5"
                    title="ایجاد پروژه به عنوان پیش‌نویس جهت تست و بررسی کیفیت"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>ثبت پیش‌نویس (تست رایگان)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenWallet) onOpenWallet();
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>شارژ کیف پول (کسری: {(totalTranslationCost - walletBalance).toLocaleString('en-US')} ت)</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExecute(false)}
                  disabled={isProcessingFile}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ایجاد کتاب و ورود به ویرایشگر</span>
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
