import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface CaptchaConfig {
  enabled: boolean;
  provider: 'math' | 'recaptcha' | 'turnstile';
  recaptchaVersion?: 'v2' | 'v3';
  siteKey: string;
  requiredForLogin: boolean;
  requiredForRegister: boolean;
}

interface CaptchaWidgetProps {
  action: 'login' | 'register';
  onTokenChange: (token: string) => void;
  onMathAnswerChange?: (answer: string) => void;
  className?: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (callback: () => void) => void;
      execute?: (siteKey: string, options?: { action?: string }) => Promise<string>;
      render?: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback: (response: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'dark' | 'light';
          hl?: string;
        }
      ) => number;
      reset?: (widgetId?: number) => void;
    };
    turnstile?: {
      render?: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          theme?: 'dark' | 'light';
        }
      ) => string;
      reset?: (widgetId?: string) => void;
    };
  }
}

export function CaptchaWidget({ action, onTokenChange, onMathAnswerChange, className = '' }: CaptchaWidgetProps) {
  const [config, setConfig] = useState<CaptchaConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | string | null>(null);

  // Math fallback state
  const [mathQ, setMathQ] = useState(() => {
    const a = Math.floor(2 + Math.random() * 8);
    const b = Math.floor(1 + Math.random() * 9);
    return { a, b, answer: a + b };
  });
  const [userMathInput, setUserMathInput] = useState('');

  const refreshMath = () => {
    const a = Math.floor(2 + Math.random() * 8);
    const b = Math.floor(1 + Math.random() * 9);
    setMathQ({ a, b, answer: a + b });
    setUserMathInput('');
    if (onMathAnswerChange) onMathAnswerChange('');
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/public/captcha-config')
      .then((res) => res.json())
      .then((data: CaptchaConfig) => {
        if (isMounted) {
          setConfig(data);
          setLoadingConfig(false);
        }
      })
      .catch((err) => {
        console.warn('[Captcha] Failed to fetch config, fallback to math:', err);
        if (isMounted) {
          setConfig({
            enabled: true,
            provider: 'math',
            siteKey: '',
            requiredForLogin: false,
            requiredForRegister: true,
          });
          setLoadingConfig(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const [v3Ready, setV3Ready] = useState(false);
  const [v3Executing, setV3Executing] = useState(false);

  // Helper to execute reCAPTCHA v3
  const executeV3 = (siteKeyToUse?: string) => {
    const key = siteKeyToUse || config?.siteKey?.trim();
    if (!key) return;
    if (typeof window.grecaptcha?.ready === 'function' && typeof window.grecaptcha?.execute === 'function') {
      setV3Executing(true);
      window.grecaptcha.ready(() => {
        window.grecaptcha!
          .execute!(key, { action })
          .then((token: string) => {
            setV3Ready(true);
            setV3Executing(false);
            onTokenChange(token);
          })
          .catch((err) => {
            console.warn('[reCAPTCHA v3] Execution error:', err);
            setV3Executing(false);
          });
      });
    }
  };

  // When config is loaded, if it's recaptcha or turnstile, initialize widget
  useEffect(() => {
    if (!config || !config.enabled) return;
    const isRequired = action === 'login' ? config.requiredForLogin : config.requiredForRegister;
    if (!isRequired) return;

    if (config.provider === 'recaptcha' && config.siteKey) {
      const isV3 = config.recaptchaVersion === 'v3';

      if (isV3) {
        // reCAPTCHA v3 initialization
        const scriptId = 'google-recaptcha-v3-script';
        const cleanKey = config.siteKey.trim();

        const triggerV3 = () => {
          executeV3(cleanKey);
        };

        if (typeof window.grecaptcha?.ready === 'function') {
          triggerV3();
        } else if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(cleanKey)}&hl=fa`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            const timer = setInterval(() => {
              if (typeof window.grecaptcha?.ready === 'function') {
                clearInterval(timer);
                triggerV3();
              }
            }, 100);
            setTimeout(() => clearInterval(timer), 5000);
          };
          document.head.appendChild(script);
        } else {
          const timer = setInterval(() => {
            if (typeof window.grecaptcha?.ready === 'function') {
              clearInterval(timer);
              triggerV3();
            }
          }, 150);
          setTimeout(() => clearInterval(timer), 5000);
        }
      } else {
        // reCAPTCHA v2 Checkbox initialization
        const renderRecaptcha = () => {
          if (!containerRef.current || !window.grecaptcha || typeof window.grecaptcha.render !== 'function') return;
          // Clear previous children
          containerRef.current.innerHTML = '';
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: config.siteKey.trim(),
              theme: 'dark',
              hl: 'fa',
              callback: (token: string) => {
                onTokenChange(token);
              },
              'expired-callback': () => {
                onTokenChange('');
              },
              'error-callback': () => {
                console.warn('[reCAPTCHA] Encountered error rendering');
              },
            });
          } catch (err) {
            console.warn('[reCAPTCHA] render error (might be already rendered):', err);
          }
        };

        if (typeof window.grecaptcha?.render === 'function') {
          renderRecaptcha();
        } else {
          const scriptId = 'google-recaptcha-script';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&hl=fa';
            script.async = true;
            script.defer = true;
            script.onload = () => {
              const timer = setInterval(() => {
                if (typeof window.grecaptcha?.render === 'function') {
                  clearInterval(timer);
                  renderRecaptcha();
                }
              }, 100);
              setTimeout(() => clearInterval(timer), 5000);
            };
            document.head.appendChild(script);
          } else {
            const timer = setInterval(() => {
              if (typeof window.grecaptcha?.render === 'function') {
                clearInterval(timer);
                renderRecaptcha();
              }
            }, 150);
            setTimeout(() => clearInterval(timer), 5000);
          }
        }
      }
    } else if (config.provider === 'turnstile' && config.siteKey) {
      const renderTurnstile = () => {
        if (!containerRef.current || typeof window.turnstile?.render !== 'function') return;
        containerRef.current.innerHTML = '';
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: config.siteKey.trim(),
            theme: 'dark',
            callback: (token: string) => {
              onTokenChange(token);
            },
            'expired-callback': () => {
              onTokenChange('');
            },
          });
        } catch (e) {
          console.warn('[Turnstile] render error:', e);
        }
      };

      if (typeof window.turnstile?.render === 'function') {
        renderTurnstile();
      } else {
        const scriptId = 'cf-turnstile-script';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            const timer = setInterval(() => {
              if (typeof window.turnstile?.render === 'function') {
                clearInterval(timer);
                renderTurnstile();
              }
            }, 100);
            setTimeout(() => clearInterval(timer), 5000);
          };
          document.head.appendChild(script);
        }
      }
    }
  }, [config, action]);

  if (loadingConfig) {
    return null;
  }

  if (!config || !config.enabled) {
    return null;
  }

  const isRequired = action === 'login' ? config.requiredForLogin : config.requiredForRegister;
  if (!isRequired) {
    return null;
  }

  // 1. Google reCAPTCHA
  if (config.provider === 'recaptcha') {
    if (!config.siteKey) {
      return (
        <div className={`p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs ${className}`}>
          <div className="flex items-center gap-2 mb-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>تنظیمات Google reCAPTCHA کامل نیست (کلید Site Key در پنل مدیریت خالی است).</span>
          </div>
          <p className="text-[11px] text-slate-300 mb-3">برای ادامه، پاسخ سوال امنیتی زیر را وارد فرمایید:</p>
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="font-mono text-amber-400 font-bold text-sm">
              {mathQ.a} + {mathQ.b} =
            </span>
            <input
              type="number"
              value={userMathInput}
              onChange={(e) => {
                setUserMathInput(e.target.value);
                if (onMathAnswerChange) onMathAnswerChange(e.target.value);
                if (Number(e.target.value) === mathQ.answer) {
                  onTokenChange('math_verified_ok');
                } else {
                  onTokenChange('');
                }
              }}
              placeholder="پاسخ"
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs text-center focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={refreshMath}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="سوال جدید"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // reCAPTCHA v3 Display
    if (config.recaptchaVersion === 'v3') {
      return (
        <div className={`flex items-center justify-between p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block text-xs">
                حفاظت هوشمند ضدربات گوگل (Google reCAPTCHA v3)
              </span>
              <span className="text-[10px] text-emerald-300/80">
                {v3Executing ? 'در حال بررسی امنیتی...' : v3Ready ? 'اعتبارسنجی خودکار بدون نیاز به کلیک تایید شد' : 'اتصال امن برقرار شد'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => executeV3()}
            disabled={v3Executing}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition"
            title="به‌روزرسانی اعتبارسنجی گوگل"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${v3Executing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      );
    }

    // reCAPTCHA v2 Checkbox Display
    return (
      <div className={`flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950/80 border border-slate-800 ${className}`}>
        <div ref={containerRef} className="my-1 overflow-hidden rounded-xl" />
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>حفاظت امنیتی رسمی گوگل (Google reCAPTCHA v2 - چک‌باکس من ربات نیستم)</span>
        </div>
      </div>
    );
  }

  // 2. Cloudflare Turnstile
  if (config.provider === 'turnstile') {
    if (!config.siteKey) {
      return (
        <div className={`p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs ${className}`}>
          <span>کلید سایت Cloudflare تنظیم نشده است.</span>
        </div>
      );
    }
    return (
      <div className={`flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950/80 border border-slate-800 ${className}`}>
        <div ref={containerRef} className="my-1" />
        <span className="text-[10px] text-slate-400">سرویس ضد ربات کلادفلر (Cloudflare Turnstile)</span>
      </div>
    );
  }

  // 3. Math Captcha
  return (
    <div className={`p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-slate-300 text-[11px] font-medium">کد امنیتی:</span>
        <span className="font-mono text-amber-400 font-bold bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-sm">
          {mathQ.a} + {mathQ.b} =
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={userMathInput}
          onChange={(e) => {
            const val = e.target.value;
            setUserMathInput(val);
            if (onMathAnswerChange) onMathAnswerChange(val);
            if (Number(val) === mathQ.answer) {
              onTokenChange('math_passed');
            } else {
              onTokenChange('');
            }
          }}
          placeholder="پاسخ؟"
          className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs text-center focus:border-amber-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={refreshMath}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          title="تغییر سوال ریاضی"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
