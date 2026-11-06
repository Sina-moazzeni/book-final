/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ProjectHeader } from './components/ProjectHeader.tsx';
import { ChunkListSidebar } from './components/ChunkListSidebar.tsx';

// Code-split heavy views and modals for sub-second FCP and minimal bundle size
const DedicatedAuthPage = React.lazy(() => import('./components/DedicatedAuthPage.tsx').then(m => ({ default: m.DedicatedAuthPage })));
const CustomPageView = React.lazy(() => import('./components/CustomPageView.tsx').then(m => ({ default: m.CustomPageView })));
const BlogView = React.lazy(() => import('./components/BlogView.tsx').then(m => ({ default: m.BlogView })));
const AdminPanel = React.lazy(() => import('./components/AdminPanel.tsx').then(m => ({ default: m.AdminPanel })));
const UserDashboard = React.lazy(() => import('./components/UserDashboard.tsx').then(m => ({ default: m.UserDashboard })));
const TranslationWorkspace = React.lazy(() => import('./components/TranslationWorkspace.tsx').then(m => ({ default: m.TranslationWorkspace })));
const WalletModal = React.lazy(() => import('./components/WalletModal.tsx').then(m => ({ default: m.WalletModal })));
const NewBookModal = React.lazy(() => import('./components/NewBookModal.tsx').then(m => ({ default: m.NewBookModal })));
const GlossaryModal = React.lazy(() => import('./components/GlossaryModal.tsx').then(m => ({ default: m.GlossaryModal })));
const FindReplaceModal = React.lazy(() => import('./components/FindReplaceModal.tsx').then(m => ({ default: m.FindReplaceModal })));
const ServerStatusModal = React.lazy(() => import('./components/ServerStatusModal.tsx').then(m => ({ default: m.ServerStatusModal })));
const ProviderManagerModal = React.lazy(() => import('./components/ProviderManagerModal.tsx').then(m => ({ default: m.ProviderManagerModal })));
const BooksLibraryModal = React.lazy(() => import('./components/BooksLibraryModal.tsx').then(m => ({ default: m.BooksLibraryModal })));
const ExportDesignModal = React.lazy(() => import('./components/ExportDesignModal.tsx').then(m => ({ default: m.ExportDesignModal })));
const TokenEstimatorModal = React.lazy(() => import('./components/TokenEstimatorModal.tsx').then(m => ({ default: m.TokenEstimatorModal })));
const PrintDocument = React.lazy(() => import('./components/PrintDocument.tsx').then(m => ({ default: m.PrintDocument })));
const AddPageModal = React.lazy(() => import('./components/AddPageModal.tsx').then(m => ({ default: m.AddPageModal })));
import type { AddPagePayload } from './components/AddPageModal.tsx';

import {
  BookProject,
  BookChunk,
  ServerStatusResponse,
  GlossaryItem,
  AIProviderConfig,
  APIServerEndpoint,
  User,
  TranslationJob,
  SystemSettings,
  HeaderFooterConfig,
  CustomPage,
  ScriptsInjectionConfig,
} from './types.ts';
import { SAMPLE_BOOKS, SampleBook } from './utils/sampleBooks.ts';
import { chunkBookText } from './utils/chunker.ts';
import { DEFAULT_GLOSSARIES } from './constants/tones.ts';
import { DEFAULT_PROVIDERS } from './constants/providers.ts';
import { DEFAULT_DESIGN_CONFIG } from './constants/themes.ts';
import { resolveApiUrl } from './utils/aiClient.ts';

const STORAGE_KEY_AUTH_TOKEN = 'auth_token';
const STORAGE_KEY_ACTIVE_BOOK = 'persian_book_translator_active_id_v4';

export default function App() {
  // Authentication & View State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'otp'>('login');
  const [activeAuthPage, setActiveAuthPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('page') === 'login' || params.get('auth') === 'login' || params.get('auth') === '1';
    }
    return false;
  });

  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'canceled'; message: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('payment');
      const amount = params.get('amount');
      const tracking = params.get('trackingCode');
      if (p === 'success') {
        return {
          type: 'success',
          message: `پرداخت با موفقیت انجام شد و مبلغ ${Number(amount || 0).toLocaleString('en-US')} تومان به موجودی کیف پول افزوده گردید. کد پیگیری شاپرک: ${tracking || 'ثبت شده'}`,
        };
      } else if (p === 'canceled') {
        return {
          type: 'canceled',
          message: 'عملیات پرداخت در درگاه بانکی توسط کاربر لغو گردید.',
        };
      }
    }
    return null;
  });

  // Navigation View: 'dashboard' (User Panel), 'workspace' (Reader/Editor), 'admin' (Admin Panel)
  const [currentView, setCurrentView] = useState<'dashboard' | 'workspace' | 'admin'>('dashboard');

  // SaaS Settings & Public CMS
  const [cmsConfig, setCmsConfig] = useState<any>(null);
  const [seoConfig, setSeoConfig] = useState<SystemSettings['seo'] | undefined>(undefined);
  const [costPerWord, setCostPerWord] = useState<number>(45);
  const [headerFooter, setHeaderFooter] = useState<HeaderFooterConfig | undefined>(undefined);
  const [customPagesList, setCustomPagesList] = useState<Array<{ id: string; title: string; slug: string; metaDescription?: string; showInHeader?: boolean; showInFooter?: boolean }>>([]);
  const [activeCustomPageSlug, setActiveCustomPageSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/page/')) {
      return window.location.pathname.replace('/page/', '');
    }
    return null;
  });
  const [activeBlogSlug, setActiveBlogSlug] = useState<string | null | false>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/blog' || window.location.pathname === '/blog/') {
        return null; // list view
      }
      if (window.location.pathname.startsWith('/blog/')) {
        return window.location.pathname.replace('/blog/', ''); // article slug
      }
    }
    return false; // not on blog
  });
  const [scriptsInjection, setScriptsInjection] = useState<ScriptsInjectionConfig | undefined>(undefined);

  // User Books & Jobs
  const [books, setBooks] = useState<BookProject[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_BOOK) || '';
    }
    return '';
  });
  const [activeJobs, setActiveJobs] = useState<TranslationJob[]>([]);

  // Modals
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [isFindReplaceModalOpen, setIsFindReplaceModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [addPageDefaultTargetChunkId, setAddPageDefaultTargetChunkId] = useState<string | undefined>(undefined);
  const [addPageDefaultPosition, setAddPageDefaultPosition] = useState<'start' | 'end' | 'before' | 'after'>('after');

  // Active translation chunk in workspace
  const [activeChunkId, setActiveChunkId] = useState<string>('');
  const [loadingWorkspaceBookId, setLoadingWorkspaceBookId] = useState<string | null>(null);
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);
  const [isStoppingBatch, setIsStoppingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, secondsToNextCall: 0 });
  const isBatchCancelledRef = useRef(false);

  // Synchronized refs to prevent stale closure bugs in polling intervals and background syncs
  const activeBookIdRef = useRef<string>(activeBookId);
  const activeChunkIdRef = useRef<string>(activeChunkId);
  const isFetchingChunksRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    activeBookIdRef.current = activeBookId;
  }, [activeBookId]);

  useEffect(() => {
    activeChunkIdRef.current = activeChunkId;
  }, [activeChunkId]);

  // Mobile Workspace active tab: 'editor' (translation views) vs 'chunks' (list of chapters/chunks)
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'editor' | 'chunks'>('editor');

  // Active project helper with guaranteed arrays
  const rawProject = books.find((b) => b.id === activeBookId) || books[0];
  const project: BookProject = rawProject
    ? {
        ...rawProject,
        chunks: Array.isArray(rawProject.chunks) ? rawProject.chunks : [],
        glossary: Array.isArray(rawProject.glossary) ? rawProject.glossary : [],
      }
    : {
        id: 'placeholder_book',
        title: 'کتاب جدید',
        originalTitle: 'New Book',
        author: 'نامشخص',
        translator: 'سامانه ترجمه',
        tone: 'spiritual',
        model: 'gemini-3.5-flash-lite',
        glossary: [],
        chunks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

  // Connected API Servers Pool
  const [serverPool, setServerPool] = useState<APIServerEndpoint[]>([
    {
      id: 'srv_gemini_primary',
      name: 'سرور ۱: Gemini 3.5 Flash-Lite (اصلی)',
      providerType: 'gemini',
      baseURL: '',
      apiKey: '',
      model: 'gemini-3.5-flash-lite',
      isEnabled: true,
      priority: 1,
      status: 'active',
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
    },
    {
      id: 'srv_gemini_lite',
      name: 'سرور ۲: Gemini 3.1 Flash-Lite (پشتیبان)',
      providerType: 'gemini',
      baseURL: '',
      apiKey: '',
      model: 'gemini-3.1-flash-lite',
      isEnabled: true,
      priority: 2,
      status: 'active',
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
    },
  ]);

  const [providers, setProviders] = useState<AIProviderConfig[]>(DEFAULT_PROVIDERS);
  const [activeProviderId, setActiveProviderId] = useState<string>('prov_gemini');
  const [serverStatus, setServerStatus] = useState<ServerStatusResponse | null>(null);

  // 1. Initial Load: Public Config & Validate Auth Token
  useEffect(() => {
    // Fetch public CMS, pricing, header/footer, custom pages, and scripts injection
    fetch('/api/public/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.cms) setCmsConfig(data.cms);
        if (data.seo) {
          setSeoConfig(data.seo);
          if (data.seo.siteTitle) document.title = data.seo.siteTitle;
          if (data.seo.metaDescription) {
            const m = document.querySelector('meta[name="description"]');
            if (m) m.setAttribute('content', data.seo.metaDescription);
          }
        }
        if (data.pricing?.costPerWord) setCostPerWord(data.pricing.costPerWord);
        if (data.headerFooter) setHeaderFooter(data.headerFooter);
        if (data.customPages) setCustomPagesList(data.customPages);
        if (data.scriptsInjection) {
          setScriptsInjection(data.scriptsInjection);
          injectCustomScripts(data.scriptsInjection);
        }
      })
      .catch((err) => console.warn('Could not load public config', err));

    // Check auth session
    const storedToken = localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    if (storedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          if (res.status === 401) throw new Error('Session invalid');
          throw new Error('Server temporarily unavailable');
        })
        .then((data) => {
          // Retain token on currentUser so all downstream calls have access to it
          setCurrentUser({ ...data.user, token: storedToken });
          setAuthToken(storedToken);
          fetchUserBooks(storedToken);
          fetchActiveJobs(storedToken);
        })
        .catch((err) => {
          if (err.message === 'Session invalid') {
            console.warn('[Auth] Session was rejected by server, clearing token.');
            localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
            setAuthToken(null);
            setCurrentUser(null);
          } else {
            console.warn('[Auth] Transient server check error, retaining session state:', err.message);
          }
        })
        .finally(() => setIsAuthLoading(false));
    } else {
      setIsAuthLoading(false);
    }

    const handlePricingEvent = (e: any) => {
      if (e.detail?.costPerWord) {
        setCostPerWord(Number(e.detail.costPerWord));
      }
    };
    window.addEventListener('pricing-updated', handlePricingEvent);

    return () => {
      window.removeEventListener('pricing-updated', handlePricingEvent);
    };
  }, []);

  // Inject Google Search Console, Google Analytics, GTM, and custom scripts
  const injectCustomScripts = (scripts: ScriptsInjectionConfig) => {
    if (!scripts || !scripts.enabled) return;

    // 1. Google Search Console Verification Meta Tag
    if (scripts.googleSearchConsoleVerification) {
      let contentVal = scripts.googleSearchConsoleVerification.trim();
      const match = contentVal.match(/content=["']([^"']+)["']/i);
      if (match) contentVal = match[1];
      if (contentVal) {
        let metaTag = document.querySelector('meta[name="google-site-verification"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', 'google-site-verification');
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', contentVal);
      }
    }

    // 2. Google Analytics 4 (GA4)
    if (scripts.googleAnalyticsId && !document.getElementById('ga4-script')) {
      const gaId = scripts.googleAnalyticsId.trim();
      const gaScript = document.createElement('script');
      gaScript.id = 'ga4-script';
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(gaScript);

      const initScript = document.createElement('script');
      initScript.id = 'ga4-inline-init';
      initScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(initScript);
    }

    // 3. Google Tag Manager (GTM)
    if (scripts.googleTagManagerId && !document.getElementById('gtm-script')) {
      const gtmId = scripts.googleTagManagerId.trim();
      const gtmScript = document.createElement('script');
      gtmScript.id = 'gtm-script';
      gtmScript.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(gtmScript);
    }

    // 4. Custom Header Scripts (<head>)
    if (scripts.headerScripts) {
      let container = document.getElementById('custom-header-scripts-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'custom-header-scripts-container';
        document.head.appendChild(container);
      }
      container.innerHTML = scripts.headerScripts;
      const scriptsInContainer = container.querySelectorAll('script');
      scriptsInContainer.forEach((s) => {
        const newScript = document.createElement('script');
        Array.from(s.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.innerHTML = s.innerHTML;
        s.parentNode?.replaceChild(newScript, s);
      });
    }

    // 5. Custom Footer Scripts (<body> End)
    if (scripts.footerScripts) {
      let container = document.getElementById('custom-footer-scripts-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'custom-footer-scripts-container';
        document.body.appendChild(container);
      }
      container.innerHTML = scripts.footerScripts;
      const scriptsInContainer = container.querySelectorAll('script');
      scriptsInContainer.forEach((s) => {
        const newScript = document.createElement('script');
        Array.from(s.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.innerHTML = s.innerHTML;
        s.parentNode?.replaceChild(newScript, s);
      });
    }
  };

  // Listen for browser forward/back buttons on custom page paths and blog paths
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/page/')) {
        setActiveCustomPageSlug(path.replace('/page/', ''));
        setActiveBlogSlug(false);
      } else if (path === '/blog' || path === '/blog/') {
        setActiveBlogSlug(null);
        setActiveCustomPageSlug(null);
      } else if (path.startsWith('/blog/')) {
        setActiveBlogSlug(path.replace('/blog/', ''));
        setActiveCustomPageSlug(null);
      } else {
        setActiveCustomPageSlug(null);
        setActiveBlogSlug(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenCustomPage = (slug: string) => {
    setActiveCustomPageSlug(slug);
    setActiveBlogSlug(false);
    window.history.pushState({}, '', `/page/${slug}`);
  };

  const handleBackFromCustomPage = () => {
    setActiveCustomPageSlug(null);
    window.history.pushState({}, '', '/');
  };

  const handleOpenBlog = (categorySlug?: string) => {
    setActiveBlogSlug(null);
    setActiveCustomPageSlug(null);
    const url = categorySlug && categorySlug !== 'all' ? `/blog?category=${encodeURIComponent(categorySlug)}` : '/blog';
    window.history.pushState({}, '', url);
  };

  const handleOpenBlogPost = (slug: string) => {
    setActiveBlogSlug(slug);
    setActiveCustomPageSlug(null);
    window.history.pushState({}, '', `/blog/${slug}`);
  };

  const handleBackFromBlog = () => {
    setActiveBlogSlug(false);
    window.history.pushState({}, '', '/');
  };

  // 2. Smart Background Polling for Active Jobs (Bandwidth-efficient)
  // Only polls lightweight job status (/api/jobs/my-active, <1KB).
  // NEVER blindly re-downloads all heavy user books and base64 images every 4 seconds!
  const prevActiveJobsRef = useRef<TranslationJob[]>([]);

  useEffect(() => {
    if (!authToken || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/jobs/my-active', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const newJobs: TranslationJob[] = data.jobs || [];
          setActiveJobs(newJobs);

          // Check if any job completed or made progress before fetching user books
          const prevRunning = prevActiveJobsRef.current.some(
            (j) => j.status === 'queued' || j.status === 'processing'
          );
          const nowRunning = newJobs.some(
            (j) => j.status === 'queued' || j.status === 'processing'
          );

          if (prevRunning && !nowRunning) {
            // Background cloud translation finished! Sync books and force reload active book chunks
            fetchUserBooks(authToken, true);
            if (activeBookIdRef.current) {
              ensureBookChunksLoaded(activeBookIdRef.current, true);
            }
          } else if (prevRunning && nowRunning) {
            // Check if chunk counter progressed
            const prevChunks = prevActiveJobsRef.current.reduce((acc, j) => acc + (j.completedChunks || 0), 0);
            const nowChunks = newJobs.reduce((acc, j) => acc + (j.completedChunks || 0), 0);
            if (nowChunks > prevChunks) {
              fetchUserBooks(authToken, true);
              if (activeBookIdRef.current) {
                const activeJob = newJobs.find((j) => j.bookId === activeBookIdRef.current);
                if (activeJob) {
                  ensureBookChunksLoaded(activeBookIdRef.current, true);
                }
              }
            }
          }
          prevActiveJobsRef.current = newJobs;
        }
      } catch (e) {
        // silent network error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authToken, currentUser]);

  // Helper to load heavy book chunks on-demand (only when user enters workspace or exports)
  const ensureBookChunksLoaded = async (target: string | BookProject, forceReload: boolean = false): Promise<BookProject | null> => {
    const targetId = typeof target === 'string' ? target : target.id;
    if (!targetId) return null;

    if (isFetchingChunksRef.current[targetId]) {
      const existing = books.find((b) => b.id === targetId) || (typeof target !== 'string' ? target : null);
      return existing;
    }

    const existing = books.find((b) => b.id === targetId) || (typeof target !== 'string' ? target : null);
    const existingHasChunks = existing && Array.isArray(existing.chunks) && existing.chunks.length > 0;
    const existingCompletedCount = existingHasChunks
      ? existing.chunks.filter((c) => Boolean(c.translatedHtml && c.translatedHtml.trim())).length
      : 0;
    const serverCompletedCount = existing?.completedChunks || 0;

    // We can reuse in-memory chunks ONLY if:
    // 1. Not force reload
    // 2. We actually have chunks in memory
    // 3. If server reports completed chunks, our in-memory chunks must have at least that many translated chunks!
    if (!forceReload && existingHasChunks && (serverCompletedCount === 0 || existingCompletedCount >= serverCompletedCount)) {
      return existing;
    }

    try {
      isFetchingChunksRef.current[targetId] = true;
      const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_AUTH_TOKEN) : '') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/books/${targetId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.book) {
          const serverChunks = Array.isArray(data.book.chunks) ? data.book.chunks : [];
          // Preserve existing chunks if server returned empty chunks
          const finalChunks = serverChunks.length > 0 ? serverChunks : (existingHasChunks ? existing.chunks : []);
          const fullBook: BookProject = {
            ...data.book,
            chunks: finalChunks,
            glossary: Array.isArray(data.book.glossary) ? data.book.glossary : [],
          };
          setBooks((prev) => prev.map((b) => (b.id === targetId ? fullBook : b)));
          return fullBook;
        }
      } else if (res.status === 403 || res.status === 404) {
        // Book does not belong to user or was deleted
        setBooks((prev) => prev.filter((b) => b.id !== targetId));
        return null;
      }
    } catch (e) {
      console.warn('Error loading book chunks', e);
    } finally {
      isFetchingChunksRef.current[targetId] = false;
    }
    return existing;
  };

  // Dedicated function to switch and lock active book with immediate localStorage & ref synchronization
  const handleSelectBook = (selected: string | BookProject, targetView?: 'workspace' | 'dashboard') => {
    const targetId = typeof selected === 'string' ? selected : selected.id;
    if (!targetId) return;

    setActiveBookId(targetId);
    activeBookIdRef.current = targetId;
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_BOOK, targetId);
    } catch (e) {}

    // Ensure activeChunkId belongs to this book
    const targetBook = books.find((b) => b.id === targetId) || (typeof selected !== 'string' ? selected : undefined);
    if (targetBook && Array.isArray(targetBook.chunks) && targetBook.chunks.length > 0) {
      const hasCurrentChunk = targetBook.chunks.some((c) => c.id === activeChunkIdRef.current);
      if (!hasCurrentChunk) {
        const firstChunkId = targetBook.chunks[0].id;
        setActiveChunkId(firstChunkId);
        activeChunkIdRef.current = firstChunkId;
      }
    }

    if (targetView === 'workspace') {
      const targetBook = books.find((b) => b.id === targetId) || (typeof selected !== 'string' ? selected : undefined);
      const hasChunks = Boolean(targetBook?.chunks && targetBook.chunks.length > 0);

      // ONLY show the full-page loading spinner if the book has ZERO chunks in memory!
      if (!hasChunks) {
        setLoadingWorkspaceBookId(targetId);
      }
      setCurrentView('workspace');

      // Fetch fresh chunks (forced reload if no chunks, or silent background update if chunks already exist)
      ensureBookChunksLoaded(targetId, !hasChunks)
        .then((fullBook) => {
          if (fullBook && fullBook.chunks.length > 0) {
            if (!fullBook.chunks.some((c) => c.id === activeChunkIdRef.current)) {
              setActiveChunkId(fullBook.chunks[0].id);
              activeChunkIdRef.current = fullBook.chunks[0].id;
            }
          }
        })
        .finally(() => {
          setLoadingWorkspaceBookId(null);
        });
    } else if (targetView) {
      setCurrentView(targetView);
    }
  };

  // Auto-fetch chunks if current view is workspace and active book chunks haven't been loaded yet
  useEffect(() => {
    if (currentView === 'workspace' && activeBookId) {
      const active = books.find((b) => b.id === activeBookId);
      const hasChunks = Boolean(active?.chunks && active.chunks.length > 0);

      // ONLY trigger full-page loader if the active book has NO chunks in memory and is not already fetching
      if (active && !hasChunks && !isFetchingChunksRef.current[activeBookId]) {
        setLoadingWorkspaceBookId(activeBookId);
        ensureBookChunksLoaded(activeBookId, true).finally(() => {
          setLoadingWorkspaceBookId(null);
        });
      }
    }
  }, [currentView, activeBookId]);

  // Fetch user's books from server DB with active book preservation
  const fetchUserBooks = async (token: string, isSilent = false) => {
    try {
      const res = await fetch('/api/books', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const serverBooks = (data.books || []).map((b: any) => ({
          ...b,
          chunks: Array.isArray(b.chunks) ? b.chunks : [],
          glossary: Array.isArray(b.glossary) ? b.glossary : [],
        }));

        setBooks((prevBooks) => {
          return serverBooks.map((sb: any) => {
            const existing = prevBooks.find((p) => p.id === sb.id);
            if (existing && Array.isArray(existing.chunks) && existing.chunks.length > 0) {
              const existingCompletedCount = existing.chunks.filter((c: any) => Boolean(c.translatedHtml && c.translatedHtml.trim())).length;
              const serverCompletedCount = sb.completedChunks || 0;

              // If server has more completed chunks than in-memory chunks, SILENTLY update chunks in background:
              if (serverCompletedCount > existingCompletedCount && activeBookIdRef.current === sb.id) {
                setTimeout(() => {
                  ensureBookChunksLoaded(sb.id, true);
                }, 50);
              }

              // ALWAYS PRESERVE EXISTING CHUNKS! Never wipe out to empty []!
              return {
                ...sb,
                chunks: existing.chunks,
              };
            }
            return sb;
          });
        });

        if (serverBooks.length > 0) {
          const currentActive = activeBookIdRef.current || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ACTIVE_BOOK) : '') || '';
          const activeFound = serverBooks.find((b: any) => b.id === currentActive);

          if (activeFound) {
            // Book still exists on server - preserve the user's active book selection!
            if (activeBookIdRef.current !== activeFound.id) {
              setActiveBookId(activeFound.id);
              activeBookIdRef.current = activeFound.id;
            }
          } else {
            // Active book not set or was deleted from server - select first book
            const fallback = serverBooks[0];
            setActiveBookId(fallback.id);
            activeBookIdRef.current = fallback.id;
            try {
              localStorage.setItem(STORAGE_KEY_ACTIVE_BOOK, fallback.id);
            } catch (e) {}
            if (fallback.chunks?.length > 0) {
              setActiveChunkId(fallback.chunks[0].id);
              activeChunkIdRef.current = fallback.chunks[0].id;
            }
          }
        } else {
          setActiveBookId('');
          activeBookIdRef.current = '';
          setActiveChunkId('');
          activeChunkIdRef.current = '';
          try {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_BOOK);
          } catch (e) {}
        }
      }
    } catch (e) {
      if (!isSilent) console.warn('Error fetching books from server', e);
    }
  };

  // Fetch active background jobs
  const fetchActiveJobs = async (token: string) => {
    try {
      const res = await fetch('/api/jobs/my-active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveJobs(data.jobs || []);
      }
    } catch (e) {}
  };

  // Handle Successful Login / Register / Demo
  const handleAuthSuccess = (user: User, token: string) => {
    localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
    setAuthToken(token);
    setCurrentUser({ ...user, token });
    setBooks([]); // Immediately wipe previous user's books from memory
    setActiveJobs([]);
    setIsAuthModalOpen(false);
    setCurrentView('dashboard');
    fetchUserBooks(token);
    fetchActiveJobs(token);
  };

  // Handle Logout (Instant client-side clear & background server invalidate)
  const handleLogout = () => {
    const tokenToClear = authToken || localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_BOOK);
    } catch (e) {}
    setAuthToken(null);
    setCurrentUser(null);
    setBooks([]); // Immediately wipe books from memory on logout
    setActiveJobs([]);
    setCurrentView('dashboard');
    setActiveAuthPage(false);
    setActiveBookId('');
    activeBookIdRef.current = '';
    window.history.pushState({}, '', '/');

    if (tokenToClear) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenToClear}` },
      }).catch(() => {});
    }
  };

  // Create Book & Optionally Launch Background Cloud Translation
  const handleCreateBook = async (newBook: BookProject, startCloudTranslation = true) => {
    if (!authToken || !currentUser) return;

    try {
      const res = await fetch('/api/books/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: newBook.title,
          originalTitle: newBook.originalTitle,
          author: newBook.author,
          translator: newBook.translator,
          tone: newBook.tone,
          sourceLanguage: newBook.sourceLanguage || 'en',
          targetLanguage: newBook.targetLanguage || 'fa',
          chunks: newBook.chunks,
          glossary: newBook.glossary,
          startTranslation: startCloudTranslation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطا در ثبت کتاب');
        return;
      }

      if (data.updatedWalletBalance !== undefined) {
        setCurrentUser({ ...currentUser, walletBalance: data.updatedWalletBalance });
      }

      // Add to books list
      setBooks((prev) => [data.book, ...prev]);
      handleSelectBook(data.book, 'workspace');

      // Close modal and navigate immediately into workspace so user can review and edit pages first
      setIsNewBookModalOpen(false);

      // Refresh active jobs
      fetchActiveJobs(authToken);

      if (startCloudTranslation) {
        alert('🎉 کتاب با موفقیت ایجاد شد و ترجمه ابری در سرور آغاز گردید!');
      }
    } catch (err: any) {
      alert(`خطا در ارتباط با سرور: ${err.message}`);
    }
  };

  // Delete Book
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('آیا از حذف این کتاب و ترجمه‌های آن اطمینان دارید؟')) return;
    if (!authToken) return;

    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
        if (activeBookIdRef.current === bookId) {
          const remaining = books.filter((b) => b.id !== bookId);
          if (remaining.length > 0) {
            handleSelectBook(remaining[0]);
          } else {
            setActiveBookId('');
            activeBookIdRef.current = '';
            try {
              localStorage.removeItem(STORAGE_KEY_ACTIVE_BOOK);
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  };

  // Start Translation for Draft Book with Wallet Deduction
  const handleStartDraftTranslation = async (book: BookProject) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/books/${book.id}/start-translation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          if (confirm(`${data.error}\nآیا مایل به افزایش موجودی کیف پول هستید؟`)) {
            setIsWalletModalOpen(true);
          }
          return;
        }
        alert(data.error || 'خطا در شروع ترجمه');
        return;
      }
      alert('ترجمه ابری کتاب آغاز شد. هزینه از کیف پول کسر گردید.');
      if (data.updatedWalletBalance !== undefined && currentUser) {
        setCurrentUser({ ...currentUser, walletBalance: data.updatedWalletBalance });
      }
      fetchUserBooks(authToken);
      fetchActiveJobs(authToken);
    } catch (e) {}
  };

  // Stop active translation and refund remaining un-translated words
  const handleStopCloudTranslation = async (bookId: string) => {
    if (!authToken) return;
    if (!confirm('آیا مایل به توقف ترجمه هستید؟ هزینه کلمات باقی‌مانده و ترجمه‌نشده بلافاصله به کیف پول شما بازگردانده می‌شود.')) return;
    try {
      const res = await fetch(`/api/books/${bookId}/stop-translation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطا در توقف ترجمه');
        return;
      }

      alert(data.message || 'ترجمه متوقف و هزینه باقی‌مانده به کیف پول واریز شد.');

      if (data.updatedWalletBalance !== undefined && currentUser) {
        setCurrentUser({ ...currentUser, walletBalance: data.updatedWalletBalance });
      }

      fetchUserBooks(authToken);
      fetchActiveJobs(authToken);
    } catch (err: any) {
      alert(`خطا در ارتباط با سرور: ${err.message}`);
    }
  };

  // Online Delete Chunk / Page
  const handleDeleteChunk = async (chunkId: string) => {
    if (!authToken || !activeBookId) return;
    try {
      const res = await fetch(`/api/books/${activeBookId}/chunks/${chunkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطا در حذف صفحه');
        return;
      }

      setBooks((prev) => prev.map((b) => (b.id === activeBookId ? data.book : b)));
      if (activeChunkId === chunkId && data.book.chunks?.length > 0) {
        setActiveChunkId(data.book.chunks[0].id);
        activeChunkIdRef.current = data.book.chunks[0].id;
      }
    } catch (err: any) {
      alert(`خطا در حذف صفحه: ${err.message}`);
    }
  };

  // Online Add New Page / Chunk anywhere in the active book
  const handleAddChunk = async (payload: AddPagePayload) => {
    if (!authToken || !activeBookId) return;
    try {
      const res = await fetch(`/api/books/${activeBookId}/chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'خطا در افزودن صفحه به کتاب');
        return;
      }

      setBooks((prev) => prev.map((b) => (b.id === activeBookId ? data.book : b)));
      if (data.newChunk?.id) {
        setActiveChunkId(data.newChunk.id);
        activeChunkIdRef.current = data.newChunk.id;
      }
    } catch (err: any) {
      alert(`خطا در ایجاد صفحه: ${err.message}`);
    }
  };

  // Save changes to active project
  const handleUpdateProject = async (updatedProject: BookProject) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedProject.id ? updatedProject : b)));

    if (authToken) {
      try {
        await fetch(`/api/books/${updatedProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updatedProject),
        });
      } catch (e) {}
    }
  };

  // Toggle chunk exclusion from book export, print preview & PDF
  const handleToggleExcludeChunk = (chunkId: string) => {
    const updatedChunks = project.chunks.map((c) =>
      c.id === chunkId ? { ...c, isExcludedFromBook: !c.isExcludedFromBook } : c
    );
    const targetChunk = updatedChunks.find(c => c.id === chunkId);
    const isNowExcluded = targetChunk?.isExcludedFromBook;
    const currentExcluded = project.designConfig?.excludedChunkIds || [];
    const newExcluded = isNowExcluded
      ? Array.from(new Set([...currentExcluded, chunkId]))
      : currentExcluded.filter(id => id !== chunkId);

    handleUpdateProject({
      ...project,
      chunks: updatedChunks,
      designConfig: {
        ...(project.designConfig || DEFAULT_DESIGN_CONFIG),
        excludedChunkIds: newExcluded,
      },
    });
  };

  // Exports (dynamically imported on user action to preserve instant initial page speed)
  const handleExportDocx = async (targetBook: BookProject) => {
    const fullBook = (await ensureBookChunksLoaded(targetBook, true)) || targetBook;
    handleSelectBook(fullBook);
    const { downloadDocx } = await import('./utils/exporter.ts');
    await downloadDocx(fullBook);
  };

  const handleExportPdf = async (targetBook: BookProject) => {
    const fullBook = (await ensureBookChunksLoaded(targetBook, true)) || targetBook;
    handleSelectBook(fullBook);
    setIsDesignModalOpen(true);
  };

  const handleExportEpub = async (targetBook: BookProject) => {
    const fullBook = (await ensureBookChunksLoaded(targetBook, true)) || targetBook;
    handleSelectBook(fullBook);
    const { downloadStyledHtml } = await import('./utils/exporter.ts');
    downloadStyledHtml(fullBook);
  };

  // Translate a single chunk (inside workspace)
  // Translate a single chunk (inside workspace) with auth and multi-token failover
  const translateSingleChunk = async (chunkId: string): Promise<boolean> => {
    const chunk = project.chunks.find((c) => c.id === chunkId);
    if (!chunk) return false;

    // Check user wallet balance if applicable
    const chunkWords = chunk.wordCount || 100;
    const requiredCost = Math.round(chunkWords * costPerWord);
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'staff' && (currentUser.walletBalance || 0) < requiredCost) {
      alert(`موجودی کیف پول شما (${(currentUser.walletBalance || 0).toLocaleString('fa-IR')} تومان) برای ترجمه این بخش (${requiredCost.toLocaleString('fa-IR')} تومان) کافی نیست. لطفاً کیف پول خود را شارژ فرمایید.`);
      setIsWalletModalOpen(true);
      return false;
    }

    // Update chunk status to queued
    const updatedChunks = project.chunks.map((c) =>
      c.id === chunkId ? { ...c, status: 'queued' as const, errorMessage: undefined } : c
    );
    handleUpdateProject({ ...project, chunks: updatedChunks });

    try {
      const effectiveToken = authToken || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_AUTH_TOKEN) : '') || currentUser?.token || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (effectiveToken) {
        headers['Authorization'] = `Bearer ${effectiveToken}`;
      }

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookId: project.id,
          chunkId,
          chunkNumber: chunk.chunkNumber,
          englishText: chunk.englishText,
          sourceLanguage: project.sourceLanguage || 'en',
          targetLanguage: project.targetLanguage || 'fa',
          tone: project.tone,
          glossary: project.glossary,
          chapterTitle: chunk.chapterTitle,
          model: project.model || 'gemini-3.1-flash-lite',
          serverPool,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطای ترجمه');

      if (!data.translatedHtml || data.translatedHtml.trim().length === 0) {
        throw new Error('پاسخ ترجمه خالی دریافت شد.');
      }

      const completed = project.chunks.map((c) =>
        c.id === chunkId
          ? {
              ...c,
              status: 'completed' as const,
              translatedHtml: data.translatedHtml,
              keyUsed: data.keyUsed,
              modelUsed: data.model,
              serverUsed: data.serverUsed,
              switchOccurred: data.switchOccurred,
              translatedAt: Date.now(),
              errorMessage: undefined,
            }
          : c
      );
      handleUpdateProject({ ...project, chunks: completed });

      // Update wallet if server returned updated balance
      if (data.walletBalance !== undefined && currentUser) {
        setCurrentUser({ ...currentUser, walletBalance: data.walletBalance });
      }

      // Automatically advance to the next chunk/page so user doesn't have to manually click next
      const currentIdx = project.chunks.findIndex((c) => c.id === chunkId);
      if (currentIdx !== -1 && currentIdx < project.chunks.length - 1) {
        const nextChunk = project.chunks[currentIdx + 1];
        setActiveChunkId(nextChunk.id);
      }

      return true;
    } catch (err: any) {
      console.error(`[App] translateSingleChunk ${chunkId} failed:`, err);
      const failed = project.chunks.map((c) =>
        c.id === chunkId ? { ...c, status: 'error' as const, errorMessage: err.message } : c
      );
      handleUpdateProject({ ...project, chunks: failed });
      return false;
    }
  };

  // Batch translate inside workspace with graceful per-chunk stop, wallet check, and automatic recovery pass
  const handleBatchTranslate = async () => {
    const pending = project.chunks.filter((c) => c.status !== 'completed' || !c.translatedHtml || c.translatedHtml.trim().length === 0);
    if (pending.length === 0) {
      alert('تمام بخش‌های این کتاب قبلاً به صورت کامل ترجمه شده‌اند.');
      return;
    }

    setIsBatchTranslating(true);
    setIsStoppingBatch(false);
    isBatchCancelledRef.current = false;
    setBatchProgress({ current: 0, total: pending.length, secondsToNextCall: 0 });

    let succeededCount = 0;

    for (let i = 0; i < pending.length; i++) {
      if (isBatchCancelledRef.current) break;
      const c = pending[i];

      // Check wallet before translating this chunk
      const requiredCost = Math.round((c.wordCount || 100) * costPerWord);
      if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'staff' && (currentUser.walletBalance || 0) < requiredCost) {
        alert(`موجودی کیف پول شما برای ادامه ترجمه متوالی ناکافی است (${(currentUser.walletBalance || 0).toLocaleString('fa-IR')} تومان). برای ترجمه بخش «${c.chapterTitle}» به ${requiredCost.toLocaleString('fa-IR')} تومان موجودی نیاز است. لطفاً کیف پول خود را شارژ فرمایید.`);
        setIsWalletModalOpen(true);
        break;
      }

      setActiveChunkId(c.id);
      
      // Translate current chunk
      const ok = await translateSingleChunk(c.id);
      if (ok) {
        succeededCount++;
      }
      setBatchProgress({ current: succeededCount, total: pending.length, secondsToNextCall: 0 });

      // If user clicked stop during this chunk, stop IMMEDIATELY without extra delay
      if (isBatchCancelledRef.current) {
        break;
      }

      // Safe pause between calls only when translation is continuing
      await new Promise((r) => setTimeout(r, 1600));
    }

    // --- AUTOMATIC RECOVERY PASS ---
    // If not stopped by user and some chunks failed, retry them with next available tokens
    if (!isBatchCancelledRef.current) {
      const latestBook = books.find((b) => b.id === project.id);
      const chunksToCheck = latestBook?.chunks || project.chunks;
      const failedToRetry = chunksToCheck.filter(
        (c) => c.status === 'error' || (!c.translatedHtml && !c.isExcludedFromBook)
      );

      if (failedToRetry.length > 0) {
        console.log(`[BatchTranslate] Automatic Recovery Pass: Retrying ${failedToRetry.length} failed chunks...`);
        await new Promise((r) => setTimeout(r, 2000));

        for (let rIdx = 0; rIdx < failedToRetry.length; rIdx++) {
          if (isBatchCancelledRef.current) break;
          const fc = failedToRetry[rIdx];
          setActiveChunkId(fc.id);
          const recOk = await translateSingleChunk(fc.id);
          if (recOk) {
            succeededCount++;
            setBatchProgress({ current: succeededCount, total: pending.length, secondsToNextCall: 0 });
          }
          if (isBatchCancelledRef.current) break;
          await new Promise((r) => setTimeout(r, 1800));
        }
      }
    }

    setIsStoppingBatch(false);
    setIsBatchTranslating(false);

    if (!isBatchCancelledRef.current) {
      if (succeededCount === pending.length) {
        alert(`🎉 ترجمه با موفقیت به ۱۰۰٪ رسید! تمامی ${succeededCount} بخش با موفقیت ترجمه شدند.`);
      } else {
        alert(`⚡ ${succeededCount} از ${pending.length} بخش ترجمه شد. بخش‌های باقی‌مانده به دلیل اتمام سهمیه متوقف شدند. برای ادامه تا ۱۰۰٪، یک توکن جدید در پنل مدیریت اضافه نمایید و مجدداً «ادامه ترجمه ناقص» را بزنید.`);
      }
    }
  };

  // Re-translate only incomplete and failed chunks with token rotation
  const handleRetryFailedChunks = async () => {
    const failed = project.chunks.filter(
      (c) => c.status === 'error' || !c.translatedHtml || c.translatedHtml.trim().length === 0 || (!c.translatedHtml && !c.isExcludedFromBook)
    );
    if (failed.length === 0) {
      alert('تمامی بخش‌های این کتاب قبلاً با موفقیت ترجمه شده‌اند و بخش خطاداری وجود ندارد.');
      return;
    }

    setIsBatchTranslating(true);
    setIsStoppingBatch(false);
    isBatchCancelledRef.current = false;
    setBatchProgress({ current: 0, total: failed.length, secondsToNextCall: 0 });

    let successCount = 0;

    for (let i = 0; i < failed.length; i++) {
      if (isBatchCancelledRef.current) break;
      const c = failed[i];

      const requiredCost = Math.round((c.wordCount || 100) * costPerWord);
      if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'staff' && (currentUser.walletBalance || 0) < requiredCost) {
        alert(`موجودی کیف پول شما برای ادامه ترجمه ناکافی است (${(currentUser.walletBalance || 0).toLocaleString('fa-IR')} تومان).`);
        setIsWalletModalOpen(true);
        break;
      }

      setActiveChunkId(c.id);
      const ok = await translateSingleChunk(c.id);
      if (ok) {
        successCount++;
      }
      setBatchProgress({ current: successCount, total: failed.length, secondsToNextCall: 0 });

      if (isBatchCancelledRef.current) break;
      await new Promise((r) => setTimeout(r, 1600));
    }

    setIsStoppingBatch(false);
    setIsBatchTranslating(false);

    if (!isBatchCancelledRef.current) {
      if (successCount === failed.length) {
        alert(`🎉 تمامی بخش‌های ناقص با موفقیت ترجمه شدند و پروژه به ۱۰۰٪ رسید! (${successCount} بخش)`);
      } else {
        alert(`⚡ ${successCount} از ${failed.length} بخش ناقص با موفقیت تکمیل گردید. ${failed.length - successCount} بخش به دلیل اتمام سهمیه توکن‌ها ترجمه نشد. برای تکمیل ۱۰۰٪، لطفاً توکن جدید در پنل مدیریت وارد کرده و دکمه را مجدداً بزنید.`);
      }
    }
  };

  const handleStopBatchTranslate = () => {
    isBatchCancelledRef.current = true;
    setIsStoppingBatch(true);
  };

  const handleLoadSampleBook = (sample: SampleBook) => {
    const chunks = chunkBookText(sample.excerpt, { maxWordsPerChunk: 700 });
    const newProject: BookProject = {
      id: `sample_${Date.now()}`,
      title: sample.title,
      originalTitle: sample.originalTitle,
      author: sample.author,
      translator: currentUser?.name || 'سامانه ترجمه',
      tone: sample.tone,
      model: 'gemini-3.8-flash',
      glossary: [...(DEFAULT_GLOSSARIES[sample.tone] || DEFAULT_GLOSSARIES.spiritual)],
      chunks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    handleCreateBook(newProject, false);
  };

  const viewFallback = (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-slate-400">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-medium text-slate-400">در حال بارگذاری...</span>
    </div>
  );

  // ========================================================
  // CUSTOM PAGE VIEW (e.g. /page/about-us or /page/guide)
  // Accessible to both guests and logged-in users
  // ========================================================
  if (activeCustomPageSlug) {
    return (
      <Suspense fallback={viewFallback}>
        <CustomPageView
          slug={activeCustomPageSlug}
          headerFooter={headerFooter}
          currentUser={currentUser}
          onBack={handleBackFromCustomPage}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab);
            setIsAuthModalOpen(true);
          }}
          onNavigatePage={(slug) => {
            setActiveCustomPageSlug(slug);
            window.history.pushState({}, '', `/page/${slug}`);
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialTab={authModalTab}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </Suspense>
    );
  }

  // ========================================================
  // BLOG & ARTICLES VIEW (e.g. /blog or /blog/:slug)
  // Accessible to both guests and logged-in users
  // ========================================================
  if (activeBlogSlug !== false) {
    return (
      <Suspense fallback={viewFallback}>
        <BlogView
          currentSlug={activeBlogSlug}
          onNavigateHome={handleBackFromBlog}
          onNavigatePost={handleOpenBlogPost}
          onNavigateBlog={handleOpenBlog}
          onOpenAuthModal={() => {
            if (currentUser) {
              setCurrentView('dashboard');
              setActiveBlogSlug(false);
            } else {
              setAuthModalTab('login');
              setIsAuthModalOpen(true);
            }
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialTab={authModalTab}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </Suspense>
    );
  }

  // ========================================================
  // STRICT LOGIN BARRIER: If user is not authenticated
  // ========================================================
  if (!currentUser) {
    if (activeAuthPage) {
      return (
        <Suspense fallback={viewFallback}>
          <DedicatedAuthPage
            onAuthSuccess={(user, token) => {
              handleAuthSuccess(user, token);
              setActiveAuthPage(false);
              window.history.pushState({}, '', '/');
            }}
            onBackToHome={() => {
              setActiveAuthPage(false);
              window.history.pushState({}, '', '/');
            }}
            seoConfig={seoConfig}
          />
        </Suspense>
      );
    }

    return (
      <>
        <LandingPage
          onOpenAuth={(tab) => {
            setActiveAuthPage(true);
            window.history.pushState({}, '', '/?page=login');
          }}
          cmsConfig={cmsConfig}
          seoConfig={seoConfig}
          costPerWord={costPerWord}
          headerFooter={headerFooter}
          customPages={customPagesList}
          onOpenCustomPage={handleOpenCustomPage}
          onOpenBlog={handleOpenBlog}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialTab={authModalTab}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // ========================================================
  // ========================================================
  // VIEW: ADMIN & STAFF PANEL
  // ========================================================
  if (currentView === 'admin' && (currentUser.role === 'admin' || currentUser.role === 'staff')) {
    return (
      <Suspense fallback={viewFallback}>
        <AdminPanel
          currentUser={currentUser}
          onBackToUserPanel={() => setCurrentView('dashboard')}
          onLogout={handleLogout}
          onCostPerWordUpdated={(newRate) => setCostPerWord(newRate)}
        />
      </Suspense>
    );
  }

  // Calculate user personalized effective rate
  const userEffectiveRate = currentUser.customCostPerWord || (currentUser.role === 'publisher' ? Math.round(costPerWord * 0.65) : costPerWord);
  const userTierLabel = currentUser.customCostPerWord
    ? `نرخ اختصاصی شما (${currentUser.customCostPerWord} ت)`
    : currentUser.role === 'publisher'
    ? `نرخ همکار ناشر (${Math.round(costPerWord * 0.65)} ت)`
    : `نرخ عمومی (${costPerWord} ت)`;

  // ========================================================
  // VIEW: USER DASHBOARD (میز کاربری)
  // ========================================================
  if (currentView === 'dashboard') {
    return (
      <Suspense fallback={viewFallback}>
        {paymentNotice && (
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
            <div className={`max-w-5xl mx-auto p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold ${
              paymentNotice.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <span>{paymentNotice.message}</span>
              </div>
              <button
                onClick={() => setPaymentNotice(null)}
                className="px-2 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-950 text-slate-300 text-[11px]"
              >
                بستن پیام
              </button>
            </div>
          </div>
        )}
        <UserDashboard
          user={currentUser}
          books={books.filter((b) => (!b.userId || b.userId === currentUser.id) && b.title !== 'کتاب بازیابی شده' && b.originalTitle !== 'Recovered Book')}
          activeJobs={activeJobs}
          costPerWord={userEffectiveRate}
          onOpenNewBook={() => setIsNewBookModalOpen(true)}
          onSelectBook={(selected) => {
            handleSelectBook(selected, 'workspace');
          }}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onOpenAdmin={(currentUser.role === 'admin' || currentUser.role === 'staff') ? () => setCurrentView('admin') : undefined}
          onLogout={handleLogout}
          onDeleteBook={handleDeleteBook}
          onStartTranslation={handleStartDraftTranslation}
          onExportDocx={handleExportDocx}
          onExportPdf={handleExportPdf}
          onExportEpub={handleExportEpub}
          onRefresh={() => {
            if (authToken) {
              fetchActiveJobs(authToken);
              fetchUserBooks(authToken);
            }
          }}
        />

        <WalletModal
          isOpen={isWalletModalOpen}
          user={currentUser}
          onClose={() => setIsWalletModalOpen(false)}
          onBalanceUpdated={(newBalance) => {
            setCurrentUser({ ...currentUser, walletBalance: newBalance });
          }}
        />

        <NewBookModal
          isOpen={isNewBookModalOpen}
          onClose={() => setIsNewBookModalOpen(false)}
          onCreateProject={handleCreateBook}
          defaultModel="gemini-3.8-flash"
          walletBalance={currentUser.walletBalance}
          costPerWord={userEffectiveRate}
          tierLabel={userTierLabel}
          discountPercent={currentUser.discountPercent}
          onOpenWallet={() => setIsWalletModalOpen(true)}
        />

        <ExportDesignModal
          isOpen={isDesignModalOpen}
          onClose={() => setIsDesignModalOpen(false)}
          project={project}
          onUpdateDesign={(config) => handleUpdateProject({ ...project, designConfig: config })}
          onPrintPdf={() => window.print()}
        />
      </Suspense>
    );
  }

  // ========================================================
  // VIEW: WORKSPACE (ویرایشگر، مطالعه و صفحه‌بندی کتاب)
  // ========================================================
  const currentIndex = project.chunks.findIndex((c) => c.id === activeChunkId);
  const currentChunk = project.chunks[currentIndex] || project.chunks[0] || null;

  const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'staff';
  const isCloudTranslating = project.status === 'translating' || activeJobs.some(
    (j) => j.bookId === project.id && (j.status === 'queued' || j.status === 'processing')
  );

  return (
    <Suspense fallback={viewFallback}>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-['Vazirmatn'] selection:bg-amber-500/30">
        {/* Printable Document for high-res PDF generation */}
        <PrintDocument project={project} />

      {/* Main Studio Interactive UI */}
      <div className="no-print flex flex-col min-h-screen">
        <Navbar
          currentProject={project}
          serverStatus={serverStatus}
          onOpenServerModal={() => setIsServerModalOpen(true)}
          onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
          onOpenGlossaryModal={() => setIsGlossaryModalOpen(true)}
          onLoadSampleBook={handleLoadSampleBook}
          onPrintPdf={() => window.print()}
          onOpenLibraryModal={() => setIsLibraryModalOpen(true)}
          booksCount={books.length}
          onOpenProvidersModal={() => setIsProvidersModalOpen(true)}
          activeProviderName={serverPool.find((s) => s.isEnabled)?.name.split(' (')[0] || 'جمینای'}
          onOpenDesignModal={() => setIsDesignModalOpen(true)}
          onOpenFindReplaceModal={() => setIsFindReplaceModalOpen(true)}
          onBackToDashboard={() => setCurrentView('dashboard')}
          isAdmin={isUserAdmin}
        />

        <ProjectHeader
          project={project}
          onUpdateProject={(updates) => handleUpdateProject({ ...project, ...updates })}
          onOpenGlossaryModal={() => setIsGlossaryModalOpen(true)}
          onOpenFindReplaceModal={() => setIsFindReplaceModalOpen(true)}
          onOpenTokenModal={() => setIsTokenModalOpen(true)}
          onOpenExportModal={() => setIsDesignModalOpen(true)}
        />

        {/* Mobile Tab Switcher Bar for Book Editor */}
        <div className="md:hidden no-print bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-center gap-2 sticky top-16 z-30">
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 w-full max-w-sm text-xs font-semibold shadow-inner">
            <button
              onClick={() => setMobileWorkspaceTab('editor')}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mobileWorkspaceTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📖 متن و ترجمه کتاب</span>
            </button>
            <button
              onClick={() => setMobileWorkspaceTab('chunks')}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mobileWorkspaceTab === 'chunks'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📑 فهرست بخش‌ها ({project.chunks.length})</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <div className={`${mobileWorkspaceTab === 'chunks' ? 'flex flex-1' : 'hidden'} md:flex md:flex-initial h-full`}>
            <ChunkListSidebar
              chunks={project.chunks}
              activeChunkId={activeChunkId}
              onSelectChunk={(id) => {
                setActiveChunkId(id);
                setMobileWorkspaceTab('editor');
              }}
              onTranslateChunk={translateSingleChunk}
              isBatchTranslating={isBatchTranslating}
              onDeleteChunk={handleDeleteChunk}
              onToggleExcludeChunk={handleToggleExcludeChunk}
              onOpenAddPageModal={(targetChunkId, pos) => {
                setAddPageDefaultTargetChunkId(targetChunkId || activeChunkId);
                setAddPageDefaultPosition(pos || 'after');
                setIsAddPageModalOpen(true);
              }}
              isLoadingChunks={loadingWorkspaceBookId === activeBookId}
              onRetryFailedChunks={handleRetryFailedChunks}
            />
          </div>

          <div className={`${mobileWorkspaceTab === 'editor' ? 'flex flex-1' : 'hidden'} md:flex md:flex-1 h-full min-w-0`}>
            <TranslationWorkspace
              currentChunk={currentChunk}
              project={project}
              isLoadingChunks={loadingWorkspaceBookId === activeBookId}
              onRetryFailedChunks={handleRetryFailedChunks}
              onUpdateChunkHtml={(chunkId: string, newHtml: string) => {
                const updated = project.chunks.map((c) =>
                  c.id === chunkId ? { ...c, translatedHtml: newHtml } : c
                );
                handleUpdateProject({ ...project, chunks: updated });
              }}
              onDeleteChunk={handleDeleteChunk}
              onToggleExcludeChunk={handleToggleExcludeChunk}
              onTranslateCurrentChunk={() => currentChunk && translateSingleChunk(currentChunk.id)}
              onStartBatchTranslate={handleBatchTranslate}
              onStopBatchTranslate={handleStopBatchTranslate}
              isBatchTranslating={isBatchTranslating}
              isStoppingBatch={isStoppingBatch}
              batchProgress={batchProgress}
              onStartCloudTranslation={() => handleStartDraftTranslation(project)}
              onStopCloudTranslation={() => handleStopCloudTranslation(project.id)}
              isCloudTranslating={isCloudTranslating}
              onSelectPrevChunk={() => {
                if (currentIndex > 0) setActiveChunkId(project.chunks[currentIndex - 1].id);
              }}
              onSelectNextChunk={() => {
                if (currentIndex < project.chunks.length - 1)
                  setActiveChunkId(project.chunks[currentIndex + 1].id);
              }}
              hasPrevChunk={currentIndex > 0}
              hasNextChunk={currentIndex < project.chunks.length - 1}
              serverPool={serverPool}
              onOpenServerPoolModal={() => setIsProvidersModalOpen(true)}
              isAdmin={isUserAdmin}
              onOpenMobileChunks={() => setMobileWorkspaceTab('chunks')}
              onOpenFindReplaceModal={() => setIsFindReplaceModalOpen(true)}
              onOpenAddPageModal={(targetChunkId, pos) => {
                setAddPageDefaultTargetChunkId(targetChunkId || currentChunk?.id || activeChunkId);
                setAddPageDefaultPosition(pos || 'after');
                setIsAddPageModalOpen(true);
              }}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <WalletModal
        isOpen={isWalletModalOpen}
        user={currentUser}
        onClose={() => setIsWalletModalOpen(false)}
        onBalanceUpdated={(newBalance) => {
          setCurrentUser({ ...currentUser, walletBalance: newBalance });
        }}
      />

      <NewBookModal
        isOpen={isNewBookModalOpen}
        onClose={() => setIsNewBookModalOpen(false)}
        onCreateProject={handleCreateBook}
        defaultModel="gemini-3.8-flash"
        walletBalance={currentUser.walletBalance}
        costPerWord={userEffectiveRate}
        tierLabel={userTierLabel}
        discountPercent={currentUser.discountPercent}
        onOpenWallet={() => setIsWalletModalOpen(true)}
      />

      <GlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
        project={project}
        onUpdateGlossary={(newGlossary) => {
          handleUpdateProject({ ...project, glossary: newGlossary });
        }}
        isAdmin={isUserAdmin}
      />

      <FindReplaceModal
        isOpen={isFindReplaceModalOpen}
        onClose={() => setIsFindReplaceModalOpen(false)}
        project={project}
        onUpdateChunks={(updatedChunks) => {
          handleUpdateProject({ ...project, chunks: updatedChunks });
        }}
        onUpdateGlossary={(newGlossary) => {
          handleUpdateProject({ ...project, glossary: newGlossary });
        }}
      />

      <ExportDesignModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        project={project}
        onUpdateDesign={(config) => handleUpdateProject({ ...project, designConfig: config })}
        onPrintPdf={() => window.print()}
        onUpdateProject={handleUpdateProject}
        onDeleteChunk={handleDeleteChunk}
      />

      <TokenEstimatorModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        project={project}
      />

      <ServerStatusModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        status={serverStatus}
        onRefresh={() => {}}
        selectedModel={project.model || 'gemini-3.5-flash-lite'}
        onSelectModel={(m) => handleUpdateProject({ ...project, model: m })}
      />

      <ProviderManagerModal
        isOpen={isProvidersModalOpen}
        onClose={() => setIsProvidersModalOpen(false)}
        serverPool={serverPool}
        onUpdateServerPool={setServerPool}
      />

      <BooksLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        books={books}
        activeBookId={activeBookId}
        onSelectBook={(id) => {
          handleSelectBook(id, 'workspace');
        }}
        onDeleteBook={handleDeleteBook}
        onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
        onExportPdf={(book) => handleExportPdf(book)}
      />

      {isAddPageModalOpen && (
        <Suspense fallback={null}>
          <AddPageModal
            isOpen={isAddPageModalOpen}
            onClose={() => setIsAddPageModalOpen(false)}
            onSubmit={handleAddChunk}
            chunks={project?.chunks || []}
            activeChunkId={addPageDefaultTargetChunkId || activeChunkId}
            defaultPosition={addPageDefaultPosition}
          />
        </Suspense>
      )}
    </div>
    </Suspense>
  );
}
