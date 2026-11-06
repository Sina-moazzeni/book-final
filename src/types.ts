export type ToneId = 'spiritual' | 'novel' | 'self_help' | 'academic' | 'business' | 'aerospace' | 'mathematics' | 'candid_secrets' | 'romance_erotic';

export type UserRole = 'admin' | 'staff' | 'publisher' | 'user';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  walletBalance: number;
  status: 'active' | 'banned';
  createdAt: number;
  lastLoginAt?: number;
  customCostPerWord?: number; // نرخ اختصاصی هر کلمه به تومان برای این کاربر خاص
  discountPercent?: number; // درصد تخفیف ویژه اختصاصی (مثلا ۲۰ درصد)
  organizationName?: string; // نام انتشارات یا موسسه همکار
  notes?: string; // یادداشت پرسنل پشتیبانی یا مدیر
  authProvider?: 'phone' | 'email' | 'google';
  avatarUrl?: string;
  token?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  enName: string;
  flag?: string;
  isDefault?: boolean;
}

export interface TranslationJob {
  id: string;
  bookId: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'stopped';
  totalChunks: number;
  completedChunks: number;
  progressPercent: number;
  currentChunkTitle?: string;
  error?: string;
  assignedKeyMasked?: string;
  startedAt: number;
  completedAt?: number;
  updatedAt: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'charge' | 'refund' | 'admin_gift';
  description: string;
  gateway?: 'zarinpal' | 'zibal' | 'nextpay' | 'idpay' | 'bitpay' | 'stripe' | 'manual';
  status: 'success' | 'pending' | 'failed';
  trackingCode?: string;
  authority?: string;
  cardPan?: string;
  refId?: string | number;
  fee?: number;
  createdAt: number;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseURL?: string;
  isActive: boolean;
  priority: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  todayTokensUsed?: number;
  todayDate?: string;
  todayCostUsd?: number;
  todayCostTomans?: number;
  totalCostUsd?: number;
  totalCostTomans?: number;
  costPerMillionTokens?: number;
  rpmCount: number;
  cooldownUntil: number;
  lastLatencyMs?: number;
  assignedUserId?: string;
}

export interface SystemSettings {
  pricing: {
    costPerWord: number;
    publisherCostPerWord?: number; // نرخ ویژه ناشران (تومان)
    specializedMultiplier: number;
    freeWelcomeGift: number;
    minDepositAmount: number;
  };
  gateways: {
    zarinpal: {
      enabled: boolean;
      merchantId: string;
      isSandbox: boolean;
      currency?: 'IRT' | 'IRR';
      refererDomain?: string;
      callbackDomain?: string;
    };
    bitpay: {
      enabled: boolean;
      apiKey: string;
      name?: string;
    };
    zibal: {
      enabled: boolean;
      merchantId: string;
      isSandbox: boolean;
    };
    nextpay: {
      enabled: boolean;
      apiKey: string;
    };
    idpay: {
      enabled: boolean;
      apiKey: string;
      isSandbox: boolean;
    };
    stripe: {
      enabled: boolean;
      secretKey: string;
    };
  };
  sms: {
    provider: 'melipayamak' | 'kavenegar' | 'farazsms' | 'smsir' | 'mock';
    authMethod: 'credentials' | 'pattern' | 'apikey';
    username?: string;
    password?: string;
    apiKey?: string;
    senderNumber: string;
    bodyId?: string;
    patternCode?: string;
  };
  security: {
    maintenanceMode: boolean;
    maxConcurrentJobs: number;
    sessionExpireHours: number;
    ipBlacklist: string[];
    rateLimitRpm: number;
    captcha?: {
      enabled: boolean;
      provider: 'math' | 'recaptcha' | 'turnstile';
      recaptchaVersion?: 'v2' | 'v3';
      siteKey: string;
      secretKey: string;
      requiredForLogin: boolean;
      requiredForRegister: boolean;
    };
    googleOAuth?: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
    };
  };
  coupons?: Array<{
    id: string;
    code: string;
    creditBonus: number;
    discountPercent: number;
    maxUses: number;
    timesUsed: number;
    isActive: boolean;
    createdAt: number;
  }>;
  headerFooter?: HeaderFooterConfig;
  aiGlossaryConfig?: {
    enabled: boolean;
    maxSampleChars: number;
    maxTerms: number;
    fallbackHeuristicEnabled: boolean;
  };
  announcementBar?: {
    enabled: boolean;
    text: string;
    type: 'info' | 'warning' | 'success' | 'urgent';
    linkUrl?: string;
    linkText?: string;
  };
  seo?: {
    siteTitle: string;
    metaDescription: string;
    metaKeywords: string;
    logoUrl?: string;
    faviconUrl?: string;
    announcementEnabled: boolean;
    announcementText: string;
    robotsTxt?: string;
    customSitemapXml?: string;
    llmsTxt?: string;
    googleClientId?: string;
    googleClientSecret?: string;
  };
  cms: {
    heroTitle: string;
    heroSubtitle: string;
    announcement: string;
    supportPhone: string;
    supportEmail: string;
    features: Array<{ id: string; title: string; description: string; icon: string }>;
    faqs: Array<{ id: string; q: string; a: string }>;
    sections?: LandingSection[];
  };
  keyPoolSettings?: {
    allowAutoSwitchOnTranslationFailure: boolean;
    allowAutoSwitchOnTest: boolean;
    preferredFallbackModel?: string;
  };
  scriptsInjection?: ScriptsInjectionConfig;
}

export interface ScriptsInjectionConfig {
  enabled: boolean;
  googleSearchConsoleVerification?: string; // meta tag or verification token
  googleAnalyticsId?: string; // e.g. G-XXXXXXX
  googleTagManagerId?: string; // e.g. GTM-XXXXXXX
  headerScripts?: string; // scripts for <head>
  footerScripts?: string; // scripts for bottom of <body>
}

export type LandingSectionType =
  | 'hero'
  | 'calculator'
  | 'features'
  | 'tones'
  | 'faq'
  | 'cta'
  | 'custom_html';

export interface LandingSection {
  id: string;
  type: LandingSectionType;
  title: string;
  enabled: boolean;
  order: number;
  data?: {
    badgeText?: string;
    badge?: string;
    title?: string;
    subtitle?: string;
    ctaButtonText?: string;
    calcButtonText?: string;
    discountNote?: string;
    buttonText?: string;
    htmlContent?: string;
    containerClass?: string;
    metrics?: Array<{ value: string; label: string }>;
    items?: any[];
  };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // rich HTML
  category: string;
  categorySlug?: string;
  tags: string[];
  coverImage?: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  readingTimeMinutes: number;
  views: number;
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  publishedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  postsCount?: number;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  htmlContent: string;
  metaDescription?: string;
  isPublished: boolean;
  showInHeader?: boolean;
  showInFooter?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HeaderFooterConfig {
  headerHtml: string;
  footerHtml: string;
  customCss?: string;
  enabled: boolean;
  applyToAllPages: boolean;
  applyToPrint: boolean;
}

export interface MonthlyAnalytics {
  currentMonth: {
    name: string;
    revenue: number;
    booksTranslated: number;
    wordsTranslated: number;
    tokensConsumed: number;
    newUsers: number;
  };
  previousMonth: {
    name: string;
    revenue: number;
    booksTranslated: number;
    wordsTranslated: number;
    tokensConsumed: number;
    newUsers: number;
  };
  growth: {
    revenuePercent: number;
    booksPercent: number;
    wordsPercent: number;
    tokensPercent: number;
    usersPercent: number;
  };
  totals: {
    allTimeRevenue: number;
    allTimeBooks: number;
    allTimeWords: number;
    allTimeTokens: number;
    allTimeUsers: number;
  };
  keyUsageBreakdown: Array<{
    name: string;
    provider: string;
    model: string;
    tokensUsed: number;
    requests: number;
  }>;
}

export interface PricingCalculation {
  words: number;
  baseCost: number;
  totalCost: number;
  discountApplied: number;
  costPerWord: number;
  estimatedChunks: number;
  estimatedMinutes: number;
}


export interface ToneDefinition {
  id: ToneId;
  name: string;
  enLabel: string;
  description: string;
  sampleKeywords: string[];
  systemToneTag: string;
}

export type ProviderType = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'openrouter' | 'glm' | 'minimax' | 'proxy' | 'custom';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  apiKey: string;
  baseURL?: string;
  selectedModel: string;
  availableModels: string[];
  isActive?: boolean;
  lastLatencyMs?: number | null;
  lastTestedAt?: number;
}

export interface APIServerEndpoint {
  id: string;
  name: string;
  providerType: ProviderType;
  baseURL: string;
  apiKey: string;
  model: string;
  isEnabled: boolean;
  priority: number;
  lastLatencyMs?: number | null;
  lastTestedAt?: number;
  status: 'active' | 'cooldown' | 'error';
  errorMessage?: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

export interface ModelOption {
  id: string;
  name: string;
  providerType?: ProviderType;
  recommended?: boolean;
}

export interface GlossaryItem {
  id: string;
  en: string;
  fa: string;
  category?: string;
  note?: string;
}

export interface BookChunk {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  chunkNumber: number;
  englishText: string;
  translatedHtml?: string;
  status: 'idle' | 'queued' | 'translating' | 'completed' | 'error';
  wordCount: number;
  estimatedTokens: number;
  errorMessage?: string;
  keyUsed?: string;
  modelUsed?: string;
  providerUsed?: string;
  serverUsed?: string;
  switchOccurred?: boolean;
  translatedAt?: number;
  hasImages?: boolean;
  imageCount?: number;
  isExcludedFromBook?: boolean; // مستثنی کردن این چانک از خروجی نهایی، کتاب چاپی و PDF
}

export type BookThemeId =
  | 'spiritual'          // معنوی و اشراقی (تذهیب اسلیمی زرین و فیروزه‌ای)
  | 'spiritual_ancient'  // معنوی کهن (پاپیروس عتیق و خط کهن)
  | 'spiritual_azure'    // معنوی آرامش و نیایش (لاجوردی و ماندالای آسمانی)
  | 'novel'              // رمان کلاسیک ادبی (عاجی و زرشکی اشرافی)
  | 'luxury_gold'        // سلطنتی طلاکوب و فاخر (سرمه‌ای شب و طلای اعلا)
  | 'academic'           // دانشگاهی و پژوهشی (نیلی مینیمال و دقیق)
  | 'sage_nature'        // روانشناسی و رشد فردی (سبز مریم‌گلی و آرامش‌بخش)
  | 'minimal_clean';     // سفید چاپی خالص و اقتصادی

export type BackgroundPatternId = 'none' | 'arabesque' | 'geometry' | 'parchment';
export type BorderStyleId = 'ornate_spiritual' | 'double_classic' | 'thin_modern' | 'none';

export type BookTrimSize =
  | 'ruqai'    // قطع رقعی (۱۴.۵ × ۲۱.۵ سانتی‌متر - رمان، ادبیات و عمومی)
  | 'vaziri'   // قطع وزیری (۱۷.۵ × ۲۵ سانتی‌متر - دانشگاهی، علمی، تخصصی)
  | 'rahli'    // قطع رحلی (۲۱ × ۲۹.۷ سانتی‌متر / A4 - نفیس، مصور، مرجع)
  | 'pocket';  // قطع جیبی (۱۱.۵ × ۱۶.۵ سانتی‌متر - همراه و چکیده)

export interface CustomColorPalette {
  headerColor?: string;     // رنگ سربرگ / Running Header
  footerColor?: string;     // رنگ پاورقی و شماره صفحه
  heading1Color?: string;   // رنگ سرتیتر اصلی / فصل‌ها (H1)
  heading2Color?: string;   // رنگ زیرمنوها و تیترهای فرعی (H2)
  heading3Color?: string;   // رنگ بخش‌های فرعی کوچک (H3)
  textColor?: string;       // رنگ متن بدنه
  pageBgColor?: string;     // رنگ پس‌زمینه صفحات
  borderColor?: string;     // رنگ کادر دور صفحه و خطوط جداکننده
  accentColor?: string;     // رنگ کادر نقل‌قول و هایلایت‌ها
}

export interface CoverPageConfig {
  layout?: 'center' | 'right' | 'frame' | 'classic_centered' | 'modern_minimal' | 'framed_spiritual' | 'right_aligned';
  title?: string;
  titleSize?: number; // e.g. 24 - 48 pt
  titleColor?: string;
  subtitle?: string;
  subtitleSize?: number;
  subtitleColor?: string;
  author?: string;
  authorSize?: number;
  authorColor?: string;
  translator?: string;
  publisher?: string;
  editionYear?: string;
  note?: string;
  showMotif?: boolean;
  showDivider?: boolean;
  bgColor?: string;
  borderColor?: string;
}

export interface BookDesignConfig {
  themeId: BookThemeId;
  headerText: string;
  footerText: string;
  showHeader: boolean;
  showFooter: boolean;
  websiteUrl?: string; // e.g. "www.yoursite.com"
  brandName?: string;  // e.g. "انتشارات آرمان"
  showPageNumbers: boolean;
  showCoverPage: boolean;
  coverPage?: CoverPageConfig;
  fontSize: 'small' | 'medium' | 'large';
  heading1Size?: number; // سایز سرتیتر اصلی / عنوان فصل (H1) بر حسب pt
  heading2Size?: number; // سایز تیتر فرعی (H2) بر حسب pt
  heading3Size?: number; // سایز تیتر کوچک (H3) بر حسب pt
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  paragraphSpacing?: 'compact' | 'normal' | 'relaxed' | 'generous';
  fontFamily: 'Vazirmatn' | 'Vazirmatn Medium' | 'B Nazanin' | 'B Mitra' | 'Tahoma' | 'IRANSans';
  borderStyle: BorderStyleId;
  backgroundPattern: BackgroundPatternId;
  watermarkText?: string;
  pageMargin?: 'compact' | 'normal' | 'generous';
  topMargin?: 'compact' | 'normal' | 'generous' | 'extra_generous'; // فاصله از بالای صفحه (تنظیم فاصله متن از هدر و لبه کاغذ)
  trimSize?: BookTrimSize;
  customColors?: CustomColorPalette;
  continuousFlow?: boolean; // چیدمان پیوسته روان زیر هم و بدون صفحه خالی اجباری بین فصول
  excludedChunkIds?: string[]; // شناسه‌های صفحات/بخش‌های انتخابی برای حذف از خروجی PDF و Word
  textAlignment?: 'right' | 'both'; // تراز متن (راست‌چین تمیز بدون کشیدگی نامنظم در ورد یا تراز دوطرفه)
}

export interface BookProject {
  id: string;
  userId?: string;
  title: string;
  originalTitle: string;
  author: string;
  translator: string;
  tone: ToneId;
  sourceLanguage?: string; // e.g. 'en' (default)
  targetLanguage?: string; // e.g. 'fa' (default)
  providerId?: string; // ID of configured provider
  model: string; // Model selection
  customToneDescription?: string;
  glossary: GlossaryItem[];
  chunks: BookChunk[];
  createdAt: number;
  updatedAt: number;
  rollingSummary?: string;
  contextCache?: any;
  designConfig?: BookDesignConfig;
  sourceFileType?: 'txt' | 'docx' | 'pdf' | 'epub' | 'json';
  totalImagesCount?: number;
  status?: 'draft' | 'translating' | 'completed' | 'error';
  wordCount?: number;
  estimatedCost?: number;
  adminCopy?: AdminBookCopy;
  totalChunks?: number;
  completedChunks?: number;
  progressPercent?: number;
  hasImages?: boolean;
  hasAdminCopy?: boolean;
}

export interface AdminBookChunkCopy {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  chunkNumber: number;
  englishText?: string;
  translatedHtml?: string;
  wordCount?: number;
}

export interface AdminBookCopy {
  editedAt: number;
  editedByAdminId?: string;
  title: string;
  originalTitle?: string;
  author?: string;
  translator?: string;
  designConfig?: BookDesignConfig;
  chunks: AdminBookChunkCopy[];
}

export interface ServerKeyStatus {
  masked: string;
  label?: string;
  status: 'active' | 'cooldown';
  secondsLeftInCooldown: number;
  rpmCount: number;
  totalRequests: number;
  errorCount: number;
  lastLatencyMs?: number | null;
}

export interface ServerStatusResponse {
  activeKeys: number;
  totalKeys: number;
  rateLimitDelayMs: number;
  pool: ServerKeyStatus[];
  systemInstructionReady: boolean;
  availableModels?: ModelOption[];
}

export interface TokenCalculationResult {
  words: number;
  characters: number;
  paragraphs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  totalTokens: number;
  estimatedChunks: number;
  estimatedSeconds: number;
}
