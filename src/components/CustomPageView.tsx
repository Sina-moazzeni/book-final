import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe, Lock, ShieldCheck, Sparkles, Home, LogIn } from 'lucide-react';
import { CustomPage, HeaderFooterConfig, User } from '../types.ts';

interface CustomPageViewProps {
  slug: string;
  headerFooter?: HeaderFooterConfig;
  currentUser?: User | null;
  onBack: () => void;
  onOpenAuth?: (tab: 'login' | 'register') => void;
  onNavigatePage?: (newSlug: string) => void;
}

export function CustomPageView({
  slug,
  headerFooter,
  currentUser,
  onBack,
  onOpenAuth,
  onNavigatePage,
}: CustomPageViewProps) {
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/custom-pages/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'برگه مورد نظر یافت نشد یا منتشر نشده است.');
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPage(data.page);
          if (data.page?.title) {
            document.title = `${data.page.title} | سامانه ترجمه کتاب`;
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Intercept in-page links to other custom pages (/page/xyz), auth triggers, or back to home
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a, button');
    if (!target) return;

    const href = target.getAttribute('href') || '';
    const dataAuth = target.getAttribute('data-auth');

    // Auth Triggers
    if (
      dataAuth === 'login' ||
      dataAuth === 'register' ||
      href === '#login' ||
      href === '/login' ||
      href === '#register' ||
      href === '/register' ||
      href === '#auth' ||
      target.classList.contains('auth-trigger')
    ) {
      e.preventDefault();
      const tab = (dataAuth === 'register' || href.includes('register')) ? 'register' : 'login';
      if (onOpenAuth) onOpenAuth(tab);
      return;
    }

    // Home link
    if (href === '/' || href === '#home') {
      e.preventDefault();
      onBack();
      return;
    }

    // Custom Pages (/page/...)
    if (href.startsWith('/page/')) {
      e.preventDefault();
      const nextSlug = href.replace('/page/', '');
      if (onNavigatePage) {
        onNavigatePage(nextSlug);
      } else {
        window.location.href = href;
      }
      return;
    }
  };

  const hasCustomHeader = Boolean(headerFooter?.enabled && headerFooter.headerHtml && headerFooter.headerHtml.trim() && headerFooter.applyToAllPages !== false);
  const hasCustomFooter = Boolean(headerFooter?.enabled && headerFooter.footerHtml && headerFooter.footerHtml.trim() && headerFooter.applyToAllPages !== false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Vazirmatn'] selection:bg-amber-500/30">
      {/* Custom Global CSS Injection if provided in Header/Footer Designer */}
      {headerFooter?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: headerFooter.customCss }} />
      )}

      {/* Header: Custom Designed Header (REPLACES top bar) OR Universal App Top Bar */}
      {hasCustomHeader ? (
        <div
          id="custom-header-wrapper"
          className="w-full relative z-40"
          dangerouslySetInnerHTML={{ __html: headerFooter?.headerHtml || '' }}
          onClick={handleContainerClick}
        />
      ) : (
        <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span>بازگشت به سامانه</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono" dir="ltr">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200">/page/{slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser ? (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-medium">
                  وارد شده: {currentUser.name}
                </span>
              ) : (
                onOpenAuth && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenAuth('login')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1"
                    >
                      <LogIn className="w-3.5 h-3.5 text-amber-400" />
                      <span>ورود</span>
                    </button>
                    <button
                      onClick={() => onOpenAuth('register')}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
                    >
                      ثبت‌نام سریع
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12" onClick={handleContainerClick}>
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">در حال بارگذاری برگه...</p>
          </div>
        ) : error || !page ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-white mb-2">برگه یافت نشد</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {error || 'این برگه حذف شده یا آدرس وارد شده معتبر نمی‌باشد.'}
            </p>
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              بازگشت به صفحه اصلی
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
            {/* Page Header / Breadcrumb */}
            <div className="pb-6 mb-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{page.title}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                https://translator.ir/page/{page.slug}
              </div>
            </div>

            {/* Custom User HTML Content */}
            <div
              className="custom-html-content prose prose-invert max-w-none text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: page.htmlContent }}
            />
          </div>
        )}
      </main>

      {/* Custom Designed Footer (HTML) */}
      {headerFooter?.enabled && headerFooter.footerHtml && (
        <div
          dangerouslySetInnerHTML={{ __html: headerFooter.footerHtml }}
          onClick={handleContainerClick}
        />
      )}
    </div>
  );
}
