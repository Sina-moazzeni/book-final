import React, { useState } from 'react';
import {
  X,
  Server,
  Key,
  Globe,
  Cpu,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Layers,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Edit3,
  Eye,
  EyeOff,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { APIServerEndpoint, ProviderType } from '../types.ts';
import {
  testServerConnection,
  getConnectionMode,
  setConnectionMode,
  getCustomBackendUrl,
  setCustomBackendUrl,
  ConnectionMode,
} from '../utils/aiClient.ts';

interface ProviderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverPool: APIServerEndpoint[];
  onUpdateServerPool: (pool: APIServerEndpoint[]) => void;
}

export const ProviderManagerModal: React.FC<ProviderManagerModalProps> = ({
  isOpen,
  onClose,
  serverPool,
  onUpdateServerPool,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUbuntuGuide, setShowUbuntuGuide] = useState(false);
  const [copiedNginx, setCopiedNginx] = useState(false);
  const [connectionMode, setConnMode] = useState<ConnectionMode>(() => getConnectionMode());
  const [customBackendUrl, setCustBackendUrl] = useState<string>(() => getCustomBackendUrl());
  
  // New server form state
  const [newServerName, setNewServerName] = useState('');
  const [newProviderType, setNewProviderType] = useState<ProviderType>('openrouter');
  const [newBaseURL, setNewBaseURL] = useState('https://openrouter.ai/api/v1');
  const [newApiKey, setNewApiKey] = useState('');
  const [newModel, setNewModel] = useState('deepseek/deepseek-r1');
  const [showNewKey, setShowNewKey] = useState(false);

  // Edit server state
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editServerData, setEditServerData] = useState<{
    name: string;
    providerType: ProviderType;
    baseURL: string;
    apiKey: string;
    model: string;
    isEnabled: boolean;
  } | null>(null);
  const [showEditKey, setShowEditKey] = useState(false);
  
  // Testing states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; error?: string; isDirectClient?: boolean }>>({});
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProviderTypeChange = (type: ProviderType) => {
    setNewProviderType(type);
    if (type === 'gemini') {
      setNewBaseURL('');
      setNewModel('gemini-3.8-flash');
      if (!newServerName || newServerName.includes('سرور')) setNewServerName('سرور گوگل جمینای');
    } else if (type === 'openrouter') {
      setNewBaseURL('https://openrouter.ai/api/v1');
      setNewModel('deepseek/deepseek-r1');
      if (!newServerName || newServerName.includes('سرور')) setNewServerName('سرور OpenRouter');
    } else if (type === 'openai') {
      setNewBaseURL('https://api.openai.com/v1');
      setNewModel('gpt-4o');
      if (!newServerName || newServerName.includes('سرور')) setNewServerName('سرور OpenAI رسمی');
    } else if (type === 'deepseek') {
      setNewBaseURL('https://api.deepseek.com/v1');
      setNewModel('deepseek-chat');
      if (!newServerName || newServerName.includes('سرور')) setNewServerName('سرور DeepSeek مستقیم');
    } else if (type === 'glm') {
      setNewBaseURL('https://open.bigmodel.cn/api/paas/v4');
      setNewModel('glm-4-flash');
      if (!newServerName || newServerName.includes('سرور')) setNewServerName('سرور GLM Zhipu');
    } else {
      setNewBaseURL('https://api.groq.com/openai/v1');
      setNewModel('llama-3.3-70b-versatile');
      if (!newServerName || newServerName.includes('سرور')) setNewServerName('سرور واسط / پروکسی');
    }
  };

  const handleEditProviderTypeChange = (type: ProviderType) => {
    if (!editServerData) return;
    let defBase = editServerData.baseURL;
    let defModel = editServerData.model;

    if (type === 'gemini') {
      defBase = '';
      defModel = 'gemini-3.8-flash';
    } else if (type === 'openrouter') {
      if (!defBase || defBase.includes('openai.com') || defBase.includes('deepseek.com')) defBase = 'https://openrouter.ai/api/v1';
      if (!defModel || defModel.includes('gemini') || defModel.includes('gpt')) defModel = 'deepseek/deepseek-r1';
    } else if (type === 'openai') {
      if (!defBase || defBase.includes('openrouter')) defBase = 'https://api.openai.com/v1';
      if (!defModel || defModel.includes('deepseek')) defModel = 'gpt-4o';
    } else if (type === 'deepseek') {
      if (!defBase || defBase.includes('openrouter')) defBase = 'https://api.deepseek.com/v1';
      if (!defModel || defModel.includes('gpt')) defModel = 'deepseek-chat';
    } else if (type === 'glm') {
      defBase = 'https://open.bigmodel.cn/api/paas/v4';
      defModel = 'glm-4-flash';
    } else if (type === 'custom') {
      if (!defBase) defBase = 'https://api.groq.com/openai/v1';
    }

    setEditServerData({
      ...editServerData,
      providerType: type,
      baseURL: defBase,
      model: defModel,
    });
  };

  const handleStartEdit = (server: APIServerEndpoint) => {
    setEditingServerId(server.id);
    setEditServerData({
      name: server.name,
      providerType: server.providerType,
      baseURL: server.baseURL,
      apiKey: server.apiKey,
      model: server.model,
      isEnabled: server.isEnabled,
    });
    setShowEditKey(false);
  };

  const handleCancelEdit = () => {
    setEditingServerId(null);
    setEditServerData(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServerId || !editServerData) return;

    if (editServerData.providerType !== 'gemini' && !editServerData.apiKey.trim()) {
      alert('لطفاً کلید API را وارد فرمایید.');
      return;
    }

    onUpdateServerPool(
      serverPool.map(s => {
        if (s.id !== editingServerId) return s;
        return {
          ...s,
          name: editServerData.name.trim() || s.name,
          providerType: editServerData.providerType,
          baseURL: editServerData.baseURL.trim(),
          apiKey: editServerData.apiKey.trim(),
          model: editServerData.model.trim() || s.model,
        };
      })
    );

    setSaveBanner(`تنظیمات سرور «${editServerData.name}» با موفقیت به‌روزرسانی و ذخیره شد.`);
    setTimeout(() => setSaveBanner(null), 3500);
    setEditingServerId(null);
    setEditServerData(null);
  };

  const handleTestServer = async (server: { providerType: ProviderType; apiKey: string; baseURL: string; model: string }, id: string) => {
    setTestingId(id);
    try {
      const result = await testServerConnection(server, connectionMode);

      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: result.success,
          latencyMs: result.latencyMs,
          error: result.error,
          isDirectClient: result.isDirectClient,
        },
      }));

      // Update in server pool if it exists
      if (serverPool.some(s => s.id === id) && result.success) {
        onUpdateServerPool(
          serverPool.map(s => (s.id === id ? { ...s, lastLatencyMs: result.latencyMs, lastTestedAt: Date.now() } : s))
        );
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: false,
          error: err.message || 'خطا در ارسال تست اتصال',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProviderType !== 'gemini' && !newApiKey.trim()) {
      alert('لطفاً کلید API را برای این سرور وارد نمایید.');
      return;
    }

    const newEndpoint: APIServerEndpoint = {
      id: `server_${Date.now()}`,
      name: newServerName.trim() || `سرور ${serverPool.length + 1}`,
      providerType: newProviderType,
      baseURL: newBaseURL.trim(),
      apiKey: newApiKey.trim(),
      model: newModel.trim() || 'gemini-3.8-flash',
      isEnabled: true,
      priority: serverPool.length + 1,
      status: 'active',
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
    };

    onUpdateServerPool([...serverPool, newEndpoint]);
    setShowAddForm(false);
    setNewApiKey('');
    setNewServerName('');
    setSaveBanner('سرور جدید با موفقیت به استخر سوئیچ خودکار اضافه شد.');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleToggleServer = (id: string) => {
    onUpdateServerPool(
      serverPool.map(s => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const handleDeleteServer = (id: string) => {
    if (serverPool.length <= 1) {
      setSaveBanner('حداقل یک سرور باید در استخر چرخش باقی بماند.');
      setTimeout(() => setSaveBanner(null), 3000);
      return;
    }
    const target = serverPool.find(s => s.id === id);
    onUpdateServerPool(serverPool.filter(s => s.id !== id));
    setDeleteConfirmId(null);
    setSaveBanner(`سرور «${target?.name || ''}» با موفقیت از استخر حذف شد.`);
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPool = [...serverPool];
    const temp = newPool[index];
    newPool[index] = newPool[index - 1];
    newPool[index - 1] = temp;
    onUpdateServerPool(newPool);
  };

  const handleMoveDown = (index: number) => {
    if (index === serverPool.length - 1) return;
    const newPool = [...serverPool];
    const temp = newPool[index];
    newPool[index] = newPool[index + 1];
    newPool[index + 1] = temp;
    onUpdateServerPool(newPool);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">استخر سرورهای API و سیستم سوئیچ خودکار (Failover Pool)</h2>
              <p className="text-xs text-slate-400">
                چندین سرور API اضافه کنید تا در صورت قطعی یا عدم پاسخگویی، سامانه به طور خودکار سوئیچ کند
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Tone & Prompt Preservation Guarantee Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-300">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold text-emerald-200">
                تضمین قطعی ثبات لحن، پرامپت و قالب‌بندی هنگام سوئیچ هوش مصنوعی:
              </strong>
              <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                تمام سرورهای موجود در این لیست دقیقاً همان پرامپت سیستمی جامع، واژه‌نامه تخصصی کتاب، لحن انتخابی و کدهای رنگی Word (<span className="font-mono text-emerald-300">#1a365d, #2b6cb0, #9b2c2c</span>) را دریافت می‌کنند. حتی با سوئیچ میان ارائه‌دهندگان، لحن و پیوستگی متن هیچ‌گونه تغییری نخواهد کرد.
              </p>
            </div>
          </div>

          {/* Connection Mode & Production Build Settings */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>حالت اتصال در محیط توسعه، بیلد و سرور (Connection Mode):</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setConnMode('auto');
                    setConnectionMode('auto');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    connectionMode === 'auto' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="پیشنهادی: اولویت با سرور برنامه؛ در صورت اجرای بیلد استاتیک یا IIS، سوئیچ خودکار به کلاینت انجام می‌شود"
                >
                  هوشمند خودکار (پیشنهادی)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConnMode('direct');
                    setConnectionMode('direct');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    connectionMode === 'direct' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="اتصال مستقیم مرورگر به OpenRouter/DeepSeek/Gemini بدون نیاز به اجرای سرویس Node.js"
                >
                  مستقیم مرورگر (ویژه خروجی بیلد)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConnMode('server');
                    setConnectionMode('server');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    connectionMode === 'server' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="ارسال کلیه درخواست‌ها از طریق پروکسی بک‌اند سرور برنامه"
                >
                  فقط سرور بک‌اند
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-300/90 leading-relaxed">
              {connectionMode === 'auto' && (
                <>
                  <strong className="text-emerald-400 font-semibold">حالت هوشمند فعال است: </strong>
                  سامانه ابتدا از سرور بک‌اند درخواست‌ها را ارسال می‌کند. چنانچه پروژه بیلد شده باشد و هاست شما فاقد Node.js یا Reverse-Proxy باشد، درخواست‌ها بدون بروز خطای ۴۰۴ مستقیماً و خودکار از طریق مرورگر به هوش مصنوعی متصل می‌شوند.
                </>
              )}
              {connectionMode === 'direct' && (
                <>
                  <strong className="text-blue-400 font-semibold">حالت مستقیم مرورگر فعال است: </strong>
                  در این حالت هیچ نیازی به اجرای بک‌اند Node.js وجود ندارد و می‌توانید خروجی بیلد (<span className="font-mono text-indigo-300">dist</span>) را به آسانی روی هر هاست استاتیک، IIS، گیت‌هاب، ورسل یا هاست اشتراکی میزبانی نمایید.
                </>
              )}
              {connectionMode === 'server' && (
                <>
                  <strong className="text-amber-400 font-semibold">حالت پروکسی سرور فعال است: </strong>
                  کلیه درخواست‌ها منحصراً از IP سرور Node.js شما عبور می‌کنند. لطفاً مطمئن شوید سرویس بک‌اند روی سرور روشن بوده و مسیر <span className="font-mono text-amber-300">/api</span> در وب‌سرور هدایت شده است.
                </>
              )}
            </p>

            {/* Custom Backend URL Toggle */}
            <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">
                اگر فرانت‌اند و بک‌اند شما روی دو آدرس مجزا هستند (مثلاً فرانت روی Nginx و بک‌اند Node روی پورت ۳۰۰۰):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={customBackendUrl}
                  onChange={e => {
                    setCustBackendUrl(e.target.value);
                    setCustomBackendUrl(e.target.value);
                  }}
                  placeholder="http://localhost:3000 (اختیاری)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500 w-52 placeholder-slate-600"
                />
                {customBackendUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustBackendUrl('');
                      setCustomBackendUrl('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    پاکسازی
                  </button>
                )}
              </div>
            </div>

            {/* Ubuntu Linux Nginx Reverse Proxy Helper */}
            <div className="pt-2 border-t border-slate-700/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowUbuntuGuide(!showUbuntuGuide)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1.5 transition"
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showUbuntuGuide ? 'بستن راهنمای Nginx اوبونتو' : 'راهنمای تنظیم Nginx در سرور لینوکس اوبونتو (رفع خطای HTML 200)'}</span>
                </button>
                {showUbuntuGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      const nginxSnippet = `location /api/ {\n    proxy_pass http://127.0.0.1:3000/api/;\n    proxy_http_version 1.1;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_read_timeout 120s;\n}`;
                      navigator.clipboard.writeText(nginxSnippet);
                      setCopiedNginx(true);
                      setTimeout(() => setCopiedNginx(false), 2500);
                    }}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded flex items-center gap-1 transition"
                  >
                    {copiedNginx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedNginx ? 'کپی شد!' : 'کپی بلوک Nginx'}</span>
                  </button>
                )}
              </div>

              {showUbuntuGuide && (
                <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 text-[11px] space-y-2">
                  <p className="text-slate-300 leading-relaxed">
                    در سرور اوبونتو، اگر Nginx درخواست‌های <span className="font-mono text-amber-300">/api/</span> را به سرور Node.js فوروارد نکند، فایل <span className="font-mono text-indigo-300">index.html</span> فرانت با کد ۲۰۰ برگردانده می‌شود. برای حل، قطعه‌کد زیر را داخل بلوک <span className="font-mono text-purple-300">server</span> در فایل سایت در <span className="font-mono text-slate-400">/etc/nginx/sites-available/</span> قرار دهید:
                  </p>
                  <pre className="bg-black/80 text-emerald-300 font-mono text-[10px] p-2.5 rounded-lg overflow-x-auto text-left" dir="ltr">
{`location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
}`}
                  </pre>
                  <div className="text-[10px] text-slate-400">
                    💡 <strong>یا به سادگی:</strong> در بالای همین کادر، حالت اتصال را روی <strong>«مستقیم مرورگر»</strong> قرار دهید تا بدون نیاز به تغییر در Nginx یا اجرای Node.js، ترجمه مستقیماً کار کند.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Server Button Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">فهرست سرورهای متصل در استخر چرخش:</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {serverPool.filter(s => s.isEnabled).length} فعال از {serverPool.length} سرور
              </span>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'بستن فرم' : 'افزودن سرور / کلید جدید'}</span>
            </button>
          </div>

          {/* Add New Server Form */}
          {showAddForm && (
            <form onSubmit={handleAddServer} className="bg-slate-850 p-4 rounded-2xl border border-indigo-500/40 space-y-3.5 transition">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>مشخصات سرور یا کلید جدید:</span>
                </span>
                <span className="text-[10px] text-slate-400">به انتهای زنجیره سوئیچ اضافه می‌شود</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">عنوان یا برچسب سرور:</label>
                  <input
                    type="text"
                    value={newServerName}
                    onChange={e => setNewServerName(e.target.value)}
                    placeholder="مثلاً: سرور ۲ (OpenRouter DeepSeek)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">نوع ارائه‌دهنده مرجع:</label>
                  <select
                    value={newProviderType}
                    onChange={e => handleProviderTypeChange(e.target.value as ProviderType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="gemini">Google Gemini (جمینای)</option>
                    <option value="openrouter">OpenRouter (کل مدل‌ها: DeepSeek, Claude, Llama)</option>
                    <option value="openai">OpenAI (رسمی ChatGPT)</option>
                    <option value="deepseek">DeepSeek (مستقیم)</option>
                    <option value="glm">GLM / Zhipu AI</option>
                    <option value="custom">سرور واسط / پروکسی / Groq / Local</option>
                  </select>
                </div>

                {newProviderType !== 'gemini' && (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">آدرس سرور (Base URL):</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newBaseURL}
                      onChange={e => setNewBaseURL(e.target.value)}
                      placeholder="https://openrouter.ai/api/v1"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">مدل انتخابی این سرور:</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    placeholder="e.g. deepseek/deepseek-r1 or gpt-4o"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className={newProviderType === 'gemini' ? 'sm:col-span-2' : ''}>
                  <label className="block text-slate-300 mb-1 font-semibold">کلید اختصاصی API Key:</label>
                  <input
                    type="password"
                    dir="ltr"
                    value={newApiKey}
                    onChange={e => setNewApiKey(e.target.value)}
                    placeholder={newProviderType === 'gemini' ? 'اختیاری (پیش‌فرض سیستم اعمال می‌شود)' : 'sk-or-...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>ثبت و فعال‌سازی در استخر</span>
                </button>
              </div>
            </form>
          )}

          {/* Banner message */}
          {saveBanner && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveBanner}</span>
            </div>
          )}

          {/* Connected Servers List Table */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>ترتیب اولویت سرورها در سوئیچ خودکار (سرور بالاتر اول تست می‌شود):</span>
              <span>تعداد کل سرورها: {serverPool.length}</span>
            </div>

            <div className="divide-y divide-slate-850">
              {serverPool.map((server, idx) => {
                const isTestingThis = testingId === server.id;
                const testResult = testResults[server.id];

                return (
                  <div key={server.id} className="transition">
                    <div
                      className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        server.isEnabled ? 'bg-slate-900/40 hover:bg-slate-900/70' : 'bg-slate-950/80 opacity-60'
                      }`}
                    >
                    
                    {/* Left details */}
                    <div className="flex items-start gap-3">
                      {/* Priority Badge & Reorder */}
                      <div className="flex flex-col items-center justify-center pt-0.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-0.5 mt-1">
                          <button
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-0.5 rounded text-slate-500 hover:text-white disabled:opacity-20"
                            title="انتقال به اولویت بالاتر"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === serverPool.length - 1}
                            className="p-0.5 rounded text-slate-500 hover:text-white disabled:opacity-20"
                            title="انتقال به اولویت پایین‌تر"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Server Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-white">{server.name}</strong>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                            {server.providerType.toUpperCase()}
                          </span>
                          {idx === 0 && server.isEnabled && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              سرور پیش‌فرض اول
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-3" dir="ltr">
                          <span>Model: <strong className="text-purple-300">{server.model}</strong></span>
                          {server.baseURL && (
                            <span className="text-slate-500 truncate max-w-[200px]">URL: {server.baseURL}</span>
                          )}
                        </div>

                        {/* Ping Result */}
                        <div className="mt-1">
                          {testResult ? (
                            testResult.success ? (
                              <span className="text-[11px] text-emerald-400 font-bold font-mono">
                                ✓ اتصال برقرار ({testResult.latencyMs}ms{testResult.isDirectClient ? ' - مستقیم مرورگر' : ' - سرور'})
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-400 truncate max-w-xs block" title={testResult.error}>
                                ✗ خطا: {testResult.error}
                              </span>
                            )
                          ) : server.lastLatencyMs ? (
                            <span className="text-[11px] text-slate-400 font-mono">
                              آخرین پینگ: {server.lastLatencyMs}ms
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      
                      {/* Test Ping Button */}
                      <button
                        onClick={() => handleTestServer(server, server.id)}
                        disabled={isTestingThis}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1"
                        title="تست پینگ و اتصال زنده"
                      >
                        {isTestingThis ? (
                          <RotateCw className="w-3 h-3 animate-spin text-blue-400" />
                        ) : (
                          <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
                        )}
                        <span>{isTestingThis ? 'درحال تست...' : 'تست پینگ'}</span>
                      </button>

                      {/* Edit Server & API Button */}
                      <button
                        onClick={() => {
                          if (editingServerId === server.id) {
                            handleCancelEdit();
                          } else {
                            handleStartEdit(server);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                          editingServerId === server.id
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                        title="ویرایش کلید API، آدرس، مدل و نام این سرور"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{editingServerId === server.id ? 'بستن ویرایش' : 'ویرایش API'}</span>
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleServer(server.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          server.isEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                        title={server.isEnabled ? 'غیرفعال کردن در سوئیچ خودکار' : 'فعال کردن در سوئیچ خودکار'}
                      >
                        {server.isEnabled ? '✓ فعال در چرخش' : 'غیرفعال'}
                      </button>

                      {/* Delete with inline confirmation */}
                      {serverPool.length > 1 && (
                        deleteConfirmId === server.id ? (
                          <div className="flex items-center gap-1 bg-red-950/90 p-1 rounded-lg border border-red-500/50">
                            <button
                              onClick={() => handleDeleteServer(server.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white transition"
                            >
                              حذف
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="انصراف"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(server.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="حذف سرور"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>

                  </div>

                  {/* Inline Server / API Editing Panel */}
                  {editingServerId === server.id && editServerData && (
                    <form onSubmit={handleSaveEdit} className="p-4 bg-slate-900 border-t border-amber-500/30 space-y-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-amber-400" />
                          <span>ویرایش مشخصات و کلید API برای «{server.name}»:</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          تغییرات به طور زنده ذخیره می‌شود
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">عنوان یا برچسب سرور:</label>
                          <input
                            type="text"
                            value={editServerData.name}
                            onChange={e => setEditServerData({ ...editServerData, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">نوع ارائه‌دهنده مرجع:</label>
                          <select
                            value={editServerData.providerType}
                            onChange={e => handleEditProviderTypeChange(e.target.value as ProviderType)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                          >
                            <option value="gemini">Google Gemini (جمینای)</option>
                            <option value="openrouter">OpenRouter (کل مدل‌ها: DeepSeek, Claude, Llama)</option>
                            <option value="openai">OpenAI (رسمی ChatGPT)</option>
                            <option value="deepseek">DeepSeek (مستقیم)</option>
                            <option value="glm">GLM / Zhipu AI</option>
                            <option value="custom">سرور واسط / پروکسی / Groq / Local</option>
                          </select>
                        </div>

                        {editServerData.providerType !== 'gemini' && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-slate-300 font-semibold">آدرس سرور (Base URL):</label>
                              <span className="text-[10px] text-amber-400/90 font-mono">باید به /v1 ختم شود</span>
                            </div>
                            <input
                              type="text"
                              dir="ltr"
                              value={editServerData.baseURL}
                              onChange={e => setEditServerData({ ...editServerData, baseURL: e.target.value })}
                              placeholder="https://openrouter.ai/api/v1"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">مدل انتخابی این سرور:</label>
                          <input
                            type="text"
                            dir="ltr"
                            value={editServerData.model}
                            onChange={e => setEditServerData({ ...editServerData, model: e.target.value })}
                            placeholder="e.g. deepseek/deepseek-r1 or gpt-4o"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div className={editServerData.providerType === 'gemini' ? 'sm:col-span-2' : ''}>
                          <label className="block text-slate-300 mb-1 font-semibold">
                            کلید اختصاصی API Key:
                          </label>
                          <div className="relative">
                            <input
                              type={showEditKey ? 'text' : 'password'}
                              dir="ltr"
                              value={editServerData.apiKey}
                              onChange={e => setEditServerData({ ...editServerData, apiKey: e.target.value })}
                              placeholder={editServerData.providerType === 'gemini' ? 'اختیاری (در صورت خالی بودن، کلید پیش‌فرض اعمال می‌شود)' : 'sk-...'}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pl-10 text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditKey(!showEditKey)}
                              className="absolute left-2 top-2 text-slate-400 hover:text-white p-1"
                              title={showEditKey ? 'مخفی کردن کلید' : 'نمایش کلید'}
                            >
                              {showEditKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Test Status inside Edit Form */}
                      {testResults[server.id] && (
                        <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                          testResults[server.id].success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/10 border border-red-500/20 text-red-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {testResults[server.id].success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            )}
                            <span>
                              {testResults[server.id].success
                                ? `تست موفق بود! زمان پاسخگویی: ${testResults[server.id].latencyMs} میلی‌ثانیه`
                                : `خطا در تست: ${testResults[server.id].error}`}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleTestServer(editServerData, server.id)}
                          disabled={testingId === server.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                        >
                          {testingId === server.id ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          ) : (
                            <Play className="w-3 h-3 fill-current text-emerald-400" />
                          )}
                          <span>{testingId === server.id ? 'درحال تست اتصال...' : 'تست پینگ همین مشخصات'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                          >
                            انصراف
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>ذخیره تغییرات سرور</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            سوئیچ خودکار: <strong className="text-emerald-400">فعال (در صورت بروز هرگونه خطا بلافاصله سوئیچ می‌شود)</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            تأیید و ذخیره
          </button>
        </div>

      </div>
    </div>
  );
};
