import { LanguageOption } from '../types.ts';

export const SOURCE_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'انگلیسی (English)', enName: 'English', flag: '🇬🇧', isDefault: true },
  { code: 'de', name: 'آلمانی (Deutsch)', enName: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'فرانسوی (Français)', enName: 'French', flag: '🇫🇷' },
  { code: 'ar', name: 'عربی (العربية)', enName: 'Arabic', flag: '🇸🇦' },
  { code: 'es', name: 'اسپانیایی (Español)', enName: 'Spanish', flag: '🇪🇸' },
  { code: 'ru', name: 'روسی (Русский)', enName: 'Russian', flag: '🇷🇺' },
  { code: 'tr', name: 'ترکی استانبولی (Türkçe)', enName: 'Turkish', flag: '🇹🇷' },
  { code: 'it', name: 'ایتالیایی (Italiano)', enName: 'Italian', flag: '🇮🇹' },
  { code: 'zh', name: 'چینی (中文)', enName: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'ژاپنی (日本語)', enName: 'Japanese', flag: '🇯🇵' },
  { code: 'auto', name: 'تشخیص خودکار زبان متن', enName: 'Auto Detect', flag: '🌐' },
];

export const TARGET_LANGUAGES: LanguageOption[] = [
  { code: 'fa', name: 'فارسی (Persian / Farsi)', enName: 'Persian', flag: '🇮🇷', isDefault: true },
  { code: 'en', name: 'انگلیسی (English)', enName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'عربی (العربية)', enName: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'ترکی استانبولی (Türkçe)', enName: 'Turkish', flag: '🇹🇷' },
  { code: 'fr', name: 'فرانسوی (Français)', enName: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'آلمانی (Deutsch)', enName: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'اسپانیایی (Español)', enName: 'Spanish', flag: '🇪🇸' },
  { code: 'ru', name: 'روسی (Русский)', enName: 'Russian', flag: '🇷🇺' },
];

export function getLanguageName(code?: string, isTarget = false): string {
  if (!code) return isTarget ? 'فارسی' : 'انگلیسی';
  const list = isTarget ? TARGET_LANGUAGES : SOURCE_LANGUAGES;
  const match = list.find(l => l.code === code);
  return match ? match.name : code;
}
