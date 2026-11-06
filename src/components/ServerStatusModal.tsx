import React, { useState } from 'react';
import {
  X,
  Server,
  ShieldCheck,
  Zap,
  Clock,
  RotateCw,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Plus,
  Play,
  Trash2,
  Activity
} from 'lucide-react';
import { ServerStatusResponse } from '../types.ts';
import { resolveApiUrl, addClientGeminiKey, removeClientGeminiKey } from '../utils/aiClient.ts';

interface ServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ServerStatusResponse | null;
  onRefresh: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
  selectedModel,
  onSelectModel,
}) => {
  const [newKey, setNewKey] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [testingMasked, setTestingMasked] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; error?: string }>>({});
  const [addMessage, setAddMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async (masked: string) => {
    setTestingMasked(masked);
    try {
      const res = await fetch(resolveApiUrl('/api/keys/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masked, model: selectedModel }),
      });
      let data: any = null;
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        const isHtml = rawText.trim().startsWith('<') || rawText.toLowerCase().includes('<!doctype');
        throw new Error(
          isHtml
            ? `پاسخ وب HTML از سرور دریافت شد (کد ${res.status}). لطفاً مطمئن شوید سرویس Node.js روشن است یا در بخش سرورها حالت «مستقیم مرورگر» را برگزینید.`
            : `پاسخ سرور قالب معتبر نداشت (کد ${res.status}).`
        );
      }
      setTestResults(prev => ({
        ...prev,
        [masked]: {
          success: Boolean(data?.success),
          latencyMs: data?.latencyMs,
          error: data?.error,
        },
      }));
      onRefresh();
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [masked]: {
          success: false,
          error: err.message || 'خطا در تست اتصال',
        },
      }));
    } finally {
      setTestingMasked(null);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || newKey.trim().length < 8) {
      alert('لطفاً یک کلید معتبر وارد نمایید.');
      return;
    }

    const cleanKey = newKey.trim();
    addClientGeminiKey(cleanKey);

    setIsAddingKey(true);
    setAddMessage(null);
    try {
      const res = await fetch(resolveApiUrl('/api/keys/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cleanKey, label: newKeyLabel.trim() }),
      });
      const data = await res.json().catch(() => ({ success: true }));

      setAddMessage('کلید با موفقیت به استخر چرخش افزوده شد.');
      setNewKey('');
      setNewKeyLabel('');
      onRefresh();
      setTimeout(() => setAddMessage(null), 3000);
    } catch (err: any) {
      // Even if backend fails, key is stored locally for direct client fallback
      setAddMessage('کلید در حافظه مرورگر برای اتصال و چرخش خودکار ثبت شد.');
      setNewKey('');
      setNewKeyLabel('');
      setTimeout(() => setAddMessage(null), 3000);
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = async (masked: string) => {
    if (!confirm(`آیا مایلید کلید ${masked} از استخر حذف شود؟`)) return;
    removeClientGeminiKey(masked);
    try {
      const res = await fetch(resolveApiUrl(`/api/keys/${encodeURIComponent(masked)}`), {
        method: 'DELETE',
      });
      onRefresh();
    } catch (err: any) {
      // Ignore network error on delete
      onRefresh();
    }
  };

  const availableModels = status?.availableModels || [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (پیشنهادی / هوشمند و فصیح)', recommended: true },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (فوق سریع و کم‌مصرف)' },
    { id: 'gemini-4-argon', name: 'Gemini 4 Argon (نهایت عمق فلسفی و ادبی)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">مدیریت مدل‌های هوش مصنوعی و تست کلیدها</h2>
              <p className="text-xs text-slate-400">
                انتخاب مدل، مدیریت چرخش کلیدها و تست سلامت اتصال با اندازه‌گیری پینگ
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Active Model Selector */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>انتخاب مدل هوش مصنوعی برای ترجمه (AI Model Selection):</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                مدل فعال: {selectedModel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {availableModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelectModel(m.id)}
                  className={`p-2.5 rounded-lg border text-right text-xs transition flex flex-col justify-between ${
                    selectedModel === m.id
                      ? 'bg-purple-950/60 border-purple-500 text-white ring-1 ring-purple-500/40 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span className="font-semibold">{m.name}</span>
                  {selectedModel === m.id && (
                    <span className="text-[10px] text-purple-300 mt-1 font-bold">✓ انتخاب شده</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Add Key Section */}
          <form onSubmit={handleAddKey} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>افزودن کلید جدید به استخر چرخش (Add API Key):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <input
                  type="password"
                  dir="ltr"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="کلید هوش مصنوعی را وارد کنید (AIzaSy...)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newKeyLabel}
                  onChange={e => setNewKeyLabel(e.target.value)}
                  placeholder="برچسب (مثلاً: کلید کمکی ۲)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              {addMessage ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{addMessage}</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  کلیدها به صورت امن در حافظه سرور چرخش پیدا می‌کنند و خطای ۴۲۹ را مدیریت خواهند کرد.
                </span>
              )}
              <button
                type="submit"
                disabled={isAddingKey}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن کلید</span>
              </button>
            </div>
          </form>

          {/* Key Pool Table with Test Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>فهرست کلیدهای فعال و تست آنلاین هر کلید:</span>
              </span>
              <button
                onClick={onRefresh}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                <span>بروزرسانی وضعیت</span>
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3">عنوان / برچسب</th>
                    <th className="py-2.5 px-3">شناسه کلید</th>
                    <th className="py-2.5 px-3">وضعیت</th>
                    <th className="py-2.5 px-3">RPM / درخواست‌ها</th>
                    <th className="py-2.5 px-3">پینگ و سلامت</th>
                    <th className="py-2.5 px-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {status?.pool && status.pool.length > 0 ? (
                    status.pool.map((k, i) => {
                      const testInfo = testResults[k.masked];
                      const isTestingThis = testingMasked === k.masked;

                      return (
                        <tr key={i} className="hover:bg-slate-900/50 transition">
                          <td className="py-2.5 px-3 font-medium text-white">
                            {k.label || `کلید ${i + 1}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300" dir="ltr">
                            {k.masked}
                          </td>
                          <td className="py-2.5 px-3">
                            {k.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                فعال
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                خنک‌سازی ({k.secondsLeftInCooldown}s)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {k.rpmCount} RPM • {k.totalRequests} بار
                          </td>
                          <td className="py-2.5 px-3">
                            {testInfo ? (
                              testInfo.success ? (
                                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                  ✓ موفق ({testInfo.latencyMs}ms)
                                </span>
                              ) : (
                                <span className="text-[10px] text-red-400 truncate max-w-[120px] block" title={testInfo.error}>
                                  ✗ خطا: {testInfo.error}
                                </span>
                              )
                            ) : k.lastLatencyMs ? (
                              <span className="text-[11px] font-mono text-slate-400">
                                {k.lastLatencyMs}ms
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">تست نشده</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleTestKey(k.masked)}
                                disabled={isTestingThis}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition flex items-center gap-1"
                                title="ارسال پینگ تستی به مدل برای سنجش اتصال"
                              >
                                {isTestingThis ? (
                                  <RotateCw className="w-3 h-3 animate-spin text-blue-400" />
                                ) : (
                                  <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
                                )}
                                <span>{isTestingThis ? 'درحال تست...' : 'تست کلید'}</span>
                              </button>
                              {i > 0 && (
                                <button
                                  onClick={() => handleDeleteKey(k.masked)}
                                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                                  title="حذف کلید"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        کلیدی در دسترس نیست
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Translation Integrity Policies */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 space-y-2 text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>تعهد ترجمه فصیح، کامل و بدون سانسور (Full Verbatim Policy):</span>
            </div>
            <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside leading-relaxed">
              <li><strong>عدم خلاصه‌سازی مطلق:</strong> هوش مصنوعی متعهد است هر پاراگراف، دیالوگ و نکته نویسنده را عینا و کلمه به کلمه به فارسی روان بازگرداند.</li>
              <li><strong>بدون سانسور و فیلترینگ اخلاقی:</strong> تمامی کلمات، اصطلاحات و لحن واقعی کتاب به صورت صادقانه و آکادمیک ترجمه می‌گردند.</li>
              <li><strong>فارسی سلیس و گوش‌نواز:</strong> با بهره‌گیری از پرامپت اختصاصی و واژه‌نامه تخصصی، از ترجمه ماشینی اجتناب می‌شود.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition"
          >
            تأیید و بستن
          </button>
        </div>

      </div>
    </div>
  );
};
