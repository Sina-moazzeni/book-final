import type { BookThemeId, BookDesignConfig, BorderStyleId, BackgroundPatternId } from '../types.ts';

export interface ThemeStyleDefinition {
  id: BookThemeId;
  name: string;
  enName: string;
  category: 'معنوی و عرفانی' | 'ادبی و داستانی' | 'تخصصی و علمی' | 'عمومی و مدرن';
  description: string;
  previewBg: string; // CSS bg for preview
  bgClass: string;
  pageBgColor: string; // Hex for DOCX / print
  textColor: string;
  headingColor: string;
  accentColor: string;
  borderColor: string;
  dividerSymbol: string;
  borderStyle: string;
  tagline: string;
}

export const BOOK_THEMES: Record<BookThemeId, ThemeStyleDefinition> = {
  spiritual: {
    id: 'spiritual',
    name: 'معنوی و اشراقی (تذهیب اسلیمی و زرین)',
    enName: 'Persian Illumination & Gold',
    category: 'معنوی و عرفانی',
    description: 'کاغذ کرم گرم با حاشیه تذهیب زرین، کتیبه‌های لاجوردی و فیروزه‌ای؛ طراحی اصیل ایرانی برای کتب عرفانی، اشراقی و خودشناسی',
    previewBg: 'bg-[#fbf6ea]',
    bgClass: 'bg-[#fbf6ea] text-[#241c14]',
    pageBgColor: '#fbf6ea',
    textColor: '#241c14',
    headingColor: '#1e3a8a',
    accentColor: '#b45309',
    borderColor: '#d4af37',
    dividerSymbol: '❦ ✤ ❦',
    borderStyle: 'border-2 border-double border-[#d4af37]',
    tagline: 'حس اصیل کتاب‌های خطی و معنوی کهن با تذهیب زرین',
  },
  spiritual_ancient: {
    id: 'spiritual_ancient',
    name: 'معنوی کهن (پاپیروس عتیق و خط کهن)',
    enName: 'Antique Papyrus & Sepia',
    category: 'معنوی و عرفانی',
    description: 'بافت کاغذ کهن عتیق با تناژ خاکی و قهوه‌ای سوخته، کادر دوبل نوستالژیک و نشان‌های باستانی؛ مناسب متون حکمت کهن و سلوک',
    previewBg: 'bg-[#f5eedb]',
    bgClass: 'bg-[#f5eedb] text-[#281e14]',
    pageBgColor: '#f5eedb',
    textColor: '#281e14',
    headingColor: '#451a03',
    accentColor: '#92400e',
    borderColor: '#bca172',
    dividerSymbol: '❖ ❖ ❖',
    borderStyle: 'border-2 border-dashed border-[#bca172]',
    tagline: 'جلوه پاپیروس تاریخی و اسناد کهن حکمت و فلسفه',
  },
  spiritual_azure: {
    id: 'spiritual_azure',
    name: 'معنوی آرامش و نیایش (لاجوردی و آسمانی)',
    enName: 'Celestial Azure & Peace',
    category: 'معنوی و عرفانی',
    description: 'پس‌زمینه سفید متمایل به آبی فیروزه‌ای بسیار لطیف با رنگ‌های سرمه‌ای و لاجوردی؛ الهام‌بخش صلح درونی، نیایش و مراقبه',
    previewBg: 'bg-[#f0f7f9]',
    bgClass: 'bg-[#f0f7f9] text-[#132832]',
    pageBgColor: '#f0f7f9',
    textColor: '#132832',
    headingColor: '#0f4c5c',
    accentColor: '#0284c7',
    borderColor: '#94d2bd',
    dividerSymbol: '✦ ✧ ✦',
    borderStyle: 'border-2 border-solid border-[#94d2bd]',
    tagline: 'طراحی آرام، سبک و مصفا برای کتب مدیتیشن و سلامت روان',
  },
  novel: {
    id: 'novel',
    name: 'رمان کلاسیک (کاغذ عاجی و زرشکی اشرافی)',
    enName: 'Classic Novel Ivory & Crimson',
    category: 'ادبی و داستانی',
    description: 'کاغذ عاجی نرم و چشم‌نواز با سرتیترهای زرشکی ادبی؛ مطالعه طولانی مدت بدون خستگی چشم برای رمان‌ها و ادبیات',
    previewBg: 'bg-[#fdfbf7]',
    bgClass: 'bg-[#fdfbf7] text-[#262626]',
    pageBgColor: '#fdfbf7',
    textColor: '#262626',
    headingColor: '#800020',
    accentColor: '#991b1b',
    borderColor: '#e5e0d8',
    dividerSymbol: '— ✦ —',
    borderStyle: 'border border-[#e5e0d8]',
    tagline: 'استاندارد کتاب‌های رمان چاپخانه و ناشران معتبر بین‌المللی',
  },
  luxury_gold: {
    id: 'luxury_gold',
    name: 'نفیس طلایی و سرمه‌ای (لوکس طلاکوب)',
    enName: 'Royal Obsidian & Gold Filigree',
    category: 'عمومی و مدرن',
    description: 'پس‌زمینه ابریشمی گرم با فریم‌های طلای ناب و خطوط هایلایت فاخر؛ مناسب کتب موفقیت، ثروت، برندینگ و مدیریت نفیس',
    previewBg: 'bg-[#faf6ed]',
    bgClass: 'bg-[#faf6ed] text-[#1e1e24]',
    pageBgColor: '#faf6ed',
    textColor: '#1e1e24',
    headingColor: '#0f172a',
    accentColor: '#d97706',
    borderColor: '#f59e0b',
    dividerSymbol: '✦ ❖ ✦',
    borderStyle: 'border-2 border-[#f59e0b]/60 shadow-sm',
    tagline: 'جلوه‌ای شاهانه شبیه به کتاب‌های چرم و طلاکوب درباری',
  },
  academic: {
    id: 'academic',
    name: 'دانشگاهی و پژوهشی (نیلی و مدرن)',
    enName: 'Modern Academic Navy',
    category: 'تخصصی و علمی',
    description: 'صفحه‌بندی مدرن و منظم مقالات و کتب مرجع با خطوط هندسی نیلی؛ حداکثر دقت ساختار برای کتب علمی و دانشگاهی',
    previewBg: 'bg-[#fcfdff]',
    bgClass: 'bg-[#fcfdff] text-[#1e293b]',
    pageBgColor: '#fcfdff',
    textColor: '#1e293b',
    headingColor: '#1e3a8a',
    accentColor: '#2563eb',
    borderColor: '#cbd5e1',
    dividerSymbol: '◆ ◆ ◆',
    borderStyle: 'border-t-2 border-b border-[#cbd5e1]',
    tagline: 'رسمی، آکادمیک و ساختارمند برای کتب مرجع و پایان‌نامه‌ها',
  },
  sage_nature: {
    id: 'sage_nature',
    name: 'طبیعت و ذهن‌آگاهی (سبز مریم‌گلی و زیتونی)',
    enName: 'Sage Nature & Mindfulness',
    category: 'عمومی و مدرن',
    description: 'رنگ‌بندی طبیعی و ارگانیک با سرتیترهای سبز جنگلی؛ مناسب کتاب‌های تغذیه، سبک زندگی سالم، روانشناسی و طبیعت',
    previewBg: 'bg-[#f4f7f4]',
    bgClass: 'bg-[#f4f7f4] text-[#142617]',
    pageBgColor: '#f4f7f4',
    textColor: '#142617',
    headingColor: '#166534',
    accentColor: '#15803d',
    borderColor: '#bbf7d0',
    dividerSymbol: '✿ ❀ ✿',
    borderStyle: 'border border-[#bbf7d0]',
    tagline: 'انرژی مثبت، سلامت و آرامش برگرفته از طبیعت',
  },
  minimal_clean: {
    id: 'minimal_clean',
    name: 'مینی‌مالیزم مدرن (سفید چاپی اقتصادی)',
    enName: 'Clean Minimalist White',
    category: 'عمومی و مدرن',
    description: 'طراحی سفید خالص با بالاترین کنتراست متن و خطوط تمیز؛ ایده‌آل برای چاپ مستقیم روی کاغذ با حداقل مصرف کارتریج',
    previewBg: 'bg-white',
    bgClass: 'bg-white text-slate-900',
    pageBgColor: '#ffffff',
    textColor: '#0f172a',
    headingColor: '#0f172a',
    accentColor: '#475569',
    borderColor: '#e2e8f0',
    dividerSymbol: '— — —',
    borderStyle: 'border-b border-[#e2e8f0]',
    tagline: 'بهترین انتخاب برای چاپ اقتصادی خانگی و اداری',
  },
};

export const BORDER_STYLES: { id: BorderStyleId; name: string; description: string }[] = [
  { id: 'ornate_spiritual', name: 'کادر تذهیب دار معنوی', description: 'کادر دوبل اسلیمی با گوشه‌های تزئینی فاخر' },
  { id: 'double_classic', name: 'کادر دوبل کلاسیک کتابی', description: 'دو خط موازی ضخیم و باریک دور صفحه' },
  { id: 'thin_modern', name: 'خط نازک مینیمال', description: 'کادر ظریف و ساده برای صفحه منظم' },
  { id: 'none', name: 'بدون کادر (حاشیه آزاد)', description: 'بدون خط دور صفحه، سبک کتاب‌های استاندارد' },
];

export const BACKGROUND_PATTERNS: { id: BackgroundPatternId; name: string; description: string }[] = [
  { id: 'none', name: 'یکدست و ساده', description: 'رنگ زمینه ملایم بدون نقش اضافه' },
  { id: 'arabesque', name: 'تذهیب و اسلیمی محو', description: 'شمسه و نقوش اسلیمی سنتی ایرانی در مرکز و گوشه‌ها' },
  { id: 'geometry', name: 'هندسه مقدس و ماندالا', description: 'طرح ماندالای آرامش‌بخش و متقارن در پس‌زمینه' },
  { id: 'parchment', name: 'بافت کاغذ کهن و ابر و باد', description: 'گرما و بافت سنتی کاغذهای دست‌ساز عتیق' },
];

export const BOOK_TRIM_SIZES: {
  id: 'ruqai' | 'vaziri' | 'rahli' | 'pocket';
  name: string;
  dimensions: string;
  description: string;
  tag: string;
  aspectRatio: string;
}[] = [
  {
    id: 'ruqai',
    name: 'قطع رقعی (استاندارد ناشران)',
    dimensions: '۱۴.۵ × ۲۱.۵ سانتی‌متر',
    description: 'محبوب‌ترین قطع چاپ در ایران؛ ایده‌آل برای رمان، ادبیات، روانشناسی، مدیریت و توسعه فردی',
    tag: 'پرفروش‌ترین',
    aspectRatio: '145 / 215',
  },
  {
    id: 'vaziri',
    name: 'قطع وزیری (دانشگاهی و رسمی)',
    dimensions: '۱۷.۵ × ۲۵ سانتی‌متر',
    description: 'قطع رسمی کتب دانشگاهی، کتاب‌های درسی و فنی، دانشنامه‌ها، فلسفه و علوم انسانی',
    tag: 'دانشگاهی',
    aspectRatio: '175 / 250',
  },
  {
    id: 'rahli',
    name: 'قطع رحلی (A4 بزرگ و نفیس)',
    dimensions: '۲۱ × ۲۹.۷ سانتی‌متر',
    description: 'کتاب‌های مصور، هنری، کتب نفیس، مجلات پژوهشی و سالنامه‌ها با کادربندی وسیع',
    tag: 'نفیس و مصور',
    aspectRatio: '210 / 297',
  },
  {
    id: 'pocket',
    name: 'قطع جیبی (همراه و فشرده)',
    dimensions: '۱۱.۵ × ۱۶.۵ سانتی‌متر',
    description: 'کتاب‌های کوچک همراه، چکیده فصول، دیوان اشعار و کتابچه‌های آموزشی فشرده',
    tag: 'کوچک و همراه',
    aspectRatio: '115 / 165',
  },
];

export const DEFAULT_DESIGN_CONFIG: BookDesignConfig = {
  themeId: 'spiritual',
  headerText: '',
  footerText: '',
  showHeader: false, // Default off until user toggles or enters text
  showFooter: false,
  websiteUrl: '',
  brandName: '',
  showPageNumbers: true,
  showCoverPage: true,
  coverPage: {
    layout: 'center',
    titleSize: 32,
    subtitleSize: 16,
    authorSize: 13,
    showMotif: true,
    showDivider: true,
  },
  fontSize: 'medium',
  heading1Size: 22,
  heading2Size: 17,
  heading3Size: 14,
  lineSpacing: 'normal',
  paragraphSpacing: 'normal',
  fontFamily: 'Vazirmatn',
  borderStyle: 'ornate_spiritual',
  backgroundPattern: 'none',
  watermarkText: '',
  pageMargin: 'normal',
  topMargin: 'normal',
  trimSize: 'ruqai',
  continuousFlow: true,
  excludedChunkIds: [],
  textAlignment: 'right', // استاندارد راست‌چین جهت جلوگیری از کشیدگی بد جاستیفای در ورد
};
