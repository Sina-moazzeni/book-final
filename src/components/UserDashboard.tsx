import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowUpRight,
  RefreshCw,
  LogOut,
  Sliders,
  ChevronLeft,
  BarChart3,
  Table,
  LayoutGrid,
  Coins,
  FileCheck
} from 'lucide-react';
import { User, BookProject, TranslationJob } from '../types.ts';
import { InvoiceModal } from './InvoiceModal.tsx';

interface UserDashboardProps {
  user: User;
  books: BookProject[];
  activeJobs: TranslationJob[];
  onOpenNewBook: () => void;
  onSelectBook: (book: BookProject) => void;
  onOpenWallet: () => void;
  onOpenAdmin?: () => void;
  onLogout: () => void;
  onDeleteBook: (bookId: string) => void;
  onStartTranslation: (book: BookProject) => void;
  onExportDocx: (book: BookProject) => void;
  onExportPdf: (book: BookProject) => void;
  onExportEpub: (book: BookProject) => void;
  costPerWord?: number;
  onRefresh: () => void;
}

export function UserDashboard({
  user,
  books = [],
  activeJobs = [],
  costPerWord: systemCostPerWord = 45,
  onOpenNewBook,
  onSelectBook,
  onOpenWallet,
  onOpenAdmin,
  onLogout,
  onDeleteBook,
  onStartTranslation,
  onExportDocx,
  onExportPdf,
  onExportEpub,
  onRefresh,
}: UserDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'translating' | 'draft'>('all');
  const [dashboardTab, setDashboardTab] = useState<'grid' | 'analytics'>('grid');
  const [invoiceBook, setInvoiceBook] = useState<BookProject | null>(null);
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string; type?: string; linkUrl?: string; linkText?: string } | null>(null);
  const [resumingBookId, setResumingBookId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/system/public-announcement')
      .then(res => res.json())
      .then(data => {
        if (data?.announcement?.enabled && data.announcement.text) {
          setAnnouncement(data.announcement);
        }
      })
      .catch(() => {});
  }, []);

  const handleResumeIncompleteBook = async (b: BookProject) => {
    try {
      setResumingBookId(b.id);
      const token = user.token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '') || '';
      const res = await fetch(`/api/books/${b.id}/resume-translation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          alert('سشن ورود شما منقضی شده است. لطفاً یک‌بار از حساب خارج شده و مجدداً وارد شوید.');
          return;
        }
        if (res.status === 402) {
          alert(data.error || 'موجودی کیف پول شما برای ادامه ترجمه کافی نیست.');
          onOpenWallet();
          return;
        }
        throw new Error(data.error || 'خطا در برقراری ارتباط با صف ترجمه');
      }

      alert(data.message || 'ادامه ترجمه با موفقیت فعال شد و بخش‌های ناقص در صف پردازش ابری سرور قرار گرفتند.');
      onRefresh();
    } catch (err: any) {
      alert(`خطا در ادامه ترجمه: ${err.message}`);
    } finally {
      setResumingBookId(null);
    }
  };

  // Helper for per-book words and financial calculations
  const getBookUsage = (b: BookProject) => {
    const totalChunks = (b as any).totalChunks !== undefined ? (b as any).totalChunks : (b.chunks?.length || 0);
    // Real completion requires non-empty translatedHtml
    const completedChunks = (b as any).completedChunks !== undefined
      ? (b as any).completedChunks
      : (b.chunks?.filter((c) => c.status === 'completed' && Boolean(c.translatedHtml && c.translatedHtml.trim().length > 0)).length || 0);
    const totalWords = b.wordCount || b.chunks?.reduce((acc, c) => acc + (c.wordCount || 0), 0) || 0;
    
    // Strict calculation: A book is ONLY 100% completed if totalChunks > 0 and all chunks are completed!
    const isCompleted = totalChunks > 0 && completedChunks === totalChunks;
    const percent = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;

    const completedWords = (b.chunks && b.chunks.length > 0)
      ? b.chunks.filter((c) => c.status === 'completed' && Boolean(c.translatedHtml && c.translatedHtml.trim().length > 0)).reduce((acc, c) => acc + (c.wordCount || 0), 0)
      : Math.round(totalWords * (percent / 100));

    const isSpecialized = b.tone === 'academic' || b.tone === 'aerospace' || b.tone === 'mathematics';
    const effectiveCostPerWord = Math.round(systemCostPerWord * (isSpecialized ? 1.25 : 1.0));
    const incurredCost = completedWords > 0
      ? Math.round(completedWords * effectiveCostPerWord)
      : (b.estimatedCost || Math.round(totalWords * effectiveCostPerWord));

    const isTranslating = activeJobs.some((j) => j.bookId === b.id) || (b.chunks ? b.chunks.some((c) => c.status === 'queued' || c.status === 'translating') : (percent > 0 && percent < 100));

    return {
      totalChunks,
      completedChunks,
      totalWords,
      completedWords,
      incurredCost,
      costPerWord: effectiveCostPerWord,
      percent,
      isCompleted,
      isTranslating,
    };
  };

  // Strict User Isolation: Ensure only books created by this user are displayed (never other users or recovered placeholders)
  const userOwnedBooks = books.filter((b) => {
    if (b.userId && user.id && b.userId !== user.id) return false;
    if (b.title === 'کتاب بازیابی شده' || b.originalTitle === 'Recovered Book') return false;
    return true;
  });

  // Compute stats for current user's books
  const totalBooks = userOwnedBooks.length;
  let totalWordsTranslated = 0;
  let completedBooksCount = 0;
  let totalUserSpentOnBooks = 0;

  userOwnedBooks.forEach((b) => {
    const usage = getBookUsage(b);
    totalWordsTranslated += usage.completedWords;
    totalUserSpentOnBooks += usage.incurredCost;
    if (usage.isCompleted) {
      completedBooksCount++;
    }
  });

  const filteredBooks = userOwnedBooks.filter((b) => {
    const usage = getBookUsage(b);
    const isCompleted = usage.isCompleted;
    const isTranslating = usage.isTranslating;

    if (filter === 'completed') return isCompleted;
    if (filter === 'translating') return isTranslating;
    if (filter === 'draft') return !isCompleted && !isTranslating;
    return true;
  });

  const getToneLabel = (tone?: string) => {
    switch (tone) {
      case 'spiritual': return 'معنوی و خودشناسی';
      case 'novel': return 'رمان و ادبیات';
      case 'self_help': return 'روانشناسی و رشد فردی';
      case 'academic': return 'دانشگاهی و پژوهشی';
      case 'business': return 'اقتصادی و مالی';
      case 'aerospace': return 'علوم هوافضا و فیزیک';
      case 'mathematics': return 'ریاضیات و مهندسی';
      case 'candid_secrets': return 'صریح و افشاگرانه';
      case 'romance_erotic': return 'عاشقانه، روابط و اروتیک';
      default: return 'ادبی و عمومی';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Vazirmatn'] selection:bg-amber-500/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Top row on mobile: Brand, user overview and quick utility icons */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-white text-xs sm:text-base truncate">میز کاربری کتاب‌ها</span>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
                    user.role === 'admin'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      : user.role === 'staff'
                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                      : user.role === 'publisher'
                      ? 'bg-purple-500/10 border border-purple-500/30 text-purple-300'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}>
                    {user.role === 'admin' ? '👑 مدیر ارشد' : user.role === 'staff' ? '🛡️ پرسنل' : user.role === 'publisher' ? '🏢 ناشر' : '👤 کاربر'}
                  </span>
                  {user.organizationName && (
                    <span className="hidden md:inline text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 truncate">
                      {user.organizationName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                  <span className="font-medium text-slate-300 truncate max-w-[110px] sm:max-w-none">{user.name}</span>
                  <span className="font-mono text-slate-500 hidden xs:inline truncate">({user.phone || user.email})</span>
                  <span className="text-amber-400/90 font-mono text-[9px] sm:text-[10px] bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                    {systemCostPerWord} ت/کلمه
                    {user.discountPercent ? ` (${user.discountPercent}٪ تخفیف)` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Top-Right Actions (Staff/Admin Shortcut + Logout) */}
            <div className="flex items-center gap-1.5 sm:hidden shrink-0">
              {(user.role === 'admin' || user.role === 'staff') && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all ${
                    user.role === 'staff'
                      ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                  title={user.role === 'staff' ? 'میز پرسنل و پشتیبانی' : 'پنل مدیریت'}
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onLogout}
                title="خروج از حساب"
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 transition-all shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Row: Symmetrical & Balanced on Mobile, Right-aligned on Desktop */}
          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
            {/* Wallet Quick Pill */}
            <button
              onClick={onOpenWallet}
              className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-xs transition-all group shrink-0"
              title="شارژ و مشاهده تراکنش‌های کیف پول"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Wallet className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <div className="text-right truncate">
                  <span className="text-slate-400 text-[9px] sm:text-[10px] block leading-none">کیف پول:</span>
                  <span className="font-bold text-white text-xs">
                    {user.walletBalance.toLocaleString('en-US')}{' '}
                    <span className="text-[9px] sm:text-[10px] font-normal text-slate-400">تومان</span>
                  </span>
                </div>
              </div>
              <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3" />
              </span>
            </button>

            {/* Blog Quick Link (Desktop) */}
            <a
              href="/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-amber-400 transition-all shrink-0"
              title="مشاهده وبلاگ و مقالات"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>وبلاگ</span>
            </a>

            {/* Admin / Staff Switcher (Desktop) */}
            {(user.role === 'admin' || user.role === 'staff') && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  user.role === 'staff'
                    ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{user.role === 'staff' ? 'میز پرسنل' : 'پنل مدیریت'}</span>
              </button>
            )}

            {/* New Book Action Button */}
            <button
              onClick={onOpenNewBook}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">ثبت کتاب جدید</span>
            </button>

            {/* Logout (Desktop Only - Avoids Mobile Duplicate) */}
            <button
              onClick={onLogout}
              title="خروج از حساب"
              className="hidden sm:inline-flex p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 transition-all shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Global Broadcast Announcement Banner */}
        {announcement && (
          <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-950/30 border border-amber-500/30 flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-ping"></span>
              <span className="text-amber-200 font-medium leading-relaxed">{announcement.text}</span>
            </div>
            {announcement.linkUrl && (
              <a
                href={announcement.linkUrl}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 text-[11px] transition"
              >
                {announcement.linkText || 'مشاهده'}
              </a>
            )}
          </div>
        )}

        {/* Active Background Jobs Banner (Cloud Processing Guarantee) */}
        {activeJobs.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">ترجمه ابری در پس‌زمینه سرور در حال انجام است</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      پایدار و مستقل از مرورگر
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    می‌توانید با خیال آسوده این پنجره را ببندید یا دستگاه را خاموش کنید؛ ترجمه مستقیماً در پایگاه داده سرور ذخیره می‌شود.
                  </p>
                </div>
              </div>

              <button
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                بروزرسانی وضعیت
              </button>
            </div>

            {/* List active jobs progress bars */}
            <div className="mt-4 space-y-3 pt-3 border-t border-slate-800/80">
              {activeJobs.map((job) => {
                const book = books.find((b) => b.id === job.bookId);
                return (
                  <div key={job.id} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-semibold text-amber-300">
                        کتاب: «{book?.title || 'در حال ترجمه'}»
                        {job.currentChunkTitle && <span className="text-slate-400 font-normal mr-2">({job.currentChunkTitle})</span>}
                      </span>
                      <span className="font-mono text-amber-400 font-bold">{job.progressPercent}% ({job.completedChunks} از {job.totalChunks} بخش)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, job.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              کتاب‌های من
            </div>
            <div className="text-2xl font-black text-white">{totalBooks}</div>
            <div className="text-[11px] text-slate-500 mt-1">{completedBooksCount} کتاب به پایان رسیده</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              کلمات ترجمه‌شده شما
            </div>
            <div className="text-2xl font-black text-amber-400">{totalWordsTranslated.toLocaleString('en-US')}</div>
            <div className="text-[11px] text-slate-500 mt-1">کلمه با کیفیت ادبی و فصیح</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-400" />
              هزینه مصرفی کتاب‌ها
            </div>
            <div className="text-2xl font-black text-emerald-400">{totalUserSpentOnBooks.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">تومان</span></div>
            <div className="text-[11px] text-emerald-400/80 mt-1">کسر شده متناسب با کلمات</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-400" />
                مانده کیف پول
              </div>
              <div className="text-2xl font-black text-white">{user.walletBalance.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">تومان</span></div>
            </div>
            <button
              onClick={onOpenWallet}
              className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>شارژ و افزایش اعتبار</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section Header & Tab Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{dashboardTab === 'grid' ? 'کتابخانه و پروژه‌های من' : 'گزارش شفاف آمار و هزینه‌ها به تفکیک کتاب'}</span>
              <span className="text-xs text-slate-400 font-normal">({filteredBooks.length} کتاب)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {dashboardTab === 'grid'
                ? 'مشاهده وضعیت ترجمه، ویرایش متن، یا دانلود با خروجی‌های Word و PDF'
                : 'مشاهده دقیق تعداد کلمات ترجمه‌شده هر کتاب و هزینه کسر شده از کیف پول'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setDashboardTab('grid')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  dashboardTab === 'grid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>نمای کارتی</span>
              </button>
              <button
                onClick={() => setDashboardTab('analytics')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  dashboardTab === 'analytics' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>گزارش هزینه‌ها</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                همه ({books.length})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${filter === 'completed' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                پایان‌یافته ({completedBooksCount})
              </button>
              <button
                onClick={() => setFilter('translating')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${filter === 'translating' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                در حال ترجمه
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {books.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">هنوز هیچ کتابی ثبت نکرده‌اید!</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              کتاب انگلیسی خود را در هر فرمتی (PDF، Word، EPUB یا TXT) بارگذاری نمایید. سیستم تعداد کلمات را می‌سنجد و ترجمه را به صورت ابری شروع می‌کند.
            </p>
            <button
              onClick={onOpenNewBook}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>بارگذاری و شروع اولین کتاب</span>
            </button>
          </div>
        ) : dashboardTab === 'analytics' ? (
          /* TAB 2: DETAILED COST & WORD LEDGER TABLE */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">تراز تفکیکی کلمات ترجمه‌شده و مبالغ کسر شده هر کتاب</h3>
              </div>
              <span className="text-xs text-slate-400">
                مجموع کلمات پردازش شده: <b className="text-amber-400 font-mono">{totalWordsTranslated.toLocaleString('en-US')}</b> | مجموع هزینه: <b className="text-emerald-400 font-mono">{totalUserSpentOnBooks.toLocaleString('en-US')} تومان</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold">
                    <th className="py-3 px-4">ردیف</th>
                    <th className="py-3 px-4">عنوان کتاب</th>
                    <th className="py-3 px-4">لحن و رشته</th>
                    <th className="py-3 px-4">کلمات ترجمه‌شده</th>
                    <th className="py-3 px-4">کل کلمات</th>
                    <th className="py-3 px-4">پیشرفت</th>
                    <th className="py-3 px-4">هزینه هر کلمه</th>
                    <th className="py-3 px-4">کل هزینه ایجاد شده</th>
                    <th className="py-3 px-4">وضعیت تسویه</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBooks.map((b, idx) => {
                    const usage = getBookUsage(b);
                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <strong className="text-white font-bold block text-sm line-clamp-1">{b.title}</strong>
                          <span className="text-[11px] text-slate-400 font-serif line-clamp-1" dir="ltr">{b.originalTitle || b.title}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300 border border-slate-700">
                            {getToneLabel(b.tone)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold font-mono text-amber-400 text-sm">
                            {usage.completedWords.toLocaleString('en-US')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {usage.totalWords.toLocaleString('en-US')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-300">{usage.percent}٪</span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${usage.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                style={{ width: `${usage.percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {usage.costPerWord} تومان
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold font-mono text-emerald-400 text-sm">
                            {usage.incurredCost.toLocaleString('en-US')} تومان
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {usage.isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              تسویه شده کامل
                            </span>
                          ) : usage.isTranslating ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              در حال کسر پویا
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              پیش‌نویس اولیه
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSelectBook(b)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>مشاهده</span>
                            </button>
                            <button
                              onClick={() => onExportDocx(b)}
                              title="خروجی Word"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onExportPdf(b)}
                              title="خروجی PDF"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setInvoiceBook(b)}
                              title="صدور پیش‌فاکتور رسمی"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                            >
                              <FileCheck className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1: BOOKS CARDS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const usage = getBookUsage(book);
              const totalChunks = usage.totalChunks;
              const completedChunks = usage.completedChunks;
              const isAllDone = usage.isCompleted;
              const isTranslating = usage.isTranslating;
              const percent = usage.percent;

              return (
                <div
                  key={book.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg"
                >
                  <div>
                    {/* Top Row Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 border border-slate-700/80">
                        {getToneLabel(book.tone)}
                      </span>
                      {isAllDone ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          تکمیل شده (۱۰۰٪)
                        </span>
                      ) : isTranslating ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          در حال ترجمه ({percent}٪)
                        </span>
                      ) : completedChunks > 0 ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          ناقص ({percent}٪ - آماده ادامه)
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          پیش‌نویس اولیه
                        </span>
                      )}
                    </div>

                    {/* Book Titles */}
                    <h3
                      onClick={() => onSelectBook(book)}
                      className="font-bold text-base text-white line-clamp-1 mb-1 group-hover:text-amber-400 transition-colors cursor-pointer"
                      title="مشاهده و ویرایش کتاب"
                    >
                      {book.title}
                    </h3>
                    <p
                      onClick={() => onSelectBook(book)}
                      className="text-xs text-slate-400 line-clamp-1 mb-3 font-serif cursor-pointer hover:text-slate-300 transition-colors"
                      dir="ltr"
                    >
                      {book.originalTitle || book.title}
                    </p>

                    {/* Book Metadata & Cost Transparency */}
                    <div className="space-y-2 text-[11px] bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 block">نویسنده:</span>
                          <span className="text-slate-300 font-medium truncate block">{book.author || 'نامشخص'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">بخش‌های کتاب:</span>
                          <span className="text-slate-300 font-medium block">{completedChunks} از {totalChunks} فصل</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 block">کلمات ترجمه‌شده این کتاب:</span>
                          <span className="text-amber-400 font-bold block text-xs">
                            {usage.completedWords.toLocaleString('en-US')} <span className="text-[10px] text-slate-500 font-normal">از {usage.totalWords.toLocaleString('en-US')} کلمه</span>
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-500 block">هزینه ایجاد شده:</span>
                          <span className="text-emerald-400 font-bold block text-xs font-mono">
                            {usage.incurredCost.toLocaleString('en-US')} تومان
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Progress */}
                    {totalChunks > 0 && (
                      <div className="mb-4">
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isAllDone ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    {/* Resume Incomplete Chunks Quick Action */}
                    {!isAllDone && !isTranslating && totalChunks > completedChunks && (
                      <button
                        onClick={() => handleResumeIncompleteBook(book)}
                        disabled={resumingBookId === book.id}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
                        title="ادامه ترجمه خودکار بخش‌های باقی‌مانده و ناقص با چرخش بین مدل‌های Gemini تا ۱۰۰٪ بدون کسر هزینه اضافی"
                      >
                        {resumingBookId === book.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                            <span>در حال ارسال به صف ترجمه سرور...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                            <span>⚡ ادامه و تکمیل {totalChunks - completedChunks} بخش باقی‌مانده</span>
                          </>
                        )}
                      </button>
                    )}

                    {isTranslating && (
                      <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>ترجمه در صف پس‌زمینه سرور در حال انجام است ({percent}٪)</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectBook(book)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>مشاهده و ویرایش کتاب</span>
                      </button>

                      <button
                        onClick={() => onDeleteBook(book.id)}
                        title="حذف کتاب"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Exports & Proforma Invoice Row */}
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => onExportDocx(book)}
                        className="py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700/60 flex items-center justify-center gap-1 transition-colors"
                        title="دانلود خروجی Word استاندارد"
                      >
                        <Download className="w-3 h-3 text-blue-400" />
                        <span>Word</span>
                      </button>
                      <button
                        onClick={() => onExportPdf(book)}
                        className="py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700/60 flex items-center justify-center gap-1 transition-colors"
                        title="دانلود خروجی PDF صفحه‌آرایی شده"
                      >
                        <Download className="w-3 h-3 text-rose-400" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => onExportEpub(book)}
                        className="py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700/60 flex items-center justify-center gap-1 transition-colors"
                        title="دانلود فایل EPUB برای کتاب‌خوان‌ها"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>EPUB</span>
                      </button>
                      <button
                        onClick={() => setInvoiceBook(book)}
                        className="py-1.5 px-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-300 border border-amber-500/20 flex items-center justify-center gap-1 transition-colors"
                        title="صدور پیش‌فاکتور رسمی کتاب"
                      >
                        <FileCheck className="w-3 h-3 text-amber-400" />
                        <span>فاکتور</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {invoiceBook && (
        <InvoiceModal
          isOpen={Boolean(invoiceBook)}
          onClose={() => setInvoiceBook(null)}
          book={invoiceBook}
          currentUser={user}
          invoiceType="proforma"
        />
      )}
    </div>
  );
}
