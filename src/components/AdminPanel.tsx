import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Cpu,
  Layers,
  Settings,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  FileText,
  BookOpen,
  Send,
  Lock,
  Server,
  Zap,
  Check,
  X,
  ExternalLink,
  Download,
  Upload,
  Tag,
  Database,
  BarChart3,
  Code,
  Palette,
  Eye,
  Globe,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BookCheck,
  Printer,
  FileCode,
  UserPlus,
  Wallet,
  RotateCw,
  Save,
  Info,
  Edit3,
  Calculator,
  HelpCircle,
  Sliders,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';
import {
  User,
  BookProject,
  SystemSettings,
  TransactionRecord,
  TranslationJob,
  CustomPage,
  HeaderFooterConfig,
  MonthlyAnalytics,
  BlogPost,
  BlogCategory,
  ScriptsInjectionConfig,
  LandingSection,
  LandingSectionType,
} from '../types.ts';
import { DEFAULT_LANDING_SECTIONS } from '../constants/landingDefaults.ts';
import { DailyRevenueView } from './DailyRevenueView.tsx';
import { AdminBookEditorModal } from './AdminBookEditorModal.tsx';
import { downloadDocx } from '../utils/exporter.ts';
import { CaptchaWidget } from './CaptchaWidget.tsx';

interface AdminPanelProps {
  currentUser: User;
  onBackToUserPanel: () => void;
  onLogout: () => void;
  onCostPerWordUpdated?: (newRate: number) => void;
}

export type AdminTab =
  | 'overview'
  | 'monthly_analytics'
  | 'daily_revenue'
  | 'completed_books'
  | 'all_books'
  | 'users'
  | 'coupons'
  | 'api_pool'
  | 'finance'
  | 'blog_manager'
  | 'scripts_analytics'
  | 'page_builder'
  | 'header_footer'
  | 'cms'
  | 'seo'
  | 'security'
  | 'guides';

export const PROVIDER_PRESET_MODELS: Record<string, string[]> = {
  gemini: ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
  glm: ['glm-4-plus', 'glm-4-0520', 'glm-4-air', 'glm-4-airx', 'glm-4-flash', 'glm-zero-preview'],
  minimax: ['MiniMax-Text-01', 'abab6.5s-chat', 'abab6.5t-chat', 'abab5.5-chat'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo'],
  claude: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3-7-sonnet', 'anthropic/claude-3-5-haiku'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openrouter: ['deepseek/deepseek-r1', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct'],
  proxy: ['gpt-4o', 'gpt-4o-mini', 'deepseek-chat', 'deepseek-reasoner', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'qwen-plus', 'custom-model'],
  custom: ['gpt-4o', 'gpt-4o-mini', 'deepseek-chat', 'claude-3-5-sonnet', 'custom-model'],
};

export const PROVIDER_DEFAULT_BASE_URL: Record<string, string> = {
  gemini: '',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
  minimax: 'https://api.minimax.chat/v1',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  deepseek: 'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
  proxy: 'https://api.oneapi.ir/v1',
  custom: '',
};

export function AdminSectionGuide({
  title,
  badge = 'راهنمای این بخش',
  badgeColor = 'amber',
  description,
  bullets,
  tip,
}: {
  title: string;
  badge?: string;
  badgeColor?: 'amber' | 'emerald' | 'blue' | 'rose' | 'purple' | string;
  description: string;
  bullets: Array<{ title: string; text: string }>;
  tip?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'blue':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'rose':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'amber':
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{title}</span>
              {badge && (
                <span className={`text-[10px] font-semibold border px-2.5 py-0.5 rounded-full ${getBadgeStyle()}`}>
                  {badge}
                </span>
              )}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700/80 transition"
        >
          <span>{isOpen ? 'بستن راهنما ▲' : 'مشاهده راهنما ▼'}</span>
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {description}
      </p>

      {isOpen && (
        <div className="space-y-2.5 pt-2.5 border-t border-slate-800/80 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {bullets.map((b, idx) => (
              <div key={idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/90 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                <div>
                  <strong className="text-amber-300 font-bold block mb-1">{b.title}</strong>
                  <span className="text-slate-300 leading-relaxed text-[11px]">{b.text}</span>
                </div>
              </div>
            ))}
          </div>
          {tip && (
            <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminPanel({ currentUser, onBackToUserPanel, onLogout, onCostPerWordUpdated }: AdminPanelProps) {
  const isStaff = currentUser.role === 'staff';
  const [activeTab, setActiveTab] = useState<AdminTab>(isStaff ? 'overview' : 'overview');

  // Overview Data (Cached locally so stats never flicker to zero on refresh)
  const [overview, setOverview] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('admin_overview_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Monthly Analytics Data
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // All Books Oversight Data
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Dedicated Completed Books State
  const [completedBookSearch, setCompletedBookSearch] = useState('');
  const [readingBookModal, setReadingBookModal] = useState<any | null>(null);
  const [adminEditingBook, setAdminEditingBook] = useState<any | null>(null);
  const [readingFontSize, setReadingFontSize] = useState<number>(16);
  const [loadingFullBook, setLoadingFullBook] = useState(false);

  // Custom Page Builder Data
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState({
    id: '',
    title: '',
    slug: '',
    htmlContent: '',
    metaDescription: '',
    isPublished: true,
    showInHeader: false,
    showInFooter: false,
  });
  const [previewModalHtml, setPreviewModalHtml] = useState<string | null>(null);
  const [pageSaveSuccess, setPageSaveSuccess] = useState(false);

  // Header & Footer HTML Designer Data
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>({
    headerHtml: '',
    footerHtml: '',
    customCss: '',
    enabled: true,
    applyToAllPages: true,
    applyToPrint: false,
  });
  const [hfActiveSubTab, setHfActiveSubTab] = useState<'header' | 'footer' | 'css'>('header');
  const [hfSaveSuccess, setHfSaveSuccess] = useState(false);

  // Blog Management Data
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('all');
  const [editPostModal, setEditPostModal] = useState<BlogPost | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postForm, setPostForm] = useState({
    id: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'آموزش ترجمه کتاب',
    categorySlug: 'translation-guides',
    tags: '',
    coverImage: '',
    authorName: '',
    authorRole: '',
    readingTimeMinutes: 5,
    isPublished: true,
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
  });
  const [postSaveSuccess, setPostSaveSuccess] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Blog Category Modal
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    slug: '',
    description: '',
    color: '#3b82f6',
  });

  // Scripts & Analytics Injection Data
  const [scriptsConfig, setScriptsConfig] = useState<ScriptsInjectionConfig>({
    enabled: true,
    googleSearchConsoleVerification: '',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    headerScripts: '',
    footerScripts: '',
  });
  const [isSavingScripts, setIsSavingScripts] = useState(false);
  const [scriptsSaveSuccess, setScriptsSaveSuccess] = useState(false);

  // Users Data & Create User Modal
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserBooks, setSelectedUserBooks] = useState<{ user: any; books: any[] } | null>(null);
  const [adjustWalletModal, setAdjustWalletModal] = useState<{ user: any; amount: number; description: string } | null>(null);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'staff' | 'publisher' | 'user',
    walletBalance: 50000,
    customCostPerWord: '' as string | number,
    discountPercent: '' as string | number,
    organizationName: '',
    notes: '',
  });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Edit User State
  const [editUserModal, setEditUserModal] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
    role: 'admin' | 'staff' | 'publisher' | 'user';
    status: 'active' | 'banned';
    password?: string;
    customCostPerWord?: number | string;
    discountPercent?: number | string;
    organizationName?: string;
    notes?: string;
  } | null>(null);
  const [editUserLoading, setEditUserLoading] = useState(false);

  // API Pool Data
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-3.5-flash-lite',
    baseURL: '',
    priority: 1,
    isCustomModel: false,
  });
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // Batch API Key Modal State (ثبت دسته‌ای و یکجای کلیدها برای یک مدل مشخص)
  const [batchKeyModal, setBatchKeyModal] = useState(false);
  const [batchKeyForm, setBatchKeyForm] = useState({
    provider: 'gemini',
    model: 'gemini-3.5-flash-lite',
    isCustomModel: false,
    baseURL: '',
    namePrefix: 'کلید جمینای',
    keysText: '',
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Edit Key Modal State (کاربر خواست هر کلید را بشود ویرایش کرد)
  const [editKeyModal, setEditKeyModal] = useState<any | null>(null);
  const [editKeyForm, setEditKeyForm] = useState({
    id: '',
    name: '',
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-3.5-flash-lite',
    baseURL: '',
    priority: 1,
    isActive: true,
    isCustomModel: false,
  });

  // Batch Key Testing & Queue Stats
  const [testingAllKeys, setTestingAllKeys] = useState(false);
  const [batchTestResults, setBatchTestResults] = useState<any[] | null>(null);
  const [queueStats, setQueueStats] = useState<any>(null);

  // System Settings (Finance, CMS, Security, SMS, SEO)
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsToast, setSettingsToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [seoSaveSuccess, setSeoSaveSuccess] = useState(false);

  // CMS Landing Sections Management State
  const [editingSectionModal, setEditingSectionModal] = useState<LandingSection | null>(null);
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<LandingSectionType>('custom_html');
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // All Transactions
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Knowledge Base & Dedicated Guides Menu State
  const [guideSearchQuery, setGuideSearchQuery] = useState('');
  const [guideActiveCategory, setGuideActiveCategory] = useState<string>('all');

  // Test ZarinPal Gateway State
  const [testingZarinpal, setTestingZarinpal] = useState(false);
  const [zarinpalTestResult, setZarinpalTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Test BitPay Gateway State
  const [testingBitpay, setTestingBitpay] = useState(false);
  const [bitpayTestResult, setBitpayTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Test SMS phone
  const [testSmsPhone, setTestSmsPhone] = useState('09121234567');
  const [smsResult, setSmsResult] = useState<string | null>(null);

  // Test Captcha State
  const [testingCaptcha, setTestingCaptcha] = useState(false);
  const [captchaTestResult, setCaptchaTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    latencyMs?: number;
    score?: number;
    provider?: string;
    recaptchaVersion?: string;
  } | null>(null);

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponCredit, setNewCouponCredit] = useState(50000);
  const [newCouponDiscount, setNewCouponDiscount] = useState(0);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState(100);

  // Backup & Restore State
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupFileInputKey, setBackupFileInputKey] = useState(Date.now());

  // Cache clearing & Batch model switch states
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [batchTargetModel, setBatchTargetModel] = useState('gemini-3.1-flash-lite');
  const [isSwitchingBatchModel, setIsSwitchingBatchModel] = useState(false);

  // SEO Files & Agentic Browsing (Sitemap, Robots.txt, LLMs.txt)
  const [seoFilesTab, setSeoFilesTab] = useState<'robots' | 'sitemap' | 'llms'>('robots');
  const [robotsTxtContent, setRobotsTxtContent] = useState('');
  const [sitemapXmlContent, setSitemapXmlContent] = useState('');
  const [llmsTxtContent, setLlmsTxtContent] = useState('');
  const [isSavingSeoFiles, setIsSavingSeoFiles] = useState(false);
  const [seoFilesSaveSuccess, setSeoFilesSaveSuccess] = useState(false);
  const [copiedSeoLink, setCopiedSeoLink] = useState<string | null>(null);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [announcementSaveSuccess, setAnnouncementSaveSuccess] = useState(false);
  const [copiedOAuthUri, setCopiedOAuthUri] = useState(false);

  const token = localStorage.getItem('auth_token') || '';

  useEffect(() => {
    fetchOverview();
    fetchMonthlyAnalytics();
    fetchUsers();
    fetchAllBooks();
    fetchApiKeys();
    fetchSettings();
    fetchTransactions();
    fetchCoupons();
    fetchCustomPages();
    fetchHeaderFooter();
    fetchQueueStats();
    fetchBlogPosts();
    fetchBlogCategories();
    fetchScriptsConfig();
    fetchSeoFiles();
  }, []);

  const fetchSeoFiles = async () => {
    try {
      const res = await fetch('/api/system/seo-files');
      if (res.ok) {
        const data = await res.json();
        setRobotsTxtContent(data.robotsTxt || '');
        setSitemapXmlContent(data.customSitemapXml || '');
        setLlmsTxtContent(data.llmsTxt || '');
      }
    } catch (e) {
      console.warn('Could not fetch seo files');
    }
  };

  const handleSaveSeoFiles = async () => {
    setIsSavingSeoFiles(true);
    try {
      const currentToken = localStorage.getItem('auth_token') || token;
      const res = await fetch('/api/admin/seo-files', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          robotsTxt: robotsTxtContent,
          customSitemapXml: sitemapXmlContent,
          llmsTxt: llmsTxtContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeoFilesSaveSuccess(true);
        setTimeout(() => setSeoFilesSaveSuccess(false), 3500);
      } else {
        alert(data.error || 'خطا در ذخیره فایل‌های سئو');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setIsSavingSeoFiles(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!settings) return;
    setIsSavingAnnouncement(true);
    try {
      const currentToken = localStorage.getItem('auth_token') || token;
      const currentAnn = settings.announcementBar || {
        enabled: true,
        text: '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.',
        type: 'warning',
        linkUrl: '',
        linkText: 'ثبت سفارش کتاب',
      };
      const res = await fetch('/api/admin/announcement', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(currentAnn),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnnouncementSaveSuccess(true);
        setTimeout(() => setAnnouncementSaveSuccess(false), 3500);
      }
    } catch (e: any) {
      alert(`خطا در ذخیره اعلان: ${e.message}`);
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (e) {}
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: newCouponCode.trim(),
          creditBonus: Number(newCouponCredit) || 0,
          discountPercent: Number(newCouponDiscount) || 0,
          maxUses: Number(newCouponMaxUses) || 100,
        }),
      });
      if (res.ok) {
        setNewCouponCode('');
        fetchCoupons();
        alert('کد تخفیف با موفقیت ایجاد شد.');
      }
    } catch (e) {}
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('آیا از حذف این کد تخفیف مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchCoupons();
    } catch (e) {}
  };

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const currentToken = localStorage.getItem('auth_token') || token;
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && data.totalBooks !== undefined) {
          setOverview(data);
          try {
            localStorage.setItem('admin_overview_cache', JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Could not fetch admin overview', e);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {}
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (e) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {}
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/admin/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {}
  };

  // Inspect User Books
  const handleInspectUserBooks = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserBooks({ user, books: data.books || [] });
      }
    } catch (e) {}
  };

  // Adjust User Wallet
  const handleSaveWalletAdjustment = async () => {
    if (!adjustWalletModal) return;
    try {
      const res = await fetch(`/api/admin/users/${adjustWalletModal.user.id}/adjust-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: adjustWalletModal.amount,
          description: adjustWalletModal.description,
        }),
      });
      if (res.ok) {
        setAdjustWalletModal(null);
        fetchUsers();
        fetchTransactions();
      }
    } catch (e) {}
  };

  // Admin Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserForm.phone || !createUserForm.password) {
      setCreateUserError('شماره موبایل و رمز عبور الزامی است.');
      return;
    }
    setCreateUserLoading(true);
    setCreateUserError(null);
    try {
      const payload: any = {
        name: createUserForm.name,
        phone: createUserForm.phone,
        email: createUserForm.email,
        password: createUserForm.password,
        role: createUserForm.role,
        walletBalance: Number(createUserForm.walletBalance) || 0,
      };
      if (createUserForm.customCostPerWord !== '') {
        payload.customCostPerWord = Number(createUserForm.customCostPerWord);
      }
      if (createUserForm.discountPercent !== '') {
        payload.discountPercent = Number(createUserForm.discountPercent);
      }
      if (createUserForm.organizationName?.trim()) {
        payload.organizationName = createUserForm.organizationName.trim();
      }
      if (createUserForm.notes?.trim()) {
        payload.notes = createUserForm.notes.trim();
      }

      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateUserError(data.error || 'خطا در ثبت کاربر جدید');
      } else {
        setCreateUserModal(false);
        setCreateUserForm({
          name: '',
          phone: '',
          email: '',
          password: '',
          role: 'user',
          walletBalance: 50000,
          customCostPerWord: '',
          discountPercent: '',
          organizationName: '',
          notes: '',
        });
        fetchUsers();
        fetchOverview();
        alert('کاربر جدید با موفقیت ایجاد شد.');
      }
    } catch (e: any) {
      setCreateUserError(e.message || 'خطا در برقراری ارتباط');
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Admin Save Edit User (Profile, role, status, password, custom pricing)
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal) return;
    setEditUserLoading(true);
    try {
      const payload: any = {
        name: editUserModal.name,
        phone: editUserModal.phone,
        email: editUserModal.email,
        role: editUserModal.role,
        status: editUserModal.status,
        password: editUserModal.password,
        customCostPerWord: editUserModal.customCostPerWord !== '' && editUserModal.customCostPerWord !== undefined
          ? Number(editUserModal.customCostPerWord)
          : null,
        discountPercent: editUserModal.discountPercent !== '' && editUserModal.discountPercent !== undefined
          ? Number(editUserModal.discountPercent)
          : null,
        organizationName: editUserModal.organizationName || '',
        notes: editUserModal.notes || '',
      };

      const res = await fetch(`/api/admin/users/${editUserModal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطا در ویرایش اطلاعات کاربر');
      } else {
        setEditUserModal(null);
        fetchUsers();
        alert('اطلاعات کاربر با موفقیت به‌روزرسانی شد.');
      }
    } catch (e: any) {
      alert(e.message || 'خطا در ارتباط با سرور');
    } finally {
      setEditUserLoading(false);
    }
  };

  // Toggle User Role or Status
  const handleUpdateUserStatus = async (userId: string, role: string, status: string) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, status }),
      });
      fetchUsers();
    } catch (e) {}
  };

  // Book Export & Reader Helpers for Completed Books
  const fetchBookDetailsIfNeeded = async (book: any) => {
    if (book.chunks && book.chunks.length > 0) return book;
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.book || book;
      }
    } catch (e) {}
    return book;
  };

  const handleOpenReader = async (book: any) => {
    setLoadingFullBook(true);
    try {
      const fullBook = await fetchBookDetailsIfNeeded(book);
      setReadingBookModal(fullBook);
    } finally {
      setLoadingFullBook(false);
    }
  };

  // Download standard DOCX format (supports admin private copy when present)
  const handleDownloadWordDocx = async (book: any) => {
    const fullBook = await fetchBookDetailsIfNeeded(book);
    const sourceData = (fullBook.hasAdminCopy && fullBook.adminCopy) ? fullBook.adminCopy : fullBook;
    const title = sourceData.title || fullBook.title || 'کتاب ترجمه شده';
    const chunks = sourceData.chunks || fullBook.chunks || [];

    const projectForExport = {
      id: fullBook.id,
      title,
      originalTitle: sourceData.originalTitle || fullBook.originalTitle || '',
      author: sourceData.author || fullBook.author || '',
      translator: sourceData.translator || fullBook.translator || 'سامانه هوشمند ترجمه کتاب',
      chunks: chunks.map((c: any) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        chapterTitle: c.chapterTitle || c.title || `بخش ${c.chunkNumber || 1}`,
        chunkNumber: c.chunkNumber || 1,
        englishText: c.englishText || '',
        translatedHtml: c.translatedHtml || c.translatedText || '',
        status: 'completed' as const,
        wordCount: c.wordCount || 0,
        estimatedTokens: 0,
      })),
      glossary: fullBook.glossary || [],
      model: 'standard',
      tone: 'formal' as any,
      createdAt: fullBook.createdAt || Date.now(),
      updatedAt: Date.now(),
      designConfig: {
        textAlignment: 'right' as const,
        fontFamily: 'Vazirmatn Medium',
        themeId: 'spiritual' as any,
        showHeader: true,
        showFooter: true,
        headerText: title,
        footerText: fullBook.hasAdminCopy ? 'نسخه اختصاصی ویرایش مدیریت' : 'سامانه هوشمند ترجمه کتاب',
      },
    };

    try {
      await downloadDocx(projectForExport as any);
    } catch (err: any) {
      alert(`خطا در دانلود فایل Word (.docx): ${err.message}`);
    }
  };

  const handleDownloadWordDoc = async (book: any) => {
    const fullBook = await fetchBookDetailsIfNeeded(book);
    const sourceData = (fullBook.hasAdminCopy && fullBook.adminCopy) ? fullBook.adminCopy : fullBook;
    const title = sourceData.title || fullBook.title || 'کتاب ترجمه شده';
    let chaptersHtml = '';
    const chunks = sourceData.chunks || fullBook.chunks || [];
    if (chunks && chunks.length > 0) {
      chaptersHtml = chunks.map((ch: any, idx: number) => `
        <div style="page-break-before: always; margin-top: 32px; padding-top: 20px;">
          <h2 style="color: #1e3a8a; font-size: 17pt; font-weight: bold; text-align: right; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">بخش ${idx + 1}: ${ch.chapterTitle || ch.title || `فصل ${idx + 1}`}</h2>
          <div style="font-size: 12.5pt; line-height: 2.1; text-align: right; text-justify: none; margin-top: 16px;">
            ${ch.translatedHtml || ch.translatedText?.replace(/\n/g, '<br/>') || '<p>متن ترجمه شده‌ای ثبت نشده است.</p>'}
          </div>
        </div>
      `).join('');
    } else {
      chaptersHtml = `<p>متن ترجمه شده‌ای برای این کتاب ثبت نشده است.</p>`;
    }

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { font-family: 'Vazirmatn', 'B Nazanin', 'Tahoma', Arial, sans-serif; direction: rtl; text-align: right; line-height: 2.1; font-size: 12.5pt; color: #111; }
          h1 { color: #0f172a; font-size: 22pt; font-weight: bold; text-align: right; margin-bottom: 12px; }
          h2 { color: #1e3a8a; font-size: 17pt; font-weight: bold; text-align: right; }
          p, div { text-align: right; text-justify: none; }
          .meta { text-align: center; color: #64748b; font-size: 11pt; margin-bottom: 30px; }
        </style>
      </head>
      <body dir="rtl">
        <h1>${title}</h1>
        <div class="meta">
          ${sourceData.originalTitle || fullBook.originalTitle ? `<p>عنوان زبان اصلی: ${sourceData.originalTitle || fullBook.originalTitle}</p>` : ''}
          ${sourceData.author || fullBook.author ? `<p>نویسنده: ${sourceData.author || fullBook.author}</p>` : ''}
          <p>خروجی رسمی مترجم هوش مصنوعی | تاریخ: ${new Date().toLocaleDateString('fa-IR-u-nu-latn')}</p>
          ${fullBook.hasAdminCopy ? '<p style="color:#7c3aed; font-weight:bold;">نسخه اختصاصی ویرایش مدیریت</p>' : ''}
        </div>
        <hr/>
        ${chaptersHtml}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', docContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_ترجمه_فارسی.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtmlBook = async (book: any) => {
    const fullBook = await fetchBookDetailsIfNeeded(book);
    const title = fullBook.title || 'کتاب ترجمه شده';
    let chaptersHtml = '';
    if (fullBook.chunks && fullBook.chunks.length > 0) {
      chaptersHtml = fullBook.chunks.map((ch: any, idx: number) => `
        <article style="margin-bottom: 40px; padding: 28px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="color: #b45309; font-size: 20px; font-weight: 800; border-bottom: 2px solid #fef3c7; padding-bottom: 12px; margin-bottom: 20px;">بخش ${idx + 1}: ${ch.title || `فصل ${idx + 1}`}</h2>
          <div style="font-size: 16px; line-height: 2.3; text-align: justify; color: #1e293b;">
            ${ch.translatedHtml || ch.translatedText?.replace(/\n/g, '<br/>') || ''}
          </div>
        </article>
      `).join('');
    }
    const fullHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | نسخه دیجیتال کتابخوان</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 16px; line-height: 2; }
    .container { max-width: 820px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
    h1 { color: #0f172a; font-size: 26px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <p style="color: #64748b; font-size: 14px;">${fullBook.originalTitle ? `عنوان اصلی: ${fullBook.originalTitle} | ` : ''}نویسنده: ${fullBook.author || 'نامشخص'}</p>
    </header>
    ${chaptersHtml}
  </div>
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_کتابخوان_آفلاین.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxtBook = async (book: any) => {
    const fullBook = await fetchBookDetailsIfNeeded(book);
    const title = fullBook.title || 'کتاب ترجمه شده';
    let txt = `${title}\n${fullBook.originalTitle ? `عنوان زبان اصلی: ${fullBook.originalTitle}\n` : ''}${fullBook.author ? `نویسنده: ${fullBook.author}\n` : ''}\n=========================================\n\n`;
    if (fullBook.chunks && fullBook.chunks.length > 0) {
      fullBook.chunks.forEach((ch: any, idx: number) => {
        txt += `--- بخش ${idx + 1}: ${ch.title || `فصل ${idx + 1}`} ---\n\n`;
        const cleanText = (ch.translatedHtml || ch.translatedText || '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '');
        txt += cleanText.trim() + '\n\n\n';
      });
    }
    const blob = new Blob(['\ufeff', txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintBookPdf = async (book: any) => {
    const fullBook = await fetchBookDetailsIfNeeded(book);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const title = fullBook.title || 'کتاب ترجمه شده';
    let chaptersHtml = '';
    if (fullBook.chunks && fullBook.chunks.length > 0) {
      chaptersHtml = fullBook.chunks.map((ch: any, idx: number) => `
        <div class="chapter">
          <h2>${ch.title ? ch.title : `فصل ${idx + 1}`}</h2>
          <div class="chapter-content">
            ${ch.translatedHtml || ch.translatedText?.replace(/\n/g, '<br/>') || ''}
          </div>
        </div>
      `).join('');
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #faf8f5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Vazirmatn', Tahoma, 'B Nazanin', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            color: #1e293b;
          }
          .page-wrapper {
            padding: 24mm 20mm 20mm 20mm;
            min-height: 100vh;
          }
          h1 { text-align: center; font-size: 24px; margin-bottom: 8px; color: #0f172a; font-weight: 800; }
          .meta { text-align: center; color: #64748b; margin-bottom: 24px; font-size: 13px; }
          .chapter { page-break-before: always; margin-top: 24px; }
          .chapter:first-of-type { page-break-before: avoid; }
          h2 { font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; color: #b45309; }
          .chapter-content { text-align: justify; line-height: 2.2; font-size: 14px; }
          @media print {
            body { background-color: #faf8f5 !important; }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <h1>${title}</h1>
          <div class="meta">
            ${fullBook.originalTitle ? `<span>عنوان زبان اصلی: ${fullBook.originalTitle} | </span>` : ''}
            ${fullBook.author ? `<span>نویسنده: ${fullBook.author}</span>` : ''}
          </div>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-bottom: 24px;"/>
          ${chaptersHtml}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Add API Key
  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newKeyForm,
          model: newKeyForm.model.trim() || PROVIDER_PRESET_MODELS[newKeyForm.provider]?.[0] || 'gemini-3.8-flash'
        }),
      });
      if (res.ok) {
        setNewKeyModal(false);
        setNewKeyForm({
          name: '',
          provider: 'gemini',
          apiKey: '',
          model: 'gemini-3.8-flash',
          baseURL: '',
          priority: 1,
          isCustomModel: false,
        });
        fetchApiKeys();
      }
    } catch (e) {}
  };

  // Batch Import Multiple API Keys for a Selected Model
  const handleBatchImportApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchKeyForm.keysText.trim()) {
      alert('لطفاً حداقل یک کلید API وارد فرمایید.');
      return;
    }
    setBatchSubmitting(true);
    try {
      const res = await fetch('/api/admin/api-keys/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: batchKeyForm.provider,
          model: batchKeyForm.model.trim() || 'gemini-3.5-flash-lite',
          baseURL: batchKeyForm.baseURL,
          namePrefix: batchKeyForm.namePrefix,
          keysText: batchKeyForm.keysText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت دسته‌ای کلیدها');
      alert(data.message || 'کلیدها با موفقیت به استخر افزوده شدند.');
      setBatchKeyModal(false);
      setBatchKeyForm({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        isCustomModel: false,
        baseURL: '',
        namePrefix: 'کلید جمینای',
        keysText: '',
      });
      fetchApiKeys();
      fetchQueueStats();
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Delete API Key
  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('آیا از حذف این کلید API اطمینان دارید؟')) return;
    try {
      await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchApiKeys();
    } catch (e) {}
  };

  // Open Edit API Key Modal
  const handleOpenEditKey = (k: any) => {
    const isCustom = !(PROVIDER_PRESET_MODELS[k.provider] || []).includes(k.model);
    setEditKeyForm({
      id: k.id,
      name: k.name || '',
      provider: k.provider || 'gemini',
      apiKey: k.apiKey || '',
      model: k.model || 'gemini-3.8-flash',
      baseURL: k.baseURL || '',
      priority: k.priority || 1,
      isActive: k.isActive !== false,
      isCustomModel: isCustom,
    });
    setEditKeyModal(k);
  };

  // Save Edited API Key to Server (PUT /api/admin/api-keys/:id)
  const handleSaveEditedApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editKeyForm.name || !editKeyForm.apiKey) {
      alert('نام و متن کلید API الزامی هستند.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/api-keys/${editKeyForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editKeyForm,
          model: editKeyForm.model.trim() || 'gemini-3.8-flash',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditKeyModal(null);
        fetchApiKeys();
        alert('کلید با موفقیت در سرور ویرایش و ذخیره شد.');
      } else {
        alert(data.error || 'خطا در ویرایش کلید');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    }
  };

  // 1-Click Toggle Key Active Status
  const handleToggleKeyActive = async (keyItem: any) => {
    try {
      const res = await fetch(`/api/admin/api-keys/${keyItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !keyItem.isActive }),
      });
      if (res.ok) fetchApiKeys();
    } catch (e) {}
  };

  // Benchmark & Ping All Keys Concurrently
  const handleTestAllKeys = async () => {
    setTestingAllKeys(true);
    try {
      const res = await fetch('/api/admin/api-keys/test-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setBatchTestResults(data.results || []);
        fetchApiKeys();
      } else {
        alert(data.error || 'خطا در ارزیابی همزمان کلیدها');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setTestingAllKeys(false);
    }
  };

  // Fetch Live Queue Stats from Server
  const fetchQueueStats = async () => {
    try {
      const res = await fetch('/api/admin/queue/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQueueStats(data.stats);
      }
    } catch (e) {}
  };

  // Reset Single Key Stats & Tokens
  const handleResetSingleKeyStats = async (keyId: string, keyName: string) => {
    if (!confirm(`آیا از صفر کردن آمار توکن‌ها و درخواست‌های کلید «${keyName}» اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}/reset-stats`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'آمار کلید با موفقیت ریست شد.');
        fetchApiKeys();
      } else {
        alert(data.error || 'خطا در ریست آمار کلید');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    }
  };

  // Reset All Keys Stats & Tokens
  const handleResetAllKeysStats = async () => {
    if (!confirm('آیا از صفر کردن آمار مصرف توکن و تعداد درخواست‌های کلیه کلیدهای هوش مصنوعی سرور اطمینان دارید؟')) return;
    try {
      const res = await fetch('/api/admin/api-keys/reset-all-stats', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'آمار همه کلیدها صفر شد.');
        fetchApiKeys();
      } else {
        alert(data.error || 'خطا در ریست آمار کلیدها');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    }
  };

  // Clear System In-Memory Cache (Safe: Does NOT delete any books, chunks, users, or database records!)
  const handleClearSystemCache = async () => {
    if (!confirm('آیا مایل به پاکسازی حافظه موقت و کش سیستم هستید؟\n\nتوجه: این فرآیند جهت آزادسازی رم و افزایش سرعت سرور لینوکس است. هیچ‌یک از کتاب‌ها (در حال ترجمه یا پایان‌یافته) و داده‌های کاربران حذف نخواهند شد.')) {
      return;
    }
    setIsClearingCache(true);
    try {
      const res = await fetch('/api/admin/system/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🧹 ${data.message}\n• کش‌های بافت پاکسازی‌شده: ${data.stats?.clearedContextCacheCount || 0}\n• سشن‌های منقضی آزادشده: ${data.stats?.clearedExpiredSessions || 0}\n• مصرف رم کنونی هیپ: ${data.stats?.heapUsedMb || 0} مگابایت`);
      } else {
        alert(data.error || 'خطا در پاکسازی کش');
      }
    } catch (e: any) {
      alert(`خطا در پاکسازی کش: ${e.message}`);
    } finally {
      setIsClearingCache(false);
    }
  };

  // Batch Switch Model for All Keys (Allows manager to manually switch model if one is down)
  const handleBatchSwitchModel = async () => {
    if (!confirm(`آیا مایلید مدل تمام کلیدهای فعال سرور به «${batchTargetModel}» سوئیچ شود؟`)) return;
    setIsSwitchingBatchModel(true);
    try {
      const res = await fetch('/api/admin/api-keys/batch-switch-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetModel: batchTargetModel }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        fetchApiKeys();
      } else {
        alert(data.error || 'خطا در سوئیچ گروهی مدل');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setIsSwitchingBatchModel(false);
    }
  };

  // Toggle Auto-Switch on Translation Failure
  const handleToggleAutoSwitchTranslation = async (enabled: boolean) => {
    if (!settings) return;
    const updated: SystemSettings = {
      ...settings,
      keyPoolSettings: {
        ...(settings.keyPoolSettings || { allowAutoSwitchOnTest: true, preferredFallbackModel: 'gemini-3.1-flash-lite' }),
        allowAutoSwitchOnTranslationFailure: enabled,
      },
    };
    setSettings(updated);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      alert(enabled ? 'سوئیچ خودکار مدل در حین ترجمه فعال شد.' : 'سوئیچ خودکار در حین ترجمه غیرفعال شد (ترجمه منحصراً با مدل انتخابی انجام خواهد شد).');
    } catch (e) {
      alert('خطا در ذخیره تنظیمات سوئیچ');
    }
  };

  // Quick 1-Click Wallet Gift for Users
  const handleQuickGift = async (userId: string, amount: number, desc: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/adjust-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, description: desc }),
      });
      if (res.ok) {
        fetchUsers();
        alert(`مبلغ ${amount.toLocaleString('en-US')} تومان با موفقیت به کیف پول کاربر اضافه شد.`);
      }
    } catch (e) {}
  };

  // Test API Key Ping
  const handleTestApiKey = async (keyItem: any) => {
    setTestingKeyId(keyItem.id);
    try {
      const res = await fetch('/api/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: keyItem.provider,
          apiKey: keyItem.apiKey,
          baseURL: keyItem.baseURL,
          model: keyItem.model,
        }),
      });
      const data = await res.json();
      let displayError = data.error || 'خطای ناشناخته';
      if (typeof displayError === 'string') {
        if (displayError.includes('504') || displayError.includes('DEADLINE_EXCEEDED') || displayError.includes('Deadline expired')) {
          displayError = 'پایان مهلت زمانی گیت‌وی (کد ۵۰۴ - DEADLINE_EXCEEDED): پاسخ از سمت سرور جمینای در مهلت تعیین‌شده دریافت نشد. این خطا ناشی از کندی موقت شبکه یا پردازش سنگین سرور گوگل است. زمان مهلت افزایش یافت؛ لطفاً لحظاتی دیگر مجدداً تلاش فرمایید.';
        }
      }
      alert(data.success ? `اتصال موفقیت‌آمیز بود! زمان پاسخ: ${data.latencyMs} میلی‌ثانیه` : `خطا در اتصال: ${displayError}`);
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  // Test Captcha Connection & Validity
  const handleTestCaptcha = async (optionalToken?: string) => {
    if (!settings?.security?.captcha) return;
    setTestingCaptcha(true);
    setCaptchaTestResult(null);
    try {
      const captchaState = settings.security.captcha;
      const currentToken = localStorage.getItem('auth_token') || token;
      const res = await fetch('/api/admin/captcha/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          provider: captchaState.provider || 'math',
          recaptchaVersion: captchaState.recaptchaVersion || 'v2',
          siteKey: captchaState.siteKey || '',
          secretKey: captchaState.secretKey || '',
          testToken: typeof optionalToken === 'string' ? optionalToken : undefined,
        }),
      });
      const data = await res.json();
      setCaptchaTestResult(data);
    } catch (err: any) {
      setCaptchaTestResult({
        success: false,
        error: `خطا در برقراری ارتباط با سرور تست: ${err?.message || 'خطای ناشناخته'}`,
      });
    } finally {
      setTestingCaptcha(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSavingSettings(true);
    setSettingsToast(null);
    try {
      const currentToken = localStorage.getItem('auth_token') || token;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.pricing?.costPerWord) {
            const newRate = Number(data.settings.pricing.costPerWord);
            if (onCostPerWordUpdated) onCostPerWordUpdated(newRate);
            window.dispatchEvent(
              new CustomEvent('pricing-updated', {
                detail: { costPerWord: newRate, pricing: data.settings.pricing },
              })
            );
          }
        }
        setSaveSettingsSuccess(true);
        setSettingsToast({
          type: 'success',
          message: 'تنظیمات مالی، تعرفه کلمه‌ای و درگاه‌های پرداخت با موفقیت در پایگاه داده سرور ذخیره شدند.',
        });
        setTimeout(() => {
          setSaveSettingsSuccess(false);
          setSettingsToast(null);
        }, 4000);
      } else {
        setSettingsToast({
          type: 'error',
          message: data.error || 'خطا در ذخیره تنظیمات روی سرور. لطفاً مجدداً وارد شوید.',
        });
      }
    } catch (e: any) {
      setSettingsToast({
        type: 'error',
        message: `خطای برقراری ارتباط با سرور: ${e.message}`,
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // --- CMS Landing Sections Handlers ---
  const getCmsSections = (): LandingSection[] => {
    if (settings?.cms?.sections && settings.cms.sections.length > 0) {
      return [...settings.cms.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return DEFAULT_LANDING_SECTIONS;
  };

  const handleMoveCmsSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!settings) return;
    const list = getCmsSections();
    const idx = list.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((s, i) => ({ ...s, order: i + 1 }));
    setSettings({
      ...settings,
      cms: {
        ...settings.cms,
        sections: reordered,
      },
    });
  };

  const handleToggleCmsSectionEnabled = (sectionId: string) => {
    if (!settings) return;
    const list = getCmsSections();
    const updated = list.map((s) => {
      if (s.id === sectionId) {
        return { ...s, enabled: s.enabled === false ? true : false };
      }
      return s;
    });
    setSettings({
      ...settings,
      cms: {
        ...settings.cms,
        sections: updated,
      },
    });
  };

  const handleDeleteCmsSection = (sectionId: string, title: string) => {
    if (!settings) return;
    if (!confirm(`آیا از حذف سکشن «${title}» از صفحه اصلی اطمینان دارید؟`)) return;
    const list = getCmsSections();
    const updated = list.filter((s) => s.id !== sectionId).map((s, i) => ({ ...s, order: i + 1 }));
    setSettings({
      ...settings,
      cms: {
        ...settings.cms,
        sections: updated,
      },
    });
  };

  const handleResetCmsSections = () => {
    if (!settings) return;
    if (!confirm('آیا از بازگردانی کامل سکشن‌های صفحه اصلی به چیدمان و محتوای پیش‌فرض اولیه اطمینان دارید؟')) return;
    const defaults = JSON.parse(JSON.stringify(DEFAULT_LANDING_SECTIONS));
    setSettings({
      ...settings,
      cms: {
        ...settings.cms,
        sections: defaults,
      },
    });
  };

  const handleSaveEditedSection = (updatedSection: LandingSection) => {
    if (!settings) return;
    const list = getCmsSections();
    const updated = list.map((s) => (s.id === updatedSection.id ? updatedSection : s));
    const cmsRootUpdates: any = {};
    if (updatedSection.type === 'hero' && updatedSection.data) {
      if (updatedSection.data.title) cmsRootUpdates.heroTitle = updatedSection.data.title;
      if (updatedSection.data.subtitle) cmsRootUpdates.heroSubtitle = updatedSection.data.subtitle;
    }
    setSettings({
      ...settings,
      cms: {
        ...settings.cms,
        ...cmsRootUpdates,
        sections: updated,
      },
    });
    setEditingSectionModal(null);
  };

  const handleAddCmsSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const list = getCmsSections();
    const newId = `sec_${newSectionType}_${Date.now()}`;
    const title = newSectionTitle.trim() || (
      newSectionType === 'custom_html' ? 'سکشن محتوای اختصاصی HTML' :
      newSectionType === 'cta' ? 'بنر اقدام جدید' :
      'سکشن جدید'
    );

    let initialData: any = {};
    if (newSectionType === 'custom_html') {
      initialData = {
        htmlContent: `<div style="background: linear-gradient(135deg, #090d16, #1e293b); border: 1px solid #334155; border-radius: 20px; padding: 40px; text-align: center; color: white;">
  <h2 style="font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 12px;">عنوان بنر یا پیام ویژه شما</h2>
  <p style="font-size: 14px; color: #94a3b8; max-width: 600px; margin: 0 auto 20px;">توضیحات مورد نظر درباره کمپین، ناشران یا معرفی خدمات اختصاصی را اینجا وارد کنید.</p>
  <a href="#calculator" style="display: inline-block; background: #f59e0b; color: #020617; font-weight: bold; padding: 10px 24px; border-radius: 12px; text-decoration: none;">مشاهده بیشتر</a>
</div>`,
        containerClass: 'py-16 border-b border-slate-800/80 bg-slate-900/40',
      };
    } else if (newSectionType === 'cta') {
      initialData = {
        title: 'یک عنوان جذاب برای اقدام',
        subtitle: 'توضیحات ترغیب‌کننده برای شروع ترجمه کتاب',
        buttonText: 'ثبت سفارش سریع',
      };
    }

    const newSec: LandingSection = {
      id: newId,
      type: newSectionType,
      title,
      enabled: true,
      order: list.length + 1,
      data: initialData,
    };

    setSettings({
      ...settings,
      cms: {
        ...settings.cms,
        sections: [...list, newSec],
      },
    });

    setAddSectionModalOpen(false);
    setNewSectionTitle('');
    setEditingSectionModal(newSec);
  };

  // Test SMS
  const handleTestSms = async () => {
    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: testSmsPhone }),
      });
      const data = await res.json();
      setSmsResult(data.message || 'ارسال شد.');
    } catch (e: any) {
      setSmsResult(e.message || 'خطا در تست پیامک');
    }
  };

  // Direct Browser Download of Backup JSON
  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      const res = await fetch('/api/admin/backup', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'خطا در دریافت فایل پشتیبان از سرور');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nowStr = new Date().toISOString().slice(0, 10);
      a.download = `book_translator_backup_${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSettingsToast({
        type: 'success',
        message: 'فایل کامل پشتیبان پایگاه داده با موفقیت در مرورگر شما دانلود شد.',
      });
    } catch (e: any) {
      setSettingsToast({
        type: 'error',
        message: e.message || 'خطا در دانلود فایل پشتیبان',
      });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  // Import and Restore Backup File
  const handleFileUploadForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        if (!jsonContent || (!jsonContent.data && !jsonContent.books && !jsonContent.users)) {
          alert('فرمت فایل پشتیبان نامعتبر است. این فایل ساختار دیتابیس سامانه ترجمه کتاب را ندارد.');
          return;
        }

        const confirmRestore = window.confirm(
          `آیا از بازیابی و ایمپورت این فایل پشتیبان اطمینان دارید؟\nاین عملیات داده‌های پشتیبان شامل کتاب‌ها، کاربران، تنظیمات و صفحات را به پایگاه داده اضافه یا به‌روزرسانی می‌کند.`
        );
        if (!confirmRestore) return;

        setIsImportingBackup(true);
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(jsonContent),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'خطا در بازیابی نسخه پشتیبان');
        }

        setSettingsToast({
          type: 'success',
          message: data.message || 'پایگاه داده با موفقیت بازیابی و به‌روزرسانی شد.',
        });

        // Refresh all collections
        fetchOverview();
        fetchAllBooks();
        fetchUsers();
        fetchCustomPages();
        fetchSettings();
        fetchCoupons();
      } catch (err: any) {
        alert(`خطا در بازیابی فایل پشتیبان: ${err.message}`);
      } finally {
        setIsImportingBackup(false);
        setBackupFileInputKey(Date.now());
      }
    };
    reader.readAsText(file);
  };

  // Fetch Monthly Analytics
  const fetchMonthlyAnalytics = async () => {
    setLoadingMonthly(true);
    try {
      const res = await fetch('/api/admin/analytics/monthly', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMonthlyAnalytics(data);
      }
    } catch (e) {
      console.warn('Could not fetch monthly analytics');
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Fetch All Books
  const fetchAllBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch('/api/admin/all-books', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllBooks(data.books || []);
      }
    } catch (e) {
      console.warn('Could not fetch all books');
    } finally {
      setLoadingBooks(false);
    }
  };

  // Delete Book by Admin
  const handleDeleteBookAdmin = async (bookId: string) => {
    if (!confirm('آیا از حذف این کتاب و تمام بخش‌ها و ترجمه‌های آن از سیستم اطمینان دارید؟ این عملیات غیرقابل بازگشت است.')) return;
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAllBooks();
        fetchOverview();
      }
    } catch (e) {}
  };

  // Fetch Custom Pages
  const fetchCustomPages = async () => {
    setLoadingPages(true);
    try {
      const res = await fetch('/api/custom-pages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomPages(data.pages || []);
        if (data.pages && data.pages.length > 0 && !selectedPageId) {
          handleSelectPageForEdit(data.pages[0]);
        }
      }
    } catch (e) {
      console.warn('Could not fetch custom pages');
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSaveSeoSettings = async () => {
    if (!settings) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSeoSaveSuccess(true);
        setTimeout(() => setSeoSaveSuccess(false), 3000);
      }
    } catch (e) {}
  };

  const handleSelectPageForEdit = (page: CustomPage) => {
    setSelectedPageId(page.id);
    setPageForm({
      id: page.id,
      title: page.title,
      slug: page.slug,
      htmlContent: page.htmlContent,
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished,
      showInHeader: page.showInHeader ?? false,
      showInFooter: page.showInFooter ?? false,
    });
  };

  const handleCreateNewPage = () => {
    setSelectedPageId(null);
    setPageForm({
      id: '',
      title: 'برگه جدید بدون عنوان',
      slug: `new-page-${Date.now().toString().slice(-4)}`,
      htmlContent: `<div style="max-width: 850px; margin: 0 auto; padding: 40px 20px; font-family: 'Vazirmatn', sans-serif; color: #f8fafc; line-height: 2;">
  <h1 style="color: #f59e0b; font-size: 26px; font-weight: 800; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 20px;">عنوان برگه اختصاصی شما</h1>
  <p style="font-size: 15px; color: #cbd5e1;">متن، تصاویر، جدول‌ها یا کدهای HTML دلخواه خود را در این بخش قرار دهید.</p>
</div>`,
      metaDescription: 'توضیحات برگه جدید برای موتورهای جستجو',
      isPublished: true,
      showInHeader: false,
      showInFooter: false,
    });
  };

  const handleSaveCustomPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageForm.title.trim() || !pageForm.slug.trim()) {
      alert('لطفاً عنوان و آدرس یکتای برگه (Slug) را وارد نمایید.');
      return;
    }
    try {
      const res = await fetch('/api/admin/custom-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pageForm),
      });
      if (res.ok) {
        setPageSaveSuccess(true);
        setTimeout(() => setPageSaveSuccess(false), 3000);
        fetchCustomPages();
      }
    } catch (e) {
      alert('خطا در ذخیره برگه');
    }
  };

  const handleDeleteCustomPage = async (id: string) => {
    if (!confirm('آیا از حذف این برگه اختصاصی اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/custom-pages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCustomPages();
        if (selectedPageId === id) {
          handleCreateNewPage();
        }
      }
    } catch (e) {}
  };

  // Fetch Header & Footer HTML Config
  const fetchHeaderFooter = async () => {
    try {
      const res = await fetch('/api/admin/header-footer', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.headerFooter) {
          setHeaderFooterConfig(data.headerFooter);
        }
      }
    } catch (e) {
      console.warn('Could not fetch header-footer config');
    }
  };

  const handleSaveHeaderFooter = async () => {
    try {
      const res = await fetch('/api/admin/header-footer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(headerFooterConfig),
      });
      if (res.ok) {
        setHfSaveSuccess(true);
        setTimeout(() => setHfSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('خطا در ذخیره هدر و فوتر');
    }
  };

  // --- Blog & Articles Handlers ---
  const fetchBlogPosts = async () => {
    setLoadingBlog(true);
    try {
      const res = await fetch('/api/admin/blog/posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlogPosts(data.posts || []);
      }
    } catch (e) {
      console.warn('Could not fetch blog posts');
    } finally {
      setLoadingBlog(false);
    }
  };

  const fetchBlogCategories = async () => {
    try {
      const res = await fetch('/api/admin/blog/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlogCategories(data.categories || []);
      }
    } catch (e) {
      console.warn('Could not fetch blog categories');
    }
  };

  const handleStartCreatePost = () => {
    setEditPostModal(null);
    setIsCreatingPost(true);
    setPostForm({
      id: '',
      title: '',
      slug: `article-${Date.now().toString().slice(-4)}`,
      excerpt: '',
      content: '<h2>مقدمه</h2>\n<p>متن خود را در این بخش بنویسید...</p>',
      category: blogCategories[0]?.name || 'آموزش ترجمه کتاب',
      categorySlug: blogCategories[0]?.slug || 'translation-guides',
      tags: 'ترجمه کتاب, هوش مصنوعی',
      coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
      authorName: currentUser.name || 'کارشناس تحریریه',
      authorRole: currentUser.role === 'admin' ? 'مدیر ارشد' : 'کارشناس تحریریه',
      readingTimeMinutes: 5,
      isPublished: true,
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: '',
    });
  };

  const handleStartEditPost = (post: BlogPost) => {
    setIsCreatingPost(false);
    setEditPostModal(post);
    setPostForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      categorySlug: post.categorySlug || 'translation-guides',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      coverImage: post.coverImage || '',
      authorName: post.authorName || 'تیم تحریریه',
      authorRole: post.authorRole || 'کارشناس تحریریه',
      readingTimeMinutes: post.readingTimeMinutes || 5,
      isPublished: post.isPublished,
      metaTitle: post.metaTitle || '',
      metaDescription: post.metaDescription || '',
      canonicalUrl: post.canonicalUrl || '',
    });
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.slug.trim() || !postForm.content.trim()) {
      alert('لطفاً عنوان، آدرس پیوند (Slug) و محتوای مقاله را وارد نمایید.');
      return;
    }
    setIsSavingPost(true);
    try {
      const selectedCat = blogCategories.find(c => c.name === postForm.category || c.slug === postForm.categorySlug);
      const res = await fetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...postForm,
          category: selectedCat ? selectedCat.name : postForm.category,
          categorySlug: selectedCat ? selectedCat.slug : postForm.categorySlug,
          tags: postForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setPostSaveSuccess(true);
        setTimeout(() => setPostSaveSuccess(false), 3000);
        setIsCreatingPost(false);
        setEditPostModal(null);
        fetchBlogPosts();
      } else {
        const errData = await res.json();
        alert(errData.error || 'خطا در ذخیره مقاله');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (!confirm(`آیا از حذف مقاله «${title}» اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchBlogPosts();
      } else {
        alert('خطا در حذف مقاله');
      }
    } catch (e) {}
  };

  const handleSaveBlogCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      alert('لطفاً نام و نامک (Slug) انگلیسی دسته‌بندی را وارد نمایید.');
      return;
    }
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(categoryForm),
      });
      if (res.ok) {
        setCategoryModal(false);
        setCategoryForm({ id: '', name: '', slug: '', description: '', color: '#3b82f6' });
        fetchBlogCategories();
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ثبت دسته‌بندی');
      }
    } catch (e) {}
  };

  const handleDeleteBlogCategory = async (id: string, name: string) => {
    if (!confirm(`آیا از حذف دسته‌بندی «${name}» اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchBlogCategories();
      }
    } catch (e) {}
  };

  // --- Scripts & Analytics Handlers ---
  const fetchScriptsConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings/scripts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scriptsInjection) {
          setScriptsConfig(data.scriptsInjection);
        }
      }
    } catch (e) {
      console.warn('Could not fetch scripts injection config');
    }
  };

  const handleSaveScriptsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingScripts(true);
    try {
      const res = await fetch('/api/admin/settings/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(scriptsConfig),
      });
      if (res.ok) {
        setScriptsSaveSuccess(true);
        setTimeout(() => setScriptsSaveSuccess(false), 3000);
        alert('تنظیمات اسکریپت‌ها، سرچ کنسول و آمارگیر با موفقیت ذخیره شد و اعمال گردید.');
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ذخیره اسکریپت‌ها');
      }
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setIsSavingScripts(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.organizationName?.toLowerCase().includes(s) ||
      u.notes?.toLowerCase().includes(s) ||
      u.role?.toLowerCase().includes(s)
    );
  });

  const filteredBooks = allBooks.filter((b) => {
    const s = bookSearch.toLowerCase();
    return (
      b.title?.toLowerCase().includes(s) ||
      b.originalTitle?.toLowerCase().includes(s) ||
      b.author?.toLowerCase().includes(s) ||
      b.user?.name?.toLowerCase().includes(s) ||
      b.user?.email?.toLowerCase().includes(s)
    );
  });

  const completedBooksList = allBooks.filter((b) => {
    const isDone = b.status === 'completed' || (b.completedChunks && b.completedChunks > 0);
    if (!isDone) return false;
    if (!completedBookSearch) return true;
    const s = completedBookSearch.toLowerCase();
    return (
      b.title?.toLowerCase().includes(s) ||
      b.originalTitle?.toLowerCase().includes(s) ||
      b.author?.toLowerCase().includes(s) ||
      b.user?.name?.toLowerCase().includes(s) ||
      b.user?.phone?.toLowerCase().includes(s)
    );
  });

  const completedBooksCount = allBooks.filter((b) => b.status === 'completed' || (b.completedChunks && b.completedChunks > 0)).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Vazirmatn'] selection:bg-amber-500/30">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 min-h-[60px] sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-lg shrink-0 ${
              isStaff
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-500/20'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/20'
            }`}>
              {isStaff ? <Users className="w-5 h-5 sm:w-6 sm:h-6" /> : <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-white text-xs sm:text-base truncate">
                  <span className="sm:hidden">{isStaff ? 'میز پرسنل' : 'پنل مدیریت ارشد'}</span>
                  <span className="hidden sm:inline">{isStaff ? 'میز کاربری پرسنل و پشتیبانی سامانه' : 'پنل مدیریت ارشد سامانه'}</span>
                </span>
                <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-black shrink-0 ${
                  isStaff
                    ? 'bg-blue-500 text-white'
                    : 'bg-amber-500 text-slate-950'
                }`}>
                  <span className="sm:hidden">{isStaff ? 'پشتیبان' : 'مدیر کل'}</span>
                  <span className="hidden sm:inline">{isStaff ? 'STAFF / پشتیبان سامانه' : 'SUPER ADMIN'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block truncate mt-0.5">
                {isStaff
                  ? 'مدیریت کاربران، نرخ‌های اختصاصی، کدهای تخفیف، صف ترجمه و بررسی پروژه‌ها'
                  : 'نظارت بر کاربران، استخر موازی هوش مصنوعی، درآمدها و امنیت'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('guides')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeTab === 'guides'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
              title="مشاهده تمام راهنماها و دستورالعمل‌های مدیریتی"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden sm:inline">راهنمای جامع</span>
            </button>
            <button
              onClick={onBackToUserPanel}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              title="بازگشت به پیشخوان کاربری"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>پیشخوان</span>
            </button>
            <button
              onClick={onLogout}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
              title="خروج از حساب"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm sticky top-14 sm:top-20 z-30">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex overflow-x-auto pb-1.5 sm:pb-0 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 text-xs font-semibold scrollbar-none items-center">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="truncate">پیشخوان زنده</span>
            </button>

            {!isStaff && (
              <button
                onClick={() => { setActiveTab('monthly_analytics'); fetchMonthlyAnalytics(); }}
                className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                  activeTab === 'monthly_analytics'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">آمار و مقایسه ماهانه</span>
              </button>
            )}

            {!isStaff && (
              <button
                onClick={() => setActiveTab('daily_revenue')}
                className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                  activeTab === 'daily_revenue'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">درآمد روزانه و پرداخت‌ها</span>
                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">نمودار</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('completed_books'); fetchAllBooks(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'completed_books'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BookCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">کتاب‌های ترجمه‌شده</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                {completedBooksCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('all_books'); fetchAllBooks(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'all_books'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0 text-indigo-400" />
              <span className="truncate">کل کتاب‌ها ({allBooks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'users'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-blue-400" />
              <span className="truncate">کاربران ({users.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('coupons'); fetchCoupons(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'coupons'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">کدهای تخفیف ({coupons.length})</span>
            </button>

            {!isStaff && (
              <button
                onClick={() => setActiveTab('api_pool')}
                className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                  activeTab === 'api_pool'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0 text-purple-400" />
                <span className="truncate">استخر کلیدها ({apiKeys.length})</span>
              </button>
            )}

            {!isStaff && (
              <button
                onClick={() => setActiveTab('finance')}
                className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                  activeTab === 'finance'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className="truncate">امور مالی و درگاه‌ها</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('page_builder'); fetchCustomPages(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'page_builder'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Code className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">صفحه‌ساز HTML</span>
              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">{customPages.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('header_footer'); fetchHeaderFooter(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'header_footer'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0 text-pink-400" />
              <span className="truncate">هدر و فوتر HTML</span>
            </button>

            <button
              onClick={() => setActiveTab('cms')}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'cms'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0 text-orange-400" />
              <span className="truncate">محتوای لندینگ</span>
            </button>

            <button
              onClick={() => { setActiveTab('seo'); fetchSettings(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'seo'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0 text-teal-400" />
              <span className="truncate">سئو و برندینگ</span>
            </button>

            <button
              onClick={() => { setActiveTab('blog_manager'); fetchBlogPosts(); fetchBlogCategories(); }}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'blog_manager'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">وبلاگ و مقالات</span>
              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">{blogPosts.length}</span>
            </button>

            {!isStaff && (
              <button
                onClick={() => { setActiveTab('scripts_analytics'); fetchScriptsConfig(); }}
                className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                  activeTab === 'scripts_analytics'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">آمارگیر و سرچ کنسول</span>
              </button>
            )}

            {!isStaff && (
              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                  activeTab === 'security'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="truncate">امنیت و پیامک</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('guides')}
              className={`px-3 py-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 border shrink-0 whitespace-nowrap min-w-max sm:min-w-0 ${
                activeTab === 'guides'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">راهنمای جامع مدیریت</span>
              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">مرجع</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {settingsToast && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xl transition-all animate-in fade-in sticky top-28 z-30 backdrop-blur-md ${
              settingsToast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10'
                : 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-rose-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {settingsToast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{settingsToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsToast(null)}
              className="p-1 rounded-lg hover:bg-slate-900/60 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">داشبورد جامع سامانه</h2>
                <p className="text-xs text-slate-400">آمار لحظه‌ای فروش، مصرف توکن‌ها و پردازش‌های فعال ابری</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('guides')}
                  title="مشاهده راهنمای این بخش در مرکز راهنما"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">راهنمای بخش</span>
                </button>
                <button
                  onClick={fetchOverview}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>بروزرسانی داده‌ها</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" />
                  کل کاربران عضو
                </div>
                <div className="text-3xl font-black text-white">{overview?.totalUsers || users.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">با دسترسی مجزا و کیف پول مستقل</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  کل کلمات ترجمه شده
                </div>
                <div className="text-3xl font-black text-amber-400">
                  {(overview?.totalWords || 0).toLocaleString('en-US')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">در قالب {overview?.totalBooks || 0} پروژه کتاب</div>
              </div>

              {isStaff ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <BookCheck className="w-4 h-4 text-emerald-400" />
                    کتاب‌های ترجمه‌شده کامل
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {completedBooksCount} <span className="text-xs font-normal text-slate-400">پروژه</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">آماده مطالعه و دریافت خروجی</div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    مجموع درآمد کل پلتفرم
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {(overview?.totalRevenue || 0).toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">تومان</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">از درگاه‌های زرین‌پال، نکست‌پی و مستقیم</div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-purple-400" />
                  استخر کلیدهای فعال
                </div>
                <div className="text-3xl font-black text-white">
                  {overview?.apiKeysActive || apiKeys.length} <span className="text-xs text-slate-500">از {overview?.apiKeysCount || apiKeys.length} کلید</span>
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">توزیع خودکار بین کاربران همزمان</div>
              </div>
            </div>

            {/* Active Queue Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-white">پردازش‌های فعال در صف سرور</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-mono">
                  {overview?.activeJobsCount || 0} پردازش همزمان
                </span>
              </div>

              {overview?.activeJobs?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  در حال حاضر صفی در انتظار نیست؛ سرور در حالت آماده‌باش کامل قرار دارد.
                </div>
              ) : (
                <div className="space-y-3">
                  {overview?.activeJobs?.map((job: any) => (
                    <div key={job.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">شناسه کتاب: {job.bookId}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">کاربر: {job.userId} • بخش جاری: {job.currentChunkTitle || 'فصل کتاب'}</div>
                      </div>
                      <div className="text-left font-mono text-xs">
                        <span className="text-amber-400 font-bold">{job.progressPercent}%</span>
                        <span className="text-slate-500 block text-[10px]">کلید: {job.assignedKeyMasked || 'خودکار'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linux VPS Environment & Production Health Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>وضعیت استقرار روی سرور مجازی لینوکس (Linux VPS Production Health)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">سامانه ۱۰۰٪ سازگار با Ubuntu/Debian، سرویس Systemd و cPanel Phusion Passenger</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>پایدار و آماده بهره‌برداری تجاری</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">سیستم‌عامل و سرور:</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Linux VPS / Debian / Ubuntu</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">پشتیبانی از اسکریپت deploy.sh</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">سرویس پس‌زمینه لینوکس:</span>
                  <div className="font-bold text-amber-300 font-mono">
                    book-translator.service
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Auto-Restart فعال در Systemd</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">حالت گوش دادن پورت و سوکت:</span>
                  <div className="font-bold text-cyan-300 font-mono">
                    PORT / Unix Domain Socket
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">سازگار با Nginx Reverse Proxy</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">پایگاه داده مستقل از کاربر:</span>
                  <div className="font-bold text-purple-300 font-mono">
                    data/database.json (Fast I/O)
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">پشتیبان‌گیری خودکار بدون وابستگی</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1.5: MONTHLY COMPARATIVE ANALYTICS */}
        {/* ========================================================= */}
        {activeTab === 'monthly_analytics' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">تحلیل جامع و آمار مقایسه‌ای مالی و عملکرد</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    ماه جاری در مقایسه با ماه قبل
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  بررسی رشد درآمد، تعداد کتاب‌های سفارش‌داده شده، کلمات پردازش شده و توکن‌های مصرفی هوش مصنوعی
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('daily_revenue')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>گزارش درآمد روزانه و پرداخت‌ها</span>
                </button>
                <button
                  onClick={fetchMonthlyAnalytics}
                  disabled={loadingMonthly}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMonthly ? 'animate-spin text-amber-400' : ''}`} />
                  <span>بروزرسانی شاخص‌ها</span>
                </button>
              </div>
            </div>

            {/* Top 5 Comparative KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Revenue */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>درآمد واریزی‌ها</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {monthlyAnalytics?.currentMonth.revenue.toLocaleString('en-US')}
                  <span className="text-xs text-slate-400 font-normal mr-1">تومان</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">ماه قبل: {monthlyAnalytics?.previousMonth.revenue.toLocaleString('en-US')}</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      (monthlyAnalytics?.growth.revenuePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(monthlyAnalytics?.growth.revenuePercent || 0) >= 0 ? '+' : ''}
                    {monthlyAnalytics?.growth.revenuePercent}%
                    {(monthlyAnalytics?.growth.revenuePercent || 0) >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Card 2: Books */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>کتاب‌های ترجمه‌شده</span>
                  <BookOpen className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {monthlyAnalytics?.currentMonth.booksTranslated.toLocaleString('en-US')}
                  <span className="text-xs text-slate-400 font-normal mr-1">جلد</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">ماه قبل: {monthlyAnalytics?.previousMonth.booksTranslated} جلد</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      (monthlyAnalytics?.growth.booksPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(monthlyAnalytics?.growth.booksPercent || 0) >= 0 ? '+' : ''}
                    {monthlyAnalytics?.growth.booksPercent}%
                    {(monthlyAnalytics?.growth.booksPercent || 0) >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Card 3: Words */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>کلمات پردازش‌شده</span>
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-blue-400 font-mono">
                  {monthlyAnalytics?.currentMonth.wordsTranslated.toLocaleString('en-US')}
                  <span className="text-xs text-slate-400 font-normal mr-1">کلمه</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">ماه قبل: {monthlyAnalytics?.previousMonth.wordsTranslated.toLocaleString('en-US')}</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      (monthlyAnalytics?.growth.wordsPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(monthlyAnalytics?.growth.wordsPercent || 0) >= 0 ? '+' : ''}
                    {monthlyAnalytics?.growth.wordsPercent}%
                    {(monthlyAnalytics?.growth.wordsPercent || 0) >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Card 4: Tokens */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>توکن‌های مصرفی AI</span>
                  <Cpu className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-400 font-mono">
                  {monthlyAnalytics?.currentMonth.tokensConsumed.toLocaleString('en-US')}
                  <span className="text-xs text-slate-400 font-normal mr-1">توکن</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">ماه قبل: {monthlyAnalytics?.previousMonth.tokensConsumed.toLocaleString('en-US')}</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      (monthlyAnalytics?.growth.tokensPercent || 0) >= 0 ? 'text-purple-400' : 'text-slate-400'
                    }`}
                  >
                    {(monthlyAnalytics?.growth.tokensPercent || 0) >= 0 ? '+' : ''}
                    {monthlyAnalytics?.growth.tokensPercent}%
                  </span>
                </div>
              </div>

              {/* Card 5: New Users */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>کاربران جدید</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-cyan-400 font-mono">
                  {monthlyAnalytics?.currentMonth.newUsers.toLocaleString('en-US')}
                  <span className="text-xs text-slate-400 font-normal mr-1">عضو</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">ماه قبل: {monthlyAnalytics?.previousMonth.newUsers} عضو</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      (monthlyAnalytics?.growth.usersPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(monthlyAnalytics?.growth.usersPercent || 0) >= 0 ? '+' : ''}
                    {monthlyAnalytics?.growth.usersPercent}%
                    {(monthlyAnalytics?.growth.usersPercent || 0) >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <span>جدول مقایسه پارامترهای کلیدی (ماه جاری در برابر ماه گذشته)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4">شاخص عملکردی</th>
                      <th className="py-3 px-4">ماه جاری (۳۰ روز اخیر)</th>
                      <th className="py-3 px-4">ماه قبل (۳۰ تا ۶۰ روز قبل)</th>
                      <th className="py-3 px-4">میزان تغییر</th>
                      <th className="py-3 px-4">وضعیت رشد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr className="hover:bg-slate-850">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">درآمد حاصل از شارژ و پرداخت‌ها</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {monthlyAnalytics?.currentMonth.revenue.toLocaleString('en-US')} تومان
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {monthlyAnalytics?.previousMonth.revenue.toLocaleString('en-US')} تومان
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        +{monthlyAnalytics?.growth.revenuePercent}%
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">رشد مثبت و سودآور</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-850">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">تعداد کتاب‌های سفارش‌داده شده</td>
                      <td className="py-3 px-4 text-amber-400 font-bold">
                        {monthlyAnalytics?.currentMonth.booksTranslated} کتاب
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {monthlyAnalytics?.previousMonth.booksTranslated} کتاب
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">
                        +{monthlyAnalytics?.growth.booksPercent}%
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">استقبال صعودی</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-850">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">حجم کلمات ترجمه شده</td>
                      <td className="py-3 px-4 text-blue-400 font-bold">
                        {monthlyAnalytics?.currentMonth.wordsTranslated.toLocaleString('en-US')} کلمه
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {monthlyAnalytics?.previousMonth.wordsTranslated.toLocaleString('en-US')} کلمه
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-400">
                        +{monthlyAnalytics?.growth.wordsPercent}%
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">پردازش مستمر سرور</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-850">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">مصرف توکن‌های هوش مصنوعی</td>
                      <td className="py-3 px-4 text-purple-400 font-bold">
                        {monthlyAnalytics?.currentMonth.tokensConsumed.toLocaleString('en-US')} توکن
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {monthlyAnalytics?.previousMonth.tokensConsumed.toLocaleString('en-US')} توکن
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-400">
                        +{monthlyAnalytics?.growth.tokensPercent}%
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">توزیع پایدار در صف</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-850">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">تعداد کاربران ثبت‌نامی جدید</td>
                      <td className="py-3 px-4 text-cyan-400 font-bold">
                        {monthlyAnalytics?.currentMonth.newUsers} کاربر
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {monthlyAnalytics?.previousMonth.newUsers} کاربر
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-400">
                        +{monthlyAnalytics?.growth.usersPercent}%
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">افزایش جامعه کاربری</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Keys Usage Breakdown Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <span>تفکیک مصرف توکن‌ها و درخواست‌ها به ازای هر کلید و مدل هوش مصنوعی</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4">نام سرور / کلید</th>
                      <th className="py-3 px-4">سرویس‌دهنده</th>
                      <th className="py-3 px-4">مدل فعال</th>
                      <th className="py-3 px-4">تعداد درخواست‌ها</th>
                      <th className="py-3 px-4">مجموع توکن مصرفی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(monthlyAnalytics?.keyUsageBreakdown || []).map((k, idx) => (
                      <tr key={idx} className="hover:bg-slate-850">
                        <td className="py-3 px-4 font-sans font-bold text-slate-200">{k.name}</td>
                        <td className="py-3 px-4 font-sans text-amber-400 uppercase text-[11px] font-bold">{k.provider}</td>
                        <td className="py-3 px-4 text-slate-300">{k.model}</td>
                        <td className="py-3 px-4 text-slate-300">{k.requests.toLocaleString('en-US')}</td>
                        <td className="py-3 px-4 text-purple-400 font-bold">{k.tokensUsed.toLocaleString('en-US')} توکن</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform All-Time Cumulative Summary */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/20 flex flex-wrap items-center justify-between gap-6">
              <div>
                <h4 className="text-sm font-bold text-amber-400">آمار تجمیعی کل تاریخچه فعالیت سامانه</h4>
                <p className="text-xs text-slate-400 mt-1">از ابتدای راه‌اندازی تا این لحظه</p>
              </div>

              <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">کل درآمد تاریخچه:</span>
                  <span className="font-bold text-emerald-400 text-base">{monthlyAnalytics?.totals.allTimeRevenue.toLocaleString('en-US')} تومان</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">کل کتاب‌های ثبت شده:</span>
                  <span className="font-bold text-white text-base">{monthlyAnalytics?.totals.allTimeBooks} پروژه</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">کل کلمات تاریخچه:</span>
                  <span className="font-bold text-amber-400 text-base">{monthlyAnalytics?.totals.allTimeWords.toLocaleString('en-US')} کلمه</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">کل توکن‌های مصرفی:</span>
                  <span className="font-bold text-purple-400 text-base">{monthlyAnalytics?.totals.allTimeTokens.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: DAILY REVENUE & FILTERABLE PAYMENTS */}
        {/* ========================================================= */}
        {activeTab === 'daily_revenue' && (
          <DailyRevenueView token={token} onRefreshOverview={fetchOverview} />
        )}

        {/* ========================================================= */}
        {/* TAB: COMPLETED BOOKS (MULTI-FORMAT DOWNLOAD & READER) */}
        {/* ========================================================= */}
        {activeTab === 'completed_books' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookCheck className="w-6 h-6 text-emerald-400" />
                  <span>آرشیو کتاب‌های ترجمه‌شده کاربران (دانلود و مطالعه مستقیم)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  مشاهده و دانلود کامل کتاب‌های ترجمه‌شده با فرمت‌های Word، PDF، کتابخوان وب (HTML/EPUB) و فایل متنی TXT
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    placeholder="جستجو در نام کتاب، نویسنده یا کاربر..."
                    value={completedBookSearch}
                    onChange={(e) => setCompletedBookSearch(e.target.value)}
                    className="w-full px-4 py-2 pr-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <button
                  onClick={fetchAllBooks}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                  بروزرسانی
                </button>
              </div>
            </div>

            {/* Quick summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">کتاب‌های ترجمه‌شده آماده:</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    {completedBooksCount.toLocaleString('en-US')} <span className="text-xs text-slate-400 font-normal">عنوان</span>
                  </div>
                </div>
                <BookCheck className="w-8 h-8 text-emerald-500/30" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">فرمت‌های دانلود فعال:</span>
                  <div className="text-xs font-bold text-amber-300 mt-1">Word (.doc), PDF, HTML/EPUB, TXT</div>
                </div>
                <Download className="w-8 h-8 text-amber-500/30" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">قابلیت مطالعه درون پنل:</span>
                  <div className="text-xs font-bold text-cyan-300 mt-1">کتابخوان تعاملی با تغییر اندازه قلم</div>
                </div>
                <Eye className="w-8 h-8 text-cyan-500/30" />
              </div>
            </div>

            {/* Completed Books Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">عنوان کتاب</th>
                      <th className="py-3.5 px-4">سفارش‌دهنده</th>
                      <th className="py-3.5 px-4">تعداد کلمات</th>
                      <th className="py-3.5 px-4">پیشرفت بخش‌ها</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-4 text-center">دانلود در فرمت‌های مختلف و مطالعه</th>
                      <th className="py-3.5 px-4 text-left">مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {completedBooksList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          {loadingBooks ? 'در حال بارگذاری لیست کتاب‌ها...' : 'هیچ کتاب ترجمه‌شده‌ای یافت نشد.'}
                        </td>
                      </tr>
                    ) : (
                      completedBooksList.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-bold text-white text-sm">{b.title}</div>
                            {b.originalTitle && (
                              <div className="text-[11px] text-slate-400 font-serif" dir="ltr">{b.originalTitle}</div>
                            )}
                            {b.author && (
                              <div className="text-[10px] text-amber-400/80 mt-0.5">نویسنده: {b.author}</div>
                            )}
                            {b.hasAdminCopy && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold" title="این کتاب دارای نسخه اختصاصی ویرایش شده توسط مدیریت است">
                                  <Sparkles className="w-3 h-3 text-purple-400" />
                                  <span>دارای نسخه مدیریت</span>
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-slate-200 font-medium">{b.user?.name || 'کاربر عمومی'}</div>
                            <div className="text-[10px] text-slate-500 font-mono" dir="ltr">
                              {b.user?.phone || b.user?.email || b.userId}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-amber-400">
                            {(b.wordCount || 0).toLocaleString('en-US')} <span className="text-[10px] text-slate-400 font-normal">کلمه</span>
                          </td>
                          <td className="py-4 px-4 font-mono">
                            <span className="text-emerald-400 font-bold">{b.completedChunks || 0}</span>
                            <span className="text-slate-500"> / {b.chunksCount || 0} بخش</span>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                b.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {b.status === 'completed' ? 'تکمیل شده' : 'ترجمه جزیی / در جریان'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {/* Word DOCX Download */}
                              <button
                                onClick={() => handleDownloadWordDocx(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                                title="دانلود فایل استاندارد Word (.docx) راست‌چین بدون کشیدگی متن"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Word (.docx)</span>
                              </button>

                              {/* Word .doc Legacy Download */}
                              <button
                                onClick={() => handleDownloadWordDoc(b)}
                                className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition"
                                title="دانلود فایل ورد نسخه (.doc)"
                              >
                                <span>.doc</span>
                              </button>

                              {/* PDF Print */}
                              <button
                                onClick={() => handlePrintBookPdf(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                                title="چاپ و دانلود مستقیم PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>

                              {/* HTML / EPUB */}
                              <button
                                onClick={() => handleDownloadHtmlBook(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                                title="دانلود کتاب دیجیتال HTML/EPUB"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                                <span>HTML</span>
                              </button>

                              {/* TXT Download */}
                              <button
                                onClick={() => handleDownloadTxtBook(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition"
                                title="دانلود متن خالص TXT"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>TXT</span>
                              </button>

                              {/* Online Reader */}
                              <button
                                onClick={() => handleOpenReader(b)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                                title="مطالعه آنلاین در پنل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>مطالعه</span>
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Admin Private Edit Button */}
                              <button
                                onClick={() => setAdminEditingBook(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                                title="ویرایش نسخه اختصاصی مدیریت (بدون تغییر روی پنل کاربر)"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                                <span>ویرایش مدیریت</span>
                              </button>

                              <button
                                onClick={() => handleDeleteBookAdmin(b.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="حذف کتاب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Online Book Reader Modal */}
            {readingBookModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        <h3 className="font-bold text-base text-white">{readingBookModal.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {readingBookModal.author ? `نویسنده: ${readingBookModal.author} | ` : ''}
                        {readingBookModal.chunks?.length || 0} بخش و فصل ثبت‌شده
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Font size adjustment */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-400 text-[10px]">اندازه قلم:</span>
                        <button
                          onClick={() => setReadingFontSize(Math.max(12, readingFontSize - 2))}
                          className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono text-amber-400 w-5 text-center">{readingFontSize}</span>
                        <button
                          onClick={() => setReadingFontSize(Math.min(26, readingFontSize + 2))}
                          className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleDownloadWordDoc(readingBookModal)}
                        className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs"
                        title="دانلود فایل ورد"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handlePrintBookPdf(readingBookModal)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs"
                        title="چاپ یا ذخیره PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setReadingBookModal(null)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reading Body */}
                  <div
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-slate-950/70 rounded-2xl border border-slate-800/80 my-4 select-text"
                    style={{ fontSize: `${readingFontSize}px`, lineHeight: 2.2 }}
                  >
                    {(!readingBookModal.chunks || readingBookModal.chunks.length === 0) ? (
                      <div className="text-center py-12 text-slate-400 text-sm">
                        هنوز محتوای ترجمه‌شده‌ای برای این کتاب ثبت نشده است.
                      </div>
                    ) : (
                      readingBookModal.chunks.map((ch: any, idx: number) => (
                        <div key={ch.id || idx} className="border-b border-slate-800/80 pb-8 last:border-0">
                          <h4 className="text-amber-400 font-bold text-lg mb-3 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">
                              {idx + 1}
                            </span>
                            <span>{ch.title || `بخش ${idx + 1}`}</span>
                          </h4>

                          <div
                            className="text-slate-200 text-justify leading-loose"
                            dangerouslySetInnerHTML={{
                              __html: ch.translatedHtml || (ch.translatedText ? ch.translatedText.replace(/\n/g, '<br/>') : '<p class="text-slate-500 italic">ترجمه نشده</p>')
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Private Book Editor Modal */}
            {adminEditingBook && (
              <AdminBookEditorModal
                book={adminEditingBook}
                token={token}
                isOpen={Boolean(adminEditingBook)}
                onClose={() => setAdminEditingBook(null)}
                onSaveSuccess={() => {
                  fetchAllBooks();
                }}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1.7: ALL BOOKS OVERSIGHT */}
        {/* ========================================================= */}
        {activeTab === 'all_books' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">نظارت، بازرسی و مدیریت کلیه کتاب‌های سامانه</h2>
                <p className="text-xs text-slate-400">
                  مشاهده تمام کتاب‌های ایجاد شده توسط کاربران، تعداد کلمات، وضعیت ترجمه و امکان حذف کتاب‌های غیرمجاز
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    placeholder="جستجو در عنوان کتاب، نویسنده یا کاربر..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="w-full px-4 py-2 pr-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <button
                  onClick={fetchAllBooks}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                  بروزرسانی
                </button>
              </div>
            </div>

            {/* Books Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">عنوان کتاب</th>
                      <th className="py-3.5 px-4">کاربر سفارش‌دهنده</th>
                      <th className="py-3.5 px-4">تعداد کلمات</th>
                      <th className="py-3.5 px-4">هزینه محاسبه‌شده</th>
                      <th className="py-3.5 px-4">فصل‌ها / بخش‌ها</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-4 text-center">عملیات مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredBooks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          کتابی با این مشخصات یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredBooks.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{b.title}</div>
                            <div className="text-[11px] text-slate-400">{b.originalTitle || '—'}</div>
                            {b.author && <div className="text-[10px] text-slate-500 mt-0.5">نویسنده: {b.author}</div>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-medium">{b.user?.name || 'کاربر عمومی'}</div>
                            <div className="text-[10px] text-slate-500 font-mono" dir="ltr">{b.user?.phone || b.user?.email || b.userId}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {(b.wordCount || 0).toLocaleString('en-US')} <span className="text-[10px] text-slate-400 font-normal">کلمه</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {(b.estimatedCost || 0).toLocaleString('en-US')} <span className="text-[10px] text-slate-400 font-normal">تومان</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="text-white font-bold">{b.completedChunks || 0}</span>
                            <span className="text-slate-500"> از {b.chunksCount || 0} بخش</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                b.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : b.status === 'translating'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {b.status === 'completed' ? 'تکمیل شده' : b.status === 'translating' ? 'در حال ترجمه' : 'پیش‌نویس'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setAdminEditingBook(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                                title="ویرایش نسخه اختصاصی مدیریت (بدون تغییر روی پنل کاربر)"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                                <span>ویرایش مدیریت</span>
                              </button>
                              <button
                                onClick={() => handleDeleteBookAdmin(b.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                                title="حذف کامل کتاب از سیستم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: USER MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">مدیریت تمام کاربران سامانه</h2>
                <p className="text-xs text-slate-400">مشاهده مشخصات، شارژ کیف پول، نقش و کتاب‌های هر کاربر</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setCreateUserModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>افزودن کاربر جدید</span>
                </button>
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    placeholder="جستجو با نام، شماره یا ایمیل..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full px-4 py-2 pr-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">کاربر</th>
                      <th className="py-3.5 px-4">اطلاعات تماس</th>
                      <th className="py-3.5 px-4">نقش و سازمان</th>
                      <th className="py-3.5 px-4">تعرفه کلمه‌ای</th>
                      <th className="py-3.5 px-4">مانده کیف پول</th>
                      {!isStaff && <th className="py-3.5 px-4">کل مصرف‌شده</th>}
                      <th className="py-3.5 px-4">کتاب‌ها و کلمات</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-4 text-left">عملیات و مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.notes && (
                              <span title={`یادداشت داخلی: ${u.notes}`} className="cursor-help text-amber-400">
                                <Info className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {u.id.slice(-6)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300 font-mono" dir="ltr">{u.phone}</div>
                          <div className="text-[10px] text-slate-500 font-mono" dir="ltr">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                : u.role === 'staff'
                                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                                : u.role === 'publisher'
                                ? 'bg-purple-500/10 border border-purple-500/30 text-purple-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {u.role === 'admin' ? '👑 مدیر ارشد' : u.role === 'staff' ? '🛡️ کارمند / پشتیبان' : u.role === 'publisher' ? '🏢 ناشر همکار' : '👤 کاربر عادی'}
                            </span>
                            {u.organizationName && (
                              <div className="text-[11px] text-purple-300 font-semibold truncate max-w-[140px]" title={u.organizationName}>
                                {u.organizationName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.customCostPerWord ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                                ✨ اختصاصی: {u.customCostPerWord} ت
                              </span>
                              {u.discountPercent ? (
                                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">+{u.discountPercent}٪ تخفیف</div>
                              ) : null}
                            </div>
                          ) : u.role === 'publisher' ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                                🏢 نرخ ناشر ({settings?.pricing?.publisherCostPerWord ?? 30} ت)
                              </span>
                              {u.discountPercent ? (
                                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">+{u.discountPercent}٪ تخفیف</div>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 font-mono border border-slate-700/60">
                                عمومی ({settings?.pricing?.costPerWord ?? 45} ت)
                              </span>
                              {u.discountPercent ? (
                                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">+{u.discountPercent}٪ تخفیف</div>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                          <span className="bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            {(u.walletBalance || 0).toLocaleString('en-US')} <span className="text-[10px] text-emerald-300 font-normal">تومان</span>
                          </span>
                        </td>
                        {!isStaff && (
                          <td className="py-3.5 px-4 font-bold text-purple-400 font-mono">
                            <span className="bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                              {(u.totalSpent || 0).toLocaleString('en-US')} <span className="text-[10px] text-purple-300 font-normal">تومان</span>
                            </span>
                          </td>
                        )}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleInspectUserBooks(u)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 text-[11px] flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{u.booksCount || 0} کتاب ({(u.translatedWords || 0).toLocaleString('en-US')} کلمه)</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {u.status === 'active' ? 'فعال' : 'مسدود'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <div className="flex items-center justify-end flex-wrap gap-1.5">
                            {/* Edit User Button */}
                            <button
                              onClick={() => setEditUserModal({
                                id: u.id,
                                name: u.name,
                                phone: u.phone,
                                email: u.email || '',
                                role: u.role || 'user',
                                status: u.status,
                                password: '',
                                customCostPerWord: u.customCostPerWord ?? '',
                                discountPercent: u.discountPercent ?? '',
                                organizationName: u.organizationName || '',
                                notes: u.notes || '',
                              })}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                              title="ویرایش مشخصات نام، شماره، نقش، تعرفه اختصاصی و یادداشت"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-400" />
                              <span>ویرایش و تعرفه</span>
                            </button>

                            {/* Wallet Adjust Button */}
                            <button
                              onClick={() => setAdjustWalletModal({ user: u, amount: 50000, description: 'شارژ کیف پول توسط پرسنل' })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                              title="افزایش یا کسر موجودی کیف پول"
                            >
                              <Wallet className="w-3 h-3 text-emerald-400" />
                              <span>کیف پول (+/-)</span>
                            </button>

                            {(!isStaff || u.role !== 'admin') && (
                              <button
                                onClick={() => handleUpdateUserStatus(u.id, u.role, u.status === 'active' ? 'banned' : 'active')}
                                className={`px-2 py-1 rounded-lg text-[10px] ${
                                  u.status === 'active'
                                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                {u.status === 'active' ? 'مسدودسازی' : 'فعال‌سازی'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Edit User Profile */}
            {editUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-base text-white">ویرایش مشخصات کاربر: {editUserModal.name}</h3>
                    </div>
                    <button
                      onClick={() => setEditUserModal(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نام و نام خانوادگی:</label>
                        <input
                          type="text"
                          value={editUserModal.name}
                          onChange={(e) => setEditUserModal({ ...editUserModal, name: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">شماره تلفن همراه:</label>
                        <input
                          type="tel"
                          dir="ltr"
                          value={editUserModal.phone}
                          onChange={(e) => setEditUserModal({ ...editUserModal, phone: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">آدرس ایمیل:</label>
                        <input
                          type="email"
                          dir="ltr"
                          value={editUserModal.email}
                          onChange={(e) => setEditUserModal({ ...editUserModal, email: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نقش کاربری:</label>
                        <select
                          value={editUserModal.role}
                          onChange={(e) => setEditUserModal({ ...editUserModal, role: e.target.value as any })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="user">کاربر عادی سامانه</option>
                          <option value="publisher">ناشر همکار (سازمانی)</option>
                          <option value="staff">پرسنل و پشتیبان سامانه</option>
                          {!isStaff && <option value="admin">مدیر ارشد (دسترسی تام)</option>}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نام سازمان / انتشارات (اختیاری):</label>
                        <input
                          type="text"
                          placeholder="مثلاً: انتشارات ققنوس"
                          value={editUserModal.organizationName || ''}
                          onChange={(e) => setEditUserModal({ ...editUserModal, organizationName: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">یادداشت داخلی پرسنل:</label>
                        <input
                          type="text"
                          placeholder="توضیحات خصوصی درباره مشتری"
                          value={editUserModal.notes || ''}
                          onChange={(e) => setEditUserModal({ ...editUserModal, notes: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Dedicated Pricing & Custom Discount Box */}
                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>تعرفه اختصاصی و تخفیف ویژه این کاربر:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            نرخ اختصاصی هر کلمه (تومان):
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="خالی = نرخ پیش‌فرض سامانه"
                            value={editUserModal.customCostPerWord ?? ''}
                            onChange={(e) => setEditUserModal({ ...editUserModal, customCostPerWord: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            عمومی: {settings?.pricing?.costPerWord ?? 45} ت | ناشران: {settings?.pricing?.publisherCostPerWord ?? 30} ت
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            درصد تخفیف دائم (٪):
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="مثلاً: ۱۵"
                            value={editUserModal.discountPercent ?? ''}
                            onChange={(e) => setEditUserModal({ ...editUserModal, discountPercent: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            کسر مستقیم از مبلغ محاسبه‌شده
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">وضعیت حساب:</label>
                        <select
                          value={editUserModal.status}
                          onChange={(e) => setEditUserModal({ ...editUserModal, status: e.target.value as any })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="active">فعال (مجاز به استفاده)</option>
                          <option value="banned">مسدود (غیرفعال)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">تغییر رمز عبور (اختیاری):</label>
                        <input
                          type="password"
                          dir="ltr"
                          placeholder="در صورت خالی بودن تغییر نمی‌کند"
                          value={editUserModal.password || ''}
                          onChange={(e) => setEditUserModal({ ...editUserModal, password: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={editUserLoading}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        {editUserLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>ذخیره تغییرات مشخصات کاربر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditUserModal(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Inspect Specific User Books */}
            {selectedUserBooks && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                    <div>
                      <h3 className="font-bold text-base text-white">
                        کتاب‌های کاربر: {selectedUserBooks.user.name} ({selectedUserBooks.user.phone})
                      </h3>
                      <p className="text-xs text-slate-400">دسترسی و بازرسی کامل مدیر به کتاب‌های ایجاد شده توسط این کاربر</p>
                    </div>
                    <button
                      onClick={() => setSelectedUserBooks(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {selectedUserBooks.books.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-500">
                        این کاربر تا کنون کتابی ایجاد نکرده است.
                      </div>
                    ) : (
                      selectedUserBooks.books.map((b) => (
                        <div key={b.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-sm text-amber-300">{b.title}</h4>
                              <p className="text-xs text-slate-400 font-serif" dir="ltr">{b.originalTitle}</p>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              وضعیت: {b.status === 'completed' ? 'تکمیل شده' : b.status === 'translating' ? 'در حال ترجمه' : 'پیش‌نویس'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 mb-2">
                            <div>کلمات: <b className="text-white">{(b.wordCount || 0).toLocaleString('en-US')}</b></div>
                            <div>تعداد بخش‌ها: <b className="text-white">{b.chunks?.length || 0} فصل</b></div>
                            <div>لحن: <b className="text-amber-400">{b.tone}</b></div>
                          </div>

                          <div className="text-[11px] text-slate-500 line-clamp-2">
                            نمونه متن ترجمه شده: {b.chunks?.[0]?.translatedHtml?.replace(/<[^>]+>/g, ' ').slice(0, 160) || 'هنوز ترجمه نشده'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Adjust User Wallet */}
            {adjustWalletModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-base text-white">مدیریت کیف پول: {adjustWalletModal.user.name}</h3>
                    </div>
                    <button
                      onClick={() => setAdjustWalletModal(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 mb-4 flex items-center justify-between text-xs">
                    <span className="text-slate-400">موجودی فعلی کاربر:</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {(adjustWalletModal.user.walletBalance || 0).toLocaleString('en-US')} تومان
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Quick Preset Adjust Buttons */}
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">انتخاب سریع مبلغ:</span>
                      <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => setAdjustWalletModal({ ...adjustWalletModal, amount: 50000, description: 'شارژ تشویقی ۵۰ هزار تومان' })}
                          className="py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold"
                        >
                          +50,000
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustWalletModal({ ...adjustWalletModal, amount: 100000, description: 'شارژ تشویقی ۱۰۰ هزار تومان' })}
                          className="py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold"
                        >
                          +100,000
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustWalletModal({ ...adjustWalletModal, amount: 200000, description: 'شارژ تشویقی ۲۰۰ هزار تومان' })}
                          className="py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold"
                        >
                          +200,000
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustWalletModal({ ...adjustWalletModal, amount: -20000, description: 'کسر ۲۰ هزار تومان توسط مدیر' })}
                          className="py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold"
                        >
                          -20,000
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustWalletModal({ ...adjustWalletModal, amount: -50000, description: 'کسر ۵۰ هزار تومان توسط مدیر' })}
                          className="py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold"
                        >
                          -50,000
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustWalletModal({ ...adjustWalletModal, amount: -100000, description: 'کسر ۱۰۰ هزار تومان توسط مدیر' })}
                          className="py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold"
                        >
                          -100,000
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        مبلغ دلخواه تغییر (تومان - عدد مثبت برای اضافه کردن، منفی برای کسر):
                      </label>
                      <input
                        type="number"
                        step="5000"
                        value={adjustWalletModal.amount}
                        onChange={(e) => setAdjustWalletModal({ ...adjustWalletModal, amount: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Projected Balance Preview */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-400">موجودی جدید پس از اعمال:</span>
                      <span className={`font-bold font-mono text-sm ${
                        (adjustWalletModal.user.walletBalance + adjustWalletModal.amount) >= 0
                          ? 'text-white'
                          : 'text-rose-400'
                      }`}>
                        {Math.max(0, adjustWalletModal.user.walletBalance + adjustWalletModal.amount).toLocaleString('en-US')} تومان
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        علت و توضیحات تغییر موجودی:
                      </label>
                      <input
                        type="text"
                        value={adjustWalletModal.description}
                        onChange={(e) => setAdjustWalletModal({ ...adjustWalletModal, description: e.target.value })}
                        placeholder="مثلاً: هدیه شارژ تشویقی یا کسر بابت خدمات"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveWalletAdjustment}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition"
                      >
                        {adjustWalletModal.amount >= 0 ? `شارژ +${adjustWalletModal.amount.toLocaleString('en-US')} تومان` : `کسر ${Math.abs(adjustWalletModal.amount).toLocaleString('en-US')} تومان`}
                      </button>
                      <button
                        onClick={() => setAdjustWalletModal(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Create New User by Admin */}
            {createUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-base text-white">افزودن کاربر جدید توسط مدیر</h3>
                    </div>
                    <button
                      onClick={() => setCreateUserModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {createUserError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{createUserError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">نام و نام خانوادگی:</label>
                      <input
                        type="text"
                        placeholder="مثال: علی احمدی"
                        value={createUserForm.name}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">شماره تلفن همراه (الزامی):</label>
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="09123456789"
                        value={createUserForm.phone}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">ایمیل (اختیاری):</label>
                      <input
                        type="email"
                        dir="ltr"
                        placeholder="user@example.com"
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">کلمه عبور (الزامی):</label>
                      <input
                        type="password"
                        dir="ltr"
                        placeholder="حداقل ۶ نویسه"
                        value={createUserForm.password}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نقش کاربری:</label>
                        <select
                          value={createUserForm.role}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        >
                          <option value="user">کاربر عادی</option>
                          <option value="publisher">ناشر همکار (سازمانی)</option>
                          <option value="staff">پرسنل و پشتیبان سامانه</option>
                          {!isStaff && <option value="admin">مدیر ارشد (دسترسی تام)</option>}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">شارژ اولیه کیف پول (تومان):</label>
                        <input
                          type="number"
                          step="10000"
                          value={createUserForm.walletBalance}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, walletBalance: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نام سازمان / انتشارات (اختیاری):</label>
                        <input
                          type="text"
                          placeholder="مثلاً: انتشارات ققنوس"
                          value={createUserForm.organizationName}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, organizationName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">یادداشت داخلی پرسنل:</label>
                        <input
                          type="text"
                          placeholder="توضیحات خصوصی..."
                          value={createUserForm.notes}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, notes: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Dedicated Pricing Override for User */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>تعرفه اختصاصی و تخفیف این کاربر (اختیاری):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-300 mb-1">نرخ کلمه‌ای (تومان):</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="خالی = پیش‌فرض"
                            value={createUserForm.customCostPerWord}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, customCostPerWord: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-300 mb-1">تخفیف دائم (٪):</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="مثلاً ۱۰"
                            value={createUserForm.discountPercent}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, discountPercent: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <button
                        type="submit"
                        disabled={createUserLoading}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition"
                      >
                        {createUserLoading ? 'در حال ثبت...' : 'ثبت و ایجاد کاربر'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateUserModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2.5: COUPONS & DISCOUNT CODES */}
        {/* ========================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  <span>مدیریت کدهای تخفیف و بن‌های اعتباری</span>
                </h2>
                <p className="text-xs text-slate-400">ایجاد کدهای هدیه نقدی، درصد تخفیف و تعیین ظرفیت مجاز استفاده</p>
              </div>

              <button
                onClick={fetchCoupons}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بروزرسانی لیست</span>
              </button>
            </div>

            {/* Create Coupon Form Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>تعریف و صدور کد تخفیف جدید</span>
              </h3>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">کد تخفیف (انگلیسی / حروف بزرگ):</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="مثال: SPRING1404"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono text-sm font-bold focus:border-emerald-500 focus:outline-none text-left"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">بدون فاصله و کاراکترهای خاص</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">شارژ هدیه کیف پول (تومان):</label>
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      placeholder="50000"
                      value={newCouponCredit}
                      onChange={(e) => setNewCouponCredit(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">مستقیماً به کیف پول اضافه می‌شود</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">درصد تخفیف سفارش (٪):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="مثلاً: 20"
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">از هزینه ترجمه کتاب کسر می‌شود</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">حداکثر سقف مجاز استفاده (تعداد):</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="100"
                      value={newCouponMaxUses}
                      onChange={(e) => setNewCouponMaxUses(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">پس از این تعداد منقضی می‌شود</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ایجاد و فعال‌سازی کد تخفیف</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Coupons Table Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">لیست کلیه کدهای تخفیف تعریف‌شده ({coupons.length})</h3>
                <span className="text-xs text-slate-400">کدها فوراً برای همه کاربران قابل اعمال هستند</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">کد تخفیف</th>
                      <th className="py-3.5 px-4">نوع جایزه / پاداش</th>
                      <th className="py-3.5 px-4">دفعات استفاده</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          هیچ کد تخفیفی تاکنون ایجاد نشده است. از فرم بالا اولین کد را بسازید.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((c: any) => {
                        const used = c.usedCount || (c.usedBy || []).length;
                        const isExhausted = c.maxUses && used >= c.maxUses;
                        return (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-amber-300 text-sm bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800" dir="ltr">
                                  {c.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(c.code);
                                    alert(`کد «${c.code}» در حافظه کپی شد.`);
                                  }}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                  title="کپی در حافظه"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                {c.creditBonus > 0 && (
                                  <div className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span>+{c.creditBonus.toLocaleString('en-US')} تومان شارژ هدیه</span>
                                  </div>
                                )}
                                {c.discountPercent > 0 && (
                                  <div className="text-cyan-400 font-mono font-bold flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5" />
                                    <span>{c.discountPercent}٪ تخفیف روی فاکتور</span>
                                  </div>
                                )}
                                {!c.creditBonus && !c.discountPercent && (
                                  <span className="text-slate-500">بدون مزیت نقدی</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{used}</span>
                                <span className="text-slate-500">از {c.maxUses || 'نامحدود'}</span>
                              </div>
                              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className={`h-full ${isExhausted ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, ((used / (c.maxUses || 100)) * 100))}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExhausted
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isExhausted ? 'تکمیل ظرفیت' : 'فعال و معتبر'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupon(c.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold inline-flex items-center gap-1 transition"
                                title="حذف کد تخفیف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: API POOL & PARALLEL QUEUE */}
        {/* ========================================================= */}
        {activeTab === 'api_pool' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-amber-400" />
                  <span>مدیریت استخر کلیدهای هوش مصنوعی و صف هوشمند</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  توزیع هوشمند درخواست‌ها بین کلیدهای فعال سرور و پردازش پس‌زمینه بدون وابستگی به کاربر
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClearSystemCache}
                  disabled={isClearingCache}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="پاکسازی امن کش حافظه جهت آزادسازی رم و افزایش سرعت بدون حذف اطلاعات یا کتاب‌ها"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isClearingCache ? 'در حال پاکسازی...' : 'پاکسازی کش و رم سیستم'}</span>
                </button>
                <button
                  onClick={handleTestAllKeys}
                  disabled={testingAllKeys}
                  className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="ارزیابی سلامت و تاخیر تمامی کلیدها به طور همزمان"
                >
                  {testingAllKeys ? <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> : <Zap className="w-4 h-4 text-purple-400" />}
                  <span>{testingAllKeys ? 'در حال بررسی...' : 'تست پینگ همزمان تمام کلیدها'}</span>
                </button>
                <button
                  onClick={handleResetAllKeysStats}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                  title="صفر کردن کنتور توکن و آمار کلیه کلیدها"
                >
                  <RotateCw className="w-4 h-4 text-rose-400" />
                  <span>ریست آمار و توکن همه کلیدها</span>
                </button>
                <button
                  onClick={() => { fetchApiKeys(); fetchQueueStats(); }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  بروزرسانی وضعیت
                </button>
                <button
                  onClick={() => setNewKeyModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  افزودن کلید تکی
                </button>
                <button
                  onClick={() => setBatchKeyModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  title="افزودن همزمان ده‌ها کلید برای یک مدل مشخص (مانند 3.5 فلش لایت)"
                >
                  <Layers className="w-4 h-4" />
                  <span>⚡ ورود دسته‌ای کلیدها (یکجا)</span>
                </button>
              </div>
            </div>

            {/* Live Queue Monitor Card (70/30 Dynamic Distribution Architecture) */}
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">موتور صف ابری و توزیع ۷۰/۳۰ ظرفیت کلیدها</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        پایداری هوشمند شبکه
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ۷۰٪ سرورهای فعال به عنوان درگاه پردازش همزمان و ۳۰٪ به عنوان ظرفیت رزرو ضد اتمام توکن تخصیص می‌یابند.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchQueueStats}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition"
                    title="بروزرسانی وضعیت صف"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>بروزرسانی صف</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
                    مجموع کلیدها: <strong className="text-white">{queueStats?.totalConnectedServers ?? apiKeys.filter((k) => k.isActive).length}</strong>
                  </span>
                </div>
              </div>

              {/* Dynamic 70/30 Visual Distribution Bar */}
              <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                    اسلات‌های فعال پردازش همزمان (۷۰٪ ظرفیت): {queueStats?.activeSlotsLimit ?? Math.max(1, Math.floor(apiKeys.filter((k) => k.isActive).length * 0.7))} اسلات
                  </span>
                  <span className="text-purple-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>
                    ظرفیت رزرو پشتیبان و ضد توقف (۳۰٪ پایداری): {queueStats?.reserveSlotsLimit ?? Math.max(0, apiKeys.filter((k) => k.isActive).length - Math.max(1, Math.floor(apiKeys.filter((k) => k.isActive).length * 0.7)))} کلید
                  </span>
                </div>

                {/* Progress bar split */}
                <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full relative transition-all duration-500"
                    style={{ width: `${queueStats?.rule?.activePercent || 70}%` }}
                    title="۷۰٪ اسلات‌های فعال پردازش مستقیم"
                  >
                    <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                  </div>
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-r-full relative transition-all duration-500"
                    style={{ width: `${queueStats?.rule?.reservePercent || 30}%` }}
                    title="۳۰٪ کلیدهای رزرو اضطراری"
                  ></div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    پردازش فعال کنونی:{' '}
                    <strong className="text-amber-400 font-mono">
                      {queueStats ? (queueStats.activeProcessingCount ?? queueStats.activeJobs ?? 0) : (overview?.activeJobsCount || 0)}
                    </strong>{' '}
                    از سقف مجاز{' '}
                    <strong className="text-emerald-400 font-mono">
                      {queueStats?.activeSlotsLimit ?? Math.max(1, Math.floor(apiKeys.filter((k) => k.isActive).length * 0.7))}
                    </strong>{' '}
                    اسلات
                  </span>

                  {queueStats?.reserveSlotsInFailoverCount > 0 ? (
                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      {queueStats.reserveSlotsInFailoverCount} کلید رزرو جهت جلوگیری از وقفه فعال شده است.
                    </span>
                  ) : (
                    <span className="text-purple-300/80 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      تمام کلیدهای رزرو در حالت آماده‌باش امن (Hot-Standby) قرار دارند.
                    </span>
                  )}
                </div>
              </div>

              {/* 4 Stats Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/70">
                  <div className="text-slate-400 text-[11px] mb-1">کتاب‌های در حال ترجمه:</div>
                  <div className="text-lg font-black text-amber-400 font-mono flex items-baseline gap-1">
                    <span>{queueStats ? (queueStats.activeProcessingCount ?? queueStats.activeJobs ?? 0) : (overview?.activeJobsCount || 0)}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      / سقف {queueStats?.activeSlotsLimit ?? Math.max(1, Math.floor(apiKeys.filter((k) => k.isActive).length * 0.7))}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/70">
                  <div className="text-slate-400 text-[11px] mb-1">کتاب‌های در صف انتظار:</div>
                  <div className="text-lg font-black text-blue-400 font-mono">
                    {queueStats ? (queueStats.queuedJobsCount ?? queueStats.queuedJobs ?? 0) : 0}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/70">
                  <div className="text-slate-400 text-[11px] mb-1">ظرفیت اصلی (۷۰٪ کلیدها):</div>
                  <div className="text-lg font-black text-emerald-400 font-mono flex items-baseline gap-1">
                    <span>{queueStats?.activeSlotsLimit ?? Math.max(1, Math.floor(apiKeys.filter((k) => k.isActive).length * 0.7))}</span>
                    <span className="text-[10px] text-slate-400 font-normal">ترجمه همزمان</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/70">
                  <div className="text-slate-400 text-[11px] mb-1">کلیدهای پشتیبان (۳۰٪ رزرو):</div>
                  <div className="text-lg font-black text-purple-400 font-mono flex items-baseline gap-1">
                    <span>{queueStats?.reserveSlotsLimit ?? Math.max(0, apiKeys.filter((k) => k.isActive).length - Math.max(1, Math.floor(apiKeys.filter((k) => k.isActive).length * 0.7)))}</span>
                    <span className="text-[10px] text-purple-300 font-normal">رزرو ضد توقف</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Pool Switching Policy & Linux Speed Optimization Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Key Pool Model Switch Policy */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">سیاست سوئیچ مدل‌ها در استخر کلیدها</h3>
                      <p className="text-[11px] text-slate-400">کنترل رفتار سیستم هنگام ترجمه یا تست کلیدها</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    settings?.keyPoolSettings?.allowAutoSwitchOnTranslationFailure
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {settings?.keyPoolSettings?.allowAutoSwitchOnTranslationFailure ? 'سوئیچ خودکار فعال' : 'ثابت روی مدل انتخابی (پیش‌فرض)'}
                  </span>
                </div>

                {/* Auto-switch on Translation toggle */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-200 block">
                      سوئیچ خودکار مدل در زمان ترجمه کتاب
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      در حالت پیش‌فرض (غیرفعال)، ترجمه صرفاً با مدل مشخص‌شده انجام می‌شود و در صورت بروز خطا سوئیچ نمی‌کند تا ساختار و لحن دستخوش تغییر نشود. فقط در صورت فعال‌سازی این کلید توسط مدیر، سامانه مجاز به سوئیچ روی مدل‌های رزرو خواهد بود.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAutoSwitchTranslation(!(settings?.keyPoolSettings?.allowAutoSwitchOnTranslationFailure))}
                    className={`shrink-0 w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                      settings?.keyPoolSettings?.allowAutoSwitchOnTranslationFailure ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></div>
                  </button>
                </div>

                {/* Manual Switch for Management */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      سوئیچ سریع مدل تمام کلیدها توسط مدیریت (در صورت عدم کارکرد یک مدل)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      چنانچه مدلی خاص (مانند Gemini 3.8) دچار کندی یا اختلال موقت شد، مدیر می‌تواند با یک کلیک مدل تمام کلیدهای سرور را به مدل پایدار دیگری سوئیچ کند.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <select
                      value={batchTargetModel}
                      onChange={(e) => setBatchTargetModel(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      <option value="gemini-4-argon">Gemini 4 Argon (نهایت عمق فلسفی، ادبی و استدلال برتر)</option>
                      <option value="gemini-3.8-flash">Gemini 3.8 Flash (هوشمند، استاندارد و با کیفیت کتاب)</option>
                      <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (پرسرعت، سبک و روان)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (فوق سریع، پایدار و کم‌مصرف)</option>
                      <option value="gemini-flash-latest">Gemini Flash Latest (آخرین نگارش پایدار فلش)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleBatchSwitchModel}
                      disabled={isSwitchingBatchModel}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isSwitchingBatchModel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>سوئیچ کلیدها</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 2: Linux VPS Speed & Cache Optimization */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">بهینه‌سازی سرعت و پاکسازی رم سرور لینوکس VPS</h3>
                        <p className="text-[11px] text-slate-400">آزادسازی کش موقت بدون آسیب به کتاب‌ها یا سفارشات</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold">
                      سرور لینوکس VPS
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="text-slate-300 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      گارانتی حفظ ۱۰۰٪ اطلاعات و کتاب‌های در حال ترجمه:
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                      <li>هیچ کتابی چه در حال ترجمه و چه تکمیل‌شده پاک <strong className="text-white">نمی‌شود</strong>.</li>
                      <li>اطلاعات کاربران، کیف پول و فایل‌های خروجی کاملاً دست‌نخورده باقی می‌مانند.</li>
                      <li>تنها کش‌های موقت پردازش قبلی و سشن‌های منقضی از رم سرور آزاد می‌شوند.</li>
                      <li>سرعت و پاسخگویی سرور مجازی لینوکس به مراتب روان‌تر و سریع‌تر می‌شود.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClearSystemCache}
                    disabled={isClearingCache}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isClearingCache ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <Sparkles className="w-4 h-4 text-slate-950" />}
                    <span>{isClearingCache ? 'در حال آزادسازی کش و پاکسازی حافظه...' : 'پاکسازی کش و حافظه موقت سیستم (افزایش سرعت)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Test Results Banner */}
            {batchTestResults && batchTestResults.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-purple-400" />
                    نتیجه تست همزمان پینگ کلیدها:
                  </span>
                  <button
                    onClick={() => setBatchTestResults(null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    بستن گزارش
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                  {batchTestResults.map((r, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        r.status === 'ok'
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold block truncate">{r.name}</span>
                        <span className="text-[10px] opacity-75">{r.provider} / {r.model}</span>
                      </div>
                      <div className="text-left font-mono font-bold shrink-0 mr-2">
                        {r.status === 'ok' ? `${r.latencyMs} ms` : 'خطا'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  تفکیک کلید به ازای هر کاربر فعال
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  هنگامی که چند کاربر همزمان ترجمه می‌کنند، سیستم به هر کاربر یک کلید مجزا از استخر اختصاص می‌دهد تا سهمیه هیچ کاربری مسدود نشود.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" />
                  سوئیچ خودکار در خطای ۴۲۹ و ۵۰۳
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  در صورت اتمام سهمیه یا شلوغی سرور ارائه‌دهنده، پردازش کتاب بدون وقفه به کلید فعال بعدی منتقل می‌شود.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                <div className="font-bold text-blue-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  صف هوشمند FIFO
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  کتاب‌های ارسالی کاربران بر اساس زمان ثبت در صف سرور قرار گرفته و به ترتیب اولویت و کلمات پردازش می‌شوند.
                </p>
              </div>
            </div>

            {/* API Keys Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">عنوان کلید / سرور</th>
                      <th className="py-3.5 px-4">ارائه‌دهنده و مدل</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-4">توکن‌های سوخته امروز</th>
                      <th className="py-3.5 px-4">هزینه امروز (دلار / تومان)</th>
                      <th className="py-3.5 px-4">مجموع کل توکن‌ها و هزینه</th>
                      <th className="py-3.5 px-4">درخواست‌ها</th>
                      <th className="py-3.5 px-4">تاخیر</th>
                      <th className="py-3.5 px-4 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {apiKeys.map((k) => {
                      const isCooldown = k.cooldownUntil > Date.now();
                      const secondsLeft = Math.max(0, Math.ceil((k.cooldownUntil - Date.now()) / 1000));
                      const todayTokens = k.todayTokensUsed || 0;
                      const todayCostUsd = k.todayCostUsd ?? Number(((todayTokens / 1000000) * 0.15).toFixed(4));
                      const todayCostTomans = k.todayCostTomans ?? Math.round(todayCostUsd * 95000);
                      const totalTokens = k.totalTokensUsed || 0;
                      const totalCostUsd = k.totalCostUsd ?? Number(((totalTokens / 1000000) * 0.15).toFixed(4));
                      const totalCostTomans = k.totalCostTomans ?? Math.round(totalCostUsd * 95000);

                      return (
                        <tr key={k.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div>{k.name}</div>
                            {k.lastError && (
                              <div className="text-[9.5px] text-rose-400/90 font-normal max-w-[200px] truncate" title={k.lastError}>
                                {k.lastError}
                              </div>
                            )}
                            {k.assignedBookTitle && (
                              <div className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5" title={`این کلید منحصراً به کتاب «${k.assignedBookTitle}» اختصاص یافته و کتاب‌های دیگر از آن استفاده نمی‌کنند.`}>
                                <span>🔒 اختصاصی کتاب: «{k.assignedBookTitle}»</span>
                              </div>
                            )}
                            {k.assignedUserId && !k.assignedBookTitle && (
                              <span className="text-[10px] text-amber-400 font-mono">کاربر اختصاصی: {k.assignedUserId}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px]">
                              {k.provider} / {k.model}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {k.isSuspended ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1" title={k.lastError || 'پروژه گوگل معلق شده است (Consumer Suspended)'}>
                                  <span>🚫 معلق شده (گوگل)</span>
                                </span>
                              ) : isCooldown ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold" title={k.lastError}>
                                  توقف موقت ({secondsLeft > 180 ? `${Math.ceil(secondsLeft / 60)} دقیقه` : `${secondsLeft} ثانیه`})
                                </span>
                              ) : k.isActive ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                  فعال و آماده
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px]">
                                  غیرفعال
                                </span>
                              )}
                              <button
                                onClick={() => handleToggleKeyActive(k)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                                  k.isActive && !k.isSuspended
                                    ? 'border-slate-700 text-slate-400 hover:border-rose-500/40 hover:text-rose-400'
                                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={k.isSuspended ? 'رفع تعلیق و فعال‌سازی مجدد کلید' : 'تغییر وضعیت فعال / غیرفعال کلید'}
                              >
                                {k.isSuspended ? 'رفع تعلیق و فعال‌سازی' : k.isActive ? 'خاموش' : 'روشن'}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-amber-400 font-bold text-sm">
                              {todayTokens.toLocaleString('en-US')}
                            </div>
                            <span className="text-[10px] text-slate-500">توکن امروز</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-emerald-400 font-bold">
                              ${todayCostUsd.toFixed(4)}
                            </div>
                            <div className="text-[10.5px] text-slate-400 font-sans">
                              {todayCostTomans.toLocaleString('fa-IR')} تومان
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-white font-bold">
                              {totalTokens.toLocaleString('en-US')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ${totalCostUsd.toFixed(4)} • {totalCostTomans.toLocaleString('fa-IR')} ت
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <span className="text-emerald-400 font-bold">{k.successfulRequests || 0}</span> / <span className="text-rose-400">{k.failedRequests || 0}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {k.lastLatencyMs ? `${k.lastLatencyMs} ms` : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditKey(k)}
                                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1 transition"
                                title="ویرایش کامل کلید، مدل، توکن یا آدرس پایه در سرور"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>ویرایش</span>
                              </button>
                              <button
                                onClick={() => handleResetSingleKeyStats(k.id, k.name)}
                                className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1 transition"
                                title="صفر کردن آمار توکن‌های مصرفی و خطاهای این کلید"
                              >
                                <RotateCw className="w-3 h-3 text-blue-400" />
                                <span>ریست توکن</span>
                              </button>
                              <button
                                onClick={() => handleTestApiKey(k)}
                                disabled={testingKeyId === k.id}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1"
                              >
                                {testingKeyId === k.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-400" />}
                                <span>تست اتصال</span>
                              </button>
                              <button
                                onClick={() => handleDeleteApiKey(k.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                title="حذف کلید"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Token Cost Transparency & Live Financial Calculator Card */}
            {(() => {
              const totalTokensUsedAll = apiKeys.reduce((acc, k) => acc + (k.totalTokensUsed || 0), 0);
              const totalTokensTodayAll = apiKeys.reduce((acc, k) => acc + (k.todayTokensUsed || 0), 0);
              const todayCostUsdAll = apiKeys.reduce((acc, k) => acc + (k.todayCostUsd || 0), 0);
              const todayCostTomansAll = apiKeys.reduce((acc, k) => acc + (k.todayCostTomans || 0), 0);
              const totalCostUsdAll = apiKeys.reduce((acc, k) => acc + (k.totalCostUsd || 0), 0);
              const totalCostTomansAll = apiKeys.reduce((acc, k) => acc + (k.totalCostTomans || 0), 0);

              return (
                <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="font-bold text-sm text-white">محاسبه‌گر شفاف هزینه توکن‌های سوخته‌شده امروز و کل سرور</h3>
                        <p className="text-[11px] text-slate-400">شفافیت ۱۰۰٪ تجاری: برآورد ریالی و دلاری هزینه‌های پردازش هوش مصنوعی</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/20">
                      نرخ میانگین: ۰.۱۵$ به ازای هر ۱ میلیون توکن (دلار ۹۵,۰۰۰ تومان)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                      <span className="text-amber-400 font-semibold text-[11px] block mb-1">🔥 توکن‌های سوخته‌شده امروز:</span>
                      <div className="text-xl font-black text-amber-300 font-mono">
                        {totalTokensTodayAll.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">توکن</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">مصرف تمام کلیدهای سرور در امروز</span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-emerald-400 font-semibold text-[11px] block mb-1">💵 هزینه توکن‌های امروز:</span>
                      <div className="text-lg font-black text-emerald-300 font-mono">
                        ${todayCostUsdAll.toFixed(4)} <span className="text-xs font-normal text-emerald-400">USD</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        {todayCostTomansAll.toLocaleString('fa-IR')} تومان
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-[11px] block mb-1">مجموع کل توکن‌های مصرف‌شده:</span>
                      <div className="text-lg font-black text-white font-mono">
                        {totalTokensUsedAll.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">توکن</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">از زمان آغاز به کار سرور</span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-[11px] block mb-1">مجموع کل هزینه پردازش:</span>
                      <div className="text-lg font-black text-blue-400 font-mono">
                        ${totalCostUsdAll.toFixed(4)}
                      </div>
                      <div className="text-xs font-bold text-slate-300 mt-0.5">
                        {totalCostTomansAll.toLocaleString('fa-IR')} تومان
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* AI Glossary Extractor Throttling & Configuration Card */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">کنترل استخراج هوشمند اصطلاحات تخصصی (AI Glossary Extractor)</h3>
                    <p className="text-[11px] text-slate-400">مدیریت سقف نمونه متن و کنترل قطعی مصرف توکن در استخراج واژگان</p>
                  </div>
                </div>
                <div className="text-[11px] bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full font-bold border border-amber-500/25">
                  مصرف هر استخراج: کمتر از ۳ تک‌تومان ایران!
                </div>
              </div>

              {/* Explanatory banner addressing user concern */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl text-xs text-emerald-200 leading-relaxed space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تضمین عدم مصرف زیاد توکن در استخراج اصطلاحات:</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  برای استخراج واژه‌نامه تخصصی، سامانه کل کتاب را به هوش مصنوعی ارسال نمی‌کند، بلکه تنها یک نمونه کوتاه (حدود ۲۰۰ کلمه / ۱۲۰۰ کاراکتر) را برای کشف ۶ الی ۸ واژه کلیدی بررسی می‌کند. 
                  حداکثر مصرف هر بار استخراج تنها <strong>حدود ۳۰۰ توکن</strong> (معادل <strong>۰.۰۰۰۰۴۵ دلار</strong> یا <strong>کمتر از ۳ تک‌تومان ایران</strong>) است. 
                  این قابلیت بدون تحمیل هزینه، کیفیت و یکدستی ترجمه را در تمام فصل‌های کتاب تضمین می‌نماید.
                </p>
              </div>

              {settings && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <label className="font-bold text-slate-300 block">وضعیت استخراج خودکار:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const currentEnabled = settings.aiGlossaryConfig?.enabled !== false;
                          const newConfig = {
                            ...(settings.aiGlossaryConfig || {}),
                            enabled: !currentEnabled,
                            maxSampleChars: settings.aiGlossaryConfig?.maxSampleChars || 1200,
                            maxTerms: settings.aiGlossaryConfig?.maxTerms || 8,
                            fallbackHeuristicEnabled: true,
                          };
                          const updated = { ...settings, aiGlossaryConfig: newConfig };
                          setSettings(updated);
                          await fetch('/api/admin/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify(updated),
                          });
                          alert(currentEnabled ? 'استخراج خودکار واژه‌نامه غیرفعال شد.' : 'استخراج خودکار واژه‌نامه فعال شد.');
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          settings.aiGlossaryConfig?.enabled !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        {settings.aiGlossaryConfig?.enabled !== false ? '✓ فعال و خودکار' : '✕ غیرفعال'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                    <label className="font-bold text-slate-300 block">سقف طول متن نمونه (کاراکتر):</label>
                    <input
                      type="number"
                      min="400"
                      max="3000"
                      step="100"
                      value={settings.aiGlossaryConfig?.maxSampleChars || 1200}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSettings({
                          ...settings,
                          aiGlossaryConfig: {
                            ...(settings.aiGlossaryConfig || { enabled: true, maxTerms: 8, fallbackHeuristicEnabled: true }),
                            maxSampleChars: val,
                          },
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-slate-500 block">پیش‌فرض: ۱۲۰۰ کاراکتر (~۲۰۰ کلمه)</span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                    <label className="font-bold text-slate-300 block">سقف تعداد واژگان استخراجی:</label>
                    <input
                      type="number"
                      min="4"
                      max="15"
                      value={settings.aiGlossaryConfig?.maxTerms || 8}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSettings({
                          ...settings,
                          aiGlossaryConfig: {
                            ...(settings.aiGlossaryConfig || { enabled: true, maxSampleChars: 1200, fallbackHeuristicEnabled: true }),
                            maxTerms: val,
                          },
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-slate-500 block">پیش‌فرض: ۶ الی ۸ اصطلاح کلیدی</span>
                  </div>
                </div>
              )}
            </div>

            {/* Add Key Modal */}
            {newKeyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                  <h3 className="font-bold text-base text-white mb-4">افزودن کلید یا سرور هوش مصنوعی جدید</h3>

                  <form onSubmit={handleAddApiKey} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">نام یا برچسب کلید:</label>
                      <input
                        type="text"
                        placeholder="مثلاً: کلید کمکی ۲ جمینای"
                        value={newKeyForm.name}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">ارائه‌دهنده هوش مصنوعی (Provider):</label>
                      <select
                        value={newKeyForm.provider}
                        onChange={(e) => {
                          const p = e.target.value;
                          const defaultModels = PROVIDER_PRESET_MODELS[p] || [];
                          const defaultBaseUrl = PROVIDER_DEFAULT_BASE_URL[p] || '';
                          setNewKeyForm({
                            ...newKeyForm,
                            provider: p,
                            model: defaultModels[0] || '',
                            baseURL: defaultBaseUrl,
                            isCustomModel: false,
                          });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      >
                        <option value="gemini">Google Gemini (پیش‌فرض فصیح و استاندارد)</option>
                        <option value="glm">GLM - Zhipu AI (GLM-4 / GLM-Zero چینی)</option>
                        <option value="minimax">MiniMax (MiniMax-Text-01 / Abab چینی)</option>
                        <option value="openai">OpenAI (GPT-4o / GPT-4o-mini / o1)</option>
                        <option value="claude">Anthropic Claude (Sonnet 3.5 / 3.7)</option>
                        <option value="deepseek">DeepSeek Direct API</option>
                        <option value="openrouter">OpenRouter (دسترسی تجمیعی به همه مدل‌ها)</option>
                        <option value="proxy">سرویس واسطه / OneAPI / NewAPI / پروکسی اختصاصی</option>
                        <option value="custom">ارائه‌دهنده سفارشی (Custom API / Self-hosted)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">کلید API (API Key یا توکن دسترسی):</label>
                      <input
                        type="password"
                        dir="ltr"
                        placeholder="AIzaSy... یا sk-..."
                        value={newKeyForm.apiKey}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, apiKey: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">مدل هوش مصنوعی (Model):</label>
                        <button
                          type="button"
                          onClick={() => setNewKeyForm({ ...newKeyForm, isCustomModel: !newKeyForm.isCustomModel })}
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          {newKeyForm.isCustomModel ? 'انتخاب از مدل‌های پیش‌فرض' : 'ورود دستی نام مدل (سفارشی)'}
                        </button>
                      </div>

                      {!newKeyForm.isCustomModel ? (
                        <select
                          value={newKeyForm.model}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setNewKeyForm({ ...newKeyForm, isCustomModel: true, model: '' });
                            } else {
                              setNewKeyForm({ ...newKeyForm, model: e.target.value });
                            }
                          }}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                        >
                          {(PROVIDER_PRESET_MODELS[newKeyForm.provider] || []).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="__custom__">+ ورود دستی نام مدل دیگر...</option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="مثلاً: glm-4-air یا deepseek-ai/DeepSeek-V3 یا gpt-4o"
                            value={newKeyForm.model}
                            onChange={(e) => setNewKeyForm({ ...newKeyForm, model: e.target.value })}
                            required
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                          />
                          <p className="text-[10px] text-slate-400">نام دقیق مدل را وارد نمایید تا به موتور ارائه‌دهنده پاس داده شود.</p>
                        </div>
                      )}
                    </div>

                    {newKeyForm.provider !== 'gemini' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          آدرس پایه سرور یا واسطه (Base URL):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          placeholder={
                            newKeyForm.provider === 'glm'
                              ? 'https://open.bigmodel.cn/api/paas/v4'
                              : newKeyForm.provider === 'minimax'
                              ? 'https://api.minimax.chat/v1'
                              : newKeyForm.provider === 'proxy'
                              ? 'https://api.oneapi.ir/v1'
                              : 'https://api.openai.com/v1'
                          }
                          value={newKeyForm.baseURL}
                          onChange={(e) => setNewKeyForm({ ...newKeyForm, baseURL: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          می‌توانید از سرورهای اختصاصی واسطه مانند OneAPI، NewAPI یا پروکسی‌های معکوس ایران/خارج استفاده کنید.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        ثبت کلید در استخر
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewKeyModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Batch Key Import Modal (ثبت دسته‌ای و یکجای کلیدها برای یک مدل مشخص مانند 3.5 فلش لایت) */}
            {batchKeyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-emerald-400" />
                        <span>ورود دسته‌ای کلیدها به استخر (Batch Import)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        مدل مورد نظر (مثلاً ۳.۵ فلش لایت) را انتخاب کرده و لیست تمام کلیدها را یکجا پیست نمایید.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBatchKeyModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleBatchImportApiKeys} className="space-y-4">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ۱. ارائه‌دهنده هوش مصنوعی (Provider):
                      </label>
                      <select
                        value={batchKeyForm.provider}
                        onChange={(e) => {
                          const p = e.target.value;
                          const defaultModels = PROVIDER_PRESET_MODELS[p] || [];
                          const defaultBaseUrl = PROVIDER_DEFAULT_BASE_URL[p] || '';
                          const defaultPrefix = p === 'gemini' ? 'کلید جمینای' : p === 'openai' ? 'کلید OpenAI' : p === 'deepseek' ? 'کلید دیپ‌سیک' : 'کلید API';
                          setBatchKeyForm({
                            ...batchKeyForm,
                            provider: p,
                            model: defaultModels[0] || '',
                            baseURL: defaultBaseUrl,
                            namePrefix: defaultPrefix,
                            isCustomModel: false,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="gemini">Google Gemini (پیشنهاد اصلی و استاندارد فصیح)</option>
                        <option value="openai">OpenAI رسمی (GPT-4o / mini)</option>
                        <option value="deepseek">DeepSeek Direct (مستقیم)</option>
                        <option value="openrouter">OpenRouter (تجمیعی)</option>
                        <option value="glm">GLM - Zhipu AI (چینی)</option>
                        <option value="minimax">MiniMax (چینی)</option>
                        <option value="proxy">OneAPI / NewAPI / پروکسی اختصاصی</option>
                      </select>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          ۲. انتخاب مدل برای انتساب به تمام این کلیدها:
                        </label>
                        <button
                          type="button"
                          onClick={() => setBatchKeyForm({ ...batchKeyForm, isCustomModel: !batchKeyForm.isCustomModel })}
                          className="text-[11px] text-emerald-400 hover:underline"
                        >
                          {batchKeyForm.isCustomModel ? 'انتخاب از مدل‌های پیشنهادی' : 'تایپ دستی نام مدل'}
                        </button>
                      </div>

                      {!batchKeyForm.isCustomModel ? (
                        <div className="space-y-2">
                          <select
                            value={batchKeyForm.model}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setBatchKeyForm({ ...batchKeyForm, isCustomModel: true, model: '' });
                              } else {
                                setBatchKeyForm({ ...batchKeyForm, model: e.target.value });
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                          >
                            {(PROVIDER_PRESET_MODELS[batchKeyForm.provider] || []).map((m) => (
                              <option key={m} value={m}>
                                {m} {m === 'gemini-3.5-flash-lite' ? '⚡ (پیشنهاد ویژه: پرسرعت و سبک)' : m === 'gemini-3.8-flash' ? '🌟 (تعادل بهینه کیفیت و سرعت)' : ''}
                              </option>
                            ))}
                            <option value="__custom__">+ ورود نام مدل دیگر...</option>
                          </select>

                          {/* Quick Choice Buttons for Gemini */}
                          {batchKeyForm.provider === 'gemini' && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {[
                                { id: 'gemini-4-argon', label: '4 Argon 🧠' },
                                { id: 'gemini-3.8-flash', label: '3.8 Flash 🚀' },
                                { id: 'gemini-3.5-flash-lite', label: '3.5 Flash Lite ⚡' },
                                { id: 'gemini-3.1-flash-lite', label: '3.1 Flash Lite 🛡️' },
                              ].map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => setBatchKeyForm({ ...batchKeyForm, model: btn.id, isCustomModel: false })}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                                    batchKeyForm.model === btn.id
                                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="مثلاً: gemini-3.5-flash-lite یا deepseek-chat"
                          value={batchKeyForm.model}
                          onChange={(e) => setBatchKeyForm({ ...batchKeyForm, model: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none text-left"
                        />
                      )}
                    </div>

                    {/* Prefix for Key Names */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ۳. پیشوند نام‌گذاری خودکار کلیدها:
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: کلید جمینای فلش لایت"
                        value={batchKeyForm.namePrefix}
                        onChange={(e) => setBatchKeyForm({ ...batchKeyForm, namePrefix: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        کلیدها به صورت خودکار با شماره تفکیک می‌شوند (مثلاً: {batchKeyForm.namePrefix || 'کلید'} #۱، {batchKeyForm.namePrefix || 'کلید'} #۲ و ...).
                      </p>
                    </div>

                    {/* Base URL for Non-Gemini */}
                    {batchKeyForm.provider !== 'gemini' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          آدرس سرور پایه (Base URL):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={batchKeyForm.baseURL}
                          onChange={(e) => setBatchKeyForm({ ...batchKeyForm, baseURL: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono text-left focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Big Textarea for Pasting Keys */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          ۴. لیست کلیدهای API (در هر خط یک کلید قرار دهید):
                        </label>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          {batchKeyForm.keysText.split(/[\r\n,;]+/).filter(k => k.trim() && !k.trim().startsWith('#') && !k.trim().startsWith('//')).length} کلید شناسایی شد
                        </span>
                      </div>
                      <textarea
                        dir="ltr"
                        rows={6}
                        placeholder={`AIzaSyA...
AIzaSyB...
AIzaSyC...`}
                        value={batchKeyForm.keysText}
                        onChange={(e) => setBatchKeyForm({ ...batchKeyForm, keysText: e.target.value })}
                        required
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none text-left leading-relaxed resize-y"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        می‌توانید کلیدها را با Enter، ویرگول یا سمی‌کالن از هم جدا کنید. خطوط خالی یا کلیدهای تکراری به صورت خودکار پالایش می‌شوند.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={batchSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {batchSubmitting ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin" />
                            <span>در حال ذخیره و اتصال کلیدها...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>
                              ثبت و افزودن {batchKeyForm.keysText.split(/[\r\n,;]+/).filter(k => k.trim() && !k.trim().startsWith('#') && !k.trim().startsWith('//')).length} کلید به استخر
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBatchKeyModal(false)}
                        disabled={batchSubmitting}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        انصراف
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Key Modal */}
            {editKeyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-amber-400" />
                        <span>ویرایش کلید API در سرور</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        شناسه کلید: <span className="font-mono text-amber-300">{editKeyModal.id}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditKeyModal(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditedApiKey} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">نام یا عنوان نمایشی کلید:</label>
                      <input
                        type="text"
                        value={editKeyForm.name}
                        onChange={(e) => setEditKeyForm({ ...editKeyForm, name: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">ارائه‌دهنده (Provider):</label>
                      <select
                        value={editKeyForm.provider}
                        onChange={(e) => {
                          const p = e.target.value;
                          const defaultModels = PROVIDER_PRESET_MODELS[p] || [];
                          const defaultBaseUrl = PROVIDER_DEFAULT_BASE_URL[p] || '';
                          setEditKeyForm({
                            ...editKeyForm,
                            provider: p,
                            model: defaultModels[0] || '',
                            baseURL: defaultBaseUrl,
                            isCustomModel: false,
                          });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      >
                        <option value="gemini">Google Gemini (پیش‌فرض فصیح و استاندارد)</option>
                        <option value="glm">GLM - Zhipu AI (GLM-4 / GLM-Zero چینی)</option>
                        <option value="minimax">MiniMax (MiniMax-Text-01 / Abab چینی)</option>
                        <option value="openai">OpenAI (GPT-4o / GPT-4o-mini / o1)</option>
                        <option value="claude">Anthropic Claude (Sonnet 3.5 / 3.7)</option>
                        <option value="deepseek">DeepSeek Direct API</option>
                        <option value="openrouter">OpenRouter (دسترسی تجمیعی به همه مدل‌ها)</option>
                        <option value="proxy">سرویس واسطه / OneAPI / NewAPI / پروکسی اختصاصی</option>
                        <option value="custom">ارائه‌دهنده سفارشی (Custom API / Self-hosted)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        متن کلید API (API Key Token):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={editKeyForm.apiKey}
                        onChange={(e) => setEditKeyForm({ ...editKeyForm, apiKey: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        کلید مستقیماً در پایگاه داده سرور ذخیره می‌شود و برای کاربران مخفی است.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">مدل هوش مصنوعی (Model):</label>
                        <button
                          type="button"
                          onClick={() => setEditKeyForm({ ...editKeyForm, isCustomModel: !editKeyForm.isCustomModel })}
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          {editKeyForm.isCustomModel ? 'انتخاب از مدل‌های پیش‌فرض' : 'ورود دستی نام مدل (سفارشی)'}
                        </button>
                      </div>

                      {!editKeyForm.isCustomModel ? (
                        <select
                          value={editKeyForm.model}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setEditKeyForm({ ...editKeyForm, isCustomModel: true, model: '' });
                            } else {
                              setEditKeyForm({ ...editKeyForm, model: e.target.value });
                            }
                          }}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                        >
                          {(PROVIDER_PRESET_MODELS[editKeyForm.provider] || []).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="__custom__">+ ورود دستی نام مدل دیگر...</option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            dir="ltr"
                            value={editKeyForm.model}
                            onChange={(e) => setEditKeyForm({ ...editKeyForm, model: e.target.value })}
                            required
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                          />
                        </div>
                      )}
                    </div>

                    {editKeyForm.provider !== 'gemini' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          آدرس پایه سرور یا پروکسی (Base URL):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={editKeyForm.baseURL}
                          onChange={(e) => setEditKeyForm({ ...editKeyForm, baseURL: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">اولویت انتخاب (Priority):</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editKeyForm.priority}
                          onChange={(e) => setEditKeyForm({ ...editKeyForm, priority: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={editKeyForm.isActive}
                            onChange={(e) => setEditKeyForm({ ...editKeyForm, isActive: e.target.checked })}
                            className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700"
                          />
                          <span className="text-white font-semibold">کلید در صف فعال باشد</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                      >
                        ذخیره تغییرات در سرور
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditKeyModal(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FINANCE & GATEWAYS */}
        {/* ========================================================= */}
        {activeTab === 'finance' && settings && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">درگاه‌های پرداخت، نرخ‌گذاری و امور مالی</h2>
                <p className="text-xs text-slate-400">پیکربندی زرین‌پال، نکست‌پی، آیدی‌پی، استرایپ و تعرفه کلمه‌ای</p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSettingsSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                <span>{isSavingSettings ? 'در حال ذخیره...' : saveSettingsSuccess ? 'ذخیره شد!' : 'ذخیره تنظیمات مالی'}</span>
              </button>
            </div>

            {settingsToast && (
              <div
                className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
                  settingsToast.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {settingsToast.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span>{settingsToast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsToast(null)}
                  className="p-1 rounded-lg hover:bg-slate-900/60 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick banner to Daily Revenue & Filterable Payments */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">گزارش تفکیک درآمد روزانه و فیلتر تراکنش‌ها</h4>
                  <p className="text-xs text-slate-400 mt-0.5">مشاهده نمودارهای شکیل روزانه، سهم درگاه‌ها (زرین‌پال، زیبال، نکست‌پی) و جستجوی کدهای پیگیری</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('daily_revenue')}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition whitespace-nowrap"
              >
                <span>مشاهده آمار درآمد روزانه</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Pricing Config Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="font-bold text-base text-amber-400 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>تعرفه و قیمت‌گذاری کلمات کتاب</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نرخ پایه عمومی هر کلمه (تومان):
                  </label>
                  <input
                    type="number"
                    value={settings.pricing.costPerWord}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: { ...settings.pricing, costPerWord: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">پیش‌فرض کاربران عادی (۴۵ تومان)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1.5">
                    نرخ سازمانی ناشران (تومان):
                  </label>
                  <input
                    type="number"
                    value={settings.pricing.publisherCostPerWord ?? 30}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: { ...settings.pricing, publisherCostPerWord: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-500/30 text-purple-300 font-mono text-sm focus:border-purple-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">نرخ خودکار کاربران سطح ناشر (۳۰ تومان)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ضریب کتاب‌های تخصصی (علمی/پزشکی):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.pricing.specializedMultiplier}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: { ...settings.pricing, specializedMultiplier: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">مثلاً ۱.۲ برابر برای متون دانشگاهی</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    هدیه شارژ اولیه ثبت نام (تومان):
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={settings.pricing.freeWelcomeGift}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: { ...settings.pricing, freeWelcomeGift: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">اعتبار رایگان برای آزمایش کیفیت</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    حداقل مبلغ شارژ کیف پول (تومان):
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={settings.pricing.minDepositAmount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: { ...settings.pricing, minDepositAmount: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">کف مبلغ واریزی کاربران</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  تغییر نرخ کلمه‌ای بلافاصله روی تمام فاکتورها، محاسبه‌های پیش‌نمایش و کیف پول اعمال می‌شود.
                </span>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {isSavingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSettingsSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingSettings ? 'در حال ذخیره...' : saveSettingsSuccess ? 'ذخیره شد!' : 'ذخیره نرخ و تعرفه کلمات'}</span>
                </button>
              </div>
            </div>

            {/* Payment Gateways Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zarinpal */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">درگاه زرین‌پال (ZarinPal v4)</h4>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          REST API v4 • اتصال مستقیم به شاپرک
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.gateways.zarinpal.enabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            gateways: {
                              ...settings.gateways,
                              zarinpal: { ...settings.gateways.zarinpal, enabled: e.target.checked },
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="space-y-3.5">
                    {/* Merchant ID */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">کد مرچنت ۳۶ کاراکتری اختصاصی پذیرنده (Merchant ID):</label>
                        <span className={`text-[10px] font-mono ${
                          (settings.gateways.zarinpal.merchantId || '').trim().length === 36
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-400'
                        }`}>
                          {(settings.gateways.zarinpal.merchantId || '').trim().length} / 36 نویسه
                        </span>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={settings.gateways.zarinpal.merchantId}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            gateways: {
                              ...settings.gateways,
                              zarinpal: { ...settings.gateways.zarinpal, merchantId: e.target.value },
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none text-left"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        کد اختصاصی پذیرنده که پس از ثبت درگاه در پنل زرین‌پال دریافت کرده‌اید.
                      </p>
                    </div>

                    {/* Referer Header Domain (Mandatory for subdomains like book.gaiafa.ir using gaiafa.ir merchant) */}
                    {/* Referer Header Domain (Mandatory for subdomains like book.gaiafa.ir using gaiafa.ir merchant) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          دامنه ریفرر درگاه زرین‌پال (Referer / Origin Header):
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono">الزامی برای زیردامنه‌ها طبق دستور شاپرک</span>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="https://gaiafa.ir/"
                        value={(settings.gateways.zarinpal as any).refererDomain ?? 'https://gaiafa.ir/'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            gateways: {
                              ...settings.gateways,
                              zarinpal: { ...settings.gateways.zarinpal, refererDomain: e.target.value } as any,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none text-left"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        چون مرچنت کد برای دامنه اصلی <code className="text-amber-400">gaiafa.ir</code> ثبت شده، هنگام فراخوانی درگاه از زیردامنه <code className="text-amber-400">book.gaiafa.ir</code>، هدر <code className="text-amber-400">Referer: https://gaiafa.ir/</code> در پشت صحنه به زرین‌پال ارسال می‌شود تا تراکنش شاپرک مسدود نشود.
                      </p>
                    </div>

                    {/* Callback Domain (Fixes Error -14) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          دامنه پایه بازگشت از درگاه (Callback Base URL):
                        </label>
                        <span className="text-[10px] text-emerald-400 font-mono">آدرس بازگشت خریدار</span>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="https://book.gaiafa.ir"
                        value={(settings.gateways.zarinpal as any).callbackDomain || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            gateways: {
                              ...settings.gateways,
                              zarinpal: { ...settings.gateways.zarinpal, callbackDomain: e.target.value } as any,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none text-left"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        برای سایت شما خالی بگذارید یا مقدار <code className="text-emerald-400">https://book.gaiafa.ir</code> را وارد کنید تا خریدار پس از پرداخت به زیردامنه کتاب بازگردد.
                      </p>
                    </div>

                    {/* Currency & Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">واحد پولی تراکنش (Currency):</label>
                        <select
                          value={(settings.gateways.zarinpal as any).currency || 'IRT'}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              gateways: {
                                ...settings.gateways,
                                zarinpal: {
                                  ...settings.gateways.zarinpal,
                                  currency: e.target.value as any,
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        >
                          <option value="IRT">تومان (IRT - استاندارد)</option>
                          <option value="IRR">ریال (IRR - در صورت الزام درگاه به ریال)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={settings.gateways.zarinpal.isSandbox}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                gateways: {
                                  ...settings.gateways,
                                  zarinpal: { ...settings.gateways.zarinpal, isSandbox: e.target.checked },
                                },
                              })
                            }
                            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                          />
                          <span>حالت آزمایشی زرین‌پال (Sandbox)</span>
                        </label>
                        <span className="text-[10px] text-rose-400 mt-1">
                          توجه: در صورت استفاده از مرچنت کد واقعی gaiafa.ir، تیک Sandbox باید <strong>غیرفعال</strong> باشد.
                        </span>
                      </div>
                    </div>

                    {/* Test Gateway Action & Results */}
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={testingZarinpal}
                          onClick={async () => {
                            setTestingZarinpal(true);
                            setZarinpalTestResult(null);
                            try {
                              const res = await fetch('/api/admin/gateways/test-zarinpal', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  merchantId: settings.gateways.zarinpal.merchantId,
                                  isSandbox: settings.gateways.zarinpal.isSandbox,
                                  currency: (settings.gateways.zarinpal as any).currency || 'IRT',
                                  referer: (settings.gateways.zarinpal as any).refererDomain || 'https://gaiafa.ir/',
                                }),
                              });
                              const data = await res.json();
                              setZarinpalTestResult(data);
                            } catch (err: any) {
                              setZarinpalTestResult({ success: false, message: `خطا در ارتباط با سرور: ${err.message}` });
                            } finally {
                              setTestingZarinpal(false);
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          {testingZarinpal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          <span>{testingZarinpal ? 'درحال آزمایش وب‌سرویس...' : 'آزمایش اتصال به وب‌سرویس زرین‌پال'}</span>
                        </button>

                        <span className="text-[10px] text-slate-400">تست ارسال درخواست ۱,۰۰۰ تومان</span>
                      </div>

                      {zarinpalTestResult && (
                        <div
                          className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                            zarinpalTestResult.success
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {zarinpalTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold">{zarinpalTestResult.message}</div>
                            {zarinpalTestResult.details?.authority && (
                              <div className="font-mono text-[10px] opacity-80 mt-1">
                                شناسه دریافتی (Authority): {zarinpalTestResult.details.authority}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Official v4 Integration Specs Guide */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-[11px] text-slate-300">
                      <div className="font-bold text-amber-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>گردش کار رسمی وب‌سرویس زرین‌پال (REST v4):</span>
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-1 leading-relaxed">
                        <div>۱. ارسال اولیه به <code className="text-amber-300 bg-slate-900 px-1 rounded">https://api.zarinpal.com/pg/v4/payment/request.json</code> همراه با هدر <code className="text-emerald-400 font-mono">Referer: https://gaiafa.ir/</code></div>
                        <div>۲. ریدایرکت مستقیم خریدار به <code className="text-amber-300 bg-slate-900 px-1 rounded">https://www.zarinpal.com/pg/StartPay/[Authority]</code></div>
                        <div>۳. بازگشت خریدار به Callback و تایید قطعی با <code className="text-amber-300 bg-slate-900 px-1 rounded">https://api.zarinpal.com/pg/v4/payment/verify.json</code></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BitPay (bitpay.ir - Direct Merchant) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>درگاه مستقیم بیت‌پی (BitPay.ir - مرچنت مستقیم بانکی)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                          مرچنت مستقیم
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">اتصال مستقیم به شبکه شاپرک و درگاه‌های سداد، به‌پرداخت و سامان</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gateways.bitpay?.enabled ?? false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            bitpay: {
                              enabled: e.target.checked,
                              apiKey: settings.gateways.bitpay?.apiKey || '',
                              name: 'بیت‌پی (bitpay.ir)',
                            },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      کلید دسترسی اختصاصی (Merchant API Key):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.gateways.bitpay?.apiKey || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            bitpay: {
                              enabled: settings.gateways.bitpay?.enabled ?? true,
                              apiKey: e.target.value,
                              name: 'بیت‌پی (bitpay.ir)',
                            },
                          },
                        })
                      }
                      placeholder="مثلاً: *****-*****-*****-*****-****************************"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none text-left"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      کلید API مرچنت مستقیم خود را که از پنل پذیرندگان بیت‌پی (bitpay.ir) دریافت کرده‌اید در این قسمت قرار دهید.
                    </p>
                  </div>

                  {/* Test BitPay Gateway Action */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={testingBitpay}
                        onClick={async () => {
                          setTestingBitpay(true);
                          setBitpayTestResult(null);
                          try {
                            const res = await fetch('/api/admin/gateways/test-bitpay', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                apiKey: settings.gateways.bitpay?.apiKey,
                              }),
                            });
                            const data = await res.json();
                            setBitpayTestResult(data);
                          } catch (err: any) {
                            setBitpayTestResult({ success: false, message: `خطا در ارتباط با سرور: ${err.message}` });
                          } finally {
                            setTestingBitpay(false);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {testingBitpay ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>{testingBitpay ? 'درحال بررسی وب‌سرویس بیت‌پی...' : 'آزمایش اتصال به درگاه بیت‌پی (BitPay)'}</span>
                      </button>

                      <span className="text-[10px] text-slate-400">تست ارسال درخواست و اعتبارسنجی API Key</span>
                    </div>

                    {bitpayTestResult && (
                      <div
                        className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                          bitpayTestResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {bitpayTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold">{bitpayTestResult.message}</div>
                          {bitpayTestResult.details?.idGet && (
                            <div className="font-mono text-[10px] opacity-80 mt-1">
                              شناسه فاکتور تست (id_get): {bitpayTestResult.details.idGet}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Official BitPay Specs Guide */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-[11px] text-slate-300">
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>گردش کار رسمی درگاه بیت‌پی (BitPay.ir Workflow):</span>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-1 leading-relaxed">
                      <div>۱. ارسال اطلاعات به <code className="text-emerald-300 bg-slate-900 px-1 rounded">https://bitpay.ir/payment/gateway-send</code> همراه با API و مبلغ ریالی</div>
                      <div>۲. دریافت شناسه <code className="text-emerald-300 font-mono">id_get</code> و هدایت به <code className="text-emerald-300 bg-slate-900 px-1 rounded">https://bitpay.ir/payment/gateway-[id_get]-get</code></div>
                      <div>۳. بازگشت خریدار به آدرس بازگشت (Callback) همراه با <code className="text-emerald-300 font-mono">trans_id</code> و تایید نهایی در متد <code className="text-emerald-300 bg-slate-900 px-1 rounded">gateway-result-second</code></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zibal */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-500" />
                    <h4 className="font-bold text-sm text-white">درگاه زیبال (Zibal)</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gateways.zibal?.enabled ?? false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            zibal: {
                              enabled: e.target.checked,
                              merchantId: settings.gateways.zibal?.merchantId || 'zibal',
                              isSandbox: settings.gateways.zibal?.isSandbox ?? true,
                            },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">مرچنت کد زیبال (Merchant ID):</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.gateways.zibal?.merchantId || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            zibal: {
                              enabled: settings.gateways.zibal?.enabled ?? false,
                              merchantId: e.target.value,
                              isSandbox: settings.gateways.zibal?.isSandbox ?? true,
                            },
                          },
                        })
                      }
                      placeholder="zibal (یا مرچنت اختصاصی)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="zibal_sandbox"
                      checked={settings.gateways.zibal?.isSandbox ?? true}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            zibal: {
                              enabled: settings.gateways.zibal?.enabled ?? false,
                              merchantId: settings.gateways.zibal?.merchantId || 'zibal',
                              isSandbox: e.target.checked,
                            },
                          },
                        })
                      }
                      className="rounded accent-amber-500"
                    />
                    <label htmlFor="zibal_sandbox" className="text-xs text-slate-300">
                      حالت آزمایشی زیبال (Sandbox) فعال باشد
                    </label>
                  </div>
                </div>
              </div>

              {/* NextPay */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <h4 className="font-bold text-sm text-white">درگاه نکست‌پی (NextPay)</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gateways.nextpay.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            nextpay: { ...settings.gateways.nextpay, enabled: e.target.checked },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">کلید دسترسی (API Key):</label>
                    <input
                      type="password"
                      dir="ltr"
                      value={settings.gateways.nextpay.apiKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            nextpay: { ...settings.gateways.nextpay, apiKey: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* IDPay */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-sm text-white">درگاه آیدی‌پی (IDPay)</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gateways.idpay.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            idpay: { ...settings.gateways.idpay, enabled: e.target.checked },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">کلید API آیدی‌پی:</label>
                    <input
                      type="password"
                      dir="ltr"
                      value={settings.gateways.idpay.apiKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            idpay: { ...settings.gateways.idpay, apiKey: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Stripe */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-bold text-sm text-white">درگاه بین‌المللی استرایپ (Stripe)</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gateways.stripe.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            stripe: { ...settings.gateways.stripe, enabled: e.target.checked },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">کلید محرمانه (Secret Key):</label>
                    <input
                      type="password"
                      dir="ltr"
                      value={settings.gateways.stripe.secretKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gateways: {
                            ...settings.gateways,
                            stripe: { ...settings.gateways.stripe, secretKey: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Save Bar for Gateways & Pricing */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">ثبت نهایی تنظیمات درگاه‌ها و تعرفه‌ها</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">مرچنت‌کدها، وضعیت فعال/غیرفعال بودن درگاه‌ها و دامنه‌های ریفرر بلافاصله در دیتابیس سرور ذخیره می‌شوند.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
              >
                {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSettingsSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSavingSettings ? 'در حال ذخیره‌سازی...' : saveSettingsSuccess ? 'ذخیره شد!' : 'ذخیره تنظیمات درگاه‌های پرداخت'}</span>
              </button>
            </div>

            {/* Transactions Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="font-bold text-base text-white mb-4">کل تراکنش‌های مالی اخیر سامانه</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">{tx.description}</span>
                      <span className="text-[10px] text-slate-500 block">کاربر: {tx.userId} • کد: {tx.trackingCode || tx.id}</span>
                    </div>
                    <div className="text-left font-mono font-bold">
                      <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('en-US')} تومان
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4.5: HTML PAGE BUILDER WITH CUSTOM URLS */}
        {/* ========================================================= */}
        {activeTab === 'page_builder' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">صفحه‌ساز اختصاصی با کدهای HTML و URL اختصاصی</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    {customPages.length} برگه اختصاصی
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ایجاد نامحدود صفحات دلخواه با تزریق مستقیم HTML، CSS و جاوااسکریپت روی آدرس‌های اختصاصی مانند <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded font-mono">/page/about-us</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateNewPage}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>ایجاد برگه جدید</span>
                </button>
                <button
                  type="button"
                  onClick={fetchCustomPages}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>بروزرسانی</span>
                </button>
              </div>
            </div>

            {/* Split Screen: Pages List & Page Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Pages List (4 cols) */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">لیست صفحات طراحی‌شده</span>
                  <span className="text-[11px] text-slate-500">برای ویرایش کلیک کنید</span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {customPages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => handleSelectPageForEdit(page)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-xs ${
                        selectedPageId === page.id
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/5'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm truncate">{page.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            page.isPublished
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {page.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-mono mt-1" dir="ltr">
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">/page/{page.slug}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                        <span>بروزرسانی: {new Date(page.updatedAt).toLocaleDateString('fa-IR-u-nu-latn')}</span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setPreviewModalHtml(page.htmlContent)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                            title="پیش‌نمایش برگه"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPage(page.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="حذف برگه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: HTML Editor Form (8 cols) */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <form onSubmit={handleSaveCustomPage} className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-base text-white">
                        {pageForm.id ? 'ویرایش مشخصات و کدهای برگه' : 'ایجاد برگه اختصاصی جدید'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        کدهای HTML شما مستقیماً رندر می‌شوند؛ می‌توانید از قالب‌های آماده استفاده کنید
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewModalHtml(pageForm.htmlContent)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span>پیش‌نمایش HTML</span>
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
                      >
                        {pageSaveSuccess ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                        <span>{pageSaveSuccess ? 'ذخیره شد!' : 'ذخیره و انتشار برگه'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان برگه (Page Title):</label>
                      <input
                        type="text"
                        placeholder="مثال: درباره سامانه ما"
                        value={pageForm.title}
                        onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        آدرس URL یکتا (Slug):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="about-us"
                          value={pageForm.slug}
                          onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                          className="w-full px-3.5 py-2.5 pr-14 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs focus:border-amber-500 focus:outline-none text-left"
                          required
                        />
                        <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono pointer-events-none">/page/</span>
                      </div>
                    </div>
                  </div>

                  {/* URL Live Link Banner */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">آدرس دسترسی عمومی این برگه:</span>
                      <span className="font-mono text-white font-bold bg-slate-900 px-2 py-0.5 rounded" dir="ltr">
                        /page/{pageForm.slug || 'slug'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={pageForm.isPublished}
                          onChange={(e) => setPageForm({ ...pageForm, isPublished: e.target.checked })}
                          className="rounded accent-amber-500"
                        />
                        <span className="text-slate-300">انتشار عمومی</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={pageForm.showInHeader}
                          onChange={(e) => setPageForm({ ...pageForm, showInHeader: e.target.checked })}
                          className="rounded accent-amber-500"
                        />
                        <span className="text-amber-300">نمایش در هدر بالای سایت</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={pageForm.showInFooter}
                          onChange={(e) => setPageForm({ ...pageForm, showInFooter: e.target.checked })}
                          className="rounded accent-amber-500"
                        />
                        <span className="text-cyan-300">نمایش در فوتر سایت</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">توضیحات سئو و متا (Meta Description):</label>
                    <input
                      type="text"
                      placeholder="توضیح کوتاه ۱ یا ۲ خطی برای نمایش در گوگل و کارت‌های اشتراک‌گذاری"
                      value={pageForm.metaDescription}
                      onChange={(e) => setPageForm({ ...pageForm, metaDescription: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* HTML Preset Templates Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
                      <span>درج قالب‌های آماده با یک کلیک:</span>
                      <span className="text-[11px] text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        طراحی واکنش‌گرا و سازگار با فونت Vazirmatn
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPageForm({
                            ...pageForm,
                            title: 'صفحه اصلی و لندینگ پیج سایت',
                            slug: 'home',
                            showInHeader: true,
                            showInFooter: true,
                            htmlContent: `<div style="max-width: 1000px; margin: 0 auto; padding: 50px 20px; font-family: 'Vazirmatn', sans-serif; text-align: center; color: #f8fafc;">
  <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(2, 6, 23, 0.6)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 28px; padding: 48px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
    <div style="display: inline-block; background: #f59e0b; color: #020617; font-weight: 900; font-size: 13px; padding: 6px 16px; border-radius: 20px; margin-bottom: 20px;">
      نسخه سازمانی ترجمه هوشمند کتاب
    </div>
    <h1 style="font-size: 36px; font-weight: 900; color: #ffffff; margin-bottom: 16px; line-height: 1.4;">
      ترجمه و ویراستاری تخصصی کتاب با قدرتمندترین هوش مصنوعی جهان
    </h1>
    <p style="font-size: 17px; color: #94a3b8; max-width: 720px; margin: 0 auto 32px; line-height: 1.9;">
      بارگذاری آسان PDF، EPUB و Word، شمارش آنی کلمات و پردازش پیوسته ابری در پس‌زمینه بدون نیاز به باز ماندن مرورگر.
    </p>
    <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
      <a href="/?page=login" style="background: #f59e0b; color: #020617; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 16px; text-decoration: none; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
        ورود به سامانه و ثبت سفارش
      </a>
      <a href="/page/pricing" style="background: #1e293b; color: #f8fafc; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 16px; text-decoration: none; border: 1px solid #334155;">
        مشاهده تعرفه کلمه‌ای
      </a>
    </div>
  </div>
</div>`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition"
                      >
                        قالب صفحه اصلی (Home / Landing)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPageForm({
                            ...pageForm,
                            title: 'ورود و احراز هویت اختصاصی',
                            slug: 'login',
                            showInHeader: true,
                            showInFooter: false,
                            htmlContent: `<div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Vazirmatn', sans-serif; text-align: center; color: #f8fafc;">
  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 36px 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
    <h1 style="color: #f59e0b; font-size: 24px; font-weight: 800; margin-bottom: 12px;">ورود به سامانه ترجمه کتاب</h1>
    <p style="font-size: 14px; color: #94a3b8; margin-bottom: 28px;">جهت ورود سریع به پنل کاربری و مشاهده کتاب‌های ترجمه‌شده کلیک نمایید:</p>
    <a href="/?page=login" style="display: block; background: #f59e0b; color: #020617; font-weight: 800; font-size: 15px; padding: 14px; border-radius: 14px; text-decoration: none;">
      انتقال به فرم ورود امن با پیامک و کلمه عبور
    </a>
  </div>
</div>`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                      >
                        قالب صفحه ورود (Login)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPageForm({
                            ...pageForm,
                            title: 'قوانین، مقررات و حریم خصوصی',
                            slug: 'terms',
                            showInHeader: false,
                            showInFooter: true,
                            htmlContent: `<div style="max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'Vazirmatn', sans-serif; line-height: 2; color: #f8fafc;">
  <h1 style="color: #f59e0b; font-size: 26px; font-weight: 800; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 24px;">قوانین و شرایط استفاده از خدمات</h1>
  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 20px;">
    <h3 style="color: #38bdf8; font-size: 16px; margin-top: 0;">۱. تعهدات و شفافیت مالی</h3>
    <p style="font-size: 14px; color: #cbd5e1; text-align: justify;">محاسبه هزینه ترجمه منحصراً بر مبنای شمارش دقیق کلمات کتاب و نرخ مصوب سامانه انجام می‌پذیرد. در صورت لغو سفارش در حین ترجمه، مبالغ مربوط به بخش‌های پردازش‌نشده به کیف پول کاربر عودت داده می‌شود.</p>
  </div>
  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 24px;">
    <h3 style="color: #38bdf8; font-size: 16px; margin-top: 0;">۲. محرمانگی و مالکیت متون</h3>
    <p style="font-size: 14px; color: #cbd5e1; text-align: justify;">تمامی فایل‌های بارگذاری‌شده و ترجمه‌های حاصل متعلق به کاربر بوده و در سرورهای امن به صورت ایزوله نگهداری می‌شوند.</p>
  </div>
</div>`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                      >
                        قالب قوانین و حریم خصوصی
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPageForm({
                            ...pageForm,
                            title: 'درباره سامانه ما',
                            slug: 'about-us',
                            showInHeader: true,
                            showInFooter: true,
                            htmlContent: `<div style="max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'Vazirmatn', sans-serif; line-height: 2; color: #f8fafc;">
  <h1 style="color: #f59e0b; font-size: 28px; font-weight: 800; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 24px;">درباره سامانه ما</h1>
  <p style="font-size: 16px; margin-bottom: 20px; text-align: justify; color: #cbd5e1;">سامانه هوشمند ترجمه کتاب پیشرفته‌ترین پلتفرم برای تبدیل دقیق و تخصصی متون قطور با حفظ ساختار است.</p>
  <div style="background: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155; margin-bottom: 24px;">
    <h3 style="color: #38bdf8; font-size: 18px; margin-top: 0;">مزایای متمایز</h3>
    <ul style="padding-right: 20px; color: #e2e8f0; font-size: 14px;">
      <li>پردازش ابری بدون نیاز به باز بودن مرورگر</li>
      <li>شمارش دقیق کلمات با تعرفه منصفانه</li>
      <li>خروجی استاندارد Word و PDF</li>
    </ul>
  </div>
</div>`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                      >
                        قالب معرفی و درباره ما
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPageForm({
                            ...pageForm,
                            title: 'جدول تعرفه‌ها و بسته‌ها',
                            slug: 'pricing',
                            showInHeader: true,
                            showInFooter: true,
                            htmlContent: `<div style="max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'Vazirmatn', sans-serif; line-height: 2; color: #f8fafc;">
  <h1 style="color: #f59e0b; font-size: 28px; font-weight: 800; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 24px;">جدول تعرفه‌ها و بسته‌های شارژ</h1>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 24px; text-align: center;">
      <h3 style="color: #ffffff; margin-top: 0;">طرح عمومی</h3>
      <div style="font-size: 28px; font-weight: bold; color: #f59e0b; margin: 16px 0;">۴۵ تومان <span style="font-size: 13px; color: #94a3b8;">/ کلمه</span></div>
      <p style="color: #94a3b8; font-size: 13px;">مناسب برای رمان‌ها و کتب عمومی</p>
    </div>
    <div style="background: #0f172a; border: 2px solid #f59e0b; border-radius: 16px; padding: 24px; text-align: center;">
      <h3 style="color: #ffffff; margin-top: 0;">طرح فوق‌تخصصی</h3>
      <div style="font-size: 28px; font-weight: bold; color: #10b981; margin: 16px 0;">۵۴ تومان <span style="font-size: 13px; color: #94a3b8;">/ کلمه</span></div>
      <p style="color: #94a3b8; font-size: 13px;">مناسب کتب پزشکی، هوافضا و ریاضیات</p>
    </div>
  </div>
</div>`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                      >
                        قالب جدول تعرفه‌ها
                      </button>
                    </div>
                  </div>

                  {/* HTML Code Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      کدهای HTML برگه (HTML Code):
                    </label>
                    <textarea
                      rows={14}
                      dir="ltr"
                      value={pageForm.htmlContent}
                      onChange={(e) => setPageForm({ ...pageForm, htmlContent: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                      placeholder="<div><h1>عنوان برگه</h1><p>متن شما...</p></div>"
                      required
                    />
                  </div>
                </form>
              </div>
            </div>

            {/* Modal: Live HTML Preview */}
            {previewModalHtml && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-base text-white">پیش‌نمایش زنده صفحه HTML</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewModalHtml(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-6">
                    <div
                      dangerouslySetInnerHTML={{ __html: previewModalHtml }}
                      className="prose prose-invert max-w-none font-['Vazirmatn']"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4.7: HEADER & FOOTER HTML DESIGNER */}
        {/* ========================================================= */}
        {activeTab === 'header_footer' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">طراحی هدر و فوتر اختصاصی به صورت کدهای HTML</h2>
                <p className="text-xs text-slate-400 mt-1">
                  شخصی‌سازی هدر و فوتر سراسری با تگ‌های HTML، CSS و المان‌های دلخواه برای نمایش در سایت و صفحات
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveHeaderFooter}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                {hfSaveSuccess ? <Check className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                <span>{hfSaveSuccess ? 'تنظیمات ذخیره شد!' : 'ذخیره طراحی هدر و فوتر'}</span>
              </button>
            </div>

            {/* Global Options Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={headerFooterConfig.enabled}
                    onChange={(e) => setHeaderFooterConfig({ ...headerFooterConfig, enabled: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <span className="font-bold text-white">فعال‌سازی نمایش هدر و فوتر سفارشی در سامانه</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={headerFooterConfig.applyToAllPages}
                    onChange={(e) => setHeaderFooterConfig({ ...headerFooterConfig, applyToAllPages: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <span className="text-slate-300">اعمال بر روی صفحات اختصاصی صفحه‌ساز (/page/...)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={headerFooterConfig.applyToPrint}
                    onChange={(e) => setHeaderFooterConfig({ ...headerFooterConfig, applyToPrint: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <span className="text-slate-300">اعمال در نسخه چاپی و خروجی PDF</span>
                </label>
              </div>

              <div className="text-[11px] text-slate-400">
                وضعیت: {headerFooterConfig.enabled ? <span className="text-emerald-400 font-bold">● فعال</span> : <span className="text-slate-500">○ غیرفعال</span>}
              </div>
            </div>

            {/* Sub-tabs for Header / Footer / CSS / Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHfActiveSubTab('header')}
                  className={`px-4 py-2 rounded-xl transition ${
                    hfActiveSubTab === 'header'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  کد HTML هدر (Header)
                </button>
                <button
                  type="button"
                  onClick={() => setHfActiveSubTab('footer')}
                  className={`px-4 py-2 rounded-xl transition ${
                    hfActiveSubTab === 'footer'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  کد HTML فوتر (Footer)
                </button>
                <button
                  type="button"
                  onClick={() => setHfActiveSubTab('css')}
                  className={`px-4 py-2 rounded-xl transition ${
                    hfActiveSubTab === 'css'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  استایل‌های سفارشی (Custom CSS)
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* SUBTAB 1: HEADER HTML */}
                {hfActiveSubTab === 'header' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
                      <span>💡 <strong>جایگزینی هوشمند:</strong> با وارد کردن هدر سفارشی، این کد به صورت کامل جایگزین هدر، نوار اعلان و منوی پیش‌فرض بالای سایت می‌شود.</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>متغیرهای CMS:</span>
                        <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">{'{{siteTitle}}'}</code>
                        <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">{'{{customPagesHeader}}'}</code>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>کد HTML سربرگ بالای سایت را وارد کنید:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setHeaderFooterConfig({
                              ...headerFooterConfig,
                              headerHtml: `<header style="background: linear-gradient(135deg, #090d16 0%, #151d2f 100%); border-bottom: 1px solid #334155; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; color: #f8fafc; font-family: 'Vazirmatn', sans-serif;">
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; font-weight: 900; font-size: 13px; padding: 6px 12px; border-radius: 10px; box-shadow: 0 2px 8px rgba(245,158,11,0.3);">
      ترجمه هوشمند
    </div>
    <span style="font-weight: 800; font-size: 15px; color: #ffffff;">{{siteTitle}}</span>
  </div>
  <nav style="display: flex; align-items: center; gap: 20px; font-size: 13px;">
    <a href="#features" style="color: #cbd5e1; text-decoration: none;">امکانات پلتفرم</a>
    <a href="#calculator" style="color: #cbd5e1; text-decoration: none;">ماشین‌حساب هزینه</a>
    {{customPagesHeader}}
    <a href="#login" data-auth="login" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; font-weight: 700; padding: 6px 14px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(245,158,11,0.25);">
      ورود / ثبت‌نام
    </a>
  </nav>
</header>`,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px]"
                        >
                          قالب آماده کامل (با دکمه ورود و متغیرهای CMS)
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setHeaderFooterConfig({
                              ...headerFooterConfig,
                              headerHtml: `<div style="background: #020617; border-bottom: 2px solid #f59e0b; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; color: #f8fafc; font-family: 'Vazirmatn', sans-serif; font-size: 12px;">
  <span>📞 پشتیبانی ویژه: {{supportPhone}} | ساعت پاسخگویی: ۲۴/۷</span>
  <div style="display: flex; gap: 12px; align-items: center;">
    <span style="color: #f59e0b; font-weight: bold;">🎉 ۲۵,۰۰۰ تومان هدیه ثبت‌نام اولیه</span>
    <a href="#login" data-auth="login" style="color: #f59e0b; font-weight: 800; text-decoration: underline;">ورود به حساب</a>
  </div>
</div>`,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px]"
                        >
                          قالب نوار اعلان طلایی
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={10}
                      dir="ltr"
                      value={headerFooterConfig.headerHtml}
                      onChange={(e) => setHeaderFooterConfig({ ...headerFooterConfig, headerHtml: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* SUBTAB 2: FOOTER HTML */}
                {hfActiveSubTab === 'footer' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
                      <span>💡 <strong>جایگزینی هوشمند:</strong> با وارد کردن فوتر سفارشی، این کد مستقیماً جایگزین فوتر پیش‌فرض انتهای سایت خواهد شد.</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>متغیرهای CMS:</span>
                        <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">{'{{customPagesFooter}}'}</code>
                        <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">{'{{supportPhone}}'}</code>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>کد HTML پابرگ انتهای سایت را وارد کنید:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setHeaderFooterConfig({
                              ...headerFooterConfig,
                              footerHtml: `<footer style="background: #020617; border-top: 1px solid #1e293b; padding: 28px 24px; color: #94a3b8; font-family: 'Vazirmatn', sans-serif;">
  <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
    <div>
      <div style="color: #ffffff; font-weight: 800; font-size: 14px; margin-bottom: 6px;">{{siteTitle}}</div>
      <p style="margin: 0; font-size: 12px; color: #64748b;">سامانه تجاری و ابری ترجمه کتاب، مقالات و متون تخصصی</p>
    </div>
    <div style="display: flex; gap: 24px; font-size: 13px;">
      {{customPagesFooter}}
      <span style="color: #10b981;">🛡️ اتصال امن SSL و درگاه‌های رسمی شاپرک</span>
    </div>
  </div>
</footer>`,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px]"
                        >
                          قالب چندستونه مدرن (متصل به CMS)
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={10}
                      dir="ltr"
                      value={headerFooterConfig.footerHtml}
                      onChange={(e) => setHeaderFooterConfig({ ...headerFooterConfig, footerHtml: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* SUBTAB 3: CUSTOM CSS */}
                {hfActiveSubTab === 'css' && (
                  <div className="space-y-3">
                    <span className="text-xs text-slate-400 block">استایل‌های دلخواه CSS برای اعمال روی هدر و فوتر:</span>
                    <textarea
                      rows={8}
                      dir="ltr"
                      value={headerFooterConfig.customCss || ''}
                      onChange={(e) => setHeaderFooterConfig({ ...headerFooterConfig, customCss: e.target.value })}
                      placeholder="header a:hover { color: #f59e0b; }"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Live Preview Panel */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      پیش‌نمایش زنده در همین لحظه:
                    </span>
                    <span className="text-[11px] text-slate-500">هدر و فوتر به شکل زیر در سایت دیده می‌شوند</span>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                    {/* Rendered Header */}
                    {headerFooterConfig.headerHtml && (
                      <div dangerouslySetInnerHTML={{ __html: headerFooterConfig.headerHtml }} />
                    )}

                    {/* Middle Sample Page Mock */}
                    <div className="p-8 text-center text-xs text-slate-600 bg-slate-900/50">
                      محتوای صفحات سایت در این بخش قرار می‌گیرد...
                    </div>

                    {/* Rendered Footer */}
                    {headerFooterConfig.footerHtml && (
                      <div dangerouslySetInnerHTML={{ __html: headerFooterConfig.footerHtml }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CMS & LANDING SECTIONS BUILDER */}
        {/* ========================================================= */}
        {activeTab === 'cms' && settings && (
          <div className="space-y-8 animate-in fade-in">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-6 h-6 text-amber-400" />
                  <span>صفحه‌ساز و مدیریت سکشن‌های صفحه اصلی (Landing Page CMS)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  قابلیت جابه‌جایی چیدمان، فعال/غیرفعال کردن، حذف، ویرایش تمامی متن‌ها و دکمه‌ها و افزودن سکشن‌های سفارشی به صفحه اصلی
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddSectionModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن سکشن جدید</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCmsSections}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs flex items-center gap-1.5 transition"
                  title="بازگردانی چیدمان و متن‌های پیش‌فرض اولیه"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>چیدمان پیش‌فرض</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSettingsSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{saveSettingsSuccess ? 'ذخیره شد!' : 'ذخیره تغییرات چیدمان'}</span>
                </button>
              </div>
            </div>

            {/* Global CMS Contacts & Announcement Banner Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>اطلاعات تماس و نوار اعلان سراسری صفحه اصلی:</span>
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  {getCmsSections().length} سکشن تعریف‌شده ({getCmsSections().filter(s => s.enabled !== false).length} فعال)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">شماره پشتیبانی:</label>
                  <input
                    type="text"
                    value={settings.cms.supportPhone || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cms: { ...settings.cms, supportPhone: e.target.value },
                      })
                    }
                    placeholder="۰۲۱-۸۸۸۸۹۹۹۹"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">ایمیل پشتیبانی:</label>
                  <input
                    type="email"
                    value={settings.cms.supportEmail || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cms: { ...settings.cms, supportEmail: e.target.value },
                      })
                    }
                    placeholder="support@translator.ir"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">متن نوار پیام اعلان بالای صفحه:</label>
                  <input
                    type="text"
                    value={settings.cms.announcement || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cms: { ...settings.cms, announcement: e.target.value },
                      })
                    }
                    placeholder="متن پیام بالای سایت..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section Cards Manager List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>چیدمان و ترتیب سکشن‌های صفحه اصلی (به ترتیبی که در زیر قرار دارند در سایت نمایش داده می‌شوند):</span>
                <span className="text-[11px] text-amber-400">برای تغییر ترتیب از فلش‌های بالا و پایین استفاده نمایید</span>
              </div>

              <div className="space-y-3">
                {getCmsSections().map((sec, idx) => {
                  const total = getCmsSections().length;
                  const isFirst = idx === 0;
                  const isLast = idx === total - 1;
                  const isEnabled = sec.enabled !== false;

                  const typeLabel =
                    sec.type === 'hero' ? 'معرفی اصلی و هدر (Hero)' :
                    sec.type === 'calculator' ? 'ماشین‌حساب هوشمند قیمت و زمان' :
                    sec.type === 'features' ? 'امکانات و مزایای پلتفرم' :
                    sec.type === 'tones' ? 'لحن‌ها و سبک‌های نگارش' :
                    sec.type === 'faq' ? 'سوالات متداول (FAQ)' :
                    sec.type === 'cta' ? 'بنر اقدام نهایی (CTA)' :
                    'سکشن سفارشی HTML';

                  const typeBadgeClass =
                    sec.type === 'hero' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                    sec.type === 'calculator' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                    sec.type === 'features' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                    sec.type === 'tones' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                    sec.type === 'faq' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' :
                    sec.type === 'cta' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                    'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';

                  return (
                    <div
                      key={sec.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isEnabled
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg'
                          : 'bg-slate-950/70 border-slate-900/80 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        {/* Section Left/Start: Order Badge, Title, Type */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-white text-sm sm:text-base truncate">
                                {sec.title || typeLabel}
                              </span>
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${typeBadgeClass}`}>
                                {typeLabel}
                              </span>
                              {!isEnabled && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                                  مخفی در سایت
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 truncate">
                              {sec.type === 'hero'
                                ? sec.data?.title || settings.cms.heroTitle || 'معرفی و تیتر اصلی سایت'
                                : sec.type === 'calculator'
                                ? 'ماشین‌حساب تعرفه کلمه‌ای و مدت زمان تخمینی'
                                : sec.type === 'features'
                                ? `${sec.data?.items?.length || 4} ویژگی و مزیت ثبت‌شده`
                                : sec.type === 'tones'
                                ? `${sec.data?.items?.length || 3} سبک و لحن تخصصی`
                                : sec.type === 'faq'
                                ? `${sec.data?.items?.length || 3} پرسش و پاسخ متداول`
                                : sec.type === 'cta'
                                ? sec.data?.title || 'بنر شروع ترجمه و ثبت‌نام سریع'
                                : 'محتوای کدهای HTML اختصاصی'}
                            </p>
                          </div>
                        </div>

                        {/* Section Right/End: Action Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto shrink-0">
                          {/* Reorder Buttons */}
                          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveCmsSection(sec.id, 'up')}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-850 disabled:opacity-25 disabled:hover:text-slate-300 disabled:hover:bg-transparent transition"
                              title="انتقال به یک ردیف بالاتر (Move Up)"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <div className="w-[1px] h-4 bg-slate-800" />
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveCmsSection(sec.id, 'down')}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-850 disabled:opacity-25 disabled:hover:text-slate-300 disabled:hover:bg-transparent transition"
                              title="انتقال به یک ردیف پایین‌تر (Move Down)"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Visibility Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleCmsSectionEnabled(sec.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${
                              isEnabled
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                            title={isEnabled ? 'مخفی کردن از صفحه اصلی' : 'فعال‌سازی و نمایش در صفحه اصلی'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isEnabled ? 'فعال' : 'مخفی'}</span>
                          </button>

                          {/* Edit Content Button */}
                          <button
                            type="button"
                            onClick={() => setEditingSectionModal(JSON.parse(JSON.stringify(sec)))}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                            title="ویرایش متون، عناوین و تنظیمات این سکشن"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ویرایش محتوا</span>
                          </button>

                          {/* Delete Section Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCmsSection(sec.id, sec.title || typeLabel)}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition"
                            title="حذف سکشن"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Sticky Save Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">ثبت تغییرات چیدمان و محتوای صفحه اصلی</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    پس از هرگونه تغییر ترتیب، افزودن، ویرایش متون یا حذف سکشن، دکمه ذخیره را بزنید تا بلافاصله برای بازدیدکنندگان صفحه اصلی اعمال گردد.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
              >
                {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSettingsSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSavingSettings ? 'در حال ذخیره‌سازی...' : saveSettingsSuccess ? 'ذخیره شد!' : 'ذخیره تغییرات صفحه اصلی'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: EDIT SECTION CONTENT & DATA */}
        {/* ========================================================= */}
        {editingSectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      ویرایش محتوای سکشن: {editingSectionModal.title || editingSectionModal.type}
                    </h3>
                    <p className="text-[11px] text-slate-400">تغییر عناوین، متن‌ها، دکمه‌ها و عناصر این بخش از صفحه اصلی</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingSectionModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
                {/* Section Common Title & Visibility */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">نام/عنوان داخلی سکشن:</label>
                    <input
                      type="text"
                      value={editingSectionModal.title}
                      onChange={(e) => setEditingSectionModal({ ...editingSectionModal, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center sm:justify-end gap-2 pt-4 sm:pt-0">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editingSectionModal.enabled !== false}
                        onChange={(e) => setEditingSectionModal({ ...editingSectionModal, enabled: e.target.checked })}
                        className="rounded accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-slate-200">نمایش این سکشن در صفحه اصلی</span>
                    </label>
                  </div>
                </div>

                {/* --- 1. HERO SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'hero' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">متن نشان بالای عنوان (Badge):</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.badgeText || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, badgeText: e.target.value },
                          })
                        }
                        placeholder="نسل جدید موتور ترجمه ابری با پردازش موازی و صف هوشمند"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان اصلی هدر (H1 Title):</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.title || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, title: e.target.value },
                          })
                        }
                        placeholder="ترجمه حرفه‌ای و روان کتاب‌های انگلیسی به فارسی با هوش مصنوعی"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">زیرعنوان توضیحی (Subtitle):</label>
                      <textarea
                        rows={3}
                        value={editingSectionModal.data?.subtitle || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, subtitle: e.target.value },
                          })
                        }
                        placeholder="توضیحات جذاب زیر عنوان اصلی..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">متن دکمه اصلی (CTA):</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.ctaButtonText || 'شروع ترجمه کتاب'}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, ctaButtonText: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">متن دکمه ثانویه (ماشین‌حساب):</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.calcButtonText || 'محاسبه هزینه ترجمه'}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, calcButtonText: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Hero 4 Metrics Box Editor */}
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-amber-400 mb-2">۴ آمار و نشان اعتماد اجتماعی (Social Proof Metrics):</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(editingSectionModal.data?.metrics || [
                          { value: '+۲۵۰,۰۰۰', label: 'کلمه ترجمه شده موفق' },
                          { value: '۱۰۰٪ ابری', label: 'بدون نیاز به باز ماندن تب مرورگر' },
                          { value: '۴ فرمت کامل', label: 'Word، PDF، EPUB و TXT' },
                          { value: '۹۹.۹٪', label: 'پایداری با استخر کلیدهای موازی' },
                        ]).map((m, mIdx) => (
                          <div key={mIdx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                            <span className="text-[10px] text-slate-400">آمار شماره {mIdx + 1}:</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={m.value}
                                onChange={(e) => {
                                  const curMetrics = [...(editingSectionModal.data?.metrics || [])];
                                  curMetrics[mIdx] = { ...curMetrics[mIdx], value: e.target.value };
                                  setEditingSectionModal({
                                    ...editingSectionModal,
                                    data: { ...editingSectionModal.data, metrics: curMetrics },
                                  });
                                }}
                                placeholder="مقدار عددی (مثلا +۲۵۰,۰۰۰)"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs"
                              />
                              <input
                                type="text"
                                value={m.label}
                                onChange={(e) => {
                                  const curMetrics = [...(editingSectionModal.data?.metrics || [])];
                                  curMetrics[mIdx] = { ...curMetrics[mIdx], label: e.target.value };
                                  setEditingSectionModal({
                                    ...editingSectionModal,
                                    data: { ...editingSectionModal.data, metrics: curMetrics },
                                  });
                                }}
                                placeholder="برچسب توضیحی"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 2. CALCULATOR SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'calculator' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">نشان بالای تیتر (Badge):</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.badge || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, badge: e.target.value },
                          })
                        }
                        placeholder="شفافیت مالی و قیمت‌گذاری"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان سکشن ماشین‌حساب:</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.title || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, title: e.target.value },
                          })
                        }
                        placeholder="ماشین‌حساب هوشمند هزینه و زمان ترجمه"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">زیرعنوان توضیحی:</label>
                      <textarea
                        rows={2}
                        value={editingSectionModal.data?.subtitle || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, subtitle: e.target.value },
                          })
                        }
                        placeholder="توضیحات نحوه محاسبه نرخ..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">متن یادداشت تخفیف اولیه ثبت‌نام:</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.discountNote || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, discountNote: e.target.value },
                          })
                        }
                        placeholder="تخفیف 25,000 تومانی شارژ اولیه به ازای ثبت‌نام اعمال خواهد شد."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* --- 3. FEATURES SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'features' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نشان بالای تیتر (Badge):</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.badge || ''}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, badge: e.target.value },
                            })
                          }
                          placeholder="برتری‌های فنی و استانداردهای ترجمه"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان اصلی سکشن امکانات:</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.title || ''}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, title: e.target.value },
                            })
                          }
                          placeholder="چرا مترجم هوشمند برای کتاب‌های جدی مناسب است؟"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">زیرعنوان توضیحی:</label>
                      <textarea
                        rows={2}
                        value={editingSectionModal.data?.subtitle || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, subtitle: e.target.value },
                          })
                        }
                        placeholder="توضیحات کوتاه زیر تیتر امکانات..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Features Items List Editor */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400">کارت‌های ویژگی و امکانات ({editingSectionModal.data?.items?.length || 0}):</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = [...(editingSectionModal.data?.items || [])];
                            cur.push({
                              id: `feat_${Date.now()}`,
                              title: 'ویژگی جدید',
                              description: 'توضیحات این قابلیت پلتفرم را وارد کنید.',
                              icon: 'Zap',
                            });
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, items: cur },
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن کارت ویژگی</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(editingSectionModal.data?.items || []).map((item, fIdx) => (
                          <div key={item.id || fIdx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">ویژگی #{fIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = editingSectionModal.data?.items?.filter((_, i) => i !== fIdx) || [];
                                  setEditingSectionModal({
                                    ...editingSectionModal,
                                    data: { ...editingSectionModal.data, items: cur },
                                  });
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1"
                                title="حذف این ویژگی"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => {
                                    const cur = [...(editingSectionModal.data?.items || [])];
                                    cur[fIdx] = { ...cur[fIdx], title: e.target.value };
                                    setEditingSectionModal({
                                      ...editingSectionModal,
                                      data: { ...editingSectionModal.data, items: cur },
                                    });
                                  }}
                                  placeholder="عنوان ویژگی"
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                                />
                              </div>
                              <div>
                                <select
                                  value={item.icon || 'BookOpen'}
                                  onChange={(e) => {
                                    const cur = [...(editingSectionModal.data?.items || [])];
                                    cur[fIdx] = { ...cur[fIdx], icon: e.target.value };
                                    setEditingSectionModal({
                                      ...editingSectionModal,
                                      data: { ...editingSectionModal.data, items: cur },
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs"
                                >
                                  <option value="CloudLightning">آیکون ابر / پردازش (CloudLightning)</option>
                                  <option value="Calculator">آیکون ماشین‌حساب (Calculator)</option>
                                  <option value="BookOpen">آیکون کتاب (BookOpen)</option>
                                  <option value="DownloadCloud">آیکون دانلود (DownloadCloud)</option>
                                  <option value="Zap">آیکون رعدوبرق (Zap)</option>
                                  <option value="ShieldCheck">آیکون امنیت (ShieldCheck)</option>
                                </select>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => {
                                const cur = [...(editingSectionModal.data?.items || [])];
                                cur[fIdx] = { ...cur[fIdx], description: e.target.value };
                                setEditingSectionModal({
                                  ...editingSectionModal,
                                  data: { ...editingSectionModal.data, items: cur },
                                });
                              }}
                              placeholder="توضیحات این ویژگی..."
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 4. TONES SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'tones' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نشان بالای تیتر (Badge):</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.badge || ''}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, badge: e.target.value },
                            })
                          }
                          placeholder="تخصصی‌سازی عمیق"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان اصلی سکشن لحن‌ها:</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.title || ''}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, title: e.target.value },
                            })
                          }
                          placeholder="لحن‌ها و ژانرهای پشتیبانی‌شده"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">زیرعنوان توضیحی:</label>
                      <textarea
                        rows={2}
                        value={editingSectionModal.data?.subtitle || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, subtitle: e.target.value },
                          })
                        }
                        placeholder="توضیحات کوتاه..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Tone Cards Manager */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400">کارت‌های سبک و لحن نگارش ({editingSectionModal.data?.items?.length || 0}):</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = [...(editingSectionModal.data?.items || [])];
                            cur.push({
                              id: `tone_${Date.now()}`,
                              title: `${cur.length + 1}. سبک جدید`,
                              description: 'توضیحات لحن نگارش و کلمات کلیدی اثر.',
                              tags: ['برچسب ۱', 'برچسب ۲'],
                            });
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, items: cur },
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن کارت لحن</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(editingSectionModal.data?.items || []).map((tItem, tIdx) => (
                          <div key={tItem.id || tIdx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">لحن شماره {tIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = editingSectionModal.data?.items?.filter((_, i) => i !== tIdx) || [];
                                  setEditingSectionModal({
                                    ...editingSectionModal,
                                    data: { ...editingSectionModal.data, items: cur },
                                  });
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1"
                                title="حذف این لحن"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={tItem.title}
                              onChange={(e) => {
                                const cur = [...(editingSectionModal.data?.items || [])];
                                cur[tIdx] = { ...cur[tIdx], title: e.target.value };
                                setEditingSectionModal({
                                  ...editingSectionModal,
                                  data: { ...editingSectionModal.data, items: cur },
                                });
                              }}
                              placeholder="عنوان لحن (مثلا ۱. معنوی، فلسفی و خودشناسی)"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs"
                            />

                            <textarea
                              rows={2}
                              value={tItem.description}
                              onChange={(e) => {
                                const cur = [...(editingSectionModal.data?.items || [])];
                                cur[tIdx] = { ...cur[tIdx], description: e.target.value };
                                setEditingSectionModal({
                                  ...editingSectionModal,
                                  data: { ...editingSectionModal.data, items: cur },
                                });
                              }}
                              placeholder="توضیحات لحن نگارش..."
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs"
                            />

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">برچسب‌ها و نمونه‌ها (با کاما جدا کنید):</label>
                              <input
                                type="text"
                                value={Array.isArray(tItem.tags) ? tItem.tags.join(', ') : ''}
                                onChange={(e) => {
                                  const cur = [...(editingSectionModal.data?.items || [])];
                                  cur[tIdx] = {
                                    ...cur[tIdx],
                                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                                  };
                                  setEditingSectionModal({
                                    ...editingSectionModal,
                                    data: { ...editingSectionModal.data, items: cur },
                                  });
                                }}
                                placeholder="اکهارت تله, آلن واتس, کریشنا مورتی"
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 5. FAQ SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'faq' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نشان بالای تیتر (Badge):</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.badge || ''}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, badge: e.target.value },
                            })
                          }
                          placeholder="پاسخ به ابهامات متداول"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان اصلی سکشن پرسش‌ها:</label>
                        <input
                          type="text"
                          value={editingSectionModal.data?.title || ''}
                          onChange={(e) =>
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, title: e.target.value },
                            })
                          }
                          placeholder="سوالات متداول کاربران"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* FAQ Items Manager */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400">پرسش‌ها و پاسخ‌ها ({editingSectionModal.data?.items?.length || 0}):</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = [...(editingSectionModal.data?.items || [])];
                            cur.push({
                              id: `faq_${Date.now()}`,
                              q: 'سوال جدید شما چیست؟',
                              a: 'پاسخ کامل و شفاف به این سوال را در اینجا بنویسید.',
                            });
                            setEditingSectionModal({
                              ...editingSectionModal,
                              data: { ...editingSectionModal.data, items: cur },
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن پرسش جدید</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(editingSectionModal.data?.items || []).map((faqItem, qIdx) => (
                          <div key={faqItem.id || qIdx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">پرسش #{qIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = editingSectionModal.data?.items?.filter((_, i) => i !== qIdx) || [];
                                  setEditingSectionModal({
                                    ...editingSectionModal,
                                    data: { ...editingSectionModal.data, items: cur },
                                  });
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1"
                                title="حذف این پرسش"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={faqItem.q}
                              onChange={(e) => {
                                const cur = [...(editingSectionModal.data?.items || [])];
                                cur[qIdx] = { ...cur[qIdx], q: e.target.value };
                                setEditingSectionModal({
                                  ...editingSectionModal,
                                  data: { ...editingSectionModal.data, items: cur },
                                });
                              }}
                              placeholder="متن پرسش..."
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                            />

                            <textarea
                              rows={3}
                              value={faqItem.a}
                              onChange={(e) => {
                                const cur = [...(editingSectionModal.data?.items || [])];
                                cur[qIdx] = { ...cur[qIdx], a: e.target.value };
                                setEditingSectionModal({
                                  ...editingSectionModal,
                                  data: { ...editingSectionModal.data, items: cur },
                                });
                              }}
                              placeholder="پاسخ تفصیلی..."
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 6. CTA SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'cta' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان بنر اقدام نهایی:</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.title || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, title: e.target.value },
                          })
                        }
                        placeholder="همین حالا اولین کتاب خود را ترجمه کنید"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">متن توضیحی / مشوق:</label>
                      <textarea
                        rows={2}
                        value={editingSectionModal.data?.subtitle || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, subtitle: e.target.value },
                          })
                        }
                        placeholder="با عضویت در سامانه، ۲۵,۰۰۰ تومان شارژ هدیه برای آزمایش کیفیت ترجمه دریافت خواهید کرد."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">متن روی دکمه:</label>
                      <input
                        type="text"
                        value={editingSectionModal.data?.buttonText || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, buttonText: e.target.value },
                          })
                        }
                        placeholder="ورود و ثبت‌نام سریع"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* --- 7. CUSTOM HTML SPECIFIC FIELDS --- */}
                {editingSectionModal.type === 'custom_html' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">کلاس‌های CSS کانتینر بیرونی (اختیاری):</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={editingSectionModal.data?.containerClass || 'py-16 border-b border-slate-800/80 bg-slate-900/30'}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, containerClass: e.target.value },
                          })
                        }
                        placeholder="py-16 border-b border-slate-800 bg-slate-900/40"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <label className="font-semibold text-slate-300">کدهای HTML این سکشن:</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSectionModal({
                                ...editingSectionModal,
                                data: {
                                  ...editingSectionModal.data,
                                  htmlContent: `<div style="max-width: 1100px; margin: 0 auto; padding: 20px; text-align: center;">
  <span style="color: #f59e0b; font-weight: bold; font-size: 13px;">تخفیف ویژه ناشران و سازمان‌ها</span>
  <h2 style="font-size: 26px; font-weight: 900; color: #ffffff; margin-top: 8px;">طرح ترجمه سازمانی کتب دانشگاهی و تخصصی</h2>
  <p style="color: #94a3b8; font-size: 14px; max-width: 650px; margin: 12px auto 24px;">پشتیبانی از قراردادهای حقوقی، تحویل فایل InDesign و Word با رعایت کامل قوانین حق نشر.</p>
  <a href="#calculator" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; font-weight: 800; padding: 12px 30px; border-radius: 12px; text-decoration: none; display: inline-block;">درخواست مشاوره اختصاصی</a>
</div>`,
                                },
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px]"
                          >
                            قالب آماده بنر طلایی
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={10}
                        dir="ltr"
                        value={editingSectionModal.data?.htmlContent || ''}
                        onChange={(e) =>
                          setEditingSectionModal({
                            ...editingSectionModal,
                            data: { ...editingSectionModal.data, htmlContent: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSectionModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditedSection(editingSectionModal)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تأیید و اعمال تغییرات</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: ADD NEW SECTION */}
        {/* ========================================================= */}
        {addSectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-white">افزودن سکشن جدید به صفحه اصلی</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAddSectionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCmsSection} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نوع سکشن:</label>
                  <select
                    value={newSectionType}
                    onChange={(e) => setNewSectionType(e.target.value as LandingSectionType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="custom_html">کدهای اختصاصی HTML (Custom HTML Block)</option>
                    <option value="cta">بنر دعوت به اقدام یا پیشنهاد ویژه (CTA Banner)</option>
                    <option value="features">بخش امکانات یا مزایا (Features Grid)</option>
                    <option value="faq">بخش سوالات متداول (FAQ Accordion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان / نام نمایشی سکشن:</label>
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="مثال: بنر جشنواره تخفیف بهاره ناشران"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddSectionModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ایجاد و شروع ویرایش</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: SEO & BRANDING SETTINGS */}
        {/* ========================================================= */}
        {activeTab === 'seo' && settings && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-6 h-6 text-teal-400" />
                  <span>تنظیمات سئو (SEO)، برندینگ و متاتگ‌های سایت</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  شخصی‌سازی عنوان صفحه، متاتگ‌های گوگل، لوگوی اختصاصی، فاوآیکون و کنترل نوار اعلان بالای سایت
                </p>
              </div>

              <button
                onClick={handleSaveSeoSettings}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {seoSaveSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                <span>{seoSaveSuccess ? 'تنظیمات سئو ذخیره شد!' : 'ذخیره تنظیمات سئو و برندینگ'}</span>
              </button>
            </div>

            {/* Section 1: Site Title & SEO Meta Tags */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <h3 className="font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Search className="w-5 h-5 text-teal-400" />
                <span>عناوین و متاتگ‌های موتورهای جستجو (Google & Social Cards)</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    نام و عنوان اصلی سایت (Site Title):
                  </label>
                  <input
                    type="text"
                    value={settings.seo?.siteTitle ?? 'مترجم آنلاین کتاب با هوش مصنوعی'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seo: {
                          siteTitle: e.target.value,
                          metaDescription: settings.seo?.metaDescription ?? '',
                          metaKeywords: settings.seo?.metaKeywords ?? '',
                          logoUrl: settings.seo?.logoUrl ?? '',
                          faviconUrl: settings.seo?.faviconUrl ?? '',
                          announcementEnabled: settings.seo?.announcementEnabled ?? true,
                          announcementText: settings.seo?.announcementText ?? '',
                        },
                      })
                    }
                    placeholder="مترجم آنلاین کتاب با هوش مصنوعی | ترجمه سریع رمان و کتاب تخصصی"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">این عنوان در تب مرورگر و نتایج اولیه گوگل نمایش داده می‌شود.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    توضیحات متا برای موتورهای جستجو (Meta Description):
                  </label>
                  <textarea
                    rows={3}
                    value={settings.seo?.metaDescription ?? ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seo: {
                          siteTitle: settings.seo?.siteTitle ?? 'مترجم آنلاین کتاب با هوش مصنوعی',
                          metaDescription: e.target.value,
                          metaKeywords: settings.seo?.metaKeywords ?? '',
                          logoUrl: settings.seo?.logoUrl ?? '',
                          faviconUrl: settings.seo?.faviconUrl ?? '',
                          announcementEnabled: settings.seo?.announcementEnabled ?? true,
                          announcementText: settings.seo?.announcementText ?? '',
                        },
                      })
                    }
                    placeholder="سامانه هوشمند ترجمه کامل کتاب‌های PDF و متنی با هوش مصنوعی، حفظ لحن ادبی و علمی، واژه‌نامه اختصاصی و خروجی Word و کتابخوان."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">توضیحات خلاصه (بین ۱۲۰ تا ۱۶۰ کاراکتر پیشنهاد می‌شود) که در زیر لینک سایت در گوگل ظاهر می‌گردد.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    کلمات کلیدی سئو (Meta Keywords - با کاما جدا کنید):
                  </label>
                  <input
                    type="text"
                    value={settings.seo?.metaKeywords ?? ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seo: {
                          siteTitle: settings.seo?.siteTitle ?? 'مترجم آنلاین کتاب با هوش مصنوعی',
                          metaDescription: settings.seo?.metaDescription ?? '',
                          metaKeywords: e.target.value,
                          logoUrl: settings.seo?.logoUrl ?? '',
                          faviconUrl: settings.seo?.faviconUrl ?? '',
                          announcementEnabled: settings.seo?.announcementEnabled ?? true,
                          announcementText: settings.seo?.announcementText ?? '',
                        },
                      })
                    }
                    placeholder="ترجمه کتاب, ترجمه هوش مصنوعی, مترجم کتاب انگلیسی به فارسی, ترجمه رمان, هوش مصنوعی جمینای"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Logo and Favicon */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <h3 className="font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Palette className="w-5 h-5 text-amber-400" />
                <span>لوگوی سایت و فاوآیکون (Logo & Favicon)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      آدرس اینترنتی لوگوی سایت (Logo URL):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.seo?.logoUrl ?? ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          seo: {
                            siteTitle: settings.seo?.siteTitle ?? 'مترجم آنلاین کتاب با هوش مصنوعی',
                            metaDescription: settings.seo?.metaDescription ?? '',
                            metaKeywords: settings.seo?.metaKeywords ?? '',
                            logoUrl: e.target.value,
                            faviconUrl: settings.seo?.faviconUrl ?? '',
                            announcementEnabled: settings.seo?.announcementEnabled ?? true,
                            announcementText: settings.seo?.announcementText ?? '',
                          },
                        })
                      }
                      placeholder="https://example.com/logo.png یا /logo.svg"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">در صورت خالی بودن، آیکون و نشان پیش‌فرض کتاب نمایش داده می‌شود.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      آدرس فاوآیکون مرورگر (Favicon URL):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.seo?.faviconUrl ?? ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          seo: {
                            siteTitle: settings.seo?.siteTitle ?? 'مترجم آنلاین کتاب با هوش مصنوعی',
                            metaDescription: settings.seo?.metaDescription ?? '',
                            metaKeywords: settings.seo?.metaKeywords ?? '',
                            logoUrl: settings.seo?.logoUrl ?? '',
                            faviconUrl: e.target.value,
                            announcementEnabled: settings.seo?.announcementEnabled ?? true,
                            announcementText: settings.seo?.announcementText ?? '',
                          },
                        })
                      }
                      placeholder="https://example.com/favicon.ico"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none text-left"
                    />
                  </div>
                </div>

                {/* Logo Live Preview */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-400 mb-3">پیش‌نمایش زنده لوگوی سایت:</span>
                  {settings.seo?.logoUrl ? (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 max-w-xs">
                      <img
                        src={settings.seo.logoUrl}
                        alt="Logo Preview"
                        className="max-h-16 w-auto object-contain mx-auto"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-white">لوگوی پیش‌فرض (نماد هوشمند کتاب)</span>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 mt-2">
                    {settings.seo?.logoUrl ? 'تصویر با موفقیت فراخوانی شد' : 'هیچ لوگوی اختصاصی ست نشده است'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: User Dashboard & Top Announcement Bar Control */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-base text-white">نوار اعلان تخفیف صفحه کاربران و بالای سایت</h3>
                    <p className="text-[11px] text-slate-400">اعلان سراسری که در بالای پیشخوان تمام کاربران و صفحات سایت نمایش داده می‌شود.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      checked={settings.announcementBar?.enabled ?? settings.seo?.announcementEnabled ?? true}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const currentAnn = settings.announcementBar || {
                          text: '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.',
                          type: 'warning',
                          linkUrl: '',
                          linkText: 'ثبت سفارش کتاب',
                          enabled: true,
                        };
                        setSettings({
                          ...settings,
                          announcementBar: {
                            ...currentAnn,
                            enabled: isChecked,
                          },
                          seo: {
                            ...(settings.seo || {
                              siteTitle: 'مترجم آنلاین کتاب با هوش مصنوعی',
                              metaDescription: '',
                              metaKeywords: '',
                              logoUrl: '',
                              faviconUrl: '',
                              announcementEnabled: true,
                              announcementText: '',
                            }),
                            announcementEnabled: isChecked,
                          },
                        });
                      }}
                      className="rounded accent-amber-500 w-4 h-4"
                    />
                    <span className={settings.announcementBar?.enabled ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {settings.announcementBar?.enabled ? 'اعلان فعال است' : 'اعلان غیرفعال'}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveAnnouncement}
                    disabled={isSavingAnnouncement}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1"
                  >
                    {isSavingAnnouncement ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : announcementSaveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{announcementSaveSuccess ? 'ذخیره شد!' : 'ذخیره اعلان'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">متن اعلان ویژه (نمایش در بالای پیشخوان کاربران):</label>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultText = '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.';
                        const currentAnn = settings.announcementBar || {
                          type: 'warning',
                          linkUrl: '',
                          linkText: 'ثبت سفارش کتاب',
                          enabled: true,
                          text: '',
                        };
                        setSettings({
                          ...settings,
                          announcementBar: {
                            ...currentAnn,
                            text: defaultText,
                            enabled: true,
                          },
                          seo: {
                            ...(settings.seo || {
                              siteTitle: 'مترجم آنلاین کتاب با هوش مصنوعی',
                              metaDescription: '',
                              metaKeywords: '',
                              logoUrl: '',
                              faviconUrl: '',
                              announcementEnabled: true,
                              announcementText: '',
                            }),
                            announcementText: defaultText,
                            announcementEnabled: true,
                          },
                        });
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>بازنشانی به متن پیش‌فرض تخفیف ۴۵ تومانی</span>
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={settings.announcementBar?.text ?? settings.seo?.announcementText ?? '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.'}
                    onChange={(e) => {
                      const newText = e.target.value;
                      const currentAnn = settings.announcementBar || {
                        type: 'warning',
                        linkUrl: '',
                        linkText: 'ثبت سفارش کتاب',
                        enabled: true,
                        text: '',
                      };
                      setSettings({
                        ...settings,
                        announcementBar: {
                          ...currentAnn,
                          text: newText,
                        },
                        seo: {
                          ...(settings.seo || {
                            siteTitle: 'مترجم آنلاین کتاب با هوش مصنوعی',
                            metaDescription: '',
                            metaKeywords: '',
                            logoUrl: '',
                            faviconUrl: '',
                            announcementEnabled: true,
                            announcementText: '',
                          }),
                          announcementText: newText,
                        },
                      });
                    }}
                    placeholder="متن اعلان را بنویسید..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">آدرس پیوند اعلان (اختیاری):</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.announcementBar?.linkUrl || ''}
                      onChange={(e) => {
                        const currentAnn = settings.announcementBar || {
                          type: 'warning',
                          text: '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.',
                          linkText: 'ثبت سفارش کتاب',
                          enabled: true,
                          linkUrl: '',
                        };
                        setSettings({
                          ...settings,
                          announcementBar: {
                            ...currentAnn,
                            linkUrl: e.target.value,
                          },
                        });
                      }}
                      placeholder="/?page=new-book یا https://..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">متن دکمه پیوند (اختیاری):</label>
                    <input
                      type="text"
                      value={settings.announcementBar?.linkText || ''}
                      onChange={(e) => {
                        const currentAnn = settings.announcementBar || {
                          type: 'warning',
                          text: '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.',
                          linkUrl: '',
                          enabled: true,
                          linkText: '',
                        };
                        setSettings({
                          ...settings,
                          announcementBar: {
                            ...currentAnn,
                            linkText: e.target.value,
                          },
                        });
                      }}
                      placeholder="مثال: مشاهده تعرفه‌ها و ثبت کتاب"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/20 text-xs">
                  <span className="text-[10px] text-slate-400 block mb-2 font-semibold">پیش‌نمایش زنده در صفحه کاربران:</span>
                  {settings.announcementBar?.enabled ? (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-950/30 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="text-amber-200 font-medium">
                          {settings.announcementBar?.text || 'متن اعلان خالی است.'}
                        </span>
                      </div>
                      {settings.announcementBar?.linkText && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px] shrink-0">
                          {settings.announcementBar.linkText}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-2">
                      نوار اعلان هم‌اکنون غیرفعال است و به کاربران نمایش داده نمی‌شود.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Sitemap, Robots.txt & Agentic AI Browsing Manager */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-base text-white">مدیریت فایل‌های سئو، خزنده‌ها و مرور عامل‌گرا (Agentic AI Browsing)</h3>
                    <p className="text-[11px] text-slate-400">لینک‌های مستقیم برای Google Search Console و خزنده‌های هوش مصنوعی (ChatGPT, Claude, Gemini, Perplexity)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSeoFiles}
                  disabled={isSavingSeoFiles}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  {isSavingSeoFiles ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : seoFilesSaveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{seoFilesSaveSuccess ? 'فایل‌ها با موفقیت ذخیره شدند!' : 'ذخیره اختصاصی فایل‌های سئو'}</span>
                </button>
              </div>

              {/* Direct URLs & One-Click Copy for Google Search Console & AI Bots */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                  <span>آدرس‌های رسمی سرور (جهت ثبت در سرچ کنسول گوگل و موتورهای جستجو):</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'نقشه سایت (Sitemap XML)',
                      path: '/sitemap.xml',
                      desc: 'جهت ثبت در Google Search Console > Sitemaps',
                      color: 'border-emerald-500/30 bg-emerald-500/5',
                      badge: 'گوگل سرچ کنسول',
                      badgeColor: 'text-emerald-400 bg-emerald-500/10',
                    },
                    {
                      label: 'فایل دستورات خزنده‌ها (Robots.txt)',
                      path: '/robots.txt',
                      desc: 'هدایت ربات‌های گوگل، بینگ و موتورهای جستجو',
                      color: 'border-blue-500/30 bg-blue-500/5',
                      badge: 'خزنده‌های سئو',
                      badgeColor: 'text-blue-400 bg-blue-500/10',
                    },
                    {
                      label: 'عامل‌های هوش مصنوعی (llms.txt)',
                      path: '/llms.txt',
                      desc: 'استاندارد مرور عامل‌گرا (ChatGPT, Claude, Perplexity, Gemini)',
                      color: 'border-purple-500/30 bg-purple-500/5',
                      badge: 'Agentic AI',
                      badgeColor: 'text-purple-400 bg-purple-500/10',
                    },
                    {
                      label: 'مستندات کامل مدل‌ها (llms-full.txt)',
                      path: '/llms-full.txt',
                      desc: 'شرح جامع قابلیت‌های ترجمه برای مدل‌های استدلال',
                      color: 'border-amber-500/30 bg-amber-500/5',
                      badge: 'Full LLM Context',
                      badgeColor: 'text-amber-400 bg-amber-500/10',
                    },
                    {
                      label: 'پلاگین هوش مصنوعی (.well-known)',
                      path: '/.well-known/ai-plugin.json',
                      desc: 'مانیفست استاندارد OpenAPI برای عامل‌های هوش مصنوعی',
                      color: 'border-teal-500/30 bg-teal-500/5',
                      badge: 'OpenAI Plugin',
                      badgeColor: 'text-teal-400 bg-teal-500/10',
                    },
                  ].map((item, idx) => {
                    const fullUrl = `${window.location.origin}${item.path}`;
                    const isCopied = copiedSeoLink === item.path;
                    return (
                      <div key={idx} className={`p-3.5 rounded-2xl border ${item.color} flex flex-col justify-between gap-2.5`}>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-xs">{item.label}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{item.desc}</p>
                          <div className="mt-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-all dir-ltr text-left">
                            {fullUrl}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(fullUrl);
                              setCopiedSeoLink(item.path);
                              setTimeout(() => setCopiedSeoLink(null), 2500);
                            }}
                            className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'کپی شد!' : 'کپی لینک مستقیم'}</span>
                          </button>
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="مشاهده مستقیم در تب جدید"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* In-Panel Text/Code Editor Tabs */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">ویرایشگر مستقیم محتوای فایل‌ها:</span>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setSeoFilesTab('robots')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        seoFilesTab === 'robots' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      فایل robots.txt
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoFilesTab('sitemap')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        seoFilesTab === 'sitemap' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      نقشه سایت sitemap.xml
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoFilesTab('llms')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        seoFilesTab === 'llms' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      عامل‌های هوش مصنوعی (llms.txt)
                    </button>
                  </div>
                </div>

                {/* SubTab 1: Robots.txt */}
                {seoFilesTab === 'robots' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>محتوای متنی فایل robots.txt در مسیر ریشه سایت:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const defRobots = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /auth/\n\nSitemap: ${window.location.origin}/sitemap.xml\nLLMs-Txt: ${window.location.origin}/llms.txt\n`;
                          setRobotsTxtContent(defRobots);
                        }}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>بازنشانی به پیش‌فرض استاندارد</span>
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      dir="ltr"
                      value={robotsTxtContent}
                      onChange={(e) => setRobotsTxtContent(e.target.value)}
                      placeholder="User-agent: *\nAllow: /..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                )}

                {/* SubTab 2: Sitemap.xml */}
                {seoFilesTab === 'sitemap' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>کد XML سفارشی (در صورت خالی بودن، نقشه سایت خودکار شامل تمام صفحات و مقالات وبلاگ تولید می‌شود):</span>
                      <button
                        type="button"
                        onClick={() => setSitemapXmlContent('')}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>پاکسازی و بازگشت به حالت پویا (پیشنهاد گوگل)</span>
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      dir="ltr"
                      value={sitemapXmlContent}
                      onChange={(e) => setSitemapXmlContent(e.target.value)}
                      placeholder="<?xml version='1.0' encoding='UTF-8'?>\n<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>\n  <url>\n    <loc>https://gaiafa.ir/</loc>\n  </url>\n</urlset>"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-500">
                      نکته: اگر این فیلد خالی بماند، سرور به صورت خودکار آخرین صفحات فعال، مقالات منتشر شده وبلاگ و روت‌های عمومی را با تگ‌های lastmod و changefreq در فایل sitemap.xml تولید می‌کند.
                    </p>
                  </div>
                )}

                {/* SubTab 3: llms.txt */}
                {seoFilesTab === 'llms' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>محتوای استاندارد Agentic Browsing (llms.txt) برای درک مدل‌های زبانی:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const defLlms = `# سامانه ابری ترجمه کتاب با هوش مصنوعی (Gaiafa / Book Translator)\n\n> سامانه تخصصی و تجاری ترجمه کتاب‌های انگلیسی به فارسی با هوش مصنوعی جمینای و مدل‌های پیشرفته.\n\n## ویژگی‌ها\n- حفظ دقیق ساختار سند، پاورقی‌ها و جداول\n- استخراج هوشمند واژه‌نامه تخصصی (Glossary)\n- خروجی Word، PDF و کتابخوان دیجیتال\n- تعرفه اقتصادی هر کلمه ۴۵ تومان\n\n## پیوندها\n- [صفحه اصلی](${window.location.origin}/)\n- [وبلاگ و مقالات](${window.location.origin}/blog)\n- [راهنمای جامع](${window.location.origin}/page/guide)\n`;
                          setLlmsTxtContent(defLlms);
                        }}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>بازنشانی به متن پیش‌فرض عامل‌ها</span>
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      dir="ltr"
                      value={llmsTxtContent}
                      onChange={(e) => setLlmsTxtContent(e.target.value)}
                      placeholder="# Project Name\n\n> Summary..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400">
                    {seoFilesSaveSuccess ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        تغییرات فایل‌های سئو با موفقیت در دیتابیس ثبت شد و روی سرور فعال گردید.
                      </span>
                    ) : (
                      'تغییرات شما به صورت آنی در مسیرهای مربوطه سرور اعمال می‌شود.'
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={handleSaveSeoFiles}
                    disabled={isSavingSeoFiles}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    {isSavingSeoFiles ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>ذخیره فایل‌های سئو و خزنده‌ها</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: SECURITY & SMS CONFIG */}
        {/* ========================================================= */}
        {activeTab === 'security' && settings && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">تنظیمات امنیتی، سشن‌ها و پنل پیامکی</h2>
                <p className="text-xs text-slate-400">تنظیمات ملی‌پیامک، کاوه‌نگار، SMS.ir و محدودیت‌های نرخ درخواست</p>
              </div>

              <button
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {saveSettingsSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                <span>{saveSettingsSuccess ? 'ذخیره شد!' : 'ذخیره تنظیمات امنیتی'}</span>
              </button>
            </div>

            {/* SMS Provider Config */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                  <Send className="w-5 h-5 text-amber-400" />
                  <span>پیکربندی پنل پیامکی (SMS OTP Gateway - ملی‌پیامک و وب‌سرویس‌ها)</span>
                </h3>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 w-fit">
                  {settings.sms.provider === 'melipayamak' ? 'سامانه ملی‌پیامک (فعال)' : 'درگاه پیامک فعال'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">سامانه ارائه‌دهنده پیامک:</label>
                  <select
                    value={settings.sms.provider}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sms: { ...settings.sms, provider: e.target.value as any },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="melipayamak">سامانه ملی پیامک (MeliPayamak)</option>
                    <option value="kavenegar">کاوه‌نگار (Kavenegar)</option>
                    <option value="smsir">SMS.ir (سامانه پیام کوتاه)</option>
                    <option value="mock">شبیه‌ساز تستی (توسعه محلی و رایگان)</option>
                  </select>
                </div>

                {settings.sms.provider === 'melipayamak' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">روش احراز هویت در ملی‌پیامک:</label>
                    <select
                      value={settings.sms.authMethod || 'credentials'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, authMethod: e.target.value as any },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="credentials">نام کاربری و کلمه عبور پنل (وب‌سرویس REST/SOAP)</option>
                      <option value="pattern">ارسال خدماتی با شناسه قالب (BodyId / عبور از بلک‌لیست)</option>
                      <option value="apikey">کلید توکن کنسول (API Token)</option>
                    </select>
                  </div>
                )}

                {settings.sms.provider === 'melipayamak' && settings.sms.authMethod !== 'apikey' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام کاربری ملی‌پیامک (Username):</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="e.g. 09121234567 یا نام کاربری"
                      value={settings.sms.username || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, username: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {settings.sms.provider === 'melipayamak' && settings.sms.authMethod !== 'apikey' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">کلمه عبور پنل ملی‌پیامک (Password):</label>
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="••••••••"
                      value={settings.sms.password || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, password: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {settings.sms.provider === 'melipayamak' && settings.sms.authMethod === 'pattern' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">کد متن یا شناسه الگو (BodyId / Pattern):</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="e.g. 123456 (کد متن تایید شده در وب‌سرویس خدماتی)"
                      value={settings.sms.bodyId || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, bodyId: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-200 text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {(settings.sms.provider !== 'melipayamak' || settings.sms.authMethod === 'apikey') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">کلید API یا توکن امنیتی:</label>
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="API Key / Token"
                      value={settings.sms.apiKey || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, apiKey: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {settings.sms.authMethod !== 'pattern' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره خط اختصاصی یا فرستنده:</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="e.g. 50004000... یا 1000..."
                      value={settings.sms.senderNumber || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, senderNumber: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {settings.sms.provider === 'melipayamak' && (
                <div className="mb-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>راهنمای اتصال به ملی‌پیامک:</span>
                  </div>
                  {settings.sms.authMethod === 'credentials' && (
                    <p>در روش نام کاربری و پسورد، پیامک‌ها از طریق شماره خط اختصاصی شما ارسال می‌شوند. برای شماره‌هایی که دریافت پیامک‌های تبلیغاتی را بسته‌اند، پیامک ارسال نمی‌شود مگر خط شما خدماتی شده باشد.</p>
                  )}
                  {settings.sms.authMethod === 'pattern' && (
                    <p className="text-emerald-400">در روش خدماتی (BodyId)، پیامک احراز هویت با سرعت بالا و حتی به شماره‌های مسدود تبلیغاتی ارسال خواهد شد. کافیست کد متن ثبت‌شده در کنسول ملی‌پیامک را در فیلد شناسه الگو وارد فرمایید.</p>
                  )}
                  {settings.sms.authMethod === 'apikey' && (
                    <p>در روش توکن، درخواست‌های ارسال مستقیماً با هدر دسترسی به وب‌سرویس RESTful ملی‌پیامک احراز هویت می‌شوند.</p>
                  )}
                </div>
              )}

              {/* SMS Test tool */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="09121234567 (شماره گیرنده تست)"
                  value={testSmsPhone}
                  onChange={(e) => setTestSmsPhone(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>ارسال پیامک آزمایشی به شماره فوق</span>
                </button>
                {smsResult && (
                  <span className={`text-xs px-2.5 py-1 rounded-lg ${smsResult.includes('موفقیت') || smsResult.includes('تست') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                    {smsResult}
                  </span>
                )}
              </div>
            </div>

            {/* Security Config */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>تنظیمات امنیت، سشن و محدودیت بارگذاری</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    حداکثر کتاب‌های همزمان در صف (Concurrency):
                  </label>
                  <input
                    type="number"
                    value={settings.security.maxConcurrentJobs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, maxConcurrentJobs: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    مدت اعتبار نشست لاگین (ساعت):
                  </label>
                  <input
                    type="number"
                    value={settings.security.sessionExpireHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, sessionExpireHours: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    محدودیت درخواست کاربر (در دقیقه):
                  </label>
                  <input
                    type="number"
                    value={settings.security.rateLimitRpm}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, rateLimitRpm: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <input
                  type="checkbox"
                  id="maint_mode"
                  checked={settings.security.maintenanceMode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, maintenanceMode: e.target.checked },
                    })
                  }
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <label htmlFor="maint_mode" className="text-xs text-slate-300 cursor-pointer">
                  فعال‌سازی حالت تعمیرات (Maintenance Mode) - ورود کاربران عادی موقتاً مسدود می‌شود.
                </label>
              </div>
            </div>

            {/* Captcha Configuration Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-white">تنظیمات کپچا و ضد ربات (Bot Protection & Captcha)</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.security.captcha?.enabled || false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          captcha: {
                            ...(settings.security.captcha || {
                              provider: 'math',
                              recaptchaVersion: 'v2',
                              siteKey: '',
                              secretKey: '',
                              requiredForLogin: false,
                              requiredForRegister: true,
                            }),
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <span className="text-xs text-amber-300 font-bold">فعال‌سازی سیستم کپچا</span>
                </label>
              </div>

              {/* Default Disabled Status Banner */}
              {!settings.security.captcha?.enabled ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-amber-200">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    سیستم کپچا در سراسر سامانه <strong>غیرفعال</strong> است (حالت پیش‌فرض). کاربران بدون هیچ مانع یا نیازی به حل کپچا وارد یا ثبت‌نام می‌شوند. برای فعال‌سازی در سایت، تیک بالا را فعال و ذخیره نمایید.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>سیستم کپچا هم‌اکنون در سایت فعال است و فرم‌های تعیین‌شده اعتبارسنجی می‌شوند.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">نوع ارائه‌دهنده کپچا:</label>
                  <select
                    value={settings.security.captcha?.provider || 'math'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          captcha: {
                            ...(settings.security.captcha || {
                              enabled: false,
                              recaptchaVersion: 'v2',
                              siteKey: '',
                              secretKey: '',
                              requiredForLogin: false,
                              requiredForRegister: true,
                            }),
                            provider: e.target.value as any,
                          },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="math">کپچای ریاضی هوشمند سرور (سریع و بدون نیاز به کلید)</option>
                    <option value="recaptcha">گوگل ری‌کپچا (Google reCAPTCHA v2 / v3)</option>
                    <option value="turnstile">کلادفلر ترنستایل (Cloudflare Turnstile)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">کلید عمومی سایت (Site Key):</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="site_key_..."
                    value={settings.security.captcha?.siteKey || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          captcha: {
                            ...(settings.security.captcha || {
                              enabled: false,
                              provider: 'math',
                              recaptchaVersion: 'v2',
                              secretKey: '',
                              requiredForLogin: false,
                              requiredForRegister: true,
                            }),
                            siteKey: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">کلید محرمانه سرور (Secret Key):</label>
                  <input
                    type="password"
                    dir="ltr"
                    placeholder="secret_key_..."
                    value={settings.security.captcha?.secretKey || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          captcha: {
                            ...(settings.security.captcha || {
                              enabled: false,
                              provider: 'math',
                              recaptchaVersion: 'v2',
                              siteKey: '',
                              requiredForLogin: false,
                              requiredForRegister: true,
                            }),
                            secretKey: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Version Selector for Google reCAPTCHA (v2 vs v3) */}
              {(settings.security.captcha?.provider === 'recaptcha' || !settings.security.captcha?.provider) && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">
                      انتخاب نسخه گوگل ری‌کپچا (reCAPTCHA Version):
                    </label>
                    <span className="text-[11px] text-amber-400 font-mono font-bold">
                      {settings.security.captcha?.recaptchaVersion === 'v3' ? 'نسخه ۳ نامرئی (v3)' : 'نسخه ۲ تیک من ربات نیستم (v2)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            captcha: {
                              ...(settings.security.captcha || {
                                enabled: false,
                                provider: 'recaptcha',
                                siteKey: '',
                                secretKey: '',
                                requiredForLogin: false,
                                requiredForRegister: true,
                              }),
                              recaptchaVersion: 'v2',
                            },
                          },
                        })
                      }
                      className={`p-3.5 rounded-xl border text-right transition ${
                        (settings.security.captcha?.recaptchaVersion || 'v2') === 'v2'
                          ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-amber-300">نسخه ۲ - چک‌باکس من ربات نیستم (v2 Checkbox)</span>
                        {(settings.security.captcha?.recaptchaVersion || 'v2') === 'v2' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        کادر رسمی «من ربات نیستم» به کاربر نمایش داده می‌شود و با کلیک تیک سبز می‌خورد. (کلیدهای وارد شده باید در پنل گوگل از نوع reCAPTCHA v2 Checkbox باشند).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            captcha: {
                              ...(settings.security.captcha || {
                                enabled: false,
                                provider: 'recaptcha',
                                siteKey: '',
                                secretKey: '',
                                requiredForLogin: false,
                                requiredForRegister: true,
                              }),
                              recaptchaVersion: 'v3',
                            },
                          },
                        })
                      }
                      className={`p-3.5 rounded-xl border text-right transition ${
                        settings.security.captcha?.recaptchaVersion === 'v3'
                          ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-amber-300">نسخه ۳ - هوشمند و نامرئی (v3 Invisible)</span>
                        {settings.security.captcha?.recaptchaVersion === 'v3' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        هیچ کادر یا چک‌باکسی به کاربر نشان داده نمی‌شود؛ رفتار کاربر خودکار ارزیابی و امتیازدهی می‌شود. (کلیدها باید در پنل گوگل از نوع reCAPTCHA v3 باشند).
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Captcha Connection Test Section */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block">تست اتصال و سلامت کلیدهای کپچا:</span>
                    <span className="text-[11px] text-slate-400">
                      اعتبارسنجی زنده برقراری ارتباط با سرور گوگل و صحت کلید محرمانه (Secret Key).
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestCaptcha()}
                    disabled={testingCaptcha}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-semibold text-xs transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingCaptcha ? 'animate-spin' : ''}`} />
                    <span>{testingCaptcha ? 'در حال تست ارتباط...' : 'تست اتصال کپچا'}</span>
                  </button>
                </div>

                {captchaTestResult && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs animate-in fade-in ${
                      captchaTestResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {captchaTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className={captchaTestResult.success ? 'text-emerald-300' : 'text-rose-300'}>
                            {captchaTestResult.success ? 'نتیجه تست: ارتباط موفق و کلید معتبر است' : 'نتیجه تست: خطا در اعتبارسنجی'}
                          </span>
                          {typeof captchaTestResult.latencyMs === 'number' && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                              {captchaTestResult.latencyMs}ms
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-200">
                          {captchaTestResult.message || captchaTestResult.error}
                        </p>
                        {captchaTestResult.score !== undefined && (
                          <div className="text-[11px] text-emerald-400 font-mono pt-0.5">
                            امتیاز امنیتی گوگل: {captchaTestResult.score} / 1.0
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Preview Box for Admin */}
                {settings.security.captcha?.provider === 'recaptcha' && settings.security.captcha?.siteKey && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-semibold text-white">پیش‌نمایش زنده در پنل مدیریت:</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {settings.security.captcha?.recaptchaVersion === 'v3' ? 'reCAPTCHA v3' : 'reCAPTCHA v2 Checkbox'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {settings.security.captcha?.recaptchaVersion === 'v3'
                        ? 'در نسخه ۳، اعتبارسنجی خودکار انجام می‌پذیرد. با کلیک بر دکمه تست، توکن واقعی به سرور ارسال و امتیاز ریسک سنجیده می‌شود.'
                        : 'برای تست زنده، روی چک‌باکس من ربات نیستم کلیک فرمایید؛ با تیک سبز، توکن زنده در سرور گوگل ارزیابی خواهد شد.'}
                    </p>
                    <div className="flex justify-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                      <CaptchaWidget
                        action="login"
                        onTokenChange={(tok) => {
                          if (tok && tok !== 'math_passed' && tok !== 'math_verified_ok') {
                            handleTestCaptcha(tok);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.captcha?.requiredForRegister ?? true}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          captcha: {
                            ...(settings.security.captcha || {
                              enabled: false,
                              provider: 'math',
                              siteKey: '',
                              secretKey: '',
                              requiredForLogin: false,
                            }),
                            requiredForRegister: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded accent-amber-500 w-3.5 h-3.5"
                  />
                  <span>الزام حل کپچا هنگام ثبت‌نام و دریافت کد پیامکی</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.captcha?.requiredForLogin || false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          captcha: {
                            ...(settings.security.captcha || {
                              enabled: false,
                              provider: 'math',
                              siteKey: '',
                              secretKey: '',
                              requiredForRegister: true,
                            }),
                            requiredForLogin: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded accent-amber-500 w-3.5 h-3.5"
                  />
                  <span>الزام حل کپچا در ورود با رمز عبور</span>
                </label>
              </div>
            </div>

            {/* Google OAuth 2.0 Configuration Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">تنظیمات ورود سریع با حساب گوگل (Google OAuth 2.0 Sign-In)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">احراز هویت واقعی و رسمی جیمیل از طریق پنجره پاپ‌آپ گوگل با توکن اختصاصی</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.security.googleOAuth?.enabled || false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          googleOAuth: {
                            clientId: settings.security.googleOAuth?.clientId || '',
                            clientSecret: settings.security.googleOAuth?.clientSecret || '',
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <span className="text-xs text-amber-300 font-bold">فعال‌سازی ورود با گوگل</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    شناسه کلاینت گوگل (Google Client ID):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    value={settings.security.googleOAuth?.clientId || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          googleOAuth: {
                            clientId: e.target.value.trim(),
                            clientSecret: settings.security.googleOAuth?.clientSecret || '',
                            enabled: settings.security.googleOAuth?.enabled || false,
                          },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    کلید محرمانه کلاینت (Google Client Secret):
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.security.googleOAuth?.clientSecret || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          googleOAuth: {
                            clientId: settings.security.googleOAuth?.clientId || '',
                            clientSecret: e.target.value.trim(),
                            enabled: settings.security.googleOAuth?.enabled || false,
                          },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Authorized Redirect URI copy box */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    آدرس بازگشت تایید هویت (Authorized redirect URI):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const redirectUrl = `${window.location.origin}/auth/callback`;
                      navigator.clipboard.writeText(redirectUrl);
                      setCopiedOAuthUri(true);
                      setTimeout(() => setCopiedOAuthUri(false), 3000);
                    }}
                    className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition"
                  >
                    {copiedOAuthUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOAuthUri ? 'کپی شد!' : 'کپی آدرس بازگشت'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300 break-all select-all text-left" dir="ltr">
                  {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://gaiafa.ir/auth/callback'}
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
                  <p>
                    📌 <strong className="text-slate-300">راهنمای راه‌اندازی سریع در کنسول گوگل:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pr-1">
                    <li>وارد کنسول <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-mono">Google Cloud Console</a> شوید.</li>
                    <li>در بخش <strong className="text-slate-300">Credentials</strong> روی دکمه <strong className="text-slate-300">+ Create Credentials</strong> و سپس <strong className="text-slate-300">OAuth client ID</strong> کلیک کنید.</li>
                    <li>نوع برنامه را <strong className="text-slate-300">Web application</strong> انتخاب کنید.</li>
                    <li>در بخش <strong className="text-slate-300">Authorized JavaScript origins</strong> آدرس دامنه سایت‌تان (<code className="text-amber-300 font-mono text-[10px]">{typeof window !== 'undefined' ? window.location.origin : 'https://gaiafa.ir'}</code>) را وارد کنید.</li>
                    <li>در بخش <strong className="text-slate-300">Authorized redirect URIs</strong> آدرس بازگشت فوق را کپی و اضافه کنید.</li>
                    <li>مقادیر Client ID و Client Secret حاصله را در کادرهای بالا قرار داده و روی دکمه <strong className="text-amber-400">ذخیره تنظیمات امنیتی</strong> در بالای صفحه کلیک نمایید.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Coupons & Promo Codes Manager */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-white">مدیریت کدهای تخفیف و شارژ هدیه کیف پول</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">{coupons.length} کد فعال</span>
              </div>

              {/* Create new coupon form */}
              <form onSubmit={handleCreateCoupon} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">کد تخفیف (لاتین):</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NOROOZ1405"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">مبلغ شارژ هدیه (تومان):</label>
                  <input
                    type="number"
                    value={newCouponCredit}
                    onChange={(e) => setNewCouponCredit(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">حداکثر دفعات استفاده:</label>
                  <input
                    type="number"
                    value={newCouponMaxUses}
                    onChange={(e) => setNewCouponMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت کد تخفیف جدید</span>
                </button>
              </form>

              {/* Coupons list */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">کد</th>
                      <th className="pb-2">نوع جایزه</th>
                      <th className="pb-2">مصرف شده</th>
                      <th className="pb-2">سقف مجاز</th>
                      <th className="pb-2 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">کد تخفیفی تعریف نشده است.</td>
                      </tr>
                    ) : (
                      coupons.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-850">
                          <td className="py-2.5 font-mono text-amber-300 font-bold">{c.code}</td>
                          <td className="py-2.5 text-emerald-400">
                            {c.creditBonus > 0 ? `${c.creditBonus.toLocaleString('en-US')} تومان هدیه` : `${c.discountPercent}% تخفیف`}
                          </td>
                          <td className="py-2.5 font-mono text-slate-300">{c.timesUsed}</td>
                          <td className="py-2.5 font-mono text-slate-400">{c.maxUses}</td>
                          <td className="py-2.5 text-center">
                            <button
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
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

            {/* Database Backup & Restore Center */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
                    <Database className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">مرکز پشتیبان‌گیری و بازیابی پایگاه داده (JSON Backup & Restore)</h3>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                        نسخه ۲.۰ آفلاین
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      دانلود مستقیم فایل کامل پایگاه داده در مرورگر یا بازیابی و ایمپورت اطلاعات از روی فایل‌های پشتیبان قبلی
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Action 1: Direct Download in Browser */}
                <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>دانلود مستقیم فایل پشتیبان در مرورگر</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      دریافت آنی فایل JSON شامل کاربران، کتاب‌ها، چانک‌های ترجمه‌شده، سوابق مالی، کوپن‌ها و تنظیمات روی کامپیوتر شما.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isDownloadingBackup}
                    className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/10 disabled:opacity-50"
                  >
                    {isDownloadingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{isDownloadingBackup ? 'در حال آماده‌سازی و دانلود فایل...' : 'دانلود فایل پشتیبان (JSON)'}</span>
                  </button>
                </div>

                {/* Action 2: Import & Restore Backup */}
                <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>ایمپورت و بازیابی فایل پشتیبان (Restore)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      انتخاب فایل پشتیبان JSON برای بازگردانی و ادغام امن کتاب‌ها، کاربران و تنظیمات در پایگاه داده سرور.
                    </p>
                  </div>
                  <div>
                    <label className="w-full px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/10 cursor-pointer text-center">
                      {isImportingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>{isImportingBackup ? 'در حال بازیابی اطلاعات روی سرور...' : 'انتخاب فایل JSON و بازیابی'}</span>
                      <input
                        key={backupFileInputKey}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileUploadForRestore}
                        disabled={isImportingBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: DEDICATED ALL-IN-ONE GUIDES & KNOWLEDGE BASE */}
        {/* ========================================================= */}
        {activeTab === 'guides' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Guide Header Banner */}
            <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-950/30 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 shadow-lg shadow-amber-500/10">
                    <HelpCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <span>مرکز جامع راهنما و دانش‌نامه عملیاتی سامانه</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-mono">
                        دستورالعمل‌های استاندارد
                      </span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      کلیه راهنماها، دستورالعمل‌های مدیریتی، نکات کلیدی و آموزش بخش‌های سامانه به تفکیک موضوع در این بخش جمع‌آوری شده‌اند.
                    </p>
                  </div>
                </div>

                {/* Quick Search */}
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    value={guideSearchQuery}
                    onChange={(e) => setGuideSearchQuery(e.target.value)}
                    placeholder="جستجو در متن یا عنوان راهنماها..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  {guideSearchQuery && (
                    <button
                      onClick={() => setGuideSearchQuery('')}
                      className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                <span className="text-slate-400 font-semibold text-[11px] shrink-0 ml-1">دسته‌بندی:</span>
                {[
                  { id: 'all', label: 'همه بخش‌ها (۱۱ راهنما)' },
                  { id: 'analytics', label: '📊 داشبورد و آمار' },
                  { id: 'books', label: '📚 کتاب‌ها و ترجمه' },
                  { id: 'users', label: '👤 کاربران و تعرفه' },
                  { id: 'ai', label: '⚡ هوش مصنوعی و سرور' },
                  { id: 'finance', label: '💳 مالی و درگاه‌ها' },
                  { id: 'cms', label: '🎨 صفحه‌ساز و سئو' },
                  { id: 'security', label: '🔒 امنیت و پیامک' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setGuideActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all font-semibold shrink-0 ${
                      guideActiveCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guides Cards List */}
            <div className="space-y-4">
              {[
                {
                  id: 'overview_guide',
                  category: 'analytics',
                  categoryLabel: 'داشبورد و آمار',
                  badge: 'نمای کلی سیستم',
                  badgeColor: 'emerald',
                  targetTab: 'overview' as AdminTab,
                  targetTabLabel: 'رفتن به پیشخوان زنده',
                  title: 'داشبورد جامع، درآمد، ترافیک و صف پردازش ابری',
                  description: 'این بخش خلاصه زنده‌ای از درآمد تجمیعی، تعداد کاربران، کل کلمات ترجمه شده و وضعیت پردازش‌های جاری سرور را نمایش می‌دهد.',
                  bullets: [
                    { title: 'پردازش مستقل ابری', text: 'کارهای ترجمه در صف پس‌زمینه سرور اجرا می‌شوند. هیچ کاربری نیازی به باز نگه داشتن تب مرورگر یا تهیه API Key ندارد.' },
                    { title: 'محاسبه شفاف درآمد', text: 'درآمد کل بر اساس شارژهای موفق کیف پول از طریق درگاه‌های پرداخت متصل (زرین‌پال، نکست‌پی و ...) محاسبه می‌گردد.' },
                    { title: 'تحلیل ماهیانه توکن و کلمات', text: 'نمودار تفکیکی مصرف مدل‌های مختلف و درآمد هر ماه میلادی/شمسی در پایین همان صفحه در دسترس است.' },
                    { title: 'بروزرسانی لحظه‌ای', text: 'با کلیک روی دکمه بروزرسانی، آخرین تغییرات پایگاه داده سرور بدون نیاز به رفرش کل مرورگر لود می‌شود.' },
                  ],
                  tip: 'راهنمایی سریع: اگر پردازش‌های زیادی در صف مانده‌اند، به تب «استخر کلیدهای هوش مصنوعی» بروید و کلیدهای پرسرعت فعال بیشتری اضافه کنید.',
                },
                {
                  id: 'daily_revenue_guide',
                  category: 'finance',
                  categoryLabel: 'مالی و درآمد',
                  badge: 'گزارش مالی تفکیکی',
                  badgeColor: 'emerald',
                  targetTab: 'daily_revenue' as AdminTab,
                  targetTabLabel: 'رفتن به درآمد روزانه',
                  title: 'گزارش مالی و درآمد روزانه، تراکنش‌ها و صندوق فروش',
                  description: 'مشاهده دقیق درآمد روز به روز سیستم به تفکیک تراکنش‌های شتابی درگاه‌ها، شارژهای دستی و مقایسه روند فروش در بازه‌های زمانی مختلف.',
                  bullets: [
                    { title: 'تفکیک روزانه درآمد', text: 'محاسبه درآمد هر روز به صورت تفکیک‌شده و نمایش نموداری جهت ارزیابی کمپین‌های فروش.' },
                    { title: 'فیلتر بر اساس بازه زمانی', text: 'امکان مشاهده درآمد ۷ روز اخیر، ۳۰ روز گذشته، فصل جاری یا کل تاریخچه پلتفرم.' },
                    { title: 'شفافیت تراکنش‌ها', text: 'کد رهگیری، مرجع پرداخت، شناسه کاربر و زمان دقیق هر تراکنش ثبت و قابل استعلام است.' },
                    { title: 'صندوق ذخیره اعتبار', text: 'نظارت بر تعهدات مالی و کارهای در دست ترجمه متناسب با مانده کیف پول کاربران.' },
                  ],
                  tip: 'نکته: گزارش‌های مالی روزانه به شما کمک می‌کند روزهای اوج سفارش را شناسایی کرده و تبلیغات خود را برای آن روزها متمرکز کنید.',
                },
                {
                  id: 'completed_books_guide',
                  category: 'books',
                  categoryLabel: 'کتاب‌ها و ترجمه',
                  badge: 'کتابخانه خروجی',
                  badgeColor: 'emerald',
                  targetTab: 'completed_books' as AdminTab,
                  targetTabLabel: 'رفتن به کتاب‌های تکمیل‌شده',
                  title: 'آرشیو کتاب‌های تکمیل‌شده کاربران و خروجی چندگانه',
                  description: 'در این بخش کلیه کتاب‌هایی که فرآیند ترجمه آنها با موفقیت به پایان رسیده است نگهداری می‌شوند. مدیر سامانه می‌تواند کتاب‌ها را مستقیماً در مرورگر مطالعه کرده یا با انواع فرمت‌های چاپی و دیجیتال دانلود نماید.',
                  bullets: [
                    { title: 'مطالعه مستقیم در مرورگر', text: 'با زدن دکمه «مطالعه مستقیم»، متن کامل و فصول کتاب با قابلیت تنظیم اندازه فونت باز می‌شود.' },
                    { title: 'خروجی Word و HTML کتابخوان', text: 'امکان دانلود فایل DOCX استاندارد با استایل‌بندی راست‌به‌چپ یا پکیج وب HTML سبک برای مطالعه آفلاین.' },
                    { title: 'چاپ مستقیم و PDF', text: 'تولید نسخه بهینه‌سازی‌شده برای پرینتر با صفحه‌بندی منظم فصول کتاب بدون نیاز به نرم‌افزار جانبی.' },
                    { title: 'جستجو در آرشیو', text: 'یافتن سریع کتاب‌ها بر اساس نام فارسی، نام زبان اصلی، نویسنده یا نام کاربر سفارش‌دهنده.' },
                  ],
                  tip: 'نکته: خروجی‌های تولید شده کاملاً مستقل هستند و کاربران نیز در پنل کاربری خود امکان دریافت همین فایل‌ها را دارند.',
                },
                {
                  id: 'all_books_guide',
                  category: 'books',
                  categoryLabel: 'کتاب‌ها و ترجمه',
                  badge: 'نظارت بر محتوا',
                  badgeColor: 'amber',
                  targetTab: 'all_books' as AdminTab,
                  targetTabLabel: 'رفتن به کل کتاب‌ها',
                  title: 'نظارت سراسری، بازرسی محتوا و پروژه‌های کتاب',
                  description: 'این بخش دید جامعی از کلیه کتاب‌های ثبت شده در کل پلتفرم ارائه می‌دهد؛ چه در حال ترجمه باشند، چه در مرحله پیش‌نویس یا تکمیل شده.',
                  bullets: [
                    { title: 'محاسبه هزینه و کلمات', text: 'مشاهده تعداد دقیق کلمات هر کتاب و مبلغ محاسبه شده که از کاربر دریافت شده است.' },
                    { title: 'نظارت بر روند پیشرفت', text: 'مشاهده تعداد بخش‌ها (چانک‌ها) ی تکمیل شده در برابر کل بخش‌های کتاب به همراه درصد پیشرفت زنده.' },
                    { title: 'مدیریت و حذف پروژه‌های غیرمجاز', text: 'در صورت آپلود محتوای نامناسب، مدیر ارشد می‌تواند پروژه را به همراه تمام چانک‌های آن از دیتابیس حذف نماید.' },
                    { title: 'ارتباط مستقیم با کاربر', text: 'شماره تلفن و ایمیل سفارش‌دهنده هر کتاب در دسترس است تا در صورت لزوم بتوانید با او تماس بگیرید.' },
                  ],
                  tip: 'راهنمایی: کتاب‌هایی که وضعیت آنها «در حال ترجمه» است هم‌اکنون در صف سرور به ترتیب اولویت و بدون نیاز به حضور کاربر در حال پردازش هستند.',
                },
                {
                  id: 'users_guide',
                  category: 'users',
                  categoryLabel: 'کاربران و تعرفه',
                  badge: 'کاربران و مشتریان',
                  badgeColor: 'blue',
                  targetTab: 'users' as AdminTab,
                  targetTabLabel: 'رفتن به بخش کاربران',
                  title: 'مدیریت جامع کاربران، نقش‌ها و کنترل اعتبار کیف پول و نرخ اختصاصی',
                  description: 'در این بخش لیست کامل حساب‌های کاربری، شماره‌های تماس، اعتبار باقی‌مانده و کتاب‌های هر کاربر ثبت است. شما می‌توانید به هر کاربر شارژ هدیه اهدا کنید، دسترسی او را مسدود یا به مدیر ارشد یا ناشر ارتقا دهید.',
                  bullets: [
                    { title: 'تعیین نرخ اختصاصی هر کلمه', text: 'برای مشتریان خاص، انتشارات همکار یا ناشران می‌توانید نرخ تخفیفی یا ثابت جداگانه تعیین کنید.' },
                    { title: 'شارژ مستقیم و هدیه سریع', text: 'با دکمه‌های هدیه (+۵۰ و +۱۰۰ هزار تومان) می‌توانید فوراً بدون فرم‌های طولانی به کیف پول کاربر اعتبار اضافه کنید.' },
                    { title: 'تفکیک دسترسی پرسنل و مدیران', text: 'کارمندان به کارهای عملیاتی و کاربران دسترسی دارند اما آمار درآمدهای کل برای آنها پنهان است.' },
                    { title: 'بازرسی کتاب‌های اختصاصی کاربر', text: 'با کلیک روی دکمه «مشاهده کتاب‌ها»، تمام پروژه‌ها، وضعیت ترجمه و کلمات ترجمه شده توسط آن کاربر به نمایش درمی‌آید.' },
                  ],
                  tip: 'راهنمایی: موجودی کیف پول کاربر برای کسر هزینه ترجمه هر چانک استفاده می‌شود؛ هر زمان موجودی کاربر صفر شود، سیستم به او هشدار افزایش اعتبار می‌دهد.',
                },
                {
                  id: 'coupons_guide',
                  category: 'finance',
                  categoryLabel: 'مالی و درآمد',
                  badge: 'کمپین و بازاریابی',
                  badgeColor: 'emerald',
                  targetTab: 'coupons' as AdminTab,
                  targetTabLabel: 'رفتن به کدهای تخفیف',
                  title: 'مدیریت کدهای تخفیف، بن‌های اعتباری و تشویقی',
                  description: 'در این بخش می‌توانید کدهای تخفیف متنوع برای افزایش فروش و جذب کاربران و ناشران جدید تعریف کنید. کدها می‌توانند هم شارژ هدیه مستقیم (تومان) به کیف پول کاربر اضافه کنند و هم درصد تخفیف روی فاکتور ترجمه اعمال کنند.',
                  bullets: [
                    { title: 'شارژ هدیه کیف پول (Credit Bonus)', text: 'مبلغ نقدی مشخصی (مثلاً ۵۰,۰۰۰ تومان) که به محض ثبت کد توسط کاربر به موجودی او افزوده می‌شود.' },
                    { title: 'تخفیف درصدی (Discount Percent)', text: 'درصد کسر از کل هزینه ترجمه کتاب (مثلاً ۲۰٪ تخفیف برای سفارش اول).' },
                    { title: 'سقف دفعات استفاده (Max Uses)', text: 'حداکثر دفعاتی که این کد در کل سیستم توسط کاربران مختلف قابل فعال‌سازی است.' },
                    { title: 'کپی سریع کد', text: 'با یک کلیک روی متن کد، به کلیپ‌بورد کپی می‌شود تا بتوانید آن را در پیامک یا شبکه‌های اجتماعی برای کاربران ارسال کنید.' },
                  ],
                  tip: 'راهنمایی پرسنل: کدهای تبلیغاتی مانند NOWRUZ یا FIRST-BOOK برای ترغیب کاربران به ترجمه اولین کتاب بسیار اثربخش هستند.',
                },
                {
                  id: 'api_pool_guide',
                  category: 'ai',
                  categoryLabel: 'هوش مصنوعی و سرور',
                  badge: 'پردازش ۱۰۰٪ سمت سرور',
                  badgeColor: 'amber',
                  targetTab: 'api_pool' as AdminTab,
                  targetTabLabel: 'رفتن به استخر کلیدها',
                  title: 'استخر مرکزی کلیدهای هوش مصنوعی و صف پس‌زمینه سرور (مستقل از مرورگر)',
                  description: 'کلیه کلیدها و مدل‌های هوش مصنوعی مستقیماً روی سرور سیستم ذخیره و مدیریت می‌شوند. کاربران برای ترجمه نیازی به تهیه کلید، وارد کردن API Key یا باز نگه‌داشتن مرورگر خود ندارند. با شروع ترجمه، صف سرور به صورت خودکار کار را به پایان می‌رساند.',
                  bullets: [
                    { title: 'امکان ویرایش کامل هر کلید', text: 'شما می‌توانید در هر زمان نام، توکن API، مدل انتخابی، آدرس پایه (Base URL پروکسی) یا اولویت هر کلید را در سرور ویرایش کنید.' },
                    { title: 'ذخیره امن روی سرور و استقلال کاربر', text: 'کاربران بدون نیاز به وارد کردن هیچ کلیدی کتاب خود را بارگذاری می‌کنند و سرور کار ترجمه را مستقل پیش می‌برد.' },
                    { title: 'تحمل خطا و سوئیچ خودکار (Failover)', text: 'اگر کلیدی با محدودیت نرخ (۴۲۹) یا خطای شبکه مواجه شود، درخواست بدون وقفه به کلید فعال بعدی منتقل می‌گردد.' },
                    { title: 'تست پینگ همزمان کلیدها', text: 'با یک کلیک سرعت تاخیر پاسخگویی (Latency) و سلامت تمامی کلیدهای موجود در استخر به صورت موازی ارزیابی می‌شود.' },
                  ],
                  tip: 'نکته مهم: برای سرعت و اطمینان حداکثری، همواره ۲ الی ۳ کلید از مدل‌های پرسرعت مانند Gemini 3.8 Flash یا MiniMax/GLM را در استخر فعال نگه دارید.',
                },
                {
                  id: 'finance_guide',
                  category: 'finance',
                  categoryLabel: 'مالی و درآمد',
                  badge: 'مالی و درگاه‌ها',
                  badgeColor: 'emerald',
                  targetTab: 'finance' as AdminTab,
                  targetTabLabel: 'رفتن به تنظیمات مالی',
                  title: 'امور مالی، درگاه‌های پرداخت اینترنتی و تعرفه کلمه‌ای',
                  description: 'در این بخش نرخ ترجمه بر مبنای کلمات، ضریب متون تخصصی، کد تخفیف‌ها و اتصال به درگاه‌های پرداخت شتابی (زرین‌پال، نکست‌پی، آیدی‌پی، پی‌پینگ یا شبیه‌ساز تست) تنظیم می‌شود.',
                  bullets: [
                    { title: 'نرخ پایه به ازای هر کلمه', text: 'مبلغی که به ازای ترجمه هر کلمه کتاب از کیف پول کاربر کسر می‌شود (مثلاً ۴۵ تومان برای هر کلمه).' },
                    { title: 'ضریب متون فوق‌تخصصی', text: 'ضریب افزایش قیمت برای کتاب‌های علمی، پزشکی، فلسفی یا دانشگاهی سنگین (مثلاً ۱.۳ برابر).' },
                    { title: 'اتصال آسان درگاه‌های بانکی', text: 'تنها با وارد کردن مرچنت‌کد (Merchant ID) یا API Key زرین‌پال و نکست‌پی، درگاه پرداخت شاپرک فعال خواهد شد.' },
                    { title: 'شبیه‌ساز پرداخت (Sandbox)', text: 'امکان تست کامل گردش مالی و شارژ کیف پول بدون اتصال به بانکی واقعی در محیط تست.' },
                  ],
                  tip: 'نکته توسعه‌دهندگان: برای تست کامل فرآیند خرید بدون پرداخت وجه واقعی، درگاه پرداخت را روی حالت Sandbox یا شبیه‌ساز قرار دهید.',
                },
                {
                  id: 'cms_pages_guide',
                  category: 'cms',
                  categoryLabel: 'صفحه‌ساز و سئو',
                  badge: 'مدیریت محتوا و قالب',
                  badgeColor: 'purple',
                  targetTab: 'page_builder' as AdminTab,
                  targetTabLabel: 'رفتن به صفحه‌ساز HTML',
                  title: 'صفحه‌ساز اختصاصی HTML، طراحی هدر و فوتر و مدیریت لندینگ',
                  description: 'طراحی آسان صفحات مجزا مانند «درباره ما»، «تعرفه‌ها»، «قوانین»، یا «راهنمای چاپ کتاب» با آدرس‌دهی مستقیم (مثل /page/about-us) بدون نیاز به کدنویسی در هسته برنامه.',
                  bullets: [
                    { title: 'ساخت صفحات با URL تمیز', text: 'تعیین نام پیوند یکتا (Slug) اختصاصی برای هر صفحه که مستقیماً در مرورگر باز می‌شود.' },
                    { title: 'طراحی آزاد هدر و فوتر', text: 'امکان درج کدهای HTML سفارشی، شماره تماس، نماد اعتماد الکترونیکی (اینماد) و شبکه‌های اجتماعی در سراسر سایت.' },
                    { title: 'محتوای صفحه نخست (Landing CMS)', text: 'تغییر عنوان‌ها، بنرها، متون معرفی و تضمین‌های صفحه اصلی از طریق تب محتوای لندینگ.' },
                  ],
                  tip: 'راهنمایی: صفحاتی که در صفحه‌ساز می‌سازید، در گوگل نیز ایندکس می‌شوند و می‌توانید برای هر کدام عنوان سئو و توضیحات اختصاصی قرار دهید.',
                },
                {
                  id: 'seo_guide',
                  category: 'cms',
                  categoryLabel: 'صفحه‌ساز و سئو',
                  badge: 'سئو و برندینگ',
                  badgeColor: 'blue',
                  targetTab: 'seo' as AdminTab,
                  targetTabLabel: 'رفتن به تنظیمات سئو',
                  title: 'بهینه‌سازی سئو (SEO)، عنوان و متاتگ‌های گوگل و شبکه‌های اجتماعی',
                  description: 'تنظیم متادیتاهای موتورهای جستجو، کارت‌های اشتراک‌گذاری تلگرام، توییتر و واتساپ (OpenGraph) و اسکریپت‌های تحلیلی مانند گوگل آنالیتیکس.',
                  bullets: [
                    { title: 'عنوان و توضیحات سایت', text: 'تنظیم تگ Title و Meta Description که در نتایج جستجوی گوگل نمایش داده می‌شود.' },
                    { title: 'کارت‌های OpenGraph', text: 'نمایش پیش‌نمایش گرافیکی زیبا به همراه لوگو و عنوان به هنگام ارسال لینک سایت در تلگرام، واتساپ یا شبکه‌های اجتماعی.' },
                    { title: 'کدهای تاییدیه وب‌مستر', text: 'درج آسان متاتگ تایید مالکیت گوگل سرچ کنسول (Google Search Console).' },
                  ],
                  tip: 'نکته: متن متای سایت را با کلمات کلیدی نظیر «ترجمه تخصصی کتاب»، «هوش مصنوعی ترجمه رمان» و «خروجی Word و PDF» غنی کنید.',
                },
                {
                  id: 'security_guide',
                  category: 'security',
                  categoryLabel: 'امنیت و پیامک',
                  badge: 'امنیت و زیرساخت',
                  badgeColor: 'rose',
                  targetTab: 'security' as AdminTab,
                  targetTabLabel: 'رفتن به تنظیمات امنیت',
                  title: 'امنیت سرور، احراز هویت پیامکی OTP، سشن‌ها و پشتیبان‌گیری دیتابیس',
                  description: 'در این بخش کنترل پنل پیامک OTP (ملی‌پیامک، کاوه‌نگار، SMS.ir)، محافظت در برابر حملات بروت‌فورس، حالت تعمیر و نگهداری سایت و دریافت فایل پشتیبان دیتابیس JSON قرار دارد.',
                  bullets: [
                    { title: 'پنل ارسال پیامک OTP', text: 'تنظیم کلید API و خط ارسال پیامک برای ورود و ثبت‌نام سریع کاربران با کد تایید یکبار مصرف.' },
                    { title: 'حالت تعمیر و نگهداری (Maintenance)', text: 'در زمان ارتقای سرور یا به‌روزرسانی‌های اساسی، سایت را برای کاربران عادی موقتاً مسدود کنید در حالی که مدیران دسترسی دارند.' },
                    { title: 'پشتیبان‌گیری کامل پایگاه داده', text: 'در پایین همان بخش می‌توانید با یک کلیک فایل کامل پایگاه داده (database.json) را به همراه کلیه پروژه‌ها و تراکنش‌ها دانلود نمایید.' },
                    { title: 'تست پیامک زنده', text: 'امکان تست ارسال آنی پیامک تستی به شماره موبایل دلخواه برای اطمینان از سلامت پنل پیامکی.' },
                  ],
                  tip: 'نکته امنیتی: در محیط عملیاتی، کلیدهای دسترسی پیامک و درگاه را به هیچ عنوان در اختیار افراد نامعتبر قرار ندهید.',
                },
              ]
                .filter((guide) => {
                  if (guideActiveCategory !== 'all' && guide.category !== guideActiveCategory) {
                    return false;
                  }
                  if (!guideSearchQuery.trim()) return true;
                  const q = guideSearchQuery.toLowerCase();
                  return (
                    guide.title.toLowerCase().includes(q) ||
                    guide.description.toLowerCase().includes(q) ||
                    guide.bullets.some((b) => b.title.toLowerCase().includes(q) || b.text.toLowerCase().includes(q))
                  );
                })
                .map((guide) => (
                  <div
                    key={guide.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                          <BookOpen className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-white">{guide.title}</h3>
                            <span className="text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full">
                              {guide.badge}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({guide.categoryLabel})
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab(guide.targetTab)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-400 flex items-center justify-center gap-1.5 transition shadow-sm shrink-0"
                      >
                        <span>{guide.targetTabLabel}</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {guide.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                      {guide.bullets.map((b, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 flex items-start gap-2.5 text-xs"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <div>
                            <strong className="text-amber-300 font-bold block mb-0.5">{b.title}</strong>
                            <span className="text-slate-300 text-[11px] leading-relaxed">{b.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {guide.tip && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-200">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed text-[11px] font-medium">{guide.tip}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: BLOG & ARTICLES MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'blog_manager' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">مدیریت وبلاگ و تولید محتوا (سئو)</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    {blogPosts.length} مقاله
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  تولید و انتشار منظم مقالات تخصصی توسط پرسنل و مدیران جهت ارتقای رتبه گوگل (SEO)، جذب ناشران و مترجمان
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/blog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                  <span>مشاهده وبلاگ زنده</span>
                </a>
                <button
                  type="button"
                  onClick={() => setCategoryModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <span>دسته‌بندی‌ها ({blogCategories.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartCreatePost}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>نوشتن مقاله جدید</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex-1 w-full sm:w-auto relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو در عنوان، پیوند، متن یا برچسب‌های مقالات..."
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={blogCategoryFilter}
                  onChange={(e) => setBlogCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">همه دسته‌بندی‌ها</option>
                  {blogCategories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchBlogPosts}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  title="بروزرسانی لیست"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBlog ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-3.5 px-4">عنوان مقاله</th>
                      <th className="py-3.5 px-4">دسته‌بندی</th>
                      <th className="py-3.5 px-4">نویسنده</th>
                      <th className="py-3.5 px-4 text-center">زمان مطالعه</th>
                      <th className="py-3.5 px-4 text-center">بازدید</th>
                      <th className="py-3.5 px-4 text-center">وضعیت انتشار</th>
                      <th className="py-3.5 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {blogPosts
                      .filter((p) => {
                        if (blogCategoryFilter !== 'all' && p.categorySlug !== blogCategoryFilter && p.category !== blogCategoryFilter) {
                          return false;
                        }
                        if (!blogSearch.trim()) return true;
                        const s = blogSearch.toLowerCase();
                        return (
                          p.title?.toLowerCase().includes(s) ||
                          p.slug?.toLowerCase().includes(s) ||
                          p.excerpt?.toLowerCase().includes(s) ||
                          (p.tags && p.tags.some((t) => t.toLowerCase().includes(s)))
                        );
                      })
                      .map((post) => (
                        <tr key={post.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {post.coverImage ? (
                                <img
                                  src={post.coverImage}
                                  alt={post.title}
                                  className="w-12 h-9 rounded-lg object-cover bg-slate-950 shrink-0 border border-slate-800"
                                />
                              ) : (
                                <div className="w-12 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white text-sm line-clamp-1">{post.title}</div>
                                <div className="text-[11px] text-amber-400/90 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                                  <Globe className="w-3 h-3" />
                                  <span>/blog/{post.slug}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                              {post.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-200">{post.authorName}</div>
                            <div className="text-[10px] text-slate-500">{post.authorRole}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="text-slate-400">{post.readingTimeMinutes || 5} دقیقه</span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-mono text-slate-300">{post.views || 0}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                post.isPublished
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {post.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="مشاهده آنلاین"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleStartEditPost(post)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition"
                                title="ویرایش مقاله"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id, post.title)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                                title="حذف مقاله"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {blogPosts.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  هیچ مقاله‌ای یافت نشد. برای ایجاد نخستین مقاله روی دکمه «نوشتن مقاله جدید» کلیک کنید.
                </div>
              )}
            </div>

            {/* Post Create / Edit Modal */}
            {(isCreatingPost || editPostModal) && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">
                          {editPostModal ? 'ویرایش مقاله وبلاگ' : 'نوشتن مقاله جدید در وبلاگ'}
                        </h3>
                        <p className="text-xs text-slate-400">
                          تنظیم محتوا، دسته‌بندی و متاتگ‌های سئو جهت ایندکس در گوگل
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingPost(false);
                        setEditPostModal(null);
                      }}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePost} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">عنوان مقاله (H1):</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: اصول ترجمه کتاب با هوش مصنوعی"
                          value={postForm.title}
                          onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">پیوند یکتا (Slug انگلیسی یا فارسی):</label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          placeholder="ai-book-translation-guide"
                          value={postForm.slug}
                          onChange={(e) => setPostForm({ ...postForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">دسته‌بندی مقاله:</label>
                        <select
                          value={postForm.category}
                          onChange={(e) => {
                            const cat = blogCategories.find((c) => c.name === e.target.value);
                            setPostForm({
                              ...postForm,
                              category: e.target.value,
                              categorySlug: cat ? cat.slug : 'translation-guides',
                            });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        >
                          {blogCategories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام نویسنده:</label>
                        <input
                          type="text"
                          placeholder="مثال: دکتر علیرضا کاظمی"
                          value={postForm.authorName}
                          onChange={(e) => setPostForm({ ...postForm, authorName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">سمت نویسنده:</label>
                        <input
                          type="text"
                          placeholder="مثال: کارشناس ارشد زبان‌شناسی"
                          value={postForm.authorRole}
                          onChange={(e) => setPostForm({ ...postForm, authorRole: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">تصویر شاخص (Cover Image URL):</label>
                      <input
                        type="url"
                        dir="ltr"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={postForm.coverImage}
                        onChange={(e) => setPostForm({ ...postForm, coverImage: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">چکیده / لید مقاله (Excerpt):</label>
                      <textarea
                        rows={2}
                        placeholder="خلاصه‌ای جذاب در ۱ الی ۲ جمله برای نمایش در کارت‌های وبلاگ و شبکه‌های اجتماعی..."
                        value={postForm.excerpt}
                        onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">محتوای کامل مقاله (HTML / متن ساختاریافته):</label>
                        <span className="text-[11px] text-slate-500">پشتیبانی از تگ‌های p, h2, h3, ul, ol, blockquote, strong</span>
                      </div>
                      <textarea
                        rows={10}
                        required
                        dir="rtl"
                        value={postForm.content}
                        onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                        className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">برچسب‌ها (با کاما جدا کنید):</label>
                        <input
                          type="text"
                          placeholder="ترجمه کتاب, هوش مصنوعی, رمان, ویراستاری"
                          value={postForm.tags}
                          onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">تخمین زمان مطالعه (دقیقه):</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={postForm.readingTimeMinutes}
                          onChange={(e) => setPostForm({ ...postForm, readingTimeMinutes: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* SEO Meta Box */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>تنظیمات اختصاصی سئو و موتورهای جستجو (SEO Metadata)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">عنوان سئو (Meta Title):</label>
                          <input
                            type="text"
                            placeholder="خالی بگذارید تا از عنوان مقاله استفاده شود"
                            value={postForm.metaTitle}
                            onChange={(e) => setPostForm({ ...postForm, metaTitle: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">توضیحات متا (Meta Description):</label>
                          <input
                            type="text"
                            placeholder="خالی بگذارید تا از چکیده استفاده شود"
                            value={postForm.metaDescription}
                            onChange={(e) => setPostForm({ ...postForm, metaDescription: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Publish Toggle */}
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="isPublishedCheck"
                        checked={postForm.isPublished}
                        onChange={(e) => setPostForm({ ...postForm, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-950"
                      />
                      <label htmlFor="isPublishedCheck" className="text-xs font-semibold text-slate-200 cursor-pointer">
                        انتشار عمومی در وبلاگ (در صورت برداشتن تیک، به عنوان پیش‌نویس ذخیره می‌شود)
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingPost(false);
                          setEditPostModal(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingPost}
                        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2"
                      >
                        {isSavingPost ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSavingPost ? 'در حال ذخیره...' : 'ذخیره و انتشار مقاله'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Category Management Modal */}
            {categoryModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-base text-white">مدیریت دسته‌بندی‌های وبلاگ</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategoryModal(false)}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Add Category Form */}
                  <form onSubmit={handleSaveBlogCategory} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-300">افزودن دسته‌بندی جدید:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">نام دسته‌بندی (فارسی):</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: نقد و بررسی کتاب"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">نامک پیوند (Slug انگلیسی):</label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          placeholder="book-reviews"
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">توضیح کوتاه:</label>
                        <input
                          type="text"
                          placeholder="معرفی و نقد آثار برگزیده جهان"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition"
                        >
                          ثبت دسته‌بندی
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Existing Categories List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <div className="text-xs font-bold text-slate-400 pb-1">دسته‌بندی‌های موجود:</div>
                    {blogCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }}></span>
                          <span className="font-bold text-slate-200">{cat.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono" dir="ltr">({cat.slug})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlogCategory(cat.id, cat.name)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                          title="حذف دسته‌بندی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: SCRIPTS INJECTION & GOOGLE SEARCH CONSOLE */}
        {/* ========================================================= */}
        {activeTab === 'scripts_analytics' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">اتصال آمارگیر، سرچ کنسول گوگل و اسکریپت‌های سفارشی</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    Head & Footer Injector
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  تایید فوری مالکیت دامنه در گوگل، اتصال گوگل آنالیتیکس ۴، تگ منیجر و ابزارهای چت آنلاین و ترک کاربر (گفتینو، کریسپ، کلاریتی و یکتانت)
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveScriptsConfig}
                disabled={isSavingScripts}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition"
              >
                {scriptsSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{scriptsSaveSuccess ? 'ذخیره شد!' : 'ذخیره و اعمال فوری اسکریپت‌ها'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveScriptsConfig} className="space-y-6">
              {/* Master Toggle */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">فعال‌سازی تزریق کدهای آمارگیر و اسکریپت‌ها</h3>
                    <p className="text-xs text-slate-400">در صورت غیرفعال بودن، هیچ‌یک از کدهای زیر در خروجی صفحات بارگذاری نخواهند شد.</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scriptsConfig.enabled}
                    onChange={(e) => setScriptsConfig({ ...scriptsConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Google Search Console & Webmaster Tools */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Globe className="w-5 h-5" />
                    <span>تایید مالکیت گوگل سرچ کنسول (Google Search Console Verification)</span>
                  </div>
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    ورود به کنسول سرچ گوگل <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  کد تایید HTML tag سرچ کنسول یا توکن اختصاصی گوگل را در این فیلد وارد کنید. سیستم به صورت خودکار آن را در بخش <code className="text-amber-400 font-mono">&lt;head&gt;</code> قرار می‌دهد:
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">کد تاییدیه یا تگ متای گوگل سرچ کنسول:</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder='مثال: <meta name="google-site-verification" content="abcdef123456" /> یا تنها abcdef123456'
                    value={scriptsConfig.googleSearchConsoleVerification || ''}
                    onChange={(e) => setScriptsConfig({ ...scriptsConfig, googleSearchConsoleVerification: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs focus:border-amber-500 focus:outline-none shadow-inner"
                  />
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    نکته: چه کل تگ <code className="text-slate-400 font-mono">&lt;meta ...&gt;</code> را کپی کنید و چه فقط مقدار داخل <code className="text-slate-400 font-mono">content</code> را، سیستم به صورت کاملاً استاندارد آن را تزریق می‌کند.
                  </div>
                </div>
              </div>

              {/* Google Analytics 4 & Tag Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <BarChart3 className="w-5 h-5" />
                    <span>گوگل آنالیتیکس ۴ (Google Analytics 4 - GA4)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    شناسه سنجش گوگل آنالیتیکس (Measurement ID) را وارد کنید تا کدهای gtag.js به صورت هوشمند لود شوند:
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Measurement ID:</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="G-XXXXXXXXXX"
                      value={scriptsConfig.googleAnalyticsId || ''}
                      onChange={(e) => setScriptsConfig({ ...scriptsConfig, googleAnalyticsId: e.target.value.trim() })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                    <Sliders className="w-5 h-5" />
                    <span>گوگل تگ منیجر (Google Tag Manager - GTM)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    شناسه کانتینر گوگل تگ منیجر را برای مدیریت متمرکز تگ‌ها و ایونت‌های کاربر وارد نمایید:
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">GTM Container ID:</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="GTM-XXXXXXX"
                      value={scriptsConfig.googleTagManagerId || ''}
                      onChange={(e) => setScriptsConfig({ ...scriptsConfig, googleTagManagerId: e.target.value.trim() })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 font-mono text-xs focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Header Code Injection (<head>) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Code className="w-5 h-5" />
                    <span>اسکریپت‌ها و کدهای سفارشی در هدر (&lt;head&gt;)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">مانند یکتانت، مایکروسافت کلاریتی، فونت‌های سفارشی و غیره</span>
                </div>
                <textarea
                  rows={6}
                  dir="ltr"
                  placeholder={`<!-- کدهای دلخواه جاوااسکریپت یا CSS در هدر سایت -->
<script>
  console.log("Custom script loaded");
</script>`}
                  value={scriptsConfig.headerScripts || ''}
                  onChange={(e) => setScriptsConfig({ ...scriptsConfig, headerScripts: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Custom Footer Code Injection (<body> End) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <Code className="w-5 h-5" />
                    <span>اسکریپت‌ها و ابزارک‌های انتهای صفحه (&lt;body&gt; Footer)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">مانند ویجت گفتینو (Goftino)، کریسپ (Crisp) یا رایچت</span>
                </div>
                <textarea
                  rows={6}
                  dir="ltr"
                  placeholder={`<!-- کدهای چت آنلاین یا پیکسلهای ریتارگتینگ -->
<script type="text/javascript">
  !function(){var i="xxxxxx",a=window;/* Goftino / Crisp snippet */ }();
</script>`}
                  value={scriptsConfig.footerScripts || ''}
                  onChange={(e) => setScriptsConfig({ ...scriptsConfig, footerScripts: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-blue-300 font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingScripts}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
                >
                  {scriptsSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{scriptsSaveSuccess ? 'تنظیمات با موفقیت ذخیره شد!' : 'ذخیره کلیه تنظیمات آمارگیر و سرچ کنسول'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
