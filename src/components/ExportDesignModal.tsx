import React, { useState } from 'react';
import {
  X,
  Palette,
  Printer,
  FileText,
  Download,
  Check,
  Sparkles,
  Type,
  Layout,
  Globe,
  Eye,
  CheckCircle2,
  BookOpen,
  Sliders,
  Copy,
  Save,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Feather,
  Paintbrush,
  EyeOff,
  CheckSquare,
  Square,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  Link2Off,
  Search
} from 'lucide-react';
import { BookProject, BookDesignConfig, BookThemeId, BorderStyleId, BackgroundPatternId, CustomColorPalette } from '../types.ts';
import { BOOK_THEMES, BORDER_STYLES, BACKGROUND_PATTERNS, DEFAULT_DESIGN_CONFIG, BOOK_TRIM_SIZES } from '../constants/themes.ts';
import { downloadDocx, downloadWordHtml, downloadStyledHtml, downloadPlainText, cleanChapterTitle, isReferenceOrBibliographyChunk, stripBookUrls } from '../utils/exporter.ts';

interface ExportDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  onUpdateDesign: (config: BookDesignConfig) => void;
  onPrintPdf: () => void;
  onUpdateProject?: (updated: BookProject) => void;
  onDeleteChunk?: (chunkId: string) => void;
}

const STORAGE_GLOBAL_DESIGN = 'persian_book_translator_global_design_v1';

export const ExportDesignModal: React.FC<ExportDesignModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateDesign,
  onPrintPdf,
  onUpdateProject,
  onDeleteChunk,
}) => {
  // Load saved global default if project does not have one
  const getInitialConfig = (): BookDesignConfig => {
    if (project.designConfig) return project.designConfig;
    try {
      const saved = localStorage.getItem(STORAGE_GLOBAL_DESIGN);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_DESIGN_CONFIG, ...parsed };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_DESIGN_CONFIG;
  };

  const initialConfig = getInitialConfig();

  const [themeId, setThemeId] = useState<BookThemeId>(initialConfig.themeId || 'spiritual');
  const [headerText, setHeaderText] = useState(initialConfig.headerText || '');
  const [footerText, setFooterText] = useState(initialConfig.footerText || '');
  const [showHeader, setShowHeader] = useState(initialConfig.showHeader ?? false);
  const [showFooter, setShowFooter] = useState(initialConfig.showFooter ?? false);
  const [websiteUrl, setWebsiteUrl] = useState(initialConfig.websiteUrl || '');
  const [brandName, setBrandName] = useState(initialConfig.brandName || '');
  const [showPageNumbers, setShowPageNumbers] = useState(initialConfig.showPageNumbers ?? true);
  const [showCoverPage, setShowCoverPage] = useState(initialConfig.showCoverPage ?? true);
  const [continuousFlow, setContinuousFlow] = useState(initialConfig.continuousFlow ?? true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(initialConfig.fontSize || 'medium');
  const [lineSpacing, setLineSpacing] = useState<'compact' | 'normal' | 'relaxed'>(initialConfig.lineSpacing || 'normal');
  const [paragraphSpacing, setParagraphSpacing] = useState<'compact' | 'normal' | 'relaxed' | 'generous'>(
    initialConfig.paragraphSpacing || 'normal'
  );
  const [fontFamily, setFontFamily] = useState<BookDesignConfig['fontFamily']>(
    (initialConfig.fontFamily as any) || 'Vazirmatn'
  );
  const [borderStyle, setBorderStyle] = useState<BorderStyleId>(initialConfig.borderStyle || 'ornate_spiritual');
  const [backgroundPattern, setBackgroundPattern] = useState<BackgroundPatternId>(initialConfig.backgroundPattern || 'none');
  const [watermarkText, setWatermarkText] = useState(initialConfig.watermarkText || '');
  const [pageMargin, setPageMargin] = useState<'compact' | 'normal' | 'generous'>(initialConfig.pageMargin || 'normal');
  const [topMargin, setTopMargin] = useState<BookDesignConfig['topMargin']>(initialConfig.topMargin || 'normal');
  const [trimSize, setTrimSize] = useState<'ruqai' | 'vaziri' | 'rahli' | 'pocket'>(initialConfig.trimSize || 'ruqai');
  const [textAlignment, setTextAlignment] = useState<'right' | 'both'>(initialConfig.textAlignment || 'right');
  const [customColors, setCustomColors] = useState<CustomColorPalette>(initialConfig.customColors || {});

  // Dynamic Heading Sizes across the whole book (سرتیترها و تیترها)
  const [heading1Size, setHeading1Size] = useState<number>(initialConfig.heading1Size || 22);
  const [heading2Size, setHeading2Size] = useState<number>(initialConfig.heading2Size || 17);
  const [heading3Size, setHeading3Size] = useState<number>(initialConfig.heading3Size || 14);

  const normalizeCoverLayout = (layout?: string): 'classic_centered' | 'modern_minimal' | 'framed_spiritual' | 'right_aligned' => {
    if (layout === 'frame') return 'framed_spiritual';
    if (layout === 'center') return 'classic_centered';
    if (layout === 'right') return 'right_aligned';
    if (layout === 'modern_minimal' || layout === 'framed_spiritual' || layout === 'right_aligned' || layout === 'classic_centered') {
      return layout;
    }
    return 'framed_spiritual';
  };

  const [coverLayout, setCoverLayout] = useState<'classic_centered' | 'modern_minimal' | 'framed_spiritual' | 'right_aligned'>(
    normalizeCoverLayout(initialConfig.coverPage?.layout)
  );
  const [coverTitle, setCoverTitle] = useState(
    initialConfig.coverPage?.title ?? (project.title || project.originalTitle || '')
  );
  const [coverTitleSize, setCoverTitleSize] = useState<number>(
    initialConfig.coverPage?.titleSize || 28
  );
  const [coverTitleColor, setCoverTitleColor] = useState(
    initialConfig.coverPage?.titleColor || ''
  );
  const [coverSubtitle, setCoverSubtitle] = useState(
    initialConfig.coverPage?.subtitle ?? (project.originalTitle && project.title ? project.originalTitle : '')
  );
  const [coverSubtitleSize, setCoverSubtitleSize] = useState<number>(
    initialConfig.coverPage?.subtitleSize || 14
  );
  const [coverSubtitleColor, setCoverSubtitleColor] = useState(
    initialConfig.coverPage?.subtitleColor || ''
  );
  const [coverAuthor, setCoverAuthor] = useState(
    initialConfig.coverPage?.author ?? (project.author || '')
  );
  const [coverAuthorSize, setCoverAuthorSize] = useState<number>(
    initialConfig.coverPage?.authorSize || 14
  );
  const [coverAuthorColor, setCoverAuthorColor] = useState(
    initialConfig.coverPage?.authorColor || ''
  );
  const [coverTranslator, setCoverTranslator] = useState(
    initialConfig.coverPage?.translator ?? (project.translator || '')
  );
  const [coverPublisher, setCoverPublisher] = useState(
    initialConfig.coverPage?.publisher ?? ''
  );
  const [coverNote, setCoverNote] = useState(
    initialConfig.coverPage?.note ?? ''
  );
  const [coverShowMotif, setCoverShowMotif] = useState(
    initialConfig.coverPage?.showMotif ?? true
  );
  const [coverShowDivider, setCoverShowDivider] = useState(
    initialConfig.coverPage?.showDivider ?? true
  );

  // Preview Mode Switcher ('body' = pages of the book, 'cover' = page 1 title/cover)
  const [previewMode, setPreviewMode] = useState<'body' | 'cover'>('body');

  // Excluded pages from export (combining config.excludedChunkIds and individual chunk isExcludedFromBook)
  const [excludedChunkIds, setExcludedChunkIds] = useState<string[]>(() => {
    const list = [...(initialConfig.excludedChunkIds || [])];
    (project.chunks || []).forEach(c => {
      if (c.isExcludedFromBook && !list.includes(c.id)) {
        list.push(c.id);
      }
    });
    return list;
  });
  const [pageNumberInput, setPageNumberInput] = useState('');
  const [pageExcludeFeedback, setPageExcludeFeedback] = useState<string | null>(null);
  const [inspectingChunkId, setInspectingChunkId] = useState<string | null>(null);
  const [pageSearchQuery, setPageSearchQuery] = useState<string>('');
  const [pageFilterType, setPageFilterType] = useState<'all' | 'included' | 'excluded' | 'references'>('all');
  const [inspectingLangTab, setInspectingLangTab] = useState<'fa' | 'en'>('fa');

  const [activeTab, setActiveTab] = useState<'themes' | 'cover' | 'colors' | 'headers' | 'typography' | 'pages'>('themes');
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);

  if (!isOpen) return null;

  const activeTheme = BOOK_THEMES[themeId] || BOOK_THEMES.spiritual;

  const currentConfig: BookDesignConfig = {
    themeId,
    headerText,
    footerText,
    showHeader,
    showFooter,
    websiteUrl,
    brandName,
    showPageNumbers,
    showCoverPage,
    fontSize,
    lineSpacing,
    paragraphSpacing,
    fontFamily,
    borderStyle,
    backgroundPattern,
    watermarkText,
    pageMargin,
    topMargin,
    trimSize,
    textAlignment,
    customColors,
    continuousFlow,
    excludedChunkIds,
    heading1Size,
    heading2Size,
    heading3Size,
    coverPage: {
      layout: coverLayout,
      title: coverTitle,
      titleSize: coverTitleSize,
      titleColor: coverTitleColor || undefined,
      subtitle: coverSubtitle,
      subtitleSize: coverSubtitleSize,
      subtitleColor: coverSubtitleColor || undefined,
      author: coverAuthor,
      authorSize: coverAuthorSize,
      authorColor: coverAuthorColor || undefined,
      translator: coverTranslator,
      publisher: coverPublisher,
      note: coverNote,
      showMotif: coverShowMotif,
      showDivider: coverShowDivider,
    },
  };

  const handleToggleChunkExcluded = (chunkId: string) => {
    setExcludedChunkIds(prev =>
      prev.includes(chunkId) ? prev.filter(id => id !== chunkId) : [...prev, chunkId]
    );
  };

  const handleApplyExcludeByNumbers = () => {
    if (!pageNumberInput.trim()) return;
    const parts = pageNumberInput.split(/[,،\s]+/).filter(Boolean);
    const numbersToExclude = new Set<number>();

    parts.forEach(p => {
      if (p.includes('-')) {
        const [startStr, endStr] = p.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            numbersToExclude.add(i);
          }
        }
      } else {
        const num = parseInt(p.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) numbersToExclude.add(num);
      }
    });

    if (numbersToExclude.size === 0) {
      setPageExcludeFeedback('لطفاً شماره صفحه یا بازه معتبر وارد فرمایید (مثال: 3 یا 2, 4 یا 5-7).');
      setTimeout(() => setPageExcludeFeedback(null), 3500);
      return;
    }

    const matchingIds: string[] = [];
    (project.chunks || []).forEach((c, idx) => {
      if (numbersToExclude.has(c.chunkNumber) || numbersToExclude.has(idx + 1)) {
        matchingIds.push(c.id);
      }
    });

    if (matchingIds.length > 0) {
      setExcludedChunkIds(prev => Array.from(new Set([...prev, ...matchingIds])));
      setPageExcludeFeedback(`✓ تعداد ${matchingIds.length} صفحه از خروجی PDF و چاپ حذف شدند.`);
      setPageNumberInput('');
    } else {
      setPageExcludeFeedback('هیچ صفحه‌ای با این شماره‌ها پیدا نشد.');
    }
    setTimeout(() => setPageExcludeFeedback(null), 3500);
  };

  const handleIncludeAllPages = () => {
    setExcludedChunkIds([]);
    setPageExcludeFeedback('✓ تمام صفحات برای چاپ و خروجی فعال شدند.');
    setTimeout(() => setPageExcludeFeedback(null), 3000);
  };

  const handleExcludeEmptyPages = () => {
    const emptyIds = (project.chunks || [])
      .filter(c => !c.translatedHtml || c.translatedHtml.trim().length === 0)
      .map(c => c.id);
    if (emptyIds.length === 0) {
      setPageExcludeFeedback('صفحه خالی یا ترجمه‌نشده‌ای وجود ندارد.');
    } else {
      setExcludedChunkIds(prev => Array.from(new Set([...prev, ...emptyIds])));
      setPageExcludeFeedback(`✓ تعداد ${emptyIds.length} صفحه خالی از خروجی PDF حذف گردید.`);
    }
    setTimeout(() => setPageExcludeFeedback(null), 3500);
  };

  const referenceChunks = (project.chunks || []).filter(c => isReferenceOrBibliographyChunk(c));
  const referenceChunksCount = referenceChunks.length;

  const handleExcludeReferences = () => {
    if (referenceChunksCount === 0) {
      setPageExcludeFeedback('هیچ بخش منابع، مآخذ یا رفرنسی در این کتاب یافت نشد.');
    } else {
      const refIds = referenceChunks.map(c => c.id);
      setExcludedChunkIds(prev => Array.from(new Set([...prev, ...refIds])));
      setPageExcludeFeedback(`✓ تعداد ${referenceChunksCount} بخش رفرنس و منابع پایان کتاب با موفقیت از خروجی PDF حذف گردید.`);
    }
    setTimeout(() => setPageExcludeFeedback(null), 4000);
  };

  const handleStripAllUrls = () => {
    if (!onUpdateProject) return;
    let count = 0;
    const updatedChunks = (project.chunks || []).map(c => {
      if (c.translatedHtml && (c.translatedHtml.includes('http') || c.translatedHtml.includes('www.') || c.translatedHtml.includes('<a '))) {
        count++;
        return {
          ...c,
          translatedHtml: stripBookUrls(c.translatedHtml),
        };
      }
      return c;
    });

    if (count > 0) {
      onUpdateProject({ ...project, chunks: updatedChunks });
      setPageExcludeFeedback(`✓ تمام لینک‌ها و آدرس‌های اینترنتی از ${count} صفحه کتاب پاکسازی شدند.`);
    } else {
      setPageExcludeFeedback('هیچ لینک یا URL اینترنتی در صفحات کتاب وجود نداشت.');
    }
    setTimeout(() => setPageExcludeFeedback(null), 3500);
  };

  const handleApplyConfig = () => {
    onUpdateDesign(currentConfig);
    return currentConfig;
  };

  const handleSaveAsDefault = () => {
    try {
      localStorage.setItem(STORAGE_GLOBAL_DESIGN, JSON.stringify(currentConfig));
      setSavedBanner('این تنظیمات هدر، فوتر و تم به عنوان پیش‌فرض تمام کتاب‌های شما ذخیره شد.');
      setTimeout(() => setSavedBanner(null), 3500);
    } catch (e) {
      console.warn('Could not save to localStorage');
    }
  };

  const handlePrint = () => {
    handleApplyConfig();
    onClose();
    setTimeout(() => {
      onPrintPdf();
    }, 250);
  };

  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    const cfg = handleApplyConfig();
    const updatedProject = { ...project, designConfig: cfg };
    await downloadDocx(updatedProject);
    setIsExportingDocx(false);
    setSavedBanner(`فایل رسمی Word (.docx) با قلم ${fontFamily} و تنظیمات اختصاصی ایجاد و دانلود شد.`);
    setTimeout(() => setSavedBanner(null), 3500);
  };

  const handleDownloadHtml = () => {
    const cfg = handleApplyConfig();
    const updatedProject = { ...project, designConfig: cfg };
    downloadWordHtml(updatedProject);
    setSavedBanner('فایل متنی وب قابل ویرایش در Word دانلود شد.');
    setTimeout(() => setSavedBanner(null), 3000);
  };

  const handleCopyFullBook = () => {
    const fullText = project.chunks
      .filter(c => c.translatedHtml)
      .map(c => c.translatedHtml?.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join('\n\n\n');

    if (!fullText) {
      setSavedBanner('هیچ متنی برای کپی وجود ندارد.');
      setTimeout(() => setSavedBanner(null), 2500);
      return;
    }

    navigator.clipboard.writeText(fullText);
    setSavedBanner('متن کامل تمام بخش‌های ترجمه شده کتاب در کلیپ‌بورد کپی شد.');
    setTimeout(() => setSavedBanner(null), 3500);
  };

  // Quick Preset Helper for Header
  const applyHeaderPreset = (type: 'title_only' | 'site_url' | 'title_site' | 'clear') => {
    setShowHeader(type !== 'clear');
    if (type === 'title_only') {
      setHeaderText(project.title || project.originalTitle || 'کتاب ترجمه شده');
    } else if (type === 'site_url') {
      setHeaderText(websiteUrl || 'www.mywebsite.com');
    } else if (type === 'title_site') {
      setHeaderText(`${project.title || 'عنوان کتاب'} • ${websiteUrl || 'www.mywebsite.com'}`);
    } else if (type === 'clear') {
      setHeaderText('');
      setShowHeader(false);
    }
  };

  // Quick Preset Helper for Footer
  const applyFooterPreset = (type: 'copyright' | 'site_rights' | 'translator' | 'clear') => {
    setShowFooter(type !== 'clear');
    if (type === 'copyright') {
      setFooterText('کلیه حقوق محفوظ است');
    } else if (type === 'site_rights') {
      setFooterText(`ترجمه اختصاصی • ${websiteUrl || brandName || 'نسخه چاپی'}`);
    } else if (type === 'translator') {
      setFooterText(`مترجم: ${project.translator || 'سامانه هوشمند ترجمه'}`);
    } else if (type === 'clear') {
      setFooterText('');
      setShowFooter(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullScreenPreview ? 'w-[98vw] h-[96vh]' : 'w-full max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-bold">
              <Palette className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">استودیوی دیزاین و خروجی کتاب (PDF / Word)</h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  فونت: {fontFamily}
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {activeTheme.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تنظیم دقیق هدر، فوتر، نام و آدرس سایت شما، طرح‌های پس‌زمینه معنوی، کادربندی چاپی و خروجی رسمی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreenPreview(!isFullScreenPreview)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isFullScreenPreview ? 'نمای عادی' : 'نمای تمام‌صفحه'}
            >
              {isFullScreenPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'themes'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>طرح و پس‌زمینه کتاب (Themes)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('cover');
                setPreviewMode('cover');
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'cover'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>صفحه اول و جلد کتاب</span>
            </button>

            <button
              onClick={() => setActiveTab('colors')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'colors'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>رنگ‌بندی سربرگ، زیرمنوها و متن</span>
            </button>

            <button
              onClick={() => setActiveTab('headers')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'headers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>هدر، فوتر و آدرس سایت شما</span>
            </button>

            <button
              onClick={() => setActiveTab('typography')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'typography'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>قلم، حاشیه و فواصل</span>
            </button>

            <button
              onClick={() => setActiveTab('pages')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'pages'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>حذف و انتخاب صفحات</span>
              {excludedChunkIds.length > 0 && (
                <span className="bg-rose-500/30 text-rose-200 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                  {excludedChunkIds.length} حذف‌شده
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAsDefault}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
              title="ذخیره تنظیمات فعلی برای تمام کتاب‌ها"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>ذخیره به عنوان پیش‌فرض تمام کتاب‌ها</span>
            </button>
          </div>
        </div>

        {/* Content Body: Left Controls + Right Live Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Controls Column (6 or 7 cols) */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            {/* TAB 1: Themes & Spiritual Backgrounds */}
            {activeTab === 'themes' && (
              <div className="space-y-4">
                {/* Spiritual Themes Section */}
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>طرح‌های ویژه برای کتاب‌های معنوی، عرفانی و خودشناسی:</span>
                    </span>
                    <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      تذهیب اسلیمی و پاپیروس عتیق
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(['spiritual', 'spiritual_ancient', 'spiritual_azure'] as BookThemeId[]).map(id => {
                      const t = BOOK_THEMES[id];
                      const isSelected = t.id === themeId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeId(t.id)}
                          className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                              : 'bg-slate-850 hover:bg-slate-800 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-amber-400/60 inline-block shrink-0 shadow-sm"
                                style={{ backgroundColor: t.pageBgColor }}
                              />
                              <span className="truncate">{t.name.split(' (')[0]}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <p className="text-[10px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                            {t.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Other Themes Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span>سایر تم‌ها و پس‌زمینه‌های کتاب:</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(['novel', 'luxury_gold', 'academic', 'sage_nature', 'minimal_clean'] as BookThemeId[]).map(id => {
                      const t = BOOK_THEMES[id];
                      const isSelected = t.id === themeId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeId(t.id)}
                          className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
                              : 'bg-slate-850 hover:bg-slate-800 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0"
                                style={{ backgroundColor: t.pageBgColor }}
                              />
                              <span>{t.name}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {t.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Border Style Selection */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-amber-400" />
                    <span>کادر و قاب دور صفحه (Border Style):</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BORDER_STYLES.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBorderStyle(b.id)}
                        className={`p-2.5 rounded-xl border text-right transition text-xs ${
                          borderStyle === b.id
                            ? 'bg-slate-800 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500/30'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div>{b.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Pattern */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-teal-400" />
                    <span>نقش زمینه صفحات (Watermark & Pattern):</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BACKGROUND_PATTERNS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setBackgroundPattern(p.id)}
                        className={`p-2.5 rounded-xl border text-right transition text-xs ${
                          backgroundPattern === p.id
                            ? 'bg-slate-800 border-teal-500 text-teal-300 font-bold ring-1 ring-teal-500/30'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div>{p.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Title & Cover Page Designer (طراحی و ویرایش صفحه اول و جلد کتاب) */}
            {activeTab === 'cover' && (
              <div className="space-y-4">
                {/* 1. Cover Page Layout Options */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                    <h3 className="font-bold text-white flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-amber-400" />
                      <span>سبک چیدمان صفحه عنوان (برگه اول کتاب):</span>
                    </h3>
                    <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                      صفحه رسمی آغازین کتاب
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'framed_spiritual', name: 'کادر اسلیمی معنوی', desc: 'قاب و شمسه فاخر تذهیب' },
                      { id: 'classic_centered', name: 'وسط‌چین کلاسیک', desc: 'چیدمان سنتی ناشران' },
                      { id: 'modern_minimal', name: 'مدرن مینیمال', desc: 'ساده، شیک و بدون کادر' },
                      { id: 'right_aligned', name: 'راست‌چین شرکتی', desc: 'رسمی و اداری' },
                    ].map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setCoverLayout(l.id as any)}
                        className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between ${
                          coverLayout === l.id
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold ring-2 ring-amber-500/30'
                            : 'bg-slate-900 border-slate-750 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-xs">{l.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-1">{l.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Book Title Customization (متن، سایز و رنگ) */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                    <h3 className="font-bold text-white flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-amber-400" />
                      <span>عنوان اصلی کتاب در صفحه اول:</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">سایز فعلی: {coverTitleSize} pt</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">متن عنوان کتاب:</label>
                    <input
                      type="text"
                      value={coverTitle}
                      onChange={e => setCoverTitle(e.target.value)}
                      placeholder="عنوان اصلی کتاب"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 text-[11px]">سایز قلم عنوان:</label>
                        <span className="font-mono text-amber-400 font-bold">{coverTitleSize} pt</span>
                      </div>
                      <input
                        type="range"
                        min="18"
                        max="46"
                        step="1"
                        value={coverTitleSize}
                        onChange={e => setCoverTitleSize(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">رنگ عنوان کتاب (اختیاری):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={coverTitleColor || '#1a365d'}
                          onChange={e => setCoverTitleColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-slate-900 border border-slate-700 p-0.5"
                        />
                        <input
                          type="text"
                          value={coverTitleColor}
                          onChange={e => setCoverTitleColor(e.target.value)}
                          placeholder="پیش‌فرض تم"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Subtitle & Author */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <h3 className="font-bold text-white border-b border-slate-750 pb-2">
                    عنوان فرعی، نویسنده و مترجم:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">عنوان فرعی یا زبان اصلی:</label>
                      <input
                        type="text"
                        value={coverSubtitle}
                        onChange={e => setCoverSubtitle(e.target.value)}
                        placeholder="مثلاً: The Power of Now"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">نام نویسنده اصلی:</label>
                      <input
                        type="text"
                        value={coverAuthor}
                        onChange={e => setCoverAuthor(e.target.value)}
                        placeholder="مثلاً: اکهارت تله"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">نام مترجم و ویراستار:</label>
                      <input
                        type="text"
                        value={coverTranslator}
                        onChange={e => setCoverTranslator(e.target.value)}
                        placeholder="مثلاً: سامانه هوشمند ترجمه"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">نام انتشارات یا نشان سایت:</label>
                      <input
                        type="text"
                        value={coverPublisher}
                        onChange={e => setCoverPublisher(e.target.value)}
                        placeholder="مثلاً: انتشارات نگاه نوین یا www.mywebsite.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">یادداشت، سال نشر یا توضیحات صفحه اول:</label>
                    <input
                      type="text"
                      value={coverNote}
                      onChange={e => setCoverNote(e.target.value)}
                      placeholder="مثلاً: چاپ نخست — ۱۴۰۳ | کلیه حقوق نشر و ترجمه محفوظ است"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 flex flex-wrap items-center gap-5 border-t border-slate-750">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={coverShowMotif}
                        onChange={e => setCoverShowMotif(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span>نمایش نگاره و شمسه اسلیمی تذهیب در بالای صفحه اول</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={coverShowDivider}
                        onChange={e => setCoverShowDivider(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span>نمایش نشان و خط جداکننده زیر عنوان</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Custom Color Palette (سربرگ، زیرمنوها، تیترها و پس‌زمینه) */}
            {activeTab === 'colors' && (
              <div className="space-y-4">
                {/* Header Guide */}
                <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Paintbrush className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">تنظیمات اختصاصی رنگ‌بندی سربرگ، زیرمنوها و خروجی کتاب</h3>
                        <p className="text-[11px] text-slate-400">
                          تمام رنگ‌ها مستقیماً در پیش‌نمایش زنده، خروجی چاپی PDF و فایل‌های Word اعمال می‌شوند.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomColors({
                          headerColor: activeTheme.textColor,
                          footerColor: activeTheme.textColor,
                          heading1Color: activeTheme.headingColor,
                          heading2Color: activeTheme.headingColor,
                          heading3Color: activeTheme.accentColor,
                          textColor: activeTheme.textColor,
                          pageBgColor: activeTheme.pageBgColor,
                          borderColor: activeTheme.borderColor,
                          accentColor: activeTheme.accentColor,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                      title="بازنشانی رنگ‌ها طبق تم پیش‌فرض فعلی"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>همگام‌سازی با تم فعلی</span>
                    </button>
                  </div>

                  {/* Preset Quick Palettes */}
                  <div className="pt-2 border-t border-emerald-500/20">
                    <span className="text-[10px] text-slate-300 font-bold block mb-1.5">پالت‌های رنگی آماده و هماهنگ:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        {
                          name: 'طلایی نفیس',
                          h1: '#744210',
                          h2: '#975a16',
                          h3: '#b7791f',
                          header: '#975a16',
                          footer: '#975a16',
                          text: '#2d3748',
                          bg: '#fefcf8',
                          border: '#d69e2e',
                          accent: '#d69e2e',
                        },
                        {
                          name: 'لاجوردی سنتی',
                          h1: '#1a365d',
                          h2: '#2b6cb0',
                          h3: '#3182ce',
                          header: '#2b6cb0',
                          footer: '#4a5568',
                          text: '#1a202c',
                          bg: '#f8fafc',
                          border: '#3182ce',
                          accent: '#0987a0',
                        },
                        {
                          name: 'زیتونی معنوی',
                          h1: '#1c4532',
                          h2: '#276749',
                          h3: '#2f855a',
                          header: '#276749',
                          footer: '#4a5568',
                          text: '#222222',
                          bg: '#fbfcf9',
                          border: '#38a169',
                          accent: '#38a169',
                        },
                        {
                          name: 'زرشکی رمان',
                          h1: '#742a2a',
                          h2: '#9b2c2c',
                          h3: '#c53030',
                          header: '#9b2c2c',
                          footer: '#4a5568',
                          text: '#1a202c',
                          bg: '#fdfbf7',
                          border: '#9b2c2c',
                          accent: '#9b2c2c',
                        },
                        {
                          name: 'کلاسیک چاپی',
                          h1: '#111827',
                          h2: '#1f2937',
                          h3: '#374151',
                          header: '#4b5563',
                          footer: '#6b7280',
                          text: '#111827',
                          bg: '#ffffff',
                          border: '#9ca3af',
                          accent: '#4b5563',
                        },
                      ].map((pal, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomColors({
                              heading1Color: pal.h1,
                              heading2Color: pal.h2,
                              heading3Color: pal.h3,
                              headerColor: pal.header,
                              footerColor: pal.footer,
                              textColor: pal.text,
                              pageBgColor: pal.bg,
                              borderColor: pal.border,
                              accentColor: pal.accent,
                            });
                          }}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-right transition flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-bold text-white block mb-1">{pal.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor: pal.h1 }} />
                            <span className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor: pal.h2 }} />
                            <span className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor: pal.header }} />
                            <span className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor: pal.bg }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Color Pickers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* 1. Header Running Color */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.headerColor || activeTheme.textColor }}
                        />
                        <span>رنگ متن سربرگ (Running Header):</span>
                      </label>
                      <span className="text-[10px] text-slate-400">بالای صفحات</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.headerColor || activeTheme.textColor}
                        onChange={e => setCustomColors({ ...customColors, headerColor: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.headerColor || activeTheme.textColor}
                        onChange={e => setCustomColors({ ...customColors, headerColor: e.target.value })}
                        placeholder="#1a365d"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 2. Subheadings H2 (زیرمنوها و تیترهای فرعی) */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.heading2Color || activeTheme.headingColor }}
                        />
                        <span>رنگ زیرمنوها و تیترهای سطح ۲ (H2):</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold">زیربخش‌های کتاب</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.heading2Color || activeTheme.headingColor}
                        onChange={e => setCustomColors({ ...customColors, heading2Color: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.heading2Color || activeTheme.headingColor}
                        onChange={e => setCustomColors({ ...customColors, heading2Color: e.target.value })}
                        placeholder="#2b6cb0"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 3. Heading H1 (عناوین اصلی و فصل‌ها) */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.heading1Color || activeTheme.headingColor }}
                        />
                        <span>رنگ تیتر اصلی و عناوین فصل‌ها (H1):</span>
                      </label>
                      <span className="text-[10px] text-slate-400">سرتیتر اول</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.heading1Color || activeTheme.headingColor}
                        onChange={e => setCustomColors({ ...customColors, heading1Color: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.heading1Color || activeTheme.headingColor}
                        onChange={e => setCustomColors({ ...customColors, heading1Color: e.target.value })}
                        placeholder="#1a365d"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 4. Subheadings H3 (میان‌تیترها و نکات) */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.heading3Color || activeTheme.accentColor }}
                        />
                        <span>رنگ میان‌تیترهای سطح ۳ (H3):</span>
                      </label>
                      <span className="text-[10px] text-slate-400">تیترهای کوچک</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.heading3Color || activeTheme.accentColor}
                        onChange={e => setCustomColors({ ...customColors, heading3Color: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.heading3Color || activeTheme.accentColor}
                        onChange={e => setCustomColors({ ...customColors, heading3Color: e.target.value })}
                        placeholder="#3182ce"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 5. Body Text Color */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.textColor || activeTheme.textColor }}
                        />
                        <span>رنگ متن اصلی پاراگراف‌ها:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">متن بدنه کتاب</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.textColor || activeTheme.textColor}
                        onChange={e => setCustomColors({ ...customColors, textColor: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.textColor || activeTheme.textColor}
                        onChange={e => setCustomColors({ ...customColors, textColor: e.target.value })}
                        placeholder="#2d3748"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 6. Page Background Color */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.pageBgColor || activeTheme.pageBgColor }}
                        />
                        <span>رنگ پس‌زمینه صفحات کتاب:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">رنگ کاغذ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.pageBgColor || activeTheme.pageBgColor}
                        onChange={e => setCustomColors({ ...customColors, pageBgColor: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.pageBgColor || activeTheme.pageBgColor}
                        onChange={e => setCustomColors({ ...customColors, pageBgColor: e.target.value })}
                        placeholder="#fbf6ea"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 7. Footer Text Color */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.footerColor || activeTheme.textColor }}
                        />
                        <span>رنگ فوتر و شماره صفحه:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">پایین صفحه</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.footerColor || activeTheme.textColor}
                        onChange={e => setCustomColors({ ...customColors, footerColor: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.footerColor || activeTheme.textColor}
                        onChange={e => setCustomColors({ ...customColors, footerColor: e.target.value })}
                        placeholder="#718096"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>

                  {/* 8. Border & Line Color */}
                  <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                          style={{ backgroundColor: customColors.borderColor || activeTheme.borderColor }}
                        />
                        <span>رنگ کادر و خطوط حاشیه:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">کادربندی چاپی</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColors.borderColor || activeTheme.borderColor}
                        onChange={e => setCustomColors({ ...customColors, borderColor: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={customColors.borderColor || activeTheme.borderColor}
                        onChange={e => setCustomColors({ ...customColors, borderColor: e.target.value })}
                        placeholder="#c5a059"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Custom Header, Footer & Website URL */}
            {activeTab === 'headers' && (
              <div className="space-y-4">
                {/* Website & Brand Info Input */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>اطلاعات برند، آدرس سایت یا انتشارات شما:</span>
                    </span>
                    <span className="text-[10px] text-slate-400">در هدر، فوتر و صفحه اول درج می‌شود</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">آدرس وب‌سایت شما:</label>
                      <input
                        type="text"
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        placeholder="مثال: www.mywebsite.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">نام سایت یا انتشارات:</label>
                      <input
                        type="text"
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        placeholder="مثال: انتشارات نوین اندیشه"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Running Header Settings */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                      <input
                        type="checkbox"
                        checked={showHeader}
                        onChange={e => setShowHeader(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span>درج هدر در بالای تمام صفحات کتاب (Running Header)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {showHeader ? 'فعال' : 'غیرفعال (بدون متن در بالای صفحه)'}
                    </span>
                  </div>

                  {showHeader ? (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-300 font-semibold">متن هدر بالا:</label>
                          <span className="text-[10px] text-slate-500">دقیقاً این متن بالای صفحات چاپ می‌شود</span>
                        </div>
                        <input
                          type="text"
                          value={headerText}
                          onChange={e => setHeaderText(e.target.value)}
                          placeholder="مثال: انتشارات نوین • www.mywebsite.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">پیش‌تنظیم‌های سریع:</span>
                        <button
                          type="button"
                          onClick={() => applyHeaderPreset('site_url')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
                        >
                          آدرس سایتم
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHeaderPreset('title_site')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
                        >
                          عنوان کتاب + سایتم
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHeaderPreset('title_only')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
                        >
                          فقط عنوان کتاب
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHeaderPreset('clear')}
                          className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[10px] border border-red-500/30 transition"
                        >
                          پاک کردن هدر
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px] p-2 bg-slate-900 rounded-xl">
                      هدر بالای صفحه غیرفعال است. هیچ متن، نام یا لینکی در بالای صفحات چاپ نخواهد شد.
                    </div>
                  )}
                </div>

                {/* Running Footer Settings */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                      <input
                        type="checkbox"
                        checked={showFooter}
                        onChange={e => setShowFooter(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span>درج فوتر در پایین صفحات کتاب (Running Footer)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {showFooter ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>

                  {showFooter ? (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-300 font-semibold">متن فوتر پایین:</label>
                          <span className="text-[10px] text-slate-500">حقوق ترجمه، یادداشت یا کانال ارتباطی</span>
                        </div>
                        <input
                          type="text"
                          value={footerText}
                          onChange={e => setFooterText(e.target.value)}
                          placeholder="مثال: کلیه حقوق ترجمه محفوظ است • www.mywebsite.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">پیش‌تنظیم‌های سریع:</span>
                        <button
                          type="button"
                          onClick={() => applyFooterPreset('site_rights')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
                        >
                          ترجمه اختصاصی سایتم
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFooterPreset('copyright')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
                        >
                          حقوق محفوظ است
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFooterPreset('translator')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
                        >
                          نام مترجم
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFooterPreset('clear')}
                          className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[10px] border border-red-500/30 transition"
                        >
                          خالی
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px] p-2 bg-slate-900 rounded-xl">
                      متن فوتر اختصاصی غیرفعال است (فقط شماره صفحه در صورت فعال بودن درج می‌شود).
                    </div>
                  )}

                  {/* General Checkboxes */}
                  <div className="pt-2 flex flex-wrap items-center gap-5 border-t border-slate-750">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={showPageNumbers}
                        onChange={e => setShowPageNumbers(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span>شماره‌گذاری خودکار صفحات</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={showCoverPage}
                        onChange={e => setShowCoverPage(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span>صفحه عنوان و جلد در ابتدای کتاب</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 col-span-1 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={continuousFlow}
                        onChange={e => setContinuousFlow(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                      />
                      <span className="font-semibold text-emerald-400">چیدمان پیوسته و زیر هم فصول (جلوگیری از صفحات خالی و فاصله گسترده)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Typography, Margins & Watermark */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                {/* Font & Spacing */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <h3 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-750 pb-2">
                    <Type className="w-3.5 h-3.5 text-purple-400" />
                    <span>قلم و فواصل چاپی:</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">فونت برای ورد و چاپ:</label>
                      <select
                        value={fontFamily}
                        onChange={e => setFontFamily(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500 font-medium"
                      >
                        <option value="Vazirmatn">Vazirmatn (پیش‌فرض مدرن و فصیح)</option>
                        <option value="Tahoma">Tahoma (موجود در ۱۰۰٪ سیستم‌ها - بدون نیاز به نصب)</option>
                        <option value="B Nazanin">B Nazanin (کتابی سنتی ناشران)</option>
                        <option value="B Mitra">B Mitra (مناسب رمان و ادبیات)</option>
                        <option value="IRANSans">IRANSans (ایران‌سنس)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">اندازه قلم متن:</label>
                      <select
                        value={fontSize}
                        onChange={e => setFontSize(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500 font-medium"
                      >
                        <option value="small">ریز (11pt - کتاب جیبی)</option>
                        <option value="medium">متوسط (12pt - استاندارد رقعی)</option>
                        <option value="large">درشت (14pt - خوانش راحت)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">فاصله خطوط:</label>
                      <select
                        value={lineSpacing}
                        onChange={e => setLineSpacing(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500 font-medium"
                      >
                        <option value="compact">فشرده (1.65)</option>
                        <option value="normal">استاندارد کتابی (1.95)</option>
                        <option value="relaxed">روان و باز (2.25)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">فاصله بین پاراگراف‌ها:</label>
                      <select
                        value={paragraphSpacing}
                        onChange={e => setParagraphSpacing(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500 font-medium"
                      >
                        <option value="compact">فشرده (14px)</option>
                        <option value="normal">استاندارد کتابی (24px)</option>
                        <option value="relaxed">روان و باز (32px)</option>
                        <option value="generous">عریض و لوکس (42px)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">تراز پاراگراف‌ها در Word و کتاب:</label>
                        <span className="text-[10px] text-amber-400">تنظیم چاپ</span>
                      </div>
                      <select
                        value={textAlignment}
                        onChange={e => setTextAlignment(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500 font-medium text-xs"
                      >
                        <option value="right">راست‌چین تمیز (توصیه شده برای Word - بدون کشیدگی و فاصله نازیبا)</option>
                        <option value="both">تراز دوطرفه (Justified - خط‌کشی شده دوطرف)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Dynamic Headings Sizing across the Book (سرتیترها و تیترها) */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                    <h3 className="font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>سایز سرتیترها و تیترها در کل کتاب (H1, H2, H3):</span>
                    </h3>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      اعمال سراسری روی تمامی فصول و صفحات
                    </span>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* H1 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-200 font-semibold flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold">H1</span>
                          <span>سرتیتر فصل‌ها و تیتر اصلی کتاب:</span>
                        </label>
                        <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-xs">
                          {heading1Size} pt
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-mono">16pt</span>
                        <input
                          type="range"
                          min="16"
                          max="36"
                          step="1"
                          value={heading1Size}
                          onChange={e => setHeading1Size(Number(e.target.value))}
                          className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">36pt</span>
                      </div>
                    </div>

                    {/* H2 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-200 font-semibold flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold">H2</span>
                          <span>زیرعنوان و تیترهای درجه ۲:</span>
                        </label>
                        <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-xs">
                          {heading2Size} pt
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-mono">13pt</span>
                        <input
                          type="range"
                          min="13"
                          max="28"
                          step="1"
                          value={heading2Size}
                          onChange={e => setHeading2Size(Number(e.target.value))}
                          className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">28pt</span>
                      </div>
                    </div>

                    {/* H3 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-200 font-semibold flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">H3</span>
                          <span>تیتر فرعی و بخش‌های کوچک:</span>
                        </label>
                        <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-xs">
                          {heading3Size} pt
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-mono">11pt</span>
                        <input
                          type="range"
                          min="11"
                          max="22"
                          step="1"
                          value={heading3Size}
                          onChange={e => setHeading3Size(Number(e.target.value))}
                          className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">22pt</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Iranian Book Trim Sizes (قطع استاندارد چاپ کتاب) */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>قطع استاندارد چاپ کتاب (ابعاد فیزیکی ناشران ایران):</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      {BOOK_TRIM_SIZES.find(s => s.id === trimSize)?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BOOK_TRIM_SIZES.map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setTrimSize(size.id)}
                        className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                          trimSize === size.id
                            ? 'bg-amber-500/10 border-amber-500/60 shadow-sm'
                            : 'bg-slate-900 border-slate-750 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${trimSize === size.id ? 'text-amber-400' : 'text-slate-200'}`}>
                            {size.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {size.dimensions}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{size.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300/80">{size.tag}</span>
                          {trimSize === size.id && <span className="text-amber-400 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> انتخاب شده</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Word Font Explanation & Download Section */}
                <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-amber-400 font-bold">
                      <Type className="w-4 h-4 text-amber-400" />
                      <span>راهنمای مهم نمایش فونت‌ها در نرم‌افزار Microsoft Word:</span>
                    </span>
                    <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      پشتیبانی کامل از فونت‌های فارسی
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    برخلاف مرورگر وب که فونت را به شکل اینترنتی دانلود و نمایش می‌دهد، نرم‌افزار <strong>Word</strong> فونت‌ها را از بین <strong>فونت‌های نصب‌شده روی ویندوز یا سیستم‌عامل شما</strong> فراخوانی می‌کند:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-750">
                      <span className="font-bold text-amber-300 block mb-1">روش اول: بدون نیاز به نصب هیچ فایلی</span>
                      <span className="text-slate-400 leading-relaxed">
                        فونت را روی <strong className="text-white">Tahoma</strong> بگذارید. تاهوما در ۱۰۰٪ نسخه‌های ویندوز و آفیس به شکل پیش‌فرض وجود دارد و فوراً با حروف‌چینی درست و منظم باز می‌شود.
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-750">
                      <span className="font-bold text-amber-300 block mb-1">روش دوم: بالاترین کیفیت چاپی (وزیرمتن)</span>
                      <span className="text-slate-400 leading-relaxed">
                        پکیج فونت وزیرمتن را از دکمه زیر دریافت کنید؛ سپس فایل‌های TTF را باز کرده و دکمه <strong className="text-white">Install</strong> را بزنید (۲ ثانیه). از آن پس، تمام اسناد کتاب با شکوه وزیرمتن در ورد باز می‌شوند.
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center gap-2.5">
                    <a
                      href="/fonts/Vazirmatn-Fonts.zip"
                      download="Vazirmatn-Fonts.zip"
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold transition flex items-center gap-1.5 text-xs shadow-md shadow-amber-500/20"
                      title="دانلود پکیج کامل فونت‌های وزن‌های مختلف وزیرمتن به صورت زیپ"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-950" />
                      <span>دانلود پکیج فونت‌های وزیرمتن برای ویندوز (ZIP)</span>
                    </a>
                    <a
                      href="/fonts/Vazirmatn-Regular.ttf"
                      download="Vazirmatn-Regular.ttf"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold transition flex items-center gap-1.5 text-xs"
                      title="دانلود مستقیم فونت عادی وزیرمتن (فایل تک TTF)"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>دانلود مستقیم فونت وزیرمتن (فایل TTF)</span>
                    </a>
                  </div>
                </div>

                {/* Margins */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-white flex items-center gap-1.5 mb-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      <span>فاصله حاشیه صفحه از لبه کاغذ (Margins):</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'compact', name: 'فشرده و اقتصادی', desc: 'حداکثر متن در هر صفحه' },
                        { id: 'normal', name: 'استاندارد کتابی (پیشنهادی)', desc: 'تعادل بین زیبایی و مصرف کاغذ' },
                        { id: 'generous', name: 'لوکس و عریض', desc: 'حاشیه باز برای کتب نفیس' },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPageMargin(m.id as any)}
                          className={`p-2.5 rounded-xl border text-right transition ${
                            pageMargin === m.id
                              ? 'bg-slate-800 border-blue-500 text-blue-300 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs">{m.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Margin & Header Spacing (فاصله متن از هدر و بالای صفحه) */}
                  <div className="pt-2 border-t border-slate-750/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span>فاصله متن از بالای صفحه و خط هدر (Top Margin):</span>
                      </label>
                      <span className="text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                        تنظیم فاصله تنفس بالای کتاب
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'compact', name: 'فشرده (۸ تا ۱۶ میلی‌متر)', desc: 'شروع سریع متن' },
                        { id: 'normal', name: 'کتابی (۱۲ تا ۲۲ میلی‌متر)', desc: 'استاندارد نشر (پیشنهادی)' },
                        { id: 'generous', name: 'باز و باوقار (۱۶ تا ۳۰ میلی‌متر)', desc: 'حاشیه هوای بالای صفحه' },
                        { id: 'extra_generous', name: 'آزاد و لوکس (۲۲ تا ۴۰ میلی‌متر)', desc: 'فاصله چشم‌نواز از هدر' },
                      ].map(tm => (
                        <button
                          key={tm.id}
                          type="button"
                          onClick={() => setTopMargin(tm.id as any)}
                          className={`p-2 rounded-xl border text-right transition ${
                            topMargin === tm.id
                              ? 'bg-slate-800 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs">{tm.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">{tm.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      💡 این گزینه فاصله متن را از خط هدر و لبه بالایی کاغذ در تمام صفحات PDF و چاپ تنظیم می‌کند تا متن هرگز به هدر یا لبه کاغذ نچسبد (حتی اگر هدر غیرفعال باشد).
                    </p>
                  </div>
                </div>

                {/* Custom Watermark Text */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>متن واترمارک اختصاصی در پس‌زمینه صفحات (اختیاری):</span>
                    </label>
                    <span className="text-[10px] text-slate-400">به صورت محو و زاویه‌دار در پس‌زمینه</span>
                  </div>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={e => setWatermarkText(e.target.value)}
                    placeholder="مثال: ترجمه اختصاصی www.mywebsite.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Page Exclusion & Selection Manager (حذف و انتخاب صفحات خروجی) */}
            {activeTab === 'pages' && (
              <div className="space-y-4">
                {/* Page Exclusion Header Box */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-750 pb-2.5">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <span>مدیریت و حذف صفحات در خروجی PDF و چاپ</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        صفحاتی که تیک آن‌ها را برمی‌دارید یا حذف می‌کنید، در خروجی PDF و Word قرار نمی‌گیرند.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
                        صفحات چاپی: <strong className="text-emerald-400">{(project.chunks || []).length - excludedChunkIds.length}</strong> از {(project.chunks || []).length}
                      </span>
                    </div>
                  </div>

                  {/* Quick Input: Delete by Page Number */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-750 space-y-2">
                    <label className="block text-slate-300 font-semibold text-xs">
                      حذف سریع بر اساس شماره صفحه:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pageNumberInput}
                        onChange={e => setPageNumberInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyExcludeByNumbers();
                          }
                        }}
                        placeholder="مثال: 3 یا 2, 4 یا 5-8"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyExcludeByNumbers}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف از PDF</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      می‌توانید یک شماره تک (مانند ۳)، چند شماره با ویرگول (۲, ۴, ۶) یا یک بازه (۴-۷) را وارد کنید.
                    </p>

                    {pageExcludeFeedback && (
                      <div className="mt-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                        <span>ℹ️</span>
                        <span>{pageExcludeFeedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Bulk Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleIncludeAllPages}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>انتخاب همه صفحات</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExcludeEmptyPages}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 transition flex items-center gap-1"
                    >
                      <Filter className="w-3.5 h-3.5 text-amber-400" />
                      <span>حذف صفحات خالی و ترجمه‌نشده</span>
                    </button>

                    {/* Dedicated Button to Exclude End-of-Book References */}
                    {referenceChunksCount > 0 && (
                      <button
                        type="button"
                        onClick={handleExcludeReferences}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-sm"
                        title="حذف خودکار تمام بخش‌های منابع، مآخذ و پی‌نوشت‌ها از خروجی نهایی PDF"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>حذف رفرنس‌ها و منابع پایان کتاب ({referenceChunksCount} بخش)</span>
                      </button>
                    )}

                    {/* Clean URLs from Book Text */}
                    {onUpdateProject && (
                      <button
                        type="button"
                        onClick={handleStripAllUrls}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
                        title="حذف کامل تمام لینک‌ها و آدرس‌های اینترنتی چاپ‌شده وسط متن کتاب"
                      >
                        <Link2Off className="w-3.5 h-3.5 text-amber-400" />
                        <span>پاکسازی تمام لینک‌ها و URLها از متن</span>
                      </button>
                    )}

                    {excludedChunkIds.length > 0 && (
                      <span className="text-[11px] text-rose-400 font-bold mr-auto">
                        {excludedChunkIds.length} صفحه از خروجی نهایی حذف شده است
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Pages List with Live Inspection */}
                <div className="bg-slate-850 p-3 sm:p-4 rounded-2xl border border-slate-750 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-750 pb-2">
                    <div>
                      <span className="text-white font-bold block">فهرست بخش‌ها و صفحات کتاب:</span>
                      <span className="text-[10px] text-slate-400">برای مشاهده و بررسی دقیق متن هر صفحه، روی ردیف آن کلیک نمایید.</span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-750 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPageFilterType('all')}
                        className={`px-2 py-0.5 rounded-lg transition ${
                          pageFilterType === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        همه ({(project.chunks || []).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageFilterType('included')}
                        className={`px-2 py-0.5 rounded-lg transition ${
                          pageFilterType === 'included' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        شامل در PDF ({(project.chunks || []).length - excludedChunkIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageFilterType('excluded')}
                        className={`px-2 py-0.5 rounded-lg transition ${
                          pageFilterType === 'excluded' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        حذف‌شده ({excludedChunkIds.length})
                      </button>
                      {referenceChunksCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setPageFilterType('references')}
                          className={`px-2 py-0.5 rounded-lg transition ${
                            pageFilterType === 'references' ? 'bg-purple-600 text-white font-bold' : 'text-purple-400 hover:text-purple-300'
                          }`}
                        >
                          منابع و رفرنس‌ها ({referenceChunksCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search within chunks */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={pageSearchQuery}
                      onChange={e => setPageSearchQuery(e.target.value)}
                      placeholder="جستجو در عنوان یا متن صفحات برای یافتن سریع..."
                      className="w-full bg-slate-900 border border-slate-750 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {(project.chunks || [])
                      .filter(chunk => {
                        const isExcluded = excludedChunkIds.includes(chunk.id);
                        const isRef = isReferenceOrBibliographyChunk(chunk);
                        if (pageFilterType === 'included' && isExcluded) return false;
                        if (pageFilterType === 'excluded' && !isExcluded) return false;
                        if (pageFilterType === 'references' && !isRef) return false;
                        if (pageSearchQuery.trim()) {
                          const q = pageSearchQuery.toLowerCase();
                          const matchTitle = (chunk.chapterTitle || '').toLowerCase().includes(q);
                          const matchText = (chunk.englishText || '').toLowerCase().includes(q);
                          const matchFa = (chunk.translatedHtml || '').toLowerCase().includes(q);
                          const matchNum = String(chunk.chunkNumber).includes(q);
                          if (!matchTitle && !matchText && !matchFa && !matchNum) return false;
                        }
                        return true;
                      })
                      .map((chunk, idx) => {
                        const isExcluded = excludedChunkIds.includes(chunk.id);
                        const isInspecting = inspectingChunkId === chunk.id;
                        const isRef = isReferenceOrBibliographyChunk(chunk);
                        const hasTranslation = Boolean(chunk.translatedHtml && chunk.translatedHtml.trim().length > 0);

                        return (
                          <div
                            key={chunk.id}
                            className={`rounded-2xl border transition overflow-hidden ${
                              isExcluded
                                ? 'bg-rose-950/20 border-rose-500/30'
                                : 'bg-slate-900 border-slate-750 hover:border-slate-650'
                            }`}
                          >
                            {/* Row Header */}
                            <div
                              onClick={() => setInspectingChunkId(prev => prev === chunk.id ? null : chunk.id)}
                              className="p-3 cursor-pointer flex items-center justify-between gap-3 select-none"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => handleToggleChunkExcluded(chunk.id)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 shrink-0"
                                />

                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                                  صفحه {chunk.chunkNumber || idx + 1}
                                </span>

                                <div className="min-w-0 truncate">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold truncate text-xs ${isExcluded ? 'line-through text-slate-500' : 'text-white'}`}>
                                      {cleanChapterTitle(chunk.chapterTitle)}
                                    </span>
                                    {isRef && (
                                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 shrink-0">
                                        بخش منابع / رفرنس
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-md mt-0.5">
                                    {chunk.englishText.slice(0, 60)}...
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  hasTranslation
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}>
                                  {hasTranslation ? `${chunk.wordCount || 0} کلمه` : 'ترجمه‌نشده'}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleChunkExcluded(chunk.id);
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                                    isExcluded
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  {isExcluded ? (
                                    <>
                                      <EyeOff className="w-3 h-3 text-rose-400" />
                                      <span className="hidden sm:inline">حذف از PDF</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="hidden sm:inline">چاپ در PDF</span>
                                    </>
                                  )}
                                </button>

                                <span className="p-1 rounded text-slate-400 hover:text-white transition">
                                  {isInspecting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </span>
                              </div>
                            </div>

                            {/* Inspection Preview Drawer */}
                            {isInspecting && (
                              <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 space-y-3 animate-in fade-in">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-300">پیش‌نمایش محتوای صفحه:</span>
                                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-750 text-[10px]">
                                      <button
                                        type="button"
                                        onClick={() => setInspectingLangTab('fa')}
                                        className={`px-2 py-0.5 rounded font-bold transition ${
                                          inspectingLangTab === 'fa' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        ترجمه فارسی (چاپی)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setInspectingLangTab('en')}
                                        className={`px-2 py-0.5 rounded font-bold transition ${
                                          inspectingLangTab === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        متن اصلی انگلیسی
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isExcluded ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleChunkExcluded(chunk.id)}
                                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>بازگرداندن و چاپ این صفحه در PDF</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleChunkExcluded(chunk.id)}
                                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>حذف این صفحه از خروجی PDF</span>
                                      </button>
                                    )}

                                    {onDeleteChunk && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`آیا از حذف دائمی صفحه ${chunk.chunkNumber} (${cleanChapterTitle(chunk.chapterTitle)}) از کل کتاب اطمینان دارید؟`)) {
                                            onDeleteChunk(chunk.id);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[11px] flex items-center gap-1 transition"
                                        title="حذف دائمی این بخش از دیتابیس کتاب"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                        <span>حذف کامل از کتاب</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Text View Area */}
                                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl max-h-56 overflow-y-auto text-xs leading-relaxed">
                                  {inspectingLangTab === 'fa' ? (
                                    chunk.translatedHtml ? (
                                      <div
                                        className="book-render-content text-slate-200"
                                        dangerouslySetInnerHTML={{ __html: chunk.translatedHtml }}
                                      />
                                    ) : (
                                      <div className="text-slate-500 text-center py-6">
                                        این صفحه هنوز ترجمه نشده است.
                                      </div>
                                    )
                                  ) : (
                                    <div className="text-slate-300 font-sans whitespace-pre-wrap" dir="ltr">
                                      {chunk.englishText}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Notification Banner */}
            {savedBanner && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{savedBanner}</span>
              </div>
            )}
          </div>

          {/* Live Page Mockup Column (6 or 5 cols) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('body')}
                  className={`px-3 py-1 rounded-lg transition font-semibold flex items-center gap-1 ${
                    previewMode === 'body'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>صفحات متن کتاب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('cover')}
                  className={`px-3 py-1 rounded-lg transition font-semibold flex items-center gap-1 ${
                    previewMode === 'cover'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>صفحه اول و جلد</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400">
                {activeTheme.name.split(' (')[0]} • {activeTheme.dividerSymbol}
              </span>
            </div>

            {/* Simulated Printed Page */}
            <div
              className={`flex-1 rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between transition-all duration-300 select-none overflow-hidden min-h-[460px] relative ${
                borderStyle === 'ornate_spiritual'
                  ? 'border-4 border-double'
                  : borderStyle === 'double_classic'
                  ? 'border-4 border-double'
                  : borderStyle === 'thin_modern'
                  ? 'border'
                  : ''
              }`}
              style={{
                backgroundColor: customColors.pageBgColor || activeTheme.pageBgColor,
                color: customColors.textColor || activeTheme.textColor,
                borderColor: customColors.borderColor || activeTheme.borderColor,
                fontFamily: `'${fontFamily}', 'Vazirmatn', sans-serif`,
              }}
            >
              {/* Optional Subtle Watermark in Preview */}
              {watermarkText.trim() && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] overflow-hidden select-none">
                  <div
                    className="transform -rotate-45 text-2xl font-bold tracking-widest text-center whitespace-nowrap"
                    style={{ color: customColors.heading1Color || activeTheme.headingColor }}
                  >
                    {watermarkText}
                  </div>
                </div>
              )}

              {previewMode === 'cover' ? (
                /* ================= COVER PAGE PREVIEW ================= */
                <div
                  className={`my-auto py-6 space-y-4 w-full ${
                    coverLayout === 'right_aligned' ? 'text-right' : 'text-center'
                  } ${
                    coverLayout === 'framed_spiritual'
                      ? 'border-2 border-double p-5 rounded-2xl'
                      : ''
                  }`}
                  style={{
                    borderColor: customColors.borderColor || activeTheme.borderColor,
                  }}
                >
                  {/* Ornate Motif */}
                  {coverShowMotif && (
                    <div
                      className="text-lg tracking-[6px] select-none"
                      style={{ color: customColors.accentColor || activeTheme.accentColor }}
                    >
                      ✤ ───── ❦ ───── ✤
                    </div>
                  )}

                  {/* Title */}
                  <div className="space-y-1.5 pt-2">
                    <h2
                      className="font-extrabold tracking-tight leading-tight"
                      style={{
                        fontSize: `${coverTitleSize * 0.72}pt`,
                        color: coverTitleColor || customColors.heading1Color || activeTheme.headingColor,
                      }}
                    >
                      {coverTitle || project.title || project.originalTitle || 'عنوان کتاب'}
                    </h2>

                    {coverSubtitle && (
                      <p
                        className="opacity-75 font-serif italic"
                        style={{
                          fontSize: `${coverSubtitleSize * 0.75}pt`,
                          color: coverSubtitleColor || customColors.textColor || activeTheme.textColor,
                        }}
                      >
                        {coverSubtitle}
                      </p>
                    )}
                  </div>

                  {/* Divider Symbol */}
                  {coverShowDivider && (
                    <div
                      className="text-base select-none py-1"
                      style={{ color: customColors.accentColor || activeTheme.accentColor }}
                    >
                      ❖
                    </div>
                  )}

                  {/* Author, Translator, Publisher */}
                  <div className="space-y-2 pt-2">
                    {(coverAuthor || project.author) && (
                      <div
                        className="font-bold opacity-90"
                        style={{
                          fontSize: `${coverAuthorSize * 0.75}pt`,
                          color: coverAuthorColor || customColors.textColor || activeTheme.textColor,
                        }}
                      >
                        نویسنده: {coverAuthor || project.author}
                      </div>
                    )}

                    {(coverTranslator || project.translator) && (
                      <div
                        className="text-xs opacity-80"
                        style={{ color: customColors.textColor || activeTheme.textColor }}
                      >
                        ترجمه و نگارش: {coverTranslator || project.translator}
                      </div>
                    )}

                    {coverPublisher && (
                      <div
                        className="text-xs font-semibold pt-1"
                        style={{ color: customColors.headerColor || activeTheme.textColor }}
                      >
                        {coverPublisher}
                      </div>
                    )}
                  </div>

                  {/* Bottom Note */}
                  {coverNote && (
                    <div
                      className="text-[10px] opacity-60 pt-4 border-t border-dashed"
                      style={{
                        borderColor: customColors.borderColor || activeTheme.borderColor,
                        color: customColors.footerColor || activeTheme.textColor,
                      }}
                    >
                      {coverNote}
                    </div>
                  )}
                </div>
              ) : (
                /* ================= BODY PAGE PREVIEW ================= */
                <>
                  {/* Running Header */}
                  {showHeader && headerText ? (
                    <div>
                      <div
                        className="border-b pb-2 flex items-center justify-between text-[10px] opacity-85"
                        style={{
                          borderColor: customColors.borderColor || activeTheme.borderColor,
                          color: customColors.headerColor || activeTheme.textColor,
                        }}
                      >
                        <span className="font-bold truncate max-w-[200px]">{headerText}</span>
                        <span className="font-serif italic text-[9px] truncate max-w-[110px]" dir="ltr">
                          {project.originalTitle || 'Chapter 1'}
                        </span>
                      </div>
                      {/* Visual Top Margin Breathing Room */}
                      <div style={{ height: topMargin === 'compact' ? '8px' : topMargin === 'generous' ? '20px' : topMargin === 'extra_generous' ? '30px' : '14px' }} />
                    </div>
                  ) : (
                    <div style={{ height: topMargin === 'compact' ? '12px' : topMargin === 'generous' ? '28px' : topMargin === 'extra_generous' ? '38px' : '18px' }} className="flex items-center justify-center">
                      <span className="text-[8.5px] text-slate-400/50 italic border-b border-dashed border-slate-300/40 pb-0.5">
                        (حاشیه بالای صفحه: {topMargin === 'compact' ? 'فشرده' : topMargin === 'generous' ? 'باز' : topMargin === 'extra_generous' ? 'لوکس' : 'استاندارد کتابی'})
                      </span>
                    </div>
                  )}

                  {/* Sample Content */}
                  <div className="my-auto py-3 space-y-2.5 text-right">
                    {/* Chapter Title & Divider (H1 with heading1Size) */}
                    <div className="text-center space-y-1">
                      <h3
                        className="font-extrabold tracking-tight"
                        style={{
                          color: customColors.heading1Color || activeTheme.headingColor,
                          fontSize: `${heading1Size * 0.72}pt`,
                        }}
                      >
                        فصل اول: دروازه ورود به آرامش درون
                      </h3>
                      <div
                        className="text-xs font-serif opacity-85"
                        style={{ color: customColors.accentColor || activeTheme.accentColor }}
                      >
                        {activeTheme.dividerSymbol}
                      </div>
                    </div>

                    {/* Subheadings H2 & H3 (زیرمنوها با heading2Size و heading3Size) */}
                    <div className="pt-1">
                      <h4
                        className="font-bold tracking-tight pb-0.5"
                        style={{
                          color: customColors.heading2Color || activeTheme.headingColor,
                          fontSize: `${heading2Size * 0.72}pt`,
                        }}
                      >
                        زیرمنو و تیتر فرعی: رهایی از بند تعاریف ذهنی
                      </h4>
                      <h5
                        className="font-semibold"
                        style={{
                          color: customColors.heading3Color || activeTheme.accentColor,
                          fontSize: `${heading3Size * 0.72}pt`,
                        }}
                      >
                        بخش ۱.۱: مشاهده‌گری بدون قضاوت و سکون ذهن
                      </h5>
                    </div>

                    {/* Sample Distinct Paragraph 1 */}
                    <p
                      className="text-justify leading-relaxed text-[11px] sm:text-xs"
                      style={{
                        lineHeight: lineSpacing === 'compact' ? 1.65 : lineSpacing === 'relaxed' ? 2.25 : 1.95,
                        fontSize: fontSize === 'small' ? '10px' : fontSize === 'large' ? '13px' : '11.5px',
                        marginBottom: paragraphSpacing === 'compact' ? '12px' : paragraphSpacing === 'generous' ? '28px' : paragraphSpacing === 'relaxed' ? '22px' : '16px',
                        color: customColors.textColor || activeTheme.textColor,
                      }}
                    >
                      بزرگ‌ترین مانع در مسیر درک حقیقت، هم‌هویت‌شدن با{' '}
                      <span style={{ color: customColors.accentColor || '#9b2c2c', fontWeight: 'bold' }}>ذهن شرطی‌شده</span> است. هنگامی که انسان اسیر
                      جریان بی‌پایان افکار می‌گردد، ارتباط بنیادین خود را با ساحت آرامش درونی از دست می‌دهد.
                    </p>

                    {/* Sample Quote */}
                    <div
                      className="p-2.5 rounded-lg border-r-4 text-[10.5px] italic opacity-95 my-1"
                      style={{
                        borderRightColor: customColors.accentColor || activeTheme.accentColor,
                        backgroundColor: `${customColors.borderColor || activeTheme.borderColor}20`,
                        color: customColors.textColor || activeTheme.textColor,
                      }}
                    >
                      «سکوت، زبانی است که کائنات به واسطه آن ژرف‌ترین حقایق را آشکار می‌سازد.»
                    </div>

                    {/* Sample Distinct Paragraph 2 */}
                    <p
                      className="text-justify leading-relaxed text-[11px] sm:text-xs"
                      style={{
                        lineHeight: lineSpacing === 'compact' ? 1.65 : lineSpacing === 'relaxed' ? 2.25 : 1.95,
                        fontSize: fontSize === 'small' ? '10px' : fontSize === 'large' ? '13px' : '11.5px',
                        color: customColors.textColor || activeTheme.textColor,
                      }}
                    >
                      با ایجاد فاصله شفاف بین پاراگراف‌ها، ذهن خواننده فرصت تامل و تنفس می‌یابد و هماهنگی بصری کتاب چاپی به اوج می‌رسد.
                    </p>
                  </div>

                  {/* Running Footer */}
                  {showFooter && footerText ? (
                    <div
                      className="border-t pt-2 flex items-center justify-between text-[10px] opacity-85"
                      style={{
                        borderColor: customColors.borderColor || activeTheme.borderColor,
                        color: customColors.footerColor || activeTheme.textColor,
                      }}
                    >
                      <span className="truncate max-w-[200px]">{footerText}</span>
                      {showPageNumbers && <span className="font-bold font-mono">صفحه ۲۴</span>}
                    </div>
                  ) : showPageNumbers ? (
                    <div
                      className="border-t pt-1 flex items-center justify-end text-[10px] opacity-85"
                      style={{
                        borderColor: customColors.borderColor || activeTheme.borderColor,
                        color: customColors.footerColor || activeTheme.textColor,
                      }}
                    >
                      <span className="font-bold font-mono">صفحه ۲۴</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-400/50 pt-1 italic border-t border-dashed border-slate-300/40">
                      (بدون فوتر در پایین صفحه)
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>قالب: {activeTheme.name}</span>
              <span>کادر: {BORDER_STYLES.find(b => b.id === borderStyle)?.name}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFullBook}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
              title="کپی کردن متن کامل تمام بخش‌ها"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>کپی متن کتاب</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Standard Word DOCX Button */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
              title="دانلود فایل رسمی استاندارد مایکروسافت ورد (.docx) آماده چاپ"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingDocx ? 'درحال ساخت سند رسمی ورد...' : 'دانلود فایل استاندارد Word (.docx)'}</span>
            </button>

            {/* Print & Save PDF Button */}
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 font-bold"
              title="چاپ مستقیم یا ذخیره به صورت PDF با تنظیمات دلخواه"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>چاپ و ذخیره فایل PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
