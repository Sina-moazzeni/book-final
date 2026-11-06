import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCw,
  Copy,
  Check,
  Edit3,
  Eye,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Search,
  ExternalLink,
  Split,
  Maximize2,
  Server,
  Zap,
  Image as ImageIcon,
  Trash2,
  FileText,
  Code2,
  Save,
  Layers,
  Heading,
  Quote,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Palette,
  Sun,
  Moon,
  Type,
  Replace,
  EyeOff,
  ChevronDown,
  Plus
} from 'lucide-react';
import { BookChunk, BookProject, APIServerEndpoint } from '../types.ts';
import { cleanChapterTitle, groupChunksIntoChapters, htmlToPlainText, plainTextToHtml, formatToDistinctParagraphs } from '../utils/exporter.ts';

interface TranslationWorkspaceProps {
  currentChunk: BookChunk | null;
  project: BookProject;
  onUpdateChunkHtml: (chunkId: string, newHtml: string) => void;
  onUpdateChunkEnglish?: (chunkId: string, newEnglish: string) => void;
  onUpdateChunkTitle?: (chunkId: string, newTitle: string) => void;
  onDeleteChunk?: (chunkId: string) => void;
  onToggleExcludeChunk?: (chunkId: string) => void;
  onTranslateCurrentChunk: () => void;
  onStartBatchTranslate: () => void;
  onStopBatchTranslate: () => void;
  isBatchTranslating: boolean;
  isStoppingBatch?: boolean;
  batchProgress: { current: number; total: number; secondsToNextCall: number };
  onStartCloudTranslation?: () => void;
  onStopCloudTranslation?: () => void;
  isCloudTranslating?: boolean;
  onSelectPrevChunk: () => void;
  onSelectNextChunk: () => void;
  hasPrevChunk: boolean;
  hasNextChunk: boolean;
  onUpdateModel?: (model: string) => void;
  serverPool?: APIServerEndpoint[];
  onOpenServerPoolModal?: () => void;
  isAdmin?: boolean;
  onOpenMobileChunks?: () => void;
  onOpenFindReplaceModal?: () => void;
  onOpenAddPageModal?: (targetChunkId?: string, defaultPosition?: 'after' | 'before' | 'start' | 'end') => void;
  isLoadingChunks?: boolean;
  onRetryFailedChunks?: () => void;
  onBackToDashboard?: () => void;
}

export const TranslationWorkspace: React.FC<TranslationWorkspaceProps> = ({
  currentChunk,
  project,
  onUpdateChunkHtml,
  onUpdateChunkEnglish,
  onUpdateChunkTitle,
  onDeleteChunk,
  onToggleExcludeChunk,
  onTranslateCurrentChunk,
  onStartBatchTranslate,
  onStopBatchTranslate,
  isBatchTranslating,
  isStoppingBatch = false,
  batchProgress,
  onStartCloudTranslation,
  onStopCloudTranslation,
  isCloudTranslating,
  onSelectPrevChunk,
  onSelectNextChunk,
  hasPrevChunk,
  hasNextChunk,
  onUpdateModel,
  serverPool,
  onOpenServerPoolModal,
  isAdmin = false,
  onOpenMobileChunks,
  onOpenFindReplaceModal,
  onOpenAddPageModal,
  isLoadingChunks = false,
  onRetryFailedChunks,
  onBackToDashboard,
}) => {
  // View Modes: 'preview' (Rendered Book Page), 'plain' (Simple Plain Text Manual Editor), 'html' (Raw HTML Code)
  const [viewMode, setViewMode] = useState<'preview' | 'plain' | 'html'>('preview');
  
  // Mobile Column Switcher: 'target' (Persian Translation), 'source' (English Text), 'both' (Split view)
  const [mobileColumnView, setMobileColumnView] = useState<'target' | 'source' | 'both'>('target');

  // Plain Text Editor state synced with current chunk
  const [plainTextValue, setPlainTextValue] = useState<string>('');
  const [isSavedToast, setIsSavedToast] = useState(false);

  const [copiedEn, setCopiedEn] = useState(false);
  const [copiedFa, setCopiedFa] = useState(false);
  const [fullBookMode, setFullBookMode] = useState(false);

  // Reading Comfort Suite (Sepia, Slate, Midnight, Paper + Font Size & Line Height)
  const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'slate' | 'midnight'>('paper');
  const [readerFontSize, setReaderFontSize] = useState<number>(15);
  const [readerLineHeight, setReaderLineHeight] = useState<number>(2.2);
  const [showReaderSettings, setShowReaderSettings] = useState<boolean>(false);

  const getThemeStyles = () => {
    switch (readerTheme) {
      case 'sepia':
        return {
          bg: '#fdf6e2',
          text: '#433422',
          border: '#e6dcbf',
          h1: '#7c4a03',
          h2: '#935805',
          h3: '#ab6606',
        };
      case 'slate':
        return {
          bg: '#0f172a',
          text: '#e2e8f0',
          border: '#334155',
          h1: '#fbbf24',
          h2: '#38bdf8',
          h3: '#818cf8',
        };
      case 'midnight':
        return {
          bg: '#000000',
          text: '#cbd5e1',
          border: '#27272a',
          h1: '#f59e0b',
          h2: '#60a5fa',
          h3: '#a78bfa',
        };
      case 'paper':
      default:
        return {
          bg: '#ffffff',
          text: '#1e293b',
          border: '#e2e8f0',
          h1: '#1a365d',
          h2: '#2b6cb0',
          h3: '#3182ce',
        };
    }
  };

  // Sync plain text state when current chunk changes or when translatedHtml updates
  useEffect(() => {
    if (currentChunk?.translatedHtml) {
      setPlainTextValue(htmlToPlainText(currentChunk.translatedHtml));
    } else {
      setPlainTextValue('');
    }
  }, [currentChunk?.id, currentChunk?.translatedHtml]);

  if (isLoadingChunks) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-950">
        <RotateCw className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
        <h3 className="text-base font-bold text-white">در حال بارگذاری متن و فصول کتاب...</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          محتوای فصل‌ها و تصاویر در حال دریافت از سرور است. لطفاً چند لحظه شکیبا باشید.
        </p>
      </div>
    );
  }

  if (!currentChunk && !fullBookMode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-950">
        <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-slate-300">بخشی برای نمایش انتخاب نشده است</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          از فهرست کناری یک بخش را انتخاب کنید یا از دکمه «کتاب‌های نمونه» برای شروع استفاده نمایید.
        </p>
        {onOpenMobileChunks && (
          <button
            onClick={onOpenMobileChunks}
            className="md:hidden px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Layers className="w-4 h-4" />
            <span>مشاهده فهرست بخش‌های کتاب</span>
          </button>
        )}
      </div>
    );
  }

  const handleCopyEnglish = () => {
    if (currentChunk) {
      navigator.clipboard.writeText(currentChunk.englishText);
      setCopiedEn(true);
      setTimeout(() => setCopiedEn(false), 2000);
    }
  };

  const handleCopyPersian = () => {
    if (currentChunk?.translatedHtml) {
      const textToCopy = viewMode === 'plain' ? plainTextValue : currentChunk.translatedHtml;
      navigator.clipboard.writeText(textToCopy);
      setCopiedFa(true);
      setTimeout(() => setCopiedFa(false), 2000);
    }
  };

  // Save changes from Plain Text Editor back to Chunk HTML
  const handleSavePlainText = () => {
    if (!currentChunk) return;
    const newHtml = plainTextToHtml(plainTextValue, currentChunk.translatedHtml);
    onUpdateChunkHtml(currentChunk.id, newHtml);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handlePlainTextChange = (text: string) => {
    setPlainTextValue(text);
    if (currentChunk) {
      const newHtml = plainTextToHtml(text, currentChunk.translatedHtml);
      onUpdateChunkHtml(currentChunk.id, newHtml);
    }
  };

  // Quick insertion helpers for plain text manual editor
  const handleInsertHeading = () => {
    setPlainTextValue(prev => `# ${prev}`);
  };

  const handleInsertQuote = () => {
    setPlainTextValue(prev => `> ${prev}`);
  };

  const [showElementsMenu, setShowElementsMenu] = useState(false);

  const handleInsertElement = (type: 'tip' | 'quote' | 'warning' | 'question' | 'fleuron' | 'footnote') => {
    setShowElementsMenu(false);
    switch (type) {
      case 'tip':
        setPlainTextValue(prev => `${prev}\n\n💡 نکته کلیدی: [مهم‌ترین نتیجه‌گیری یا پیام اصلی این بخش را در اینجا بنویسید]\n\n`);
        break;
      case 'quote':
        setPlainTextValue(prev => `${prev}\n\n📜 نقل‌قول: «متن سخن بزرگان یا نقل‌قول تاثیرگذار نویسنده در اینجا قرار می‌گیرد.»\n\n`);
        break;
      case 'warning':
        setPlainTextValue(prev => `${prev}\n\n⚠️ توجه مهم: [هشدار مفهومی حساس یا تذکر مهم برای خواننده]\n\n`);
        break;
      case 'question':
        setPlainTextValue(prev => `${prev}\n\n❓ پرسش برای تامل: [پرسشی که خواننده را به تفکر عمیق‌تر وا می‌دارد]\n\n`);
        break;
      case 'fleuron':
        setPlainTextValue(prev => `${prev}\n\n✤ ───── ❦ ───── ✤\n\n`);
        break;
      case 'footnote':
        setPlainTextValue(prev => `${prev}\n\n[پانویس: توضیح تخصصی اصطلاح یا ارجاع به منبع توسط مترجم]\n\n`);
        break;
    }
  };

  const handleAutoParagraphFormat = () => {
    if (!currentChunk?.translatedHtml) return;
    const formatted = formatToDistinctParagraphs(currentChunk.translatedHtml);
    onUpdateChunkHtml(currentChunk.id, formatted);
    setPlainTextValue(htmlToPlainText(formatted));
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const customColors = project.designConfig?.customColors || {};
  const paragraphSpacing = project.designConfig?.paragraphSpacing || 'normal';
  const paragraphSpacingClass = `p-spacing-${paragraphSpacing}`;

  const plainWordCount = plainTextValue.trim().split(/\s+/).filter(Boolean).length;

  return (
    <main className="flex-1 flex flex-col h-full md:h-[calc(100vh-8rem)] overflow-hidden bg-slate-950">
      
      {/* 1. Graceful Stop Notice Banner */}
      {isBatchTranslating && isStoppingBatch && (
        <div className="no-print bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Pause className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">
              درخواست توقف ثبت شد: ترجمه پس از اتمام این بخش (بخش {currentChunk?.chunkNumber}) متوقف خواهد شد...
            </span>
          </div>
          <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
            در انتظار تکمیل
          </span>
        </div>
      )}

      {/* 2. Workspace Responsive Top Toolbar */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col gap-2 shadow-sm">
        
        {/* Row 1: Navigation, Chunk indicator & Mobile Column Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Left: Navigation and Full Book mode */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenMobileChunks && (
              <button
                onClick={onOpenMobileChunks}
                className="md:hidden px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition"
                title="مشاهده فهرست بخش‌ها"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>فهرست ({project.chunks.length})</span>
              </button>
            )}

            <button
              onClick={() => setFullBookMode(!fullBookMode)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                fullBookMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{fullBookMode ? 'نمای بخش‌ها' : 'نمای یکپارچه تمام کتاب'}</span>
              <span className="sm:hidden">{fullBookMode ? 'بخش‌ها' : 'تمام کتاب'}</span>
            </button>

            {!fullBookMode && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                <button
                  onClick={onSelectPrevChunk}
                  disabled={!hasPrevChunk}
                  className="p-1.5 rounded-md hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
                  title="بخش قبلی"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-300 px-1.5 font-medium truncate max-w-[140px] sm:max-w-[200px]">
                  {currentChunk ? `بخش ${currentChunk.chunkNumber} • ${cleanChapterTitle(currentChunk.chapterTitle)}` : ''}
                </span>
                <button
                  onClick={onSelectNextChunk}
                  disabled={!hasNextChunk}
                  className="p-1.5 rounded-md hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
                  title="بخش بعدی"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Column View Switcher (Visible only on mobile screen) */}
          {!fullBookMode && (
            <div className="flex md:hidden items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-medium">
              <button
                onClick={() => setMobileColumnView('target')}
                className={`px-2 py-1 rounded transition ${
                  mobileColumnView === 'target' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                ترجمه
              </button>
              <button
                onClick={() => setMobileColumnView('source')}
                className={`px-2 py-1 rounded transition ${
                  mobileColumnView === 'source' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                اصلی
              </button>
              <button
                onClick={() => setMobileColumnView('both')}
                className={`px-2 py-1 rounded transition ${
                  mobileColumnView === 'both' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                دوطرفه
              </button>
            </div>
          )}

          {/* Exclude / Include from Book Toggle */}
          {!fullBookMode && currentChunk && onToggleExcludeChunk && (
            <button
              onClick={() => onToggleExcludeChunk(currentChunk.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm border shrink-0 ${
                currentChunk.isExcludedFromBook
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={
                currentChunk.isExcludedFromBook
                  ? 'این صفحه در حال حاضر از کتاب و PDF حذف شده است. برای افزودن مجدد کلیک کنید.'
                  : 'عدم درج این چانک در خروجی کتاب و PDF (حذف از کتاب بدون پاک شدن متن)'
              }
            >
              {currentChunk.isExcludedFromBook ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">حذف‌شده از کتاب</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">شامل در کتاب</span>
                </>
              )}
            </button>
          )}

          {/* Delete Page Button */}
          {!fullBookMode && currentChunk && onDeleteChunk && (
            <button
              onClick={() => {
                if (confirm(`آیا از حذف صفحه ${currentChunk.chunkNumber} (${cleanChapterTitle(currentChunk.chapterTitle)}) اطمینان دارید؟`)) {
                  onDeleteChunk(currentChunk.id);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition shrink-0"
              title="حذف آنلاین این صفحه از کتاب"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

        </div>

        {/* Row 2: Action Buttons & View Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          
          {/* Translation Triggers & Batch Status */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Cloud Server Background Translation */}
            {isCloudTranslating ? (
              <button
                onClick={onStopCloudTranslation}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5 shadow-md shadow-red-600/20"
                title="توقف ترجمه در سرور و بازگرداندن هزینه صفحات باقی‌مانده به کیف پول"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>توقف ترجمه ابری</span>
              </button>
            ) : (
              onStartCloudTranslation && (
                <button
                  onClick={onStartCloudTranslation}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  title="شروع ترجمه ابری در سرور بدون نیاز به باز بودن مرورگر"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ترجمه در سرور</span>
                </button>
              )
            )}

            {/* Batch Auto-Translate Controls */}
            {isBatchTranslating ? (
              <div className="flex items-center gap-2 bg-blue-950/80 border border-blue-500/40 px-2.5 py-1 rounded-lg">
                <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                <div className="text-xs text-blue-200">
                  <span className="hidden sm:inline">ترجمه: </span>
                  <strong className="font-mono text-white">{batchProgress.current}</strong>/<strong className="font-mono text-white">{batchProgress.total}</strong>
                </div>
                
                {/* Stop Button with Instant Feedback */}
                <button
                  onClick={onStopBatchTranslate}
                  disabled={isStoppingBatch}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                    isStoppingBatch
                      ? 'bg-amber-600 text-white cursor-wait opacity-90'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-sm'
                  }`}
                  title={isStoppingBatch ? 'ترجمه پس از اتمام این بخش متوقف می‌شود' : 'توقف ترجمه متوالی'}
                >
                  <Pause className="w-3 h-3 fill-current" />
                  <span>{isStoppingBatch ? 'درحال توقف...' : 'توقف ترجمه'}</span>
                </button>
              </div>
            ) : (
              !isCloudTranslating && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onStartBatchTranslate}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm"
                    title="ترجمه متوالی خودکار تمام صفحات باقی‌مانده در مرورگر"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>ترجمه متوالی</span>
                  </button>

                  {/* Dedicated Button to Retry Incomplete & Failed Pages */}
                  {project.chunks.some(c => c.status === 'error' || !c.translatedHtml || c.translatedHtml.trim().length === 0) && onRetryFailedChunks && (
                    <button
                      type="button"
                      onClick={onRetryFailedChunks}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                      title="ادامه ترجمه بخش‌های ناقص و خطادار با چرخش خودکار بین توکن‌ها تا تکمیل ۱۰۰٪ کتاب"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>⚡ ادامه ترجمه ناقص و خطادار ({project.chunks.filter(c => c.status === 'error' || !c.translatedHtml || c.translatedHtml.trim().length === 0).length})</span>
                    </button>
                  )}
                </div>
              )
            )}

            {/* Single Chunk Translate */}
            {!fullBookMode && currentChunk && (
              <button
                onClick={onTranslateCurrentChunk}
                disabled={currentChunk.status === 'translating' || isBatchTranslating}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                {currentChunk.status === 'translating' ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>درحال ترجمه...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{currentChunk.translatedHtml ? 'ترجمه مجدد این صفحه' : 'ترجمه این صفحه'}</span>
                  </>
                )}
              </button>
            )}

            {/* Global Find & Replace in Book */}
            {onOpenFindReplaceModal && (
              <button
                type="button"
                onClick={onOpenFindReplaceModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-500/50 transition flex items-center gap-1.5 shadow-sm"
                title="جستجو و جایگزینی سراسری کلمات یا اسامی شخصیت‌ها در تمام کتاب"
              >
                <Replace className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">جایگزینی سراسری</span>
              </button>
            )}

            {/* Add Custom Page / Image */}
            {onOpenAddPageModal && (
              <button
                type="button"
                onClick={() => onOpenAddPageModal(currentChunk?.id, 'after')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/60 transition flex items-center gap-1.5 shadow-sm"
                title="افزودن صفحه یا بخش جدید با متن و تصویر به کتاب"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">افزودن صفحه / تصویر</span>
                <span className="sm:hidden">صفحه جدید</span>
              </button>
            )}

          </div>

          {/* View Modes Toggle: Preview vs Plain Text vs Raw HTML */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs shadow-inner">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                viewMode === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="پیش‌نمایش کتاب چاپی"
            >
              <Eye className="w-3 h-3" />
              <span>پیش‌نمایش</span>
            </button>
            <button
              onClick={() => setViewMode('plain')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                viewMode === 'plain'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="ویرایش دستی متن ساده بدون تگ‌های HTML"
            >
              <FileText className="w-3 h-3" />
              <span>ویرایش متن</span>
            </button>
            <button
              onClick={() => setViewMode('html')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                viewMode === 'html'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="ویرایش کدهای پیشرفته HTML"
            >
              <Code2 className="w-3 h-3" />
              <span>کد HTML</span>
            </button>
          </div>

        </div>

      </div>

      {/* 3. Main Dual View Container */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Full Book Continuous Mode */}
        {fullBookMode ? (
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-slate-900/60">
            <div
              className={`max-w-3xl mx-auto p-6 sm:p-14 rounded-2xl shadow-2xl border ${paragraphSpacingClass}`}
              style={{
                ['--theme-h1-color' as any]: customColors.heading1Color || '#1a365d',
                ['--theme-h2-color' as any]: customColors.heading2Color || '#2b6cb0',
                ['--theme-h3-color' as any]: customColors.heading3Color || '#3182ce',
                ['--theme-text-color' as any]: customColors.textColor || '#2d3748',
                ['--theme-accent-color' as any]: customColors.accentColor || '#c5a059',
                backgroundColor: customColors.pageBgColor || '#ffffff',
                color: customColors.textColor || '#1e293b',
                borderColor: customColors.borderColor || '#e2e8f0',
              }}
            >
              
              <div className="text-center pb-6 sm:pb-8 mb-6 sm:mb-8 border-b" style={{ borderColor: customColors.borderColor || '#e2e8f0' }}>
                <h1
                  className="text-2xl sm:text-3xl font-extrabold mb-2 sm:mb-3"
                  style={{ color: customColors.heading1Color || '#1a365d' }}
                >
                  {project.title || project.originalTitle}
                </h1>
                <p className="text-xs sm:text-sm font-medium opacity-80">نویسنده: {project.author || 'نامشخص'}</p>
                <p className="text-[11px] sm:text-xs italic mt-1 opacity-70">ترجمه: {project.translator || 'سامانه هوشمند ترجمه کتاب'}</p>
              </div>

              <div className="space-y-10 sm:space-y-12">
                {groupChunksIntoChapters(project?.chunks || []).map((ch) => (
                  <div key={ch.chapterKey} className="book-chapter-block border-b pb-8 sm:pb-10 last:border-b-0" style={{ borderColor: customColors.borderColor ? `${customColors.borderColor}40` : '#f1f5f9' }}>
                    <div className="text-center mb-5 sm:mb-6">
                      <h2
                        className="text-xl sm:text-2xl font-bold mb-2"
                        style={{ color: customColors.heading2Color || customColors.heading1Color || '#1a365d' }}
                      >
                        {ch.title}
                      </h2>
                      <div className="text-amber-600 opacity-60 text-xs sm:text-sm">❦ ✤ ❦</div>
                    </div>

                    <div
                      className="book-render-content text-justify leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: ch.htmlContent }}
                    />
                  </div>
                ))}
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* Left Column: English Original */}
            <div
              className={`w-full md:w-1/2 border-b md:border-b-0 md:border-l border-slate-800 flex flex-col bg-slate-900/40 ${
                mobileColumnView === 'target' ? 'hidden md:flex' : 'flex'
              }`}
            >
              
              {/* English Sub-header */}
              <div className="px-3 sm:px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">متن انگلیسی (Source)</span>
                  <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                    {currentChunk?.wordCount} کلمه
                  </span>
                  {currentChunk?.hasImages && (
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      <span>{currentChunk.imageCount || 1} تصویر</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopyEnglish}
                  className="flex items-center gap-1 hover:text-white transition px-2 py-0.5 rounded hover:bg-slate-800"
                  title="کپی متن انگلیسی"
                >
                  {copiedEn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEn ? 'کپی شد' : 'کپی'}</span>
                </button>
              </div>

              {/* English Text Content */}
              <div
                dir="ltr"
                className="flex-1 overflow-y-auto p-4 sm:p-5 text-sm leading-relaxed text-slate-300 font-serif select-text selection:bg-blue-600 selection:text-white"
              >
                {currentChunk?.englishText ? (
                  currentChunk.englishText.includes('<') ? (
                    <div
                      className="english-book-view space-y-4"
                      dangerouslySetInnerHTML={{ __html: currentChunk.englishText }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {currentChunk.englishText}
                    </div>
                  )
                ) : (
                  <div className="text-slate-500 italic">متنی برای این بخش وجود ندارد.</div>
                )}
              </div>

            </div>

            {/* Right Column: Persian Translation & Editors */}
            <div
              className={`w-full md:w-1/2 flex flex-col bg-slate-900/70 ${
                mobileColumnView === 'source' ? 'hidden md:flex' : 'flex'
              }`}
            >
              
              {/* Persian Sub-header */}
              <div className="px-3 sm:px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-400">ترجمه فارسی و ویرایش</span>
                  {isAdmin ? (
                    currentChunk?.serverUsed ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${
                        currentChunk.switchOccurred
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}>
                        <Zap className="w-2.5 h-2.5" />
                        <span>{currentChunk.serverUsed}</span>
                      </span>
                    ) : null
                  ) : (
                    currentChunk?.translatedHtml ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                        تکمیل شد
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        در انتظار ترجمه
                      </span>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {viewMode === 'plain' && isSavedToast && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ذخیره شد ✓</span>
                    </span>
                  )}
                  <button
                    onClick={handleCopyPersian}
                    disabled={!currentChunk?.translatedHtml}
                    className="flex items-center gap-1 hover:text-white transition px-2 py-0.5 rounded hover:bg-slate-800 disabled:opacity-40"
                    title="کپی ترجمه فارسی"
                  >
                    {copiedFa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFa ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>

              {/* Translation Display Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950/60 flex flex-col">
                
                {currentChunk?.status === 'translating' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
                    <h4 className="text-sm font-bold text-slate-200">درحال ترجمه هوشمند این بخش...</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      مدل جمینای در حال اعمال لحن «{project.tone}»، تطبیق واژه‌نامه تخصصی و استایل‌بندی است.
                    </p>
                  </div>
                ) : currentChunk?.status === 'error' ? (
                  <div className="max-w-md mx-auto p-5 sm:p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-3.5 my-auto">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-300">خطا در فرآیند ترجمه این بخش</div>
                      <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
                        {currentChunk.errorMessage || 'مشکل در برقراری ارتباط با مدل هوش مصنوعی'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                      <button
                        onClick={onTranslateCurrentChunk}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>تلاش مجدد</span>
                      </button>

                      {isAdmin && onOpenServerPoolModal && (
                        <button
                          onClick={onOpenServerPoolModal}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition flex items-center justify-center gap-1.5"
                        >
                          <Server className="w-3.5 h-3.5 text-amber-400" />
                          <span>ویرایش سرورها</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : currentChunk?.translatedHtml ? (
                  <>
                    {/* Excluded From Book Notice Banner */}
                    {currentChunk?.isExcludedFromBook && (
                      <div className="max-w-2xl mx-auto w-full bg-rose-950/40 border border-rose-500/40 text-rose-300 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 mb-3 shadow-md animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>این بخش از خروجی نهایی کتاب و فایل PDF حذف شده است و چاپ نخواهد شد.</span>
                        </div>
                        {onToggleExcludeChunk && (
                          <button
                            type="button"
                            onClick={() => onToggleExcludeChunk(currentChunk.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition shrink-0"
                          >
                            افزودن مجدد به کتاب
                          </button>
                        )}
                      </div>
                    )}

                    {/* MODE 1: Preview Mode */}
                    {viewMode === 'preview' ? (
                    <div className="space-y-3 max-w-2xl mx-auto w-full">
                      {/* Floating fast edit helper button */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">نمای صفحه کتاب چاپی:</span>
                          <button
                            onClick={handleAutoParagraphFormat}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 transition"
                            title="تفکیک جملات فشرده به پاراگراف‌های مجزا با فاصله استاندارد نشر"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>پاراگراف‌بندی و فاصله‌گذاری خودکار</span>
                          </button>
                        </div>
                        <button
                          onClick={() => setViewMode('plain')}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>ویرایش دستی متن این صفحه</span>
                        </button>
                      </div>

                      {/* Reading Comfort & Theme Customizer Bar */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {/* Theme Buttons */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px] ml-1">تم مطالعه:</span>
                          <button
                            type="button"
                            onClick={() => setReaderTheme('paper')}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                              readerTheme === 'paper' ? 'bg-white text-slate-900 border-white shadow-sm' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            <Sun className="w-3 h-3 text-amber-500" />
                            <span>کاغذ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setReaderTheme('sepia')}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                              readerTheme === 'sepia' ? 'bg-[#fdf6e2] text-[#433422] border-[#e6dcbf] shadow-sm' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            <span>📜 کرم</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setReaderTheme('slate')}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                              readerTheme === 'slate' ? 'bg-slate-800 text-amber-400 border-amber-500/40 shadow-sm' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            <Moon className="w-3 h-3 text-indigo-400" />
                            <span>تاریک</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setReaderTheme('midnight')}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                              readerTheme === 'midnight' ? 'bg-black text-amber-300 border-amber-500 shadow-sm' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            <span>🖤 شب</span>
                          </button>
                        </div>

                        {/* Font Size & Line Height */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setReaderFontSize(Math.max(12, readerFontSize - 2))}
                              className="px-1.5 py-0.5 rounded text-[10px] text-slate-300 hover:bg-slate-800 font-bold"
                              title="کاهش اندازه قلم"
                            >
                              A-
                            </button>
                            <span className="text-[11px] font-mono text-amber-400 px-1">{readerFontSize}px</span>
                            <button
                              type="button"
                              onClick={() => setReaderFontSize(Math.min(24, readerFontSize + 2))}
                              className="px-1.5 py-0.5 rounded text-[10px] text-slate-300 hover:bg-slate-800 font-bold"
                              title="افزایش اندازه قلم"
                            >
                              A+
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setReaderLineHeight(readerLineHeight === 1.8 ? 2.2 : readerLineHeight === 2.2 ? 2.6 : 1.8)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono"
                            title="تغییر فاصله بین خطوط"
                          >
                            فاصله: {readerLineHeight}x
                          </button>
                        </div>
                      </div>

                      <div
                        className={`p-5 sm:p-10 rounded-2xl shadow-xl border book-page transition-colors duration-300 ${paragraphSpacingClass}`}
                        style={{
                          ['--theme-h1-color' as any]: getThemeStyles().h1,
                          ['--theme-h2-color' as any]: getThemeStyles().h2,
                          ['--theme-h3-color' as any]: getThemeStyles().h3,
                          ['--theme-text-color' as any]: getThemeStyles().text,
                          ['--theme-accent-color' as any]: customColors.accentColor || '#c5a059',
                          backgroundColor: getThemeStyles().bg,
                          color: getThemeStyles().text,
                          borderColor: getThemeStyles().border,
                          fontSize: `${readerFontSize}px`,
                          lineHeight: readerLineHeight,
                        }}
                      >
                        <div
                          className="book-render-content"
                          dangerouslySetInnerHTML={{ __html: currentChunk.translatedHtml }}
                        />
                      </div>
                    </div>
                  ) : viewMode === 'plain' ? (
                    
                    /* MODE 2: PLAIN TEXT MANUAL EDITOR (درخواست کاربر برای ویرایش متن ساده بدون درگیری با تگ‌ها) */
                    <div className="h-full flex flex-col max-w-3xl mx-auto w-full space-y-2.5">
                      
                      {/* Editor Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleInsertHeading}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
                            title="افزودن تیتر به متن"
                          >
                            <Heading className="w-3 h-3 text-indigo-400" />
                            <span>تیتر فصل</span>
                          </button>
                          <button
                            onClick={handleInsertQuote}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
                            title="افزودن نقل قول"
                          >
                            <Quote className="w-3 h-3 text-blue-400" />
                            <span>نقل‌قول</span>
                          </button>
                          <button
                            onClick={handleAutoParagraphFormat}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition"
                            title="تفکیک هوشمند پاراگراف‌ها با فاصله استاندارد"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>پاراگراف‌بندی خودکار</span>
                          </button>

                          {onOpenFindReplaceModal && (
                            <button
                              type="button"
                              onClick={onOpenFindReplaceModal}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition font-bold"
                              title="جستجو و جایگزینی سراسری کلمات یا اسامی شخصیت‌ها در تمام کتاب"
                            >
                              <Replace className="w-3 h-3 text-emerald-400" />
                              <span>جایگزینی سراسری</span>
                            </button>
                          )}

                          {/* Rich Book Publishing Elements Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowElementsMenu(!showElementsMenu)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-400/10 hover:from-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition font-bold"
                              title="درج جعبه‌های زیبا، نقل‌قول، نکات کلیدی و گل‌بوته"
                            >
                              <span>✨</span>
                              <span>المان‌های نفیس کتاب</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {showElementsMenu && (
                              <div className="absolute top-full right-0 mt-1 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in">
                                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 border-b border-slate-800">
                                  درج کادرها و المان‌های استاندارد نشر:
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleInsertElement('tip')}
                                  className="w-full text-right px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2 transition"
                                >
                                  <span>💡</span>
                                  <div>
                                    <div className="font-bold">جعبه نکته کلیدی</div>
                                    <div className="text-[10px] text-slate-400">خلاصه پیام اصلی یا جمع‌بندی</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertElement('quote')}
                                  className="w-full text-right px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2 transition"
                                >
                                  <span>📜</span>
                                  <div>
                                    <div className="font-bold">نقل‌قول و کلام بزرگان</div>
                                    <div className="text-[10px] text-slate-400">کادر شکیل سخنان تاثیرگذار</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertElement('warning')}
                                  className="w-full text-right px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2 transition"
                                >
                                  <span>⚠️</span>
                                  <div>
                                    <div className="font-bold">جعبه توجه و هشدار مهم</div>
                                    <div className="text-[10px] text-slate-400">نکته حیاتی و تمایز مفهومی</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertElement('question')}
                                  className="w-full text-right px-2.5 py-1.5 rounded-xl hover:bg-sky-500/10 text-sky-300 text-xs flex items-center gap-2 transition"
                                >
                                  <span>❓</span>
                                  <div>
                                    <div className="font-bold">پرسش برای تامل</div>
                                    <div className="text-[10px] text-slate-400">تمرین تفکر و درک عمیق‌تر</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertElement('fleuron')}
                                  className="w-full text-right px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 text-amber-400 text-xs flex items-center gap-2 transition"
                                >
                                  <span>❦</span>
                                  <div>
                                    <div className="font-bold">گل‌بوته و جداکننده نفیس</div>
                                    <div className="text-[10px] text-slate-400">نشان خطی اسلیمی میان‌بندی</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertElement('footnote')}
                                  className="w-full text-right px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-2 transition"
                                >
                                  <span>📝</span>
                                  <div>
                                    <div className="font-bold">پانویس مترجم</div>
                                    <div className="text-[10px] text-slate-400">توضیح واژه یا منبع در پاورقی</div>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {plainWordCount} کلمه
                          </span>
                          <button
                            onClick={handleSavePlainText}
                            className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                            title="ذخیره متن ویرایش شده"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>ذخیره تغییرات</span>
                          </button>
                        </div>
                      </div>

                      {/* Manual Plain Textarea */}
                      <div className="flex-1 flex flex-col relative min-h-[300px]">
                        <textarea
                          value={plainTextValue}
                          onChange={e => handlePlainTextChange(e.target.value)}
                          placeholder="متن ترجمه فارسی را در اینجا به صورت روان ویرایش کنید. هر بند با دو بار Enter به عنوان یک پاراگراف استاندارد کتاب ذخیره می‌شود..."
                          className="flex-1 w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl p-4 sm:p-5 text-sm sm:text-base text-slate-100 font-['Vazirmatn'] focus:outline-none resize-none leading-loose shadow-inner"
                          dir="rtl"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                        <span>نکته: متن‌ها خودکار بر اساس پاراگراف‌بندی کتاب ذخیره و صفحه‌بندی می‌شوند.</span>
                        <button
                          onClick={() => setViewMode('preview')}
                          className="text-indigo-400 hover:underline"
                        >
                          مشاهده در پیش‌نمایش چاپی ←
                        </button>
                      </div>

                    </div>
                  ) : (
                    
                    /* MODE 3: Raw HTML Code Editor */
                    <div className="h-full flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>کدهای خام HTML این بخش (برای طراحان و ویراستاران فنی):</span>
                        <button
                          onClick={() => setViewMode('preview')}
                          className="text-indigo-400 hover:underline"
                        >
                          مشاهده پیش‌نمایش چاپی ←
                        </button>
                      </div>
                      <textarea
                        value={currentChunk.translatedHtml}
                        onChange={e => onUpdateChunkHtml(currentChunk.id, e.target.value)}
                        className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed min-h-[300px]"
                        dir="ltr"
                      />
                    </div>
                  )}
                </>
              ) : (
                  /* Empty state for this chunk */
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 my-auto">
                    <Sparkles className="w-10 h-10 text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-300">این بخش هنوز ترجمه نشده است</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                      روی دکمه «ترجمه این صفحه» کلیک کنید تا هوش مصنوعی متن را با فرمت کتابی آماده کند.
                    </p>
                    <button
                      onClick={onTranslateCurrentChunk}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>شروع ترجمه این صفحه</span>
                    </button>
                  </div>
                )}

              </div>

            </div>
          </>
        )}

      </div>

    </main>
  );
};
