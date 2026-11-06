import React from 'react';
import {
  X,
  Calculator,
  Cpu,
  Layers,
  Clock,
  Zap,
  ShieldCheck,
  Coins,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { BookProject } from '../types.ts';

interface TokenEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
}

export const TokenEstimatorModal: React.FC<TokenEstimatorModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  if (!isOpen) return null;

  const totalWords = project.chunks.reduce((acc, c) => acc + c.wordCount, 0);
  const totalCharacters = project.chunks.reduce((acc, c) => acc + c.englishText.length, 0);
  const totalChunks = project.chunks.length;

  // English words typically take ~1.35 tokens per word in Gemini
  const estimatedInputTokens = Math.ceil(totalWords * 1.35);
  // Persian translated text takes ~1.65 tokens per source English word
  const estimatedOutputTokens = Math.ceil(totalWords * 1.65);
  const totalTokens = estimatedInputTokens + estimatedOutputTokens;

  // Estimated duration: ~3s safe cooldown between chunks + ~1.5s model generation per chunk
  const estimatedDurationSeconds = totalChunks * 4.5;
  const estimatedDurationMinutes = Math.ceil(estimatedDurationSeconds / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">محاسبه‌گر جامع مصرف توکن و برآورد سهمیه</h2>
              <p className="text-xs text-slate-400">
                برآورد دقیق توکن‌های ورودی، خروجی و زمان مورد نیاز برای ترجمه کامل کتاب
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
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Main Big Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-400 mb-1">کلمات کل کتاب</div>
              <div className="text-lg font-bold text-white font-mono">
                {totalWords.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">English Words</div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-400 mb-1">توکن‌های ورودی (Input)</div>
              <div className="text-lg font-bold text-blue-400 font-mono">
                ~{estimatedInputTokens.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">متن منبع + پرامپت و واژه‌نامه</div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-400 mb-1">توکن‌های خروجی (Output)</div>
              <div className="text-lg font-bold text-purple-400 font-mono">
                ~{estimatedOutputTokens.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">ترجمه فارسی HTML کامل</div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-400 mb-1">مجموع کل توکن‌ها</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                ~{totalTokens.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Total Tokens</div>
            </div>
          </div>

          {/* Operational & Execution Metrics */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>مشخصات اجرایی و سهمیه لازم برای ترجمه:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">تعداد چانک‌ها (بخش‌ها):</span>
                <strong className="text-white font-mono text-sm">{totalChunks} بخش</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">هر بخش ~۷۰۰ کلمه</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">تعداد درخواست‌های API:</span>
                <strong className="text-white font-mono text-sm">{totalChunks} ریکوئست</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">بدون خلاصه‌سازی / کامل</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">تخمین مدت زمان کل:</span>
                <strong className="text-white font-mono text-sm">~{estimatedDurationMinutes} دقیقه</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">با احتساب مکث ۳ ثانیه‌ای ایمن</span>
              </div>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>راهنمای انتخاب مدل بر اساس سهمیه و نیاز:</span>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3">نام مدل هوش مصنوعی</th>
                    <th className="py-2.5 px-3">سرعت و پاسخگویی</th>
                    <th className="py-2.5 px-3">کیفیت ترجمه فارسی</th>
                    <th className="py-2.5 px-3">میزان مصرف سهمیه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  <tr className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      Gemini 3.8 Flash (پیشنهادی)
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">بسیار سریع (~۲ تا ۳ ثانیه)</td>
                    <td className="py-2.5 px-3 text-slate-300">عالی و فصیح، رعایت کامل واژه‌نامه</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                        بهینه‌ترین بازدهی
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-semibold text-blue-400">
                      Gemini 3.1 Flash-Lite
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">فوق‌العاده سریع (~۱ ثانیه)</td>
                    <td className="py-2.5 px-3 text-slate-300">روان و استاندارد</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400">
                        کمترین مصرف سهمیه
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-semibold text-purple-400">
                      Gemini 4 Argon
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">متوسط (~۶ تا ۱۰ ثانیه)</td>
                    <td className="py-2.5 px-3 text-slate-300">نهایت عمق فلسفی، استدلال و لحن ادبی</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400">
                        سهمیه پرمیوم (Paid)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Guarantees */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">تضمین عدم خلاصه‌سازی و ترجمه بدون سانسور:</strong>
              <p className="text-[11px] text-emerald-400/90 mt-0.5 leading-relaxed">
                تمام توکن‌های برآورد شده بر اساس ترجمه کلمه به کلمه و بند به بند بدون کوچک‌ترین خلاصه، حذف یا فیلترینگ محاسبه شده‌اند تا متن کامل کتاب عینا منتقل گردد.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition"
          >
            بستن پنجره
          </button>
        </div>

      </div>
    </div>
  );
};
