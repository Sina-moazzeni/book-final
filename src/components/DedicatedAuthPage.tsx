import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  RefreshCw,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { User, SystemSettings } from '../types.ts';
import { CaptchaWidget } from './CaptchaWidget.tsx';

interface DedicatedAuthPageProps {
  onAuthSuccess: (user: User, token: string) => void;
  onBackToHome: () => void;
  seoConfig?: SystemSettings['seo'];
}

export function DedicatedAuthPage({ onAuthSuccess, onBackToHome, seoConfig }: DedicatedAuthPageProps) {
  const [authMode, setAuthMode] = useState<'otp' | 'password' | 'register'>('otp');
  const [copiedLink, setCopiedLink] = useState(false);

  // OTP Login Fields
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(180);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);

  // Password Login Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [isRegOtpSent, setIsRegOtpSent] = useState(false);
  const [regPreviewOtp, setRegPreviewOtp] = useState<string | null>(null);

  // Anti-bot Captcha tokens
  const [captchaToken, setCaptchaToken] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');

  // State flags
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(true);

  // Fetch public settings for Google OAuth toggle status
  useEffect(() => {
    fetch('/api/public/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.googleOAuth?.enabled !== undefined) {
          setGoogleOAuthEnabled(Boolean(data.googleOAuth.enabled));
        }
      })
      .catch(() => {});
  }, []);

  // Listen for Google OAuth popup success message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token && event.data?.user) {
        setLoading(false);
        setSuccessMessage('ورود با حساب گوگل با موفقیت انجام شد.');
        localStorage.setItem('auth_token', event.data.token);
        onAuthSuccess(event.data.user, event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthSuccess]);

  // Timer countdown
  useEffect(() => {
    if (!isOtpSent && !isRegOtpSent) return;
    if (otpCountdown <= 0) return;

    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpSent, isRegOtpSent, otpCountdown]);

  // Copy shareable link
  const handleCopyDirectLink = () => {
    const url = `${window.location.origin}/?page=login`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  // Send OTP for Login
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = otpPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('شماره تلفن همراه معتبر وارد نمایید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال پیامک');

      setIsOtpSent(true);
      setOtpCountdown(180);
      setSuccessMessage(data.message || 'پیامک تایید به تلفن همراه شما ارسال شد.');
      if (data.previewCode) setPreviewOtp(data.previewCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با درگاه پیامکی');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage('لطفاً کد تایید پیامکی را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'کد تایید اشتباه است.');

      localStorage.setItem('auth_token', data.token);
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در اعتبارسنجی کد');
    } finally {
      setLoading(false);
    }
  };

  // Password Login Submit
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setLoading(true);
    try {
      const isEmail = loginIdentifier.includes('@');
      const payload: any = {
        password: loginPassword,
        captchaToken,
        mathAnswer,
        mode: 'password',
      };
      if (isEmail) payload.email = loginIdentifier.trim();
      else payload.phone = loginIdentifier.trim();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'اطلاعات ورود نادرست است.');

      localStorage.setItem('auth_token', data.token);
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ورود به حساب');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP for Register
  const handleSendRegOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regPhone || regPhone.trim().length < 10) {
      setErrorMessage('شماره تلفن همراه معتبر الزامی است.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال پیامک');

      setIsRegOtpSent(true);
      setOtpCountdown(180);
      setSuccessMessage(data.message || 'کد تایید پیامکی ارسال شد.');
      if (data.previewCode) setRegPreviewOtp(data.previewCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ارسال پیامک');
    } finally {
      setSendingOtp(false);
    }
  };

  // Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim() || !regPhone.trim() || !regPassword) {
      setErrorMessage('نام، شماره همراه و کلمه عبور الزامی هستند.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword,
          otpCode: regOtpCode.trim() || undefined,
          captchaToken,
          mathAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت‌نام');

      localStorage.setItem('auth_token', data.token);
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ثبت نام');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In with real OAuth popup
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (!res.ok || !data.configured || !data.url) {
        throw new Error(data.error || 'ورود با گوگل هنوز در پنل مدیریت پیکربندی نشده است. مدیر سامانه باید شناسه Client ID را در تب امنیت پنل مدیریت وارد کند.');
      }

      const width = 520;
      const height = 660;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!authWindow) {
        throw new Error('مرورگر از باز شدن پنجره پاپ‌آپ گوگل جلوگیری کرد. لطفاً اجازه باز شدن پنجره پاپ‌آپ را صادر فرمایید.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ورود با گوگل');
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Login
  const handleQuickLogin = async (identifier: string, pass: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoginIdentifier(identifier);
    setLoginPassword(pass);
    setAuthMode('password');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          phone: identifier,
          email: identifier,
          password: pass,
          mode: 'password',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطای ورود به حساب');

      localStorage.setItem('auth_token', data.token);
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ورود به حساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-['Vazirmatn'] selection:bg-amber-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white">{seoConfig?.siteTitle || 'سامانه هوشمند ترجمه کتاب'}</h1>
              <p className="text-xs text-slate-400">درگاه امن احراز هویت و ورود یکپارچه کاربران</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Link Share Button */}
            <button
              onClick={handleCopyDirectLink}
              title="کپی لینک اختصاصی صفحه ورود برای ارسال به کاربران"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedLink ? 'لینک کپی شد!' : 'کپی لینک مستقیم ورود'}</span>
            </button>

            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>صفحه اصلی سایت</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />



          {/* Direct Google Sign-In */}
          {googleOAuthEnabled && (
            <>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-lg shadow-white/5 transition flex items-center justify-center gap-2.5 border border-slate-200"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>ورود با حساب کاربری گوگل</span>
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-[10px]">یا ورود با شماره همراه / کلمه عبور</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </>
          )}

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6 text-xs font-semibold">
            <button
              onClick={() => { setAuthMode('otp'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'otp' ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>پیامک ورود</span>
            </button>
            <button
              onClick={() => { setAuthMode('password'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'password' ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>کلمه عبور</span>
            </button>
            <button
              onClick={() => { setAuthMode('register'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'register' ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ثبت‌نام جدید</span>
            </button>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: OTP FAST LOGIN */}
          {authMode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  شماره تلفن همراه شما:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="09121234567"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    disabled={isOtpSent}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none transition-all pl-11"
                  />
                  <Smartphone className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {!isOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !otpPhone}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                  <span>{sendingOtp ? 'در حال ارسال پیامک ملی‌پیامک...' : 'ارسال کد تایید یک‌بارمصرف'}</span>
                </button>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        کد تایید ۶ رقمی دریافت شده:
                      </label>
                      <button
                        type="button"
                        onClick={() => { setIsOtpSent(false); setOtpCode(''); }}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        تغییر شماره
                      </button>
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={6}
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono text-lg text-center tracking-widest focus:border-amber-500 focus:outline-none"
                    />
                  </div>



                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {otpCountdown > 0 ? (
                        <>ارسال مجدد تا <span className="font-mono text-amber-400">{Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}</span></>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-amber-400 font-semibold hover:underline"
                        >
                          ارسال مجدد پیامک
                        </button>
                      )}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 4}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    <span>تایید کد و ورود به حساب</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: PASSWORD LOGIN */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  شماره تلفن همراه یا ایمیل:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="09121234567 یا ایمیل"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none pl-11"
                  />
                  <UserIcon className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  کلمه عبور:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    dir="ltr"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none pl-11"
                  />
                  <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Anti-Bot Captcha (Google reCAPTCHA / Cloudflare Turnstile / Math) */}
              <CaptchaWidget
                action="login"
                onTokenChange={setCaptchaToken}
                onMathAnswerChange={setMathAnswer}
              />

              <button
                type="submit"
                disabled={loading || !loginIdentifier || !loginPassword}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                <span>ورود به حساب کاربری</span>
              </button>
            </form>
          )}

          {/* TAB 3: REGISTER */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نام و نام خانوادگی:
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: علی رضایی"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  شماره تلفن همراه:
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="09121234567"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendRegOtp}
                    disabled={sendingOtp || !regPhone}
                    className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs shrink-0"
                  >
                    {sendingOtp ? 'در حال ارسال...' : isRegOtpSent ? 'ارسال مجدد' : 'ارسال کد'}
                  </button>
                </div>
              </div>

              {isRegOtpSent && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    کد تایید پیامکی:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="کد ۶ رقمی"
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono text-center text-xs focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ایمیل (اختیاری):
                </label>
                <input
                  type="email"
                  dir="ltr"
                  placeholder="name@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  کلمه عبور:
                </label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="حداقل ۶ کاراکتر"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>با عضویت اولیه، اعتبار هدیه ترجمه رایگان به کیف پول شما اختصاص می‌یابد.</span>
              </div>

              {/* Anti-Bot Captcha (Google reCAPTCHA / Cloudflare Turnstile / Math) */}
              <CaptchaWidget
                action="register"
                onTokenChange={setCaptchaToken}
                onMathAnswerChange={setMathAnswer}
              />

              <button
                type="submit"
                disabled={loading || !regName || !regPhone || !regPassword}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                <span>ثبت نام و ورود به پنل کاربری</span>
              </button>
            </form>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-4 text-center text-xs text-slate-400">
        <p>کلیه حقوق محفوظ است © سامانه هوشمند ترجمه کتاب و مقالات تخصصی</p>
      </footer>
    </div>
  );
}
