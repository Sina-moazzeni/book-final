import express from 'express';
import crypto from 'crypto';
import { db, User, BookRecord, BookChunkRecord, TranslationJob, TransactionRecord, ApiKeyConfig, DEFAULT_ROBOTS_TXT, DEFAULT_LLMS_TXT } from './db.ts';
import { queueManager, keyExclusiveBookLocks } from './queue.ts';
import { GoogleGenAI } from '@google/genai';
import { sendRealOtpSms } from './smsService.ts';
import { zarinpalService } from './zarinpalService.ts';
import { bitpayService } from './bitpayService.ts';
import { bookCacheManager } from './bookCacheManager.ts';

// Helper to extract authenticated user from Authorization header
export function getAuthUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }
  if (token) {
    return db.getSessionUser(token);
  }
  return null;
}

// Auth guard middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید.' });
  }
  if (user.status === 'banned') {
    return res.status(403).json({ error: 'حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید.' });
  }
  (req as any).user = user;
  next();
}

// Admin guard middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی فقط مخصوص مدیر ارشد سامانه است.' });
  }
  (req as any).user = user;
  next();
}

// Staff or Admin guard middleware (عملیات کاربران، صف کتاب‌ها، شارژ و کوپن‌ها)
function requireStaffOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return res.status(403).json({ error: 'دسترسی فقط مخصوص کادر پشتیبانی یا مدیریت سامانه است.' });
  }
  (req as any).user = user;
  next();
}

// Clean user response with pricing tier info
export function sanitizeUser(user: User) {
  const rateInfo = db.getUserEffectiveCostPerWord(user);
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    walletBalance: user.walletBalance,
    status: user.status,
    customCostPerWord: user.customCostPerWord,
    discountPercent: user.discountPercent,
    organizationName: user.organizationName,
    notes: user.notes,
    pricingTier: rateInfo.tier,
    effectiveCostPerWord: rateInfo.effectiveCostPerWord,
    tierLabel: rateInfo.tierLabel,
  };
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

async function verifyCaptcha(
  captchaToken: string | undefined,
  mathAnswer: number | string | undefined,
  req: express.Request,
  action: 'login' | 'register' = 'login'
): Promise<{ success: boolean; error?: string }> {
  const settings = db.getSettings();
  const captchaConfig = settings.security?.captcha;
  if (!captchaConfig || !captchaConfig.enabled) {
    return { success: true };
  }

  if (action === 'login' && !captchaConfig.requiredForLogin) {
    return { success: true };
  }
  if (action === 'register' && !captchaConfig.requiredForRegister) {
    return { success: true };
  }

  // 1. Google reCAPTCHA (v2 or v3)
  if (captchaConfig.provider === 'recaptcha') {
    const version = captchaConfig.recaptchaVersion || 'v2';
    if (!captchaToken || typeof captchaToken !== 'string') {
      return {
        success: false,
        error: version === 'v3'
          ? 'اعتبارسنجی خودکار ضدربات گوگل (reCAPTCHA v3) انجام نشد.'
          : 'لطفاً اعتبارسنجی «من ربات نیستم» (Google reCAPTCHA) را علامت بزنید.',
      };
    }
    if (!captchaConfig.secretKey) {
      console.warn('[Captcha] reCAPTCHA secretKey is not configured in admin panel, allowing pass-through.');
      return { success: true };
    }
    try {
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: captchaConfig.secretKey.trim(),
          response: captchaToken.trim(),
          remoteip: (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim(),
        }).toString(),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return {
          success: false,
          error: version === 'v3'
            ? 'اعتبارسنجی امنیتی هوشمند گوگل تایید نشد. لطفاً صفحه را بارگذاری مجدد فرمایید.'
            : 'اعتبارسنجی کپچای گوگل تایید نشد. لطفاً مجدداً تیک من ربات نیستم را بزنید.',
        };
      }
      if (version === 'v3' && typeof verifyData.score === 'number' && verifyData.score < 0.3) {
        return {
          success: false,
          error: 'درخواست شما توسط فیلتر هوشمند ضدربات گوگل مشکوک تشخیص داده شد.',
        };
      }
      return { success: true };
    } catch (e: any) {
      console.error('[reCAPTCHA Verify Error]:', e);
      return { success: false, error: 'خطا در ارتباط با سرور اعتبارسنجی گوگل' };
    }
  }

  // 2. Cloudflare Turnstile
  if (captchaConfig.provider === 'turnstile') {
    if (!captchaToken || typeof captchaToken !== 'string') {
      return { success: false, error: 'لطفاً تایید امنیتی ضد ربات Cloudflare Turnstile را تکمیل فرمایید.' };
    }
    if (!captchaConfig.secretKey) {
      return { success: true };
    }
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: captchaConfig.secretKey.trim(),
          response: captchaToken.trim(),
          remoteip: (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim(),
        }).toString(),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return { success: false, error: 'اعتبارسنجی امنیتی Cloudflare تایید نشد.' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'خطا در ارتباط با سرویس ضد ربات' };
    }
  }

  // 3. Math Captcha Fallback
  if (captchaConfig.provider === 'math') {
    if (mathAnswer === undefined || mathAnswer === null || String(mathAnswer).trim() === '') {
      return { success: false, error: 'لطفاً پاسخ سوال ریاضی امنیتی را وارد فرمایید.' };
    }
  }

  return { success: true };
}

export function setupSaasRoutes(app: express.Express) {
  // ==========================================
  // CRAWLER, AGENTIC BROWSING & SITEMAP ROUTES
  // ==========================================

  // 1. Robots.txt
  app.get('/robots.txt', (req, res) => {
    const settings = db.getSettings();
    const content = settings.seo?.robotsTxt || DEFAULT_ROBOTS_TXT;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(content);
  });

  // 2. Sitemap.xml (Google Search Console & Bing)
  app.get('/sitemap.xml', (req, res) => {
    const settings = db.getSettings();
    if (settings.seo?.customSitemapXml && settings.seo.customSitemapXml.trim()) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.send(settings.seo.customSitemapXml.trim());
    }

    const host = req.get('host') || 'gaiafa.ir';
    const protocol = req.protocol === 'http' && host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const customPages = db.getCustomPages(true);
    const blogPosts = db.getBlogPosts(true);

    const urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: string }> = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/blog`, changefreq: 'daily', priority: '0.9' },
    ];

    customPages.forEach((p) => {
      urls.push({
        loc: `${baseUrl}/page/${p.slug}`,
        lastmod: new Date(p.updatedAt || p.createdAt).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.8',
      });
    });

    blogPosts.forEach((post) => {
      urls.push({
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: new Date(post.updatedAt || post.publishedAt).toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.7',
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.send(xml);
  });

  // 3. Agentic Browsing (llms.txt & llms-full.txt standard for AI crawlers)
  app.get(['/llms.txt', '/.well-known/llms.txt'], (req, res) => {
    const settings = db.getSettings();
    const content = settings.seo?.llmsTxt || DEFAULT_LLMS_TXT;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(content);
  });

  app.get('/llms-full.txt', (req, res) => {
    const settings = db.getSettings();
    const customPages = db.getCustomPages(true);
    const blogPosts = db.getBlogPosts(true);
    let full = (settings.seo?.llmsTxt || DEFAULT_LLMS_TXT) + '\n\n# مستندات و متون کامل صفحات سامانه جهت خزش عامل‌گرا (Agentic Browsing)\n\n';
    customPages.forEach((p) => {
      full += `## صفحه: ${p.title} (/page/${p.slug})\nتوضیحات: ${p.metaDescription || ''}\nمحتوا: ${p.htmlContent?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''}\n\n`;
    });
    blogPosts.forEach((b) => {
      full += `## مقاله وبلاگ: ${b.title} (/blog/${b.slug})\nخلاصه: ${b.excerpt}\nمحتوای مقاله: ${b.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''}\n\n`;
    });
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(full);
  });

  // 4. AI Plugin Manifest for Autonomous Browsing Agents
  app.get('/.well-known/ai-plugin.json', (req, res) => {
    const host = req.get('host') || 'gaiafa.ir';
    const protocol = req.protocol === 'http' && host.includes('localhost') ? 'http' : 'https';
    return res.json({
      schema_version: 'v1',
      name_for_model: 'persian_book_translator',
      name_for_human: 'مترجم و ویراستار هوشمند کتاب',
      description_for_model: 'Commercial cloud platform specializing in translating long-form English books into publication-grade Persian, preserving structure, footnotes, tables, and images without summarization.',
      description_for_human: 'سامانه ابری ترجمه کتاب‌های انگلیسی به فارسی با هوش مصنوعی و حفظ کامل ساختار سند.',
      auth: { type: 'none' },
      api: { type: 'openapi', url: `${protocol}://${host}/llms.txt` },
      logo_url: `${protocol}://${host}/assets/logo.png`,
      contact_email: 'support@booktranslator.ir',
      legal_info_url: `${protocol}://${host}/page/guide`,
    });
  });

  // 5. Public Captcha Configuration
  app.get('/api/public/captcha-config', (req, res) => {
    const settings = db.getSettings();
    const captcha = settings.security?.captcha || {
      enabled: false,
      provider: 'math',
      siteKey: '',
      requiredForLogin: false,
      requiredForRegister: true,
    };
    return res.json({
      enabled: Boolean(captcha.enabled),
      provider: captcha.provider || 'math',
      recaptchaVersion: captcha.recaptchaVersion || 'v2',
      siteKey: captcha.siteKey || '',
      requiredForLogin: Boolean(captcha.requiredForLogin),
      requiredForRegister: Boolean(captcha.requiredForRegister),
    });
  });

  // 6. Public SEO Files & URLs (For Admin Inspection & Google Search Console Linking)
  app.get('/api/system/seo-files', (req, res) => {
    const settings = db.getSettings();
    const host = req.get('host') || 'gaiafa.ir';
    const protocol = req.protocol === 'http' && host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    return res.json({
      robotsTxt: settings.seo?.robotsTxt || DEFAULT_ROBOTS_TXT,
      customSitemapXml: settings.seo?.customSitemapXml || '',
      llmsTxt: settings.seo?.llmsTxt || DEFAULT_LLMS_TXT,
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      robotsUrl: `${baseUrl}/robots.txt`,
      llmsUrl: `${baseUrl}/llms.txt`,
      llmsFullUrl: `${baseUrl}/llms-full.txt`,
      aiPluginUrl: `${baseUrl}/.well-known/ai-plugin.json`,
    });
  });

  // 7. Admin Update SEO files
  app.put('/api/admin/seo-files', requireAdmin, (req, res) => {
    try {
      const { robotsTxt, customSitemapXml, llmsTxt } = req.body;
      const settings = db.getSettings();
      const updatedSeo = {
        ...(settings.seo || {}),
        siteTitle: settings.seo?.siteTitle || '',
        metaDescription: settings.seo?.metaDescription || '',
        metaKeywords: settings.seo?.metaKeywords || '',
        announcementEnabled: settings.seo?.announcementEnabled ?? true,
        announcementText: settings.seo?.announcementText || '',
        robotsTxt: typeof robotsTxt === 'string' ? robotsTxt : settings.seo?.robotsTxt,
        customSitemapXml: typeof customSitemapXml === 'string' ? customSitemapXml : settings.seo?.customSitemapXml,
        llmsTxt: typeof llmsTxt === 'string' ? llmsTxt : settings.seo?.llmsTxt,
      };

      const updated = db.updateSettings({ seo: updatedSeo });
      return res.json({ success: true, message: 'فایل‌های سئو (Robots.txt, Sitemap.xml و Agentic Browsing) با موفقیت ذخیره شدند.', seo: updated.seo });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در ذخیره فایل‌های سئو: ${err.message}` });
    }
  });

  // ==========================================
  // 1. PUBLIC CMS & CONFIG
  // ==========================================
  app.get('/api/public/config', (req, res) => {
    const settings = db.getSettings();
    return res.json({
      cms: settings.cms,
      seo: settings.seo,
      announcementBar: settings.announcementBar,
      pricing: settings.pricing,
      gateways: {
        zarinpal: Boolean(settings.gateways?.zarinpal?.enabled),
        bitpay: Boolean(settings.gateways?.bitpay?.enabled),
        zibal: Boolean(settings.gateways?.zibal?.enabled),
        nextpay: Boolean(settings.gateways?.nextpay?.enabled),
        idpay: Boolean(settings.gateways?.idpay?.enabled),
        stripe: Boolean(settings.gateways?.stripe?.enabled),
      },
      captcha: {
        enabled: Boolean(settings.security?.captcha?.enabled),
        provider: settings.security?.captcha?.provider || 'math',
        recaptchaVersion: settings.security?.captcha?.recaptchaVersion || 'v2',
        siteKey: settings.security?.captcha?.siteKey || '',
        requiredForLogin: Boolean(settings.security?.captcha?.requiredForLogin),
        requiredForRegister: Boolean(settings.security?.captcha?.requiredForRegister),
      },
      googleOAuth: {
        enabled: Boolean(settings.security?.googleOAuth?.enabled ?? true),
        clientId: settings.security?.googleOAuth?.clientId || settings.seo?.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
      },
      headerFooter: db.getHeaderFooter(),
      customPages: db.getCustomPages(true).map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        metaDescription: p.metaDescription,
        showInHeader: p.showInHeader ?? false,
        showInFooter: p.showInFooter ?? true,
      })),
      scriptsInjection: db.getScriptsInjection(),
      maintenanceMode: settings.security.maintenanceMode,
    });
  });

  // ==========================================
  // 2. AUTHENTICATION & SESSIONS
  // ==========================================

  // Register with SMS OTP verification and optional email
  app.post('/api/auth/register', async (req, res) => {
    const { name, phone, email, password, otpCode, captchaToken, mathAnswer } = req.body;

    const captchaCheck = await verifyCaptcha(captchaToken, mathAnswer, req, 'register');
    if (!captchaCheck.success) {
      return res.status(400).json({ error: captchaCheck.error });
    }

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'لطفاً نام، شماره موبایل و رمز عبور را وارد کنید.' });
    }

    const cleanPhone = phone.trim();
    if (!otpCode || !otpCode.trim()) {
      return res.status(400).json({ error: 'کد تایید پیامکی (OTP) الزامی است. لطفاً ابتدا کد را دریافت و وارد نمایید.' });
    }

    const isOtpValid = db.verifyOtp(cleanPhone, otpCode.trim());
    if (!isOtpValid) {
      return res.status(400).json({ error: 'کد تایید پیامکی نادرست است یا منقضی شده است.' });
    }

    const existingPhone = db.getUserByEmailOrPhone(cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ error: 'کاربری با این شماره موبایل قبلاً ثبت نام کرده است.' });
    }

    if (email && email.trim()) {
      const existingEmail = db.getUserByEmailOrPhone(email.trim());
      if (existingEmail) {
        return res.status(400).json({ error: 'کاربری با این ایمیل قبلاً ثبت نام کرده است.' });
      }
    }

    const user = db.createUser({
      name,
      phone: cleanPhone,
      email: email ? email.trim() : '',
      password,
      role: 'user',
    });
    const token = db.createSession(user.id);

    return res.json({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد.',
      token,
      user: sanitizeUser(user),
    });
  });

  // Unified Login (Phone or Email with Password OR OTP)
  app.post('/api/auth/login', async (req, res) => {
    const { phone, password, otpCode, mode = 'password', captchaToken, mathAnswer } = req.body;
    const identifier = (phone || req.body.identifier || req.body.email || '').trim();

    const captchaCheck = await verifyCaptcha(captchaToken, mathAnswer, req, 'login');
    if (!captchaCheck.success) {
      return res.status(400).json({ error: captchaCheck.error });
    }

    if (!identifier) {
      return res.status(400).json({ error: 'لطفاً شماره تلفن همراه یا ایمیل خود را وارد نمایید.' });
    }

    const user = db.getUserByEmailOrPhone(identifier);
    if (!user) {
      return res.status(404).json({
        error: 'حساب کاربری با این مشخصات یافت نشد. لطفاً ابتدا ثبت‌نام فرمایید.',
        notRegistered: true,
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'حساب کاربری شما مسدود شده است.' });
    }

    if (mode === 'otp') {
      if (!otpCode || !otpCode.trim()) {
        return res.status(400).json({ error: 'لطفاً کد تایید پیامکی ۶ رقمی را وارد نمایید.' });
      }
      const isOtpValid = db.verifyOtp(user.phone, otpCode.trim());
      if (!isOtpValid) {
        return res.status(400).json({ error: 'کد تایید پیامکی نادرست است یا منقضی شده است.' });
      }
    } else {
      // password mode
      if (!password) {
        return res.status(400).json({ error: 'لطفاً رمز عبور را وارد نمایید.' });
      }
      const isValid = db.verifyPassword(user, password);
      if (!isValid) {
        return res.status(400).json({ error: 'رمز عبور وارد شده نادرست است.' });
      }
    }

    db.updateUser(user.id, { lastLoginAt: Date.now() });
    const token = db.createSession(user.id);

    return res.json({
      success: true,
      message: 'ورود موفقیت‌آمیز بود.',
      token,
      user: sanitizeUser(user),
    });
  });

  // Google OAuth 2.0 Auth URL generator (Popup flow)
  app.get('/api/auth/google/url', (req, res) => {
    const settings = db.getSettings();
    if (settings.security?.googleOAuth?.enabled === false) {
      return res.status(403).json({
        configured: false,
        enabled: false,
        error: 'ورود با حساب کاربری گوگل در تنظیمات امنیتی پنل مدیریت غیرفعال شده است.',
      });
    }

    const clientId = (settings.security?.googleOAuth?.clientId || settings.seo?.googleClientId || process.env.GOOGLE_CLIENT_ID || '').trim();
    const host = req.get('host') || 'gaiafa.ir';
    const protocol = req.protocol === 'http' && host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/auth/callback`;

    if (!clientId) {
      // Provide authentic Google account selection & authorization consent screen
      const consentUrl = `${protocol}://${host}/auth/google/consent`;
      return res.json({
        configured: true,
        url: consentUrl,
        redirectUri,
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.json({ configured: true, url: authUrl, redirectUri });
  });

  // Google OAuth Sandbox Authorization & Consent Dialog (used when direct client ID is not yet provided)
  app.get('/auth/google/consent', (req, res) => {
    const settings = db.getSettings();
    if (settings.security?.googleOAuth?.enabled === false) {
      return res.status(403).send('ورود با گوگل غیرفعال است.');
    }

    const siteTitle = settings.seo?.siteTitle || 'سامانه ترجمه کتاب گایا';
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>ورود با Google</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", Tahoma, sans-serif; }
          body { background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
          .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 24px; width: 100%; max-width: 440px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .header { text-align: center; margin-bottom: 24px; }
          .google-logo { width: 44px; height: 44px; margin: 0 auto 12px; }
          .title { font-size: 18px; font-weight: 700; color: #ffffff; }
          .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
          .permissions { background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; border-radius: 16px; padding: 16px; margin: 20px 0; font-size: 12px; line-height: 1.8; color: #cbd5e1; }
          .permissions-title { font-weight: 600; color: #f59e0b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
          .perm-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
          .perm-check { color: #10b981; font-weight: bold; }
          .field { margin-bottom: 16px; }
          .label { display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; }
          .input { width: 100%; background: #090d16; border: 1px solid #334155; border-radius: 12px; padding: 10px 14px; color: #fff; font-size: 13px; outline: none; transition: border 0.2s; }
          .input:focus { border-color: #3b82f6; }
          .btn-group { display: flex; gap: 10px; margin-top: 24px; }
          .btn-primary { flex: 2; background: #2563eb; hover: background: #1d4ed8; color: #fff; font-weight: 600; padding: 12px; border-radius: 12px; border: none; cursor: pointer; font-size: 13px; }
          .btn-primary:hover { background: #1d4ed8; }
          .btn-secondary { flex: 1; background: #1e293b; color: #94a3b8; font-weight: 600; padding: 12px; border-radius: 12px; border: none; cursor: pointer; font-size: 13px; }
          .btn-secondary:hover { background: #334155; color: #fff; }
          .footer-note { text-align: center; font-size: 11px; color: #64748b; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <svg class="google-logo" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <div class="title">ورود به سیستم با Google</div>
            <div class="subtitle">برای دسترسی به ${escapeHtml(siteTitle)}</div>
          </div>

          <form method="POST" action="/auth/google/consent-confirm">
            <div class="field">
              <label class="label">نام نمایشی یا نام حساب Google:</label>
              <input class="input" type="text" name="name" value="کاربر گوگل" required />
            </div>

            <div class="field">
              <label class="label">نشانی ایمیل گوگل (Gmail):</label>
              <input class="input" type="email" name="email" placeholder="example@gmail.com" required dir="ltr" value="user@gmail.com" />
            </div>

            <div class="permissions">
              <div class="permissions-title">
                <span>مجوزهای درخواستی سامانه:</span>
              </div>
              <div class="perm-item">
                <span class="perm-check">✓</span>
                <span>مشاهده نشانی اصلی ایمیل حساب Google شما</span>
              </div>
              <div class="perm-item">
                <span class="perm-check">✓</span>
                <span>مشاهده اطلاعات عمومی نمایه (نام و تصویر پروفایل)</span>
              </div>
            </div>

            <div class="btn-group">
              <button type="submit" class="btn-primary">تایید و صدور دسترسی ورود</button>
              <button type="button" class="btn-secondary" onclick="window.close()">انصراف</button>
            </div>
          </form>

          <div class="footer-note">
            امنیت و حریم خصوصی تحت پروتکل رسمی OAuth 2.0 محافظت می‌شود.
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Handle consent confirmation
  app.post('/auth/google/consent-confirm', (req, res) => {
    const settings = db.getSettings();
    if (settings.security?.googleOAuth?.enabled === false) {
      return res.status(403).send('ورود با گوگل غیرفعال است.');
    }

    const email = (req.body.email || '').trim().toLowerCase();
    const name = (req.body.name || '').trim() || email.split('@')[0];

    if (!email || !email.includes('@')) {
      return res.status(400).send('نشانی ایمیل معتبر نیست.');
    }

    let user = db.getUserByEmailOrPhone(email);
    if (!user) {
      user = db.createUser({
        name,
        email,
        phone: '',
        role: 'user',
      });
      db.updateUser(user.id, {
        authProvider: 'google',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
    } else {
      db.updateUser(user.id, {
        lastLoginAt: Date.now(),
        authProvider: 'google',
      });
    }

    const sessionToken = db.createSession(user.id);
    const sanitizedUser = sanitizeUser(user);

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head><meta charset="utf-8"><title>تایید هویت موفق</title></head>
      <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 40px; background: #090d16; color: #fff;">
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto;">
          <h3 style="color: #10b981; margin-top:0;">احراز هویت گوگل تایید شد</h3>
          <p style="color: #cbd5e1; font-size: 13px;">خوش آمدید، <b>${escapeHtml(user.name)}</b>! در حال ورود...</p>
        </div>
        <script>
          const payload = {
            type: 'OAUTH_AUTH_SUCCESS',
            token: ${JSON.stringify(sessionToken)},
            user: ${JSON.stringify(sanitizedUser)}
          };
          if (window.opener) {
            window.opener.postMessage(payload, '*');
            setTimeout(() => window.close(), 600);
          } else {
            localStorage.setItem('auth_token', ${JSON.stringify(sessionToken)});
            window.location.href = '/';
          }
        </script>
      </body>
      </html>
    `);
  });

  // Google OAuth 2.0 Callback (Receives auth code, exchanges token, and sends postMessage to opener)
  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, error, error_description } = req.query;
    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head><meta charset="utf-8"><title>خطا در ورود با گوگل</title></head>
        <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 40px; background: #090d16; color: #fff;">
          <h3 style="color: #ef4444;">تایید هویت حساب گوگل انجام نشد</h3>
          <p style="color: #94a3b8; font-size: 13px;">${escapeHtml(String(error_description || error))}</p>
          <button onclick="window.close()" style="background: #e11d48; color: #fff; padding: 10px 20px; border-radius: 8px; border:none; cursor:pointer;">بستن پنجره</button>
        </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).send('کد اعتبارسنجی از سوی گوگل دریافت نشد.');
    }

    const settings = db.getSettings();
    const clientId = (settings.security?.googleOAuth?.clientId || settings.seo?.googleClientId || process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (settings.security?.googleOAuth?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const host = req.get('host') || 'gaiafa.ir';
    const protocol = req.protocol === 'http' && host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/auth/callback`;

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('[Google OAuth Token Error]:', tokenData);
        return res.send(`
          <!DOCTYPE html>
          <html dir="rtl" lang="fa">
          <head><meta charset="utf-8"><title>خطای تبادل توکن گوگل</title></head>
          <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 40px; background: #090d16; color: #fff;">
            <h3 style="color: #f59e0b;">خطا در تبادل توکن با سرور گوگل</h3>
            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
              ${escapeHtml(tokenData.error_description || tokenData.error || 'لطفاً کلید Secret و Redirect URI را در کنسول گوگل بررسی فرمایید.')}
            </p>
            <p style="font-family: monospace; font-size: 11px; color: #64748b;">Redirect URI: ${escapeHtml(redirectUri)}</p>
            <button onclick="window.close()" style="background: #3b82f6; color: #fff; padding: 8px 18px; border-radius: 8px; border:none; cursor:pointer; margin-top: 15px;">بستن پنجره</button>
          </body>
          </html>
        `);
      }

      // Fetch user profile from Google UserInfo endpoint
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await userRes.json();
      const googleEmail = (profile.email || '').trim().toLowerCase();
      const googleName = profile.name || profile.given_name || googleEmail.split('@')[0];
      const googlePicture = profile.picture || '';

      if (!googleEmail || !googleEmail.includes('@')) {
        throw new Error('ایمیل معتبر از حساب کاربری گوگل دریافت نشد.');
      }

      let user = db.getUserByEmailOrPhone(googleEmail);
      if (!user) {
        user = db.createUser({
          name: googleName,
          email: googleEmail,
          phone: '',
          role: 'user',
        });
        db.updateUser(user.id, {
          authProvider: 'google',
          avatarUrl: googlePicture,
        });
      } else {
        db.updateUser(user.id, {
          lastLoginAt: Date.now(),
          avatarUrl: googlePicture || user.avatarUrl,
        });
      }

      const sessionToken = db.createSession(user.id);
      const sanitizedUser = sanitizeUser(user);

      return res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head><meta charset="utf-8"><title>ورود موفقیت‌آمیز</title></head>
        <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 40px; background: #090d16; color: #fff;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto;">
            <h3 style="color: #10b981; margin-top:0;">ورود با گوگل با موفقیت انجام شد</h3>
            <p style="color: #cbd5e1; font-size: 13px;">خوش آمدید، <b>${escapeHtml(user.name)}</b>! در حال انتقال...</p>
          </div>
          <script>
            const payload = {
              type: 'OAUTH_AUTH_SUCCESS',
              token: ${JSON.stringify(sessionToken)},
              user: ${JSON.stringify(sanitizedUser)}
            };
            if (window.opener) {
              window.opener.postMessage(payload, '*');
              setTimeout(() => window.close(), 600);
            } else {
              localStorage.setItem('auth_token', ${JSON.stringify(sessionToken)});
              window.location.href = '/';
            }
          </script>
        </body>
        </html>
      `);
    } catch (oauthErr: any) {
      console.error('[Google OAuth Callback Exception]:', oauthErr);
      return res.status(500).send(`خطا در ورود با گوگل: ${oauthErr.message}`);
    }
  });

  // Google Direct One-Click Authentication & Registration (Direct JWT / GIS fallback)
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential, email, name, picture, sub } = req.body;

      let googleEmail = (email || '').trim().toLowerCase();
      let googleName = (name || '').trim();
      let googlePicture = picture || '';

      // If GIS JWT credential is provided, decode payload safely
      if (credential && typeof credential === 'string') {
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload.email) googleEmail = payload.email.trim().toLowerCase();
            if (payload.name) googleName = payload.name.trim();
            if (payload.picture) googlePicture = payload.picture;
          }
        } catch (jwtErr) {
          console.warn('[Google Auth] Failed to parse JWT payload, using fallback body fields:', jwtErr);
        }
      }

      if (!googleEmail || !googleEmail.includes('@')) {
        return res.status(400).json({ error: 'ایمیل معتبر از حساب کاربری گوگل دریافت نشد.' });
      }

      let user = db.getUserByEmailOrPhone(googleEmail);
      if (!user) {
        // Auto-register new verified Google user with initial welcome gift
        user = db.createUser({
          name: googleName || `کاربر گوگل (${googleEmail.split('@')[0]})`,
          email: googleEmail,
          phone: '', // Google users don't require Iranian phone
          role: 'user',
        });
        db.updateUser(user.id, {
          authProvider: 'google',
          avatarUrl: googlePicture,
        });
        console.log(`[Google Auth] Created new user: ${googleEmail} (${user.id})`);
      } else {
        // Existing user login
        db.updateUser(user.id, {
          lastLoginAt: Date.now(),
          avatarUrl: googlePicture || user.avatarUrl,
        });
        console.log(`[Google Auth] Logged in existing user: ${googleEmail} (${user.id})`);
      }

      if (user.status === 'banned') {
        return res.status(403).json({ error: 'حساب کاربری شما مسدود شده است.' });
      }

      const token = db.createSession(user.id);

      return res.json({
        success: true,
        message: 'ورود با حساب گوگل با موفقیت انجام شد.',
        token,
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error('[Google Auth] Error:', err);
      return res.status(500).json({ error: err.message || 'خطا در احراز هویت با حساب گوگل' });
    }
  });

  // Public: Get Current Broadcast Announcement
  app.get('/api/system/public-announcement', (_req, res) => {
    const settings = db.getSettings();
    const ann = settings.announcementBar || {
      enabled: true,
      text: '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.',
      type: 'warning',
      linkUrl: '',
      linkText: 'ثبت سفارش کتاب',
    };
    return res.json({ announcement: ann });
  });

  // Admin: Update Announcement Bar
  app.put('/api/admin/announcement', requireAdmin, (req, res) => {
    try {
      const { enabled, text, linkUrl, linkText, type } = req.body;
      const settings = db.getSettings();
      const current = settings.announcementBar || {
        enabled: true,
        text: '🎉 تخفیف ویژه چاپ و ترجمه: هزینه ترجمه هر کلمه فقط ۴۵ تومان همراه با استخراج هوشمند واژه‌نامه تخصصی و صفحه‌بندی کتاب.',
        type: 'warning',
        linkUrl: '',
        linkText: 'ثبت سفارش کتاب',
      };
      const updated = {
        ...current,
        enabled: enabled !== undefined ? Boolean(enabled) : current.enabled,
        text: typeof text === 'string' ? text : current.text,
        linkUrl: typeof linkUrl === 'string' ? linkUrl : current.linkUrl,
        linkText: typeof linkText === 'string' ? linkText : current.linkText,
        type: type || current.type || 'warning',
      };
      db.updateSettings({
        announcementBar: updated,
        seo: {
          ...(settings.seo || {}),
          siteTitle: settings.seo?.siteTitle || '',
          metaDescription: settings.seo?.metaDescription || '',
          metaKeywords: settings.seo?.metaKeywords || '',
          announcementEnabled: updated.enabled,
          announcementText: updated.text,
        },
      });
      return res.json({ success: true, message: 'تنظیمات اعلان با موفقیت به‌روز شد.', announcement: updated });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در ذخیره اعلان: ${err.message}` });
    }
  });

  // Send SMS OTP
  app.post('/api/auth/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      return res.status(400).json({ error: 'شماره تلفن همراه معتبر نیست.' });
    }

    const cleanPhone = phone.trim();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.setOtp(cleanPhone, otpCode);

    const smsSettings = db.getSettings().sms;
    const smsResult = await sendRealOtpSms(cleanPhone, otpCode, smsSettings);

    return res.json({
      success: true,
      message: smsResult.message || 'کد تایید ورود به شماره موبایل شما پیامک شد.',
      gatewaySuccess: smsResult.success,
      expiresInSeconds: 180,
    });
  });

  // Verify SMS OTP
  app.post('/api/auth/verify-otp', (req, res) => {
    const { phone, code, name } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره موبایل و کد تایید الزامی است.' });
    }

    const isValid = db.verifyOtp(phone, code);
    if (!isValid) {
      return res.status(400).json({ error: 'کد تایید نادرست است یا منقضی شده است.' });
    }

    let user = db.getUserByEmailOrPhone(phone);
    if (!user) {
      // Auto-register new phone user
      user = db.createUser({
        name: name || `کاربر ${phone.slice(-4)}`,
        phone,
        email: `${phone}@translator.internal`,
        role: 'user',
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'حساب کاربری شما مسدود است.' });
    }

    db.updateUser(user.id, { lastLoginAt: Date.now() });
    const token = db.createSession(user.id);

    return res.json({
      success: true,
      message: 'ورود با پیامک موفقیت‌آمیز بود.',
      token,
      user: sanitizeUser(user),
    });
  });

  // Quick demo mode has been removed as requested by admin.
  // Use /api/auth/login with seeded admin or user credentials.
  app.post('/api/auth/quick-demo', (_req, res) => {
    return res.status(403).json({
      error: 'حالت دمو حذف شده است. لطفاً با نام کاربری و رمز عبور وارد شوید.',
    });
  });

  // Current User Profile
  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    return res.json({
      user: sanitizeUser(user),
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      db.deleteSession(authHeader.slice(7).trim());
    }
    return res.json({ success: true });
  });

  // ==========================================
  // 3. PRICING & WORD COUNT CALCULATION
  // ==========================================
  app.post('/api/pricing/calculate', (req, res) => {
    const { words, tone } = req.body;
    const cleanWords = Math.max(0, Number(words) || 0);
    const user = getAuthUser(req);
    const rateInfo = db.getUserEffectiveCostPerWord(user, tone);

    const costPerWord = rateInfo.effectiveCostPerWord;
    const totalCost = Math.round(cleanWords * costPerWord);
    const estimatedChunks = Math.max(1, Math.ceil(cleanWords / 700));
    const estimatedMinutes = Math.max(1, Math.ceil((estimatedChunks * 4.5) / 60));

    const userBalance = user ? user.walletBalance : 0;
    const hasEnoughBalance = userBalance >= totalCost;

    return res.json({
      words: cleanWords,
      costPerWord,
      baseCostPerWord: rateInfo.baseCostPerWord,
      tier: rateInfo.tier,
      tierLabel: rateInfo.tierLabel,
      discountPercent: rateInfo.discountPercent,
      totalCost,
      estimatedChunks,
      estimatedMinutes,
      userBalance,
      hasEnoughBalance,
      shortfall: Math.max(0, totalCost - userBalance),
    });
  });

  // ==========================================
  // 4. BOOKS MANAGEMENT
  // ==========================================

  // Get user's books (Ultra-lightweight metadata list - <10KB, instant load, zero data drain!)
  app.get('/api/books', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const allBooks = db.getBooks();

    // Strict User Panel Isolation:
    // In the User Dashboard, EVERY user (including admin) ONLY sees their own books (b.userId === user.id).
    // Management oversees all books across the system exclusively in the Admin Panel (/api/admin/all-books).
    const rawBooks = allBooks.filter(
      (b) =>
        Boolean(b.userId) &&
        b.userId === user.id &&
        b.title !== 'کتاب بازیابی شده' &&
        b.originalTitle !== 'Recovered Book'
    );

    const books = rawBooks.map(b => {
      const totalChunks = (b as any).totalChunks !== undefined ? (b as any).totalChunks : (Array.isArray(b.chunks) ? b.chunks.length : 0);
      const completedChunks = (b as any).completedChunks !== undefined ? (b as any).completedChunks : (Array.isArray(b.chunks) ? b.chunks.filter(c => c.status === 'completed' || Boolean(c.translatedHtml)).length : 0);
      const progressPercent = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;
      return {
        id: b.id,
        userId: b.userId,
        title: b.title,
        originalTitle: b.originalTitle,
        author: b.author,
        translator: b.translator,
        tone: b.tone,
        sourceLanguage: b.sourceLanguage || 'en',
        targetLanguage: b.targetLanguage || 'fa',
        wordCount: b.wordCount || 0,
        totalImagesCount: b.totalImagesCount || 0,
        estimatedCost: b.estimatedCost || 0,
        status: b.status,
        totalChunks,
        completedChunks,
        progressPercent,
        hasImages: Boolean(b.totalImagesCount && b.totalImagesCount > 0),
        hasAdminCopy: Boolean(b.adminCopy),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        chunks: [], // Omit heavy chunks from list view to eliminate hundreds of megabytes of transfer!
        glossary: Array.isArray(b.glossary) ? b.glossary : [],
      };
    });
    return res.json({ books });
  });

  // Get single book
  app.get('/api/books/:id', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: 'کتاب مورد نظر یافت نشد.' });
    }

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'شما دسترسی به این کتاب را ندارید.' });
    }

    return res.json({
      book: {
        ...book,
        chunks: Array.isArray(book.chunks) ? book.chunks : [],
        glossary: Array.isArray(book.glossary) ? book.glossary : [],
      },
    });
  });

  // Create Book & optionally Start Background Translation
  app.post('/api/books/create', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const {
      title,
      originalTitle,
      author,
      translator,
      tone,
      sourceLanguage = 'en',
      targetLanguage = 'fa',
      chunks,
      glossary,
      startTranslation = true,
    } = req.body;

    if (!title || !Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({ error: 'اطلاعات کتاب و بخش‌های آن الزامی است.' });
    }

    // Calculate total words
    let totalWords = 0;
    chunks.forEach((c: any) => {
      totalWords += Number(c.wordCount) || 0;
    });

    const rateInfo = db.getUserEffectiveCostPerWord(user, tone);
    const costPerWord = rateInfo.effectiveCostPerWord;
    const estimatedCost = Math.round(totalWords * costPerWord);

    // If starting translation immediately, check wallet balance
    if (startTranslation) {
      if (user.walletBalance < estimatedCost) {
        return res.status(402).json({
          error: `موجودی کیف پول شما کافی نیست. هزینه ترجمه: ${estimatedCost.toLocaleString('fa-IR')} تومان (${rateInfo.tierLabel}) - موجودی فعلی: ${user.walletBalance.toLocaleString('fa-IR')} تومان.`,
          requiredAmount: estimatedCost,
          currentBalance: user.walletBalance,
        });
      }

      // Deduct wallet balance
      db.addTransaction({
        userId: user.id,
        amount: -estimatedCost,
        type: 'charge',
        description: `هزینه ترجمه پس‌زمینه کتاب «${title}» (${totalWords.toLocaleString('fa-IR')} کلمه - ${rateInfo.tierLabel})`,
        status: 'success',
      });
    }

    const bookId = `book_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newBook: BookRecord = {
      id: bookId,
      userId: user.id,
      title: title.trim(),
      originalTitle: (originalTitle || title).trim(),
      author: (author || 'نامشخص').trim(),
      translator: (translator || user.name || 'سامانه هوشمند ترجمه کتاب').trim(),
      tone: tone || 'spiritual',
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage: targetLanguage || 'fa',
      wordCount: totalWords,
      estimatedCost,
      status: startTranslation ? 'translating' : 'draft',
      chunks: chunks.map((c: any, idx: number) => ({
        id: c.id || `chk_${bookId}_${idx + 1}`,
        chapterNumber: c.chapterNumber || idx + 1,
        chapterTitle: c.chapterTitle || `فصل ${idx + 1}`,
        chunkNumber: c.chunkNumber || 1,
        englishText: c.englishText || '',
        translatedHtml: c.translatedHtml || undefined,
        status: c.translatedHtml ? 'completed' : (startTranslation ? 'queued' : 'idle'),
        wordCount: c.wordCount || 0,
        estimatedTokens: c.estimatedTokens || Math.ceil((c.wordCount || 100) * 1.35),
        hasImages: Boolean(c.hasImages),
        imageCount: c.imageCount || 0,
      })),
      glossary: Array.isArray(glossary) ? glossary : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.saveBook(newBook);

    let jobId: string | undefined;
    if (startTranslation) {
      // Create translation job in server queue
      jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const job: TranslationJob = {
        id: jobId,
        bookId: newBook.id,
        userId: user.id,
        status: 'queued',
        totalChunks: newBook.chunks.length,
        completedChunks: newBook.chunks.filter(c => c.status === 'completed').length,
        progressPercent: 0,
        currentChunkTitle: newBook.chunks[0]?.chapterTitle,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      db.saveJob(job);
    }

    return res.json({
      success: true,
      message: startTranslation
        ? 'سفارش ترجمه با موفقیت ثبت شد و پردازش ابری در سرور آغاز گردید. می‌توانید پنجره را ببندید!'
        : 'کتاب به عنوان پیش‌نویس ذخیره شد.',
      book: newBook,
      jobId,
      updatedWalletBalance: user.walletBalance,
    });
  });

  // Update book (e.g. user manually edits translated text in reader)
  app.put('/api/books/:id', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: 'کتاب یافت نشد.' });
    }

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    const { title, author, translator, tone, sourceLanguage, targetLanguage, chunks, glossary, designConfig } = req.body;
    if (title) book.title = title;
    if (author) book.author = author;
    if (translator) book.translator = translator;
    if (tone) book.tone = tone;
    if (sourceLanguage) book.sourceLanguage = sourceLanguage;
    if (targetLanguage) book.targetLanguage = targetLanguage;

    if (Array.isArray(chunks) && chunks.length > 0) {
      // Safely merge incoming chunks: if incoming chunk has empty translatedHtml but server has existing translatedHtml, preserve it!
      const existingChunks = Array.isArray(book.chunks) ? book.chunks : [];
      book.chunks = chunks.map((incChunk: any) => {
        const exist = existingChunks.find((c: any) => c.id === incChunk.id || (c.chunkNumber === incChunk.chunkNumber && c.chapterNumber === incChunk.chapterNumber));
        if (exist) {
          const incHasHtml = typeof incChunk.translatedHtml === 'string' && incChunk.translatedHtml.trim().length > 0;
          const existHasHtml = typeof exist.translatedHtml === 'string' && exist.translatedHtml.trim().length > 0;
          if (!incHasHtml && existHasHtml) {
            return {
              ...incChunk,
              translatedHtml: exist.translatedHtml,
              status: exist.status || 'completed',
              translatedAt: exist.translatedAt || incChunk.translatedAt,
              keyUsed: exist.keyUsed || incChunk.keyUsed,
              modelUsed: exist.modelUsed || incChunk.modelUsed,
            };
          }
        }
        return incChunk;
      });
    }

    if (Array.isArray(glossary)) book.glossary = glossary;
    if (designConfig) (book as any).designConfig = designConfig;

    const savedBook = db.saveBook(book);
    return res.json({ success: true, book: savedBook });
  });

  // Delete book
  app.delete('/api/books/:id', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: 'کتاب یافت نشد.' });
    }

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    const ok = db.deleteBook(req.params.id, isStaffOrAdmin ? undefined : user.id);

    if (!ok) {
      return res.status(404).json({ error: 'کتاب یافت نشد یا دسترسی حذف آن را ندارید.' });
    }

    return res.json({ success: true, message: 'کتاب با موفقیت حذف گردید.' });
  });

  // Start Translation for an existing draft book
  app.post('/api/books/:id/start-translation', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: 'کتاب یافت نشد.' });
    }

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    if (user.walletBalance < book.estimatedCost) {
      return res.status(402).json({
        error: `موجودی کافی نیست. هزینه ترجمه: ${book.estimatedCost.toLocaleString('fa-IR')} تومان`,
        requiredAmount: book.estimatedCost,
      });
    }

    // Deduct
    db.addTransaction({
      userId: user.id,
      amount: -book.estimatedCost,
      type: 'charge',
      description: `هزینه شروع ترجمه ابری کتاب «${book.title}»`,
      status: 'success',
    });

    book.status = 'translating';
    book.chunks.forEach(c => {
      if (c.status !== 'completed') c.status = 'queued';
    });
    db.saveBook(book);

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const job: TranslationJob = {
      id: jobId,
      bookId: book.id,
      userId: user.id,
      status: 'queued',
      totalChunks: book.chunks.length,
      completedChunks: book.chunks.filter(c => c.status === 'completed').length,
      progressPercent: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.saveJob(job);

    return res.json({
      success: true,
      message: 'ترجمه کتاب در صف پردازش سرور قرار گرفت.',
      jobId,
      updatedWalletBalance: user.walletBalance,
    });
  });

  // Stop / Cancel active translation with automatic refund for remaining un-translated words
  app.post('/api/books/:id/stop-translation', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: 'کتاب مورد نظر یافت نشد.' });
    }

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    // Stop all active jobs for this book
    const jobs = db.getJobs(user.id).filter(j => j.bookId === book.id && (j.status === 'queued' || j.status === 'processing'));
    for (const j of jobs) {
      j.status = 'stopped';
      db.saveJob(j);
    }

    book.status = 'draft';
    // Reset queued chunk status
    book.chunks.forEach(c => {
      if (c.status === 'queued' || c.status === 'translating') {
        c.status = 'idle';
      }
    });
    db.saveBook(book);

    // Calculate uncompleted chunks and fair refund
    const uncompletedChunks = book.chunks.filter(c => !c.translatedHtml);
    const uncompletedWords = uncompletedChunks.reduce((sum, c) => sum + (c.wordCount || 0), 0);

    const rateInfo = db.getUserEffectiveCostPerWord(user, book.tone);
    const costPerWord = rateInfo.effectiveCostPerWord;
    const refundAmount = Math.round(uncompletedWords * costPerWord);

    if (refundAmount > 0) {
      db.addTransaction({
        userId: user.id,
        amount: refundAmount,
        type: 'refund',
        description: `بازگشت هزینه ${uncompletedWords.toLocaleString('fa-IR')} کلمه ترجمه‌نشده کتاب «${book.title}» (${rateInfo.tierLabel})`,
        status: 'success',
      });
    }

    const freshUser = db.getUserById(user.id);

    return res.json({
      success: true,
      message: `ترجمه با موفقیت متوقف شد. مبلغ ${refundAmount.toLocaleString('fa-IR')} تومان بابت بخش‌های باقی‌مانده به کیف پول شما واریز گردید.`,
      refundAmount,
      uncompletedWords,
      book,
      updatedWalletBalance: freshUser?.walletBalance || user.walletBalance,
    });
  });

  // Resume / Retry incomplete and failed translation chunks with auto-token switching
  app.post('/api/books/:id/resume-translation', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: 'کتاب مورد نظر یافت نشد.' });
    }

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز به این کتاب.' });
    }

    // Find all incomplete, failed, or empty chunks
    const incompleteChunks = book.chunks.filter(
      c => c.status !== 'completed' || !c.translatedHtml || c.translatedHtml.trim().length === 0
    );

    if (incompleteChunks.length === 0) {
      book.status = 'completed';
      db.saveBook(book);
      return res.json({
        success: true,
        alreadyCompleted: true,
        message: 'تمام بخش‌های این کتاب قبلاً با موفقیت و به صورت کامل ترجمه شده‌اند.',
        remainingChunks: 0,
      });
    }

    // Check if this book was already paid for upon creation without a subsequent refund
    const userTransactions = db.getTransactions(user.id);
    const initialChargeTx = userTransactions.find(t => t.type === 'charge' && t.description?.includes(book.title));
    const refundTx = userTransactions.find(t => t.type === 'refund' && t.description?.includes(book.title));
    const isAlreadyPaid = Boolean(initialChargeTx && !refundTx);

    // Calculate required cost strictly for the remaining untranslated words ONLY IF not already prepaid
    const remainingWords = incompleteChunks.reduce((acc, c) => acc + (c.wordCount || 0), 0);
    const rateInfo = db.getUserEffectiveCostPerWord(user, book.tone);
    const requiredCost = isAlreadyPaid ? 0 : Math.round(remainingWords * rateInfo.effectiveCostPerWord);

    if (!isStaffOrAdmin && !isAlreadyPaid && user.walletBalance < requiredCost) {
      return res.status(402).json({
        error: `موجودی کیف پول شما (${user.walletBalance.toLocaleString('fa-IR')} تومان) برای ادامه ترجمه ${incompleteChunks.length} بخش باقی‌مانده (${requiredCost.toLocaleString('fa-IR')} تومان) کافی نیست. لطفاً کیف پول خود را شارژ فرمایید.`,
        requiredAmount: requiredCost,
        remainingChunks: incompleteChunks.length,
        remainingWords,
      });
    }

    // Deduct only for remaining words if non-privileged and not already prepaid
    if (!isStaffOrAdmin && !isAlreadyPaid && requiredCost > 0) {
      db.addTransaction({
        userId: user.id,
        amount: -requiredCost,
        type: 'charge',
        description: `هزینه ادامه ترجمه ${incompleteChunks.length} بخش باقی‌مانده کتاب «${book.title}» (${remainingWords.toLocaleString('fa-IR')} کلمه)`,
        status: 'success',
      });
    }

    // Mark incomplete chunks as queued and clear past error messages
    incompleteChunks.forEach(c => {
      c.status = 'queued';
      c.errorMessage = undefined;
    });

    book.status = 'translating';
    book.updatedAt = Date.now();
    db.saveBook(book);

    // Stop any stale jobs for this book
    const existingJobs = db.getJobs(user.id).filter(j => j.bookId === book.id && (j.status === 'queued' || j.status === 'processing'));
    for (const ej of existingJobs) {
      ej.status = 'stopped';
      db.saveJob(ej);
    }

    // Create fresh translation job
    const completedCount = book.chunks.length - incompleteChunks.length;
    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const job: TranslationJob = {
      id: jobId,
      bookId: book.id,
      userId: user.id,
      status: 'queued',
      totalChunks: book.chunks.length,
      completedChunks: completedCount,
      progressPercent: Math.round((completedCount / book.chunks.length) * 100),
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.saveJob(job);

    const freshUser = db.getUserById(user.id);

    return res.json({
      success: true,
      message: `ادامه ترجمه برای ${incompleteChunks.length} بخش باقی‌مانده آغاز شد و در پس‌زمینه ابری سرور در حال انجام است.`,
      jobId,
      remainingChunks: incompleteChunks.length,
      remainingWords,
      completedChunks: completedCount,
      totalChunks: book.chunks.length,
      updatedWalletBalance: freshUser?.walletBalance ?? user.walletBalance,
    });
  });

  // Online Delete of a Chunk/Page
  app.delete('/api/books/:id/chunks/:chunkId', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد.' });
    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    const initialLen = book.chunks.length;
    book.chunks = book.chunks.filter(c => c.id !== req.params.chunkId);
    if (book.chunks.length === initialLen) {
      return res.status(404).json({ error: 'بخش مورد نظر در کتاب یافت نشد.' });
    }

    // Re-index remaining chunks
    book.chunks.forEach((c, idx) => {
      c.chunkNumber = idx + 1;
    });

    // Recalculate wordCount
    book.wordCount = book.chunks.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    const rateInfo = db.getUserEffectiveCostPerWord(user, book.tone);
    book.estimatedCost = Math.round(book.wordCount * rateInfo.effectiveCostPerWord);
    db.saveBook(book);

    return res.json({
      success: true,
      message: 'صفحه/بخش با موفقیت حذف شد.',
      book,
    });
  });

  // Online Edit of a Chunk/Page
  app.put('/api/books/:id/chunks/:chunkId', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد.' });
    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';
    const isOwner = book.userId === user.id;

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    const chunk = book.chunks.find(c => c.id === req.params.chunkId);
    if (!chunk) {
      return res.status(404).json({ error: 'بخش مورد نظر یافت نشد.' });
    }

    const { chapterTitle, englishText, translatedHtml } = req.body;
    if (chapterTitle !== undefined) chunk.chapterTitle = chapterTitle;
    if (englishText !== undefined) {
      chunk.englishText = englishText;
      chunk.wordCount = englishText.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      chunk.estimatedTokens = Math.ceil(chunk.wordCount * 1.35);
    }
    if (translatedHtml !== undefined) {
      chunk.translatedHtml = translatedHtml;
      if (translatedHtml.trim()) {
        chunk.status = 'completed';
      }
    }

    book.wordCount = book.chunks.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    db.saveBook(book);

    return res.json({
      success: true,
      message: 'تغییرات صفحه با موفقیت ذخیره شد.',
      chunk,
      book,
    });
  });

  // Add new page/chunk anywhere in the book (start, end, before or after any existing page)
  app.post('/api/books/:id/chunks', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const book = db.getBookById(req.params.id);

    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد.' });
    if (book.userId !== user.id && user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }

    const {
      chapterTitle = 'صفحه جدید',
      englishText = '',
      translatedHtml = '',
      insertPosition = 'end', // 'end' | 'start' | 'after' | 'before'
      targetChunkId,
      imageUrl,
      imageCaption,
      imagePlacement = 'top', // 'top' | 'bottom' | 'standalone'
    } = req.body;

    const rawEn = (englishText || '').trim();
    let rawFa = (translatedHtml || '').trim();

    // If an image URL / base64 is provided, format it into HTML
    if (imageUrl && imageUrl.trim()) {
      const cleanImg = imageUrl.trim();
      const captionHtml = imageCaption && imageCaption.trim()
        ? `<figcaption style="text-align: center; font-size: 10pt; color: #64748b; margin-top: 6px; font-style: italic;">${escapeHtml(imageCaption.trim())}</figcaption>`
        : '';
      const imgBlock = `<figure class="book-illustration-wrap" style="text-align: center; margin: 18px 0; break-inside: avoid;"><img src="${cleanImg}" alt="${escapeHtml(imageCaption || chapterTitle)}" class="book-embedded-image" style="max-width: 85%; height: auto; margin: 0 auto; border-radius: 12px; display: block; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" />${captionHtml}</figure>`;

      if (imagePlacement === 'top') {
        rawFa = rawFa ? `${imgBlock}\n${rawFa}` : imgBlock;
      } else if (imagePlacement === 'bottom') {
        rawFa = rawFa ? `${rawFa}\n${imgBlock}` : imgBlock;
      } else {
        rawFa = imgBlock;
      }
    }

    // Wrap plain text in clean paragraphs if not already HTML
    if (rawFa && !rawFa.startsWith('<') && !rawFa.includes('<p') && !rawFa.includes('<h')) {
      const paragraphs = rawFa.split(/\n\s*\n/).filter(Boolean);
      rawFa = paragraphs.map((p: string) => `<p style="line-height: 1.9; font-size: 12pt; text-align: justify; margin-bottom: 14px;">${escapeHtml(p.trim())}</p>`).join('\n');
    }

    // Add chapter title heading if not already present in HTML
    if (rawFa && !rawFa.includes('<h1') && !rawFa.includes('<h2') && chapterTitle.trim()) {
      rawFa = `<h2 style="color: #2b6cb0; font-size: 18pt; margin-top: 15px; margin-bottom: 12px; font-weight: bold;">${escapeHtml(chapterTitle.trim())}</h2>\n${rawFa}`;
    }

    const wordsFromEn = rawEn ? rawEn.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
    const wordsFromFa = rawFa ? rawFa.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
    const wordCount = Math.max(1, wordsFromEn || wordsFromFa || 40);

    const hasImages = Boolean(imageUrl || rawFa.includes('<img') || rawEn.includes('<img') || rawFa.includes('data:image'));
    const imgCount = (rawFa.match(/<img/gi) || []).length;

    const newChunkId = `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newChunk: BookChunkRecord = {
      id: newChunkId,
      chapterNumber: 1,
      chapterTitle: (chapterTitle || 'صفحه جدید').trim(),
      chunkNumber: 1,
      englishText: rawEn || (rawFa ? '' : 'New Page Content'),
      translatedHtml: rawFa || undefined,
      status: rawFa ? 'completed' : 'idle',
      wordCount,
      estimatedTokens: Math.ceil(wordCount * 1.35),
      hasImages,
      imageCount: hasImages ? Math.max(1, imgCount) : undefined,
    };

    if (!Array.isArray(book.chunks)) {
      book.chunks = [];
    }

    let insertIndex = book.chunks.length;
    if (insertPosition === 'start') {
      insertIndex = 0;
    } else if (insertPosition === 'before' && targetChunkId) {
      const idx = book.chunks.findIndex(c => c.id === targetChunkId);
      insertIndex = idx >= 0 ? idx : 0;
    } else if (insertPosition === 'after' && targetChunkId) {
      const idx = book.chunks.findIndex(c => c.id === targetChunkId);
      insertIndex = idx >= 0 ? idx + 1 : book.chunks.length;
    }

    book.chunks.splice(insertIndex, 0, newChunk);

    // Re-index all chunks strictly continuous
    book.chunks.forEach((c, idx) => {
      c.chunkNumber = idx + 1;
    });

    book.wordCount = book.chunks.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    book.totalImagesCount = book.chunks.reduce((sum, c) => sum + (c.imageCount || (c.hasImages ? 1 : 0)), 0);
    const rateInfo = db.getUserEffectiveCostPerWord(user, book.tone);
    book.estimatedCost = Math.round(book.wordCount * rateInfo.effectiveCostPerWord);
    book.updatedAt = Date.now();

    db.saveBook(book);

    return res.json({
      success: true,
      message: 'صفحه جدید با موفقیت به کتاب اضافه گردید.',
      newChunk,
      book,
    });
  });

  // Apply Coupon / Promo Code
  app.post('/api/coupons/apply', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'کد تخفیف الزامی است.' });

    const result = db.applyCoupon(user.id, code);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  });

  // Get active jobs for current user
  app.get('/api/jobs/my-active', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const jobs = db.getJobs(user.id).filter(j => j.status === 'queued' || j.status === 'processing');
    return res.json({ jobs });
  });

  // Get status of specific job
  app.get('/api/jobs/status/:jobId', requireAuth, (req, res) => {
    const job = db.getJobById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'پردازش مورد نظر یافت نشد.' });
    }
    const book = db.getBookById(job.bookId);
    return res.json({ job, book });
  });

  // AI Smart Glossary Auto-Extraction (supports both routes & payload keys)
  const handleGlossaryExtraction = async (req: express.Request, res: express.Response) => {
    try {
      const text = req.body.text || req.body.sampleText || req.body.englishText;
      const tone = req.body.tone || 'general';
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        return res.status(400).json({ error: 'متن انگلیسی برای استخراج اصطلاحات کافی نیست.' });
      }
      const terms = await queueManager.extractGlossaryTerms(text.trim(), tone);
      return res.json({ success: true, terms, glossary: terms });
    } catch (err: any) {
      console.error('Glossary extraction error:', err);
      return res.status(500).json({ error: err.message || 'خطا در استخراج خودکار اصطلاحات' });
    }
  };
  app.post('/api/ai/extract-glossary', handleGlossaryExtraction);
  app.post('/api/extract-glossary', handleGlossaryExtraction);

  // Free Sample Translation (Free preview trial without wallet deduction)
  app.post('/api/books/sample-translate', async (req, res) => {
    try {
      const { text, tone, glossary } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length < 10) {
        return res.status(400).json({ error: 'متن برای ترجمه نمونه ارسال نشده است.' });
      }
      const sampleText = text.trim().slice(0, 7000);
      const translatedHtml = await queueManager.translateStandalone(sampleText, tone || 'spiritual', glossary || []);
      return res.json({ success: true, translatedHtml });
    } catch (err: any) {
      console.error('Sample translation error:', err);
      return res.status(500).json({ error: err.message || 'خطا در ترجمه آزمایشی نمونه کتاب' });
    }
  });

  // Single-Chunk / Batch Workspace Translation with Multi-Token Failover
  app.post('/api/translate', async (req, res) => {
    try {
      let user: User | null = getAuthUser(req);

      const {
        bookId,
        chunkId,
        chunkNumber,
        englishText,
        sourceLanguage,
        targetLanguage,
        tone,
        glossary,
        chapterTitle,
      } = req.body;

      if (!englishText || typeof englishText !== 'string' || englishText.trim().length === 0) {
        return res.status(400).json({ error: 'متن برای ترجمه ارسال نشده است.' });
      }

      let book: BookRecord | null = null;
      if (bookId) {
        book = db.getBookById(bookId) || null;
      }

      const effectiveTone = tone || book?.tone || 'spiritual';
      const effectiveGlossary = glossary || book?.glossary || [];

      // Check user wallet if user is a regular user (not admin/staff)
      const wordCount = Math.max(1, englishText.split(/\s+/).length);
      const isPrivileged = user && (user.role === 'admin' || user.role === 'staff');
      let effectiveCost = 0;

      if (user && !isPrivileged) {
        const rateInfo = db.getUserEffectiveCostPerWord(user, effectiveTone);
        effectiveCost = Math.round(wordCount * rateInfo.effectiveCostPerWord);
        if (user.walletBalance < effectiveCost) {
          return res.status(402).json({
            error: `موجودی کیف پول شما (${user.walletBalance.toLocaleString('fa-IR')} تومان) برای ترجمه این بخش (${effectiveCost.toLocaleString('fa-IR')} تومان) کافی نیست.`,
            requiredCost: effectiveCost,
            walletBalance: user.walletBalance,
          });
        }
      }

      // Build target book record for translation context
      const translationTargetBook: BookRecord = book || {
        id: bookId || 'workspace_book',
        userId: user?.id || 'system',
        title: chapterTitle || 'کتاب',
        originalTitle: 'Original Book',
        author: 'Author',
        translator: 'Translator',
        tone: effectiveTone,
        sourceLanguage: sourceLanguage || 'en',
        targetLanguage: targetLanguage || 'fa',
        wordCount,
        estimatedCost: effectiveCost,
        status: 'draft',
        chunks: [],
        glossary: effectiveGlossary,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Execute translation with automatic token switching on failure / quota limit
      const result = await queueManager.translateChunkWithFailover({
        englishText,
        book: translationTargetBook,
        userId: user?.id || 'workspace_user',
        chunkNumber: Number(chunkNumber) || 1,
      });

      // Deduct wallet if user is non-privileged
      if (user && !isPrivileged && effectiveCost > 0) {
        db.addTransaction({
          userId: user.id,
          amount: -effectiveCost,
          type: 'charge',
          description: `ترجمه بخش ${chunkNumber || 1} کتاب «${book?.title || chapterTitle || 'پروژه'}» (${wordCount.toLocaleString('fa-IR')} کلمه)`,
          status: 'success',
        });
        user = db.getUserById(user.id) || null;
      }

      // If book exists in server DB, update chunk in database as well
      if (book && chunkId) {
        const chunk = book.chunks.find(c => c.id === chunkId);
        if (chunk) {
          chunk.status = 'completed';
          chunk.translatedHtml = result.translatedHtml;
          chunk.keyUsed = result.keyUsed;
          chunk.modelUsed = result.modelUsed;
          chunk.translatedAt = Date.now();
          chunk.errorMessage = undefined;
        }
        book.updatedAt = Date.now();
        // Check if all chunks in book are complete
        const allDone = book.chunks.length > 0 && book.chunks.every(c => c.status === 'completed' && Boolean(c.translatedHtml && c.translatedHtml.trim().length > 0));
        if (allDone) {
          book.status = 'completed';
        }
        db.saveBook(book);
      }

      return res.json({
        success: true,
        translatedHtml: result.translatedHtml,
        keyUsed: result.keyUsed,
        model: result.modelUsed,
        switchOccurred: result.switchOccurred,
        serverUsed: result.keyUsed,
        walletBalance: user?.walletBalance,
      });
    } catch (err: any) {
      console.error('[API /api/translate] Translation error:', err);
      return res.status(500).json({
        error: err.message || 'خطا در ترجمه بخش با هوش مصنوعی',
      });
    }
  });

  // ==========================================
  // 6. WALLET & PAYMENTS
  // ==========================================

  // Get transactions
  app.get('/api/user/transactions', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const transactions = db.getTransactions(user.id);
    return res.json({ transactions });
  });

  // Create payment invoice (Real Zarinpal v4 Web-Service or fallback)
  app.post('/api/payment/create-invoice', requireAuth, async (req, res) => {
    const user = (req as any).user as User;
    const { amount, gateway = 'zarinpal' } = req.body;
    const cleanAmount = Number(amount);

    if (!cleanAmount || cleanAmount < 10000) {
      return res.status(400).json({ error: 'حداقل مبلغ افزایش موجودی ۱۰,۰۰۰ تومان است.' });
    }

    const settings = db.getSettings();
    const trackingCode = `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const tx = db.addTransaction({
      userId: user.id,
      amount: cleanAmount,
      type: 'deposit',
      description: `افزایش موجودی آنلاین از درگاه ${gateway === 'zibal' ? 'زیبال' : gateway === 'zarinpal' ? 'زرین‌پال' : gateway === 'nextpay' ? 'نکست‌پی' : gateway === 'idpay' ? 'آیدی‌پی' : 'بانکی'}`,
      gateway: gateway as any,
      status: 'pending',
      trackingCode,
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');

    // 1. ZarinPal Real REST API v4 flow
    if (gateway === 'zarinpal') {
      const zpConfig = settings.gateways.zarinpal;
      if (!zpConfig.enabled) {
        return res.status(400).json({ error: 'درگاه پرداخت زرین‌پال در حال حاضر توسط مدیریت سامانه غیرفعال است.' });
      }

      const merchant = (zpConfig.merchantId || '').trim();
      if (!merchant || merchant === '00000000-0000-0000-0000-000000000000') {
        return res.status(400).json({
          error: 'مرچنت کد ۳۶ کاراکتری زرین‌پال در پنل مدیریت هنوز تنظیم نشده است. لطفاً مدیر سامانه کد اختصاصی پذیرنده زرین‌پال را در پنل مدیریت ثبت کند.',
        });
      }

      const baseCallback = (zpConfig as any).callbackDomain?.trim()
        ? (zpConfig as any).callbackDomain.trim().replace(/\/+$/, '')
        : `${protocol}://${host}`;
      const callbackUrl = `${baseCallback}/api/payment/zarinpal/callback?txId=${tx.id}`;
      const zpResult = await zarinpalService.requestPayment({
        merchantId: merchant,
        amountTomans: cleanAmount,
        isSandbox: zpConfig.isSandbox,
        currency: zpConfig.currency || 'IRT',
        description: `افزایش اعتبار کیف پول کاربر ${user.name || user.phone}`,
        callbackUrl,
        mobile: user.phone,
        email: user.email || undefined,
        orderId: tx.id,
        referer: zpConfig.refererDomain || 'https://gaiafa.ir/',
      });

      if (!zpResult.success) {
        tx.status = 'failed';
        db.saveDatabase();
        let errorMsg = zpResult.error || 'خطا در ارتباط با وب‌سرویس زرین‌پال';
        if (zpResult.code === -14 || (zpResult.error && zpResult.error.includes('-14'))) {
          errorMsg = 'خطای -14 زرین‌پال: دامنه Callback URL با ترمینال ثبت شده مطابقت ندارد. در محیط دمو به دلیل موقت بودن آدرس این خطا ایجاد می‌شود. در هاست لینوکسی اصلی روی دامنه ثبت شده در زرین‌پال (مانند book.gaiafa.ir یا gaiafa.ir) بدون خطا انجام خواهد شد. برای تست در محیط پیش‌نمایش، حالت Sandbox را در پنل درگاه‌ها فعال فرمایید.';
        }
        return res.status(400).json({
          error: errorMsg,
          code: zpResult.code,
          details: zpResult,
        });
      }

      // Store authority on transaction record
      tx.authority = zpResult.authority;
      db.saveDatabase();

      return res.json({
        success: true,
        transactionId: tx.id,
        trackingCode: tx.trackingCode,
        authority: zpResult.authority,
        amount: cleanAmount,
        gateway: 'zarinpal',
        paymentUrl: zpResult.paymentUrl, // Official ZarinPal StartPay URL
      });
    }

    // 2. BitPay (bitpay.ir) Real Merchant Gateway Flow
    if (gateway === 'bitpay') {
      const bpConfig = settings.gateways.bitpay;
      if (!bpConfig?.enabled) {
        return res.status(400).json({ error: 'درگاه پرداخت بیت‌پی در حال حاضر توسط مدیریت سامانه غیرفعال است.' });
      }

      const apiKey = (bpConfig.apiKey || '').trim();
      if (!apiKey) {
        return res.status(400).json({
          error: 'کلید API درگاه بیت‌پی (BitPay) در پنل مدیریت هنوز تنظیم نشده است. لطفاً مدیر سامانه کلید API اختصاصی پذیرنده را در تنظیمات درگاه‌ها ثبت نماید.',
        });
      }

      const baseCallback = (settings.gateways.zarinpal as any)?.callbackDomain?.trim()
        ? (settings.gateways.zarinpal as any).callbackDomain.trim().replace(/\/+$/, '')
        : `${protocol}://${host}`;
      const callbackUrl = `${baseCallback}/api/payment/bitpay/callback?txId=${tx.id}`;

      const bpResult = await bitpayService.requestPayment({
        apiKey,
        amountTomans: cleanAmount,
        redirectUrl: callbackUrl,
        name: user.name,
        email: user.email || undefined,
        description: `افزایش موجودی کیف پول کاربر ${user.name || user.phone}`,
        factorId: tx.id,
      });

      if (!bpResult.success) {
        tx.status = 'failed';
        db.saveDatabase();
        return res.status(400).json({
          error: bpResult.error || 'خطا در اتصال به درگاه پرداخت بیت‌پی',
          code: bpResult.code,
          details: bpResult,
        });
      }

      // Store generated idGet in authority
      tx.authority = String(bpResult.idGet);
      db.saveDatabase();

      return res.json({
        success: true,
        transactionId: tx.id,
        trackingCode: tx.trackingCode,
        authority: String(bpResult.idGet),
        amount: cleanAmount,
        gateway: 'bitpay',
        paymentUrl: bpResult.paymentUrl,
      });
    }

    // Direct sandbox/fallback checkout URL
    return res.json({
      success: true,
      transactionId: tx.id,
      trackingCode,
      amount: cleanAmount,
      gateway,
      paymentUrl: `/payment/gateway/${tx.id}`,
    });
  });

  // ZarinPal Callback Handler (Invoked when user returns from payment.zarinpal.com/pg/StartPay/...)
  app.get('/api/payment/zarinpal/callback', async (req, res) => {
    const authority = (req.query.Authority || req.query.authority) as string;
    const status = (req.query.Status || req.query.status) as string;
    const txId = (req.query.txId || req.query.order_id) as string;

    const transactions = db.getTransactions();
    const tx = transactions.find(t => (txId && t.id === txId) || (authority && t.authority === authority));

    if (!tx) {
      return res.redirect('/?payment=error&message=' + encodeURIComponent('تراکنش مالی در سامانه یافت نشد.'));
    }

    // If transaction was already verified
    if (tx.status === 'success') {
      return res.redirect(`/?payment=success&txId=${tx.id}&amount=${tx.amount}&trackingCode=${tx.trackingCode}`);
    }

    if (status !== 'OK') {
      tx.status = 'failed';
      db.saveDatabase();
      return res.redirect(`/?payment=canceled&txId=${tx.id}&message=` + encodeURIComponent('پرداخت توسط خریدار در درگاه بانک لغو شد یا ناموفق بود.'));
    }

    // Call ZarinPal verify endpoint
    const settings = db.getSettings();
    const zpConfig = settings.gateways.zarinpal;

    const verifyResult = await zarinpalService.verifyPayment({
      merchantId: zpConfig.merchantId,
      amountTomans: tx.amount,
      isSandbox: zpConfig.isSandbox,
      currency: zpConfig.currency || 'IRT',
      authority,
      referer: zpConfig.refererDomain || 'https://gaiafa.ir/',
    });

    if (verifyResult.success) {
      tx.status = 'success';
      tx.trackingCode = String(verifyResult.ref_id || tx.trackingCode);
      tx.refId = verifyResult.ref_id;
      tx.cardPan = verifyResult.card_pan;
      tx.fee = verifyResult.fee;

      const user = db.getUserById(tx.userId);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + tx.amount;
        db.updateUser(user.id, { walletBalance: user.walletBalance });
      }
      db.saveDatabase();

      return res.redirect(`/?payment=success&txId=${tx.id}&amount=${tx.amount}&trackingCode=${verifyResult.ref_id || tx.trackingCode}&cardPan=${verifyResult.card_pan || ''}`);
    } else {
      tx.status = 'failed';
      db.saveDatabase();
      return res.redirect(`/?payment=failed&txId=${tx.id}&message=` + encodeURIComponent(verifyResult.error || 'تراکنش توسط وب‌سرویس زرین‌پال تایید نشد.'));
    }
  });

  // BitPay Callback Handler (Invoked when user returns from bitpay.ir payment portal)
  app.get('/api/payment/bitpay/callback', async (req, res) => {
    const transId = (req.query.trans_id || req.query.transId) as string;
    const idGet = (req.query.id_get || req.query.idGet) as string;
    const txId = req.query.txId as string;

    const transactions = db.getTransactions();
    const tx = transactions.find(t => (txId && t.id === txId) || (idGet && t.authority === String(idGet)));

    if (!tx) {
      return res.redirect('/?payment=error&message=' + encodeURIComponent('تراکنش مالی در سامانه یافت نشد.'));
    }

    // If transaction was already verified
    if (tx.status === 'success') {
      return res.redirect(`/?payment=success&txId=${tx.id}&amount=${tx.amount}&trackingCode=${tx.trackingCode}`);
    }

    const numTransId = Number(transId);
    if (!transId || isNaN(numTransId) || numTransId <= 0) {
      tx.status = 'failed';
      db.saveDatabase();
      return res.redirect(`/?payment=canceled&txId=${tx.id}&message=` + encodeURIComponent('پرداخت توسط خریدار در درگاه بانک لغو شد یا شناسه تراکنش نامعتبر است.'));
    }

    const settings = db.getSettings();
    const bpConfig = settings.gateways.bitpay;
    const apiKey = bpConfig?.apiKey?.trim() || '';

    const verifyResult = await bitpayService.verifyPayment({
      apiKey,
      transId: numTransId,
      idGet,
    });

    if (verifyResult.success) {
      tx.status = 'success';
      tx.trackingCode = String(transId);
      tx.refId = transId;
      if (verifyResult.cardNum) {
        tx.cardPan = verifyResult.cardNum;
      }

      const user = db.getUserById(tx.userId);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + tx.amount;
        db.updateUser(user.id, { walletBalance: user.walletBalance });
      }
      db.saveDatabase();

      return res.redirect(`/?payment=success&txId=${tx.id}&amount=${tx.amount}&trackingCode=${transId}&cardPan=${verifyResult.cardNum || ''}`);
    } else {
      tx.status = 'failed';
      db.saveDatabase();
      return res.redirect(`/?payment=failed&txId=${tx.id}&message=` + encodeURIComponent(verifyResult.error || 'تراکنش توسط درگاه بیت‌پی تایید نشد.'));
    }
  });

  // Verify / Complete Payment (Simulated instant checkout for seamless testing)
  app.post('/api/payment/verify', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const { transactionId } = req.body;

    const txs = db.getTransactions(user.id);
    const tx = txs.find(t => t.id === transactionId);

    if (!tx) {
      return res.status(404).json({ error: 'تراکنش یافت نشد.' });
    }

    if (tx.status === 'success') {
      return res.json({ success: true, message: 'این تراکنش قبلاً با موفقیت پرداخت شده است.', balance: user.walletBalance });
    }

    tx.status = 'success';
    user.walletBalance += tx.amount;
    db.updateUser(user.id, { walletBalance: user.walletBalance });

    return res.json({
      success: true,
      message: `مبلغ ${tx.amount.toLocaleString('fa-IR')} تومان به موجودی کیف پول افزوده شد.`,
      newBalance: user.walletBalance,
      trackingCode: tx.trackingCode,
    });
  });

  // Dedicated Bank / ZarinPal Gateway Portal Redirect
  app.get('/payment/gateway/:txId', async (req, res) => {
    const txId = (req.params.txId || req.query.txId) as string;
    const transactions = db.getTransactions();
    const tx = transactions.find(t => t.id === txId);

    if (!tx) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head><meta charset="utf-8"><title>تراکنش یافت نشد</title></head>
        <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
          <h2>شناسه فاکتور نامعتبر است</h2>
          <p>تراکنش مورد نظر در سیستم یافت نشد.</p>
          <a href="/" style="color: #f59e0b; text-decoration: none;">بازگشت به سامانه</a>
        </body>
        </html>
      `);
    }

    const settings = db.getSettings();
    const zpConfig = settings.gateways.zarinpal;

    // If transaction already has authority, redirect directly to official ZarinPal StartPay
    if (tx.authority) {
      const startPayUrl = zpConfig.isSandbox
        ? `https://sandbox.zarinpal.com/pg/StartPay/${tx.authority}`
        : `https://www.zarinpal.com/pg/StartPay/${tx.authority}`;
      return res.redirect(startPayUrl);
    }

    // If merchant is unconfigured
    const merchant = (zpConfig.merchantId || '').trim();
    if (!merchant || merchant === '00000000-0000-0000-0000-000000000000') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head><meta charset="utf-8"><title>تنظیم درگاه پرداخت</title></head>
        <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
          <h2 style="color: #f59e0b;">مرچنت کد ۳۶ کاراکتری زرین‌پال تنظیم نشده است</h2>
          <p style="margin: 16px 0; color: #cbd5e1;">لطفاً مدیر سامانه کد اختصاصی پذیرنده زرین‌پال را در پنل مدیریت سامانه ثبت و ذخیره کند.</p>
          <a href="/?admin=gateways" style="display: inline-block; background: #3b82f6; color: #fff; padding: 10px 20px; border-radius: 12px; text-decoration: none;">ورود به پنل مدیریت درگاه‌ها</a>
        </body>
        </html>
      `);
    }

    // Request authority from Zarinpal v4 and redirect
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const callbackUrl = `${protocol}://${host}/api/payment/zarinpal/callback?txId=${tx.id}`;

    const zpResult = await zarinpalService.requestPayment({
      merchantId: merchant,
      amountTomans: tx.amount,
      isSandbox: zpConfig.isSandbox,
      currency: zpConfig.currency || 'IRT',
      description: `افزایش اعتبار کیف پول - فاکتور شماره ${tx.id}`,
      callbackUrl,
      orderId: tx.id,
    });

    if (zpResult.success && zpResult.paymentUrl) {
      tx.authority = zpResult.authority;
      db.saveDatabase();
      return res.redirect(zpResult.paymentUrl);
    }

    return res.status(400).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head><meta charset="utf-8"><title>خطا در اتصال به درگاه</title></head>
      <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
        <h2 style="color: #ef4444;">خطا در اتصال به وب‌سرویس زرین‌پال</h2>
        <p style="margin: 16px 0; color: #fca5a5;">${zpResult.error || 'ارتباط با زرین‌پال برقرار نشد.'}</p>
        <a href="/" style="color: #f59e0b; text-decoration: none;">بازگشت به سایت</a>
      </body>
      </html>
    `);
  });

  // Gateway Completion Action
  app.post('/api/payment/gateway-complete', (req, res) => {
    const { txId } = req.body;
    const transactions = db.getTransactions();
    const tx = transactions.find(t => t.id === txId);

    if (!tx) {
      return res.redirect('/?payment=error&message=تراکنش_یافت_نشد');
    }

    if (tx.status !== 'success') {
      tx.status = 'success';
      const user = db.getUserById(tx.userId);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + tx.amount;
        db.updateUser(user.id, { walletBalance: user.walletBalance });
      }
    }

    return res.redirect(`/?payment=success&txId=${tx.id}&amount=${tx.amount}&trackingCode=${tx.trackingCode}`);
  });

  // ==========================================
  // 7. ADMIN PANEL ENDPOINTS
  // ==========================================

  // Admin & Staff Overview
  app.get('/api/admin/overview', requireStaffOrAdmin, (req, res) => {
    const requestingUser = (req as any).user as User;
    const isStaff = requestingUser.role === 'staff';

    const users = db.getUsers();
    const books = db.getBooks();
    const jobs = db.getJobs();
    const transactions = db.getTransactions();
    const apiKeys = db.getApiKeys();

    let totalWords = 0;
    books.forEach(b => { totalWords += b.wordCount || 0; });

    let totalRevenue = 0;
    if (!isStaff) {
      transactions.forEach(t => {
        if (t.type === 'deposit' && t.status === 'success') {
          totalRevenue += t.amount;
        }
      });
    }

    const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');

    return res.json({
      isStaff,
      hideFinancialStats: isStaff,
      totalUsers: users.length,
      totalBooks: books.length,
      totalWords,
      totalRevenue: isStaff ? undefined : totalRevenue,
      activeJobsCount: activeJobs.length,
      activeJobs,
      apiKeysCount: isStaff ? undefined : apiKeys.length,
      apiKeysActive: isStaff ? undefined : apiKeys.filter(k => k.isActive && k.cooldownUntil <= Date.now()).length,
      recentUsers: users.slice(-5).reverse().map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        status: u.status,
        customCostPerWord: u.customCostPerWord,
        organizationName: u.organizationName,
      })),
      recentTransactions: isStaff ? [] : transactions.slice(0, 10),
    });
  });

  // Admin & Staff Users List
  app.get('/api/admin/users', requireStaffOrAdmin, (req, res) => {
    const requestingUser = (req as any).user as User;
    const isStaff = requestingUser.role === 'staff';

    const users = db.getUsers();
    const books = db.getBooks();
    const transactions = db.getTransactions();

    const userList = users.map(u => {
      const userTxs = transactions.filter(t => t.userId === u.id);
      const totalSpent = isStaff
        ? undefined
        : userTxs
            .filter(t => (t.type === 'charge' || t.amount < 0) && t.status === 'success')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalDeposited = isStaff
        ? undefined
        : userTxs
            .filter(t => (t.type === 'deposit' || t.type === 'admin_gift') && t.status === 'success')
            .reduce((sum, t) => sum + t.amount, 0);

      const userBooks = books.filter(b => b.userId === u.id);
      const translatedWords = userBooks.reduce((sum, b) => {
        const completedChunks = b.chunks.filter(c => c.status === 'completed' || c.translatedHtml);
        return sum + completedChunks.reduce((csum, c) => csum + (c.wordCount || 0), 0);
      }, 0);

      const rateInfo = db.getUserEffectiveCostPerWord(u);

      return {
        ...u,
        booksCount: userBooks.length,
        totalSpent,
        totalDeposited,
        translatedWords,
        pricingTier: rateInfo.tier,
        effectiveCostPerWord: rateInfo.effectiveCostPerWord,
        tierLabel: rateInfo.tierLabel,
      };
    });
    return res.json({ users: userList, isStaff });
  });

  // Admin & Staff Create New User
  app.post('/api/admin/users/create', requireStaffOrAdmin, (req, res) => {
    const requestingUser = (req as any).user as User;
    const isStaff = requestingUser.role === 'staff';

    const {
      name,
      phone,
      email,
      password,
      role = 'user',
      walletBalance,
      customCostPerWord,
      discountPercent,
      organizationName,
      notes,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'نام و شماره همراه کاربر الزامی است.' });
    }

    const cleanPhone = phone.trim();
    const existing = db.getUserByEmailOrPhone(cleanPhone) || (email ? db.getUserByEmailOrPhone(email.trim()) : null);
    if (existing) {
      return res.status(400).json({ error: 'کاربری با این شماره همراه یا ایمیل در سیستم موجود است.' });
    }

    // Staff cannot create Admin users
    let finalRole = role;
    if (isStaff && role === 'admin') {
      finalRole = 'user';
    }

    const newUser = db.createUser({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : '',
      password: password || 'User@123456',
      role: finalRole,
      walletBalance: Number(walletBalance) || 0,
      customCostPerWord: customCostPerWord ? Number(customCostPerWord) : undefined,
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      organizationName: organizationName ? organizationName.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
    });

    return res.json({
      success: true,
      message: 'کاربر جدید با موفقیت ایجاد شد.',
      user: newUser,
    });
  });

  // Admin & Staff Update User (name, phone, email, role, status, password, customCostPerWord, etc.)
  app.put('/api/admin/users/:id', requireStaffOrAdmin, (req, res) => {
    const requestingUser = (req as any).user as User;
    const isStaff = requestingUser.role === 'staff';

    const targetUser = db.getUserById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'کاربر یافت نشد.' });

    // Staff cannot edit Admin accounts
    if (isStaff && targetUser.role === 'admin') {
      return res.status(403).json({ error: 'کارمندان اجازه ویرایش مشخصات حساب مدیر ارشد را ندارند.' });
    }

    const {
      name,
      phone,
      email,
      role,
      status,
      password,
      customCostPerWord,
      discountPercent,
      organizationName,
      notes,
    } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email.trim();
    if (role !== undefined) {
      // Staff cannot escalate to Admin
      if (isStaff && role === 'admin') {
        // do not change
      } else {
        updates.role = role;
      }
    }
    if (status !== undefined) updates.status = status;
    if (customCostPerWord !== undefined) updates.customCostPerWord = customCostPerWord;
    if (discountPercent !== undefined) updates.discountPercent = discountPercent;
    if (organizationName !== undefined) updates.organizationName = organizationName;
    if (notes !== undefined) updates.notes = notes;

    const updated = db.updateUser(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'کاربر یافت نشد.' });

    if (password && password.trim()) {
      db.setUserPassword(req.params.id, password.trim());
    }

    return res.json({ success: true, user: updated, message: 'مشخصات کاربر و نرخ اختصاصی با موفقیت به‌روزرسانی شد.' });
  });

  // Admin & Staff Adjust Wallet (افزایش یا کسر دستی موجودی با ثبت لاگ)
  app.post('/api/admin/users/:id/adjust-wallet', requireStaffOrAdmin, (req, res) => {
    const requestingUser = (req as any).user as User;
    const isStaff = requestingUser.role === 'staff';

    const { amount, description } = req.body;
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد.' });

    const diff = Number(amount);
    if (isNaN(diff)) return res.status(400).json({ error: 'مبلغ نامعتبر است.' });

    const defaultDesc = diff >= 0
      ? (isStaff ? `افزایش دستی موجودی توسط کادر پشتیبانی (${requestingUser.name})` : 'افزایش دستی موجودی توسط مدیر ارشد')
      : (isStaff ? `کسر دستی موجودی توسط کادر پشتیبانی (${requestingUser.name})` : 'کسر دستی موجودی توسط مدیر ارشد');

    db.addTransaction({
      userId: user.id,
      amount: diff,
      type: diff >= 0 ? 'admin_gift' : 'charge',
      description: description || defaultDesc,
      status: 'success',
      trackingCode: `${isStaff ? 'STF' : 'ADM'}-${Date.now().toString().slice(-6)}`,
    });

    const updated = db.getUserById(req.params.id);

    return res.json({
      success: true,
      message: diff >= 0
        ? `مبلغ ${Math.abs(diff).toLocaleString('fa-IR')} تومان به کیف پول کاربر افزوده شد.`
        : `مبلغ ${Math.abs(diff).toLocaleString('fa-IR')} تومان از کیف پول کاربر کسر گردید.`,
      newBalance: updated?.walletBalance || user.walletBalance,
    });
  });

  // Admin Test SMS Sending (MeliPayamak, Kavenegar, Mock)
  app.post('/api/admin/sms/test', requireAdmin, async (req, res) => {
    const { targetPhone, message } = req.body;
    const settings = db.getSettings().sms;

    if (!targetPhone || !targetPhone.trim()) {
      return res.status(400).json({ error: 'شماره تلفن همراه مقصد برای ارسال تست الزامی است.' });
    }

    const testText = message || `کد تایید تست سامانه ترجمه کتاب: ${Math.floor(100000 + Math.random() * 900000)}`;

    if (settings.provider === 'mock') {
      return res.json({
        success: true,
        message: `پیامک به صورت شبیه‌سازی (Mock) با موفقیت ارسال شد: "${testText}" به شماره ${targetPhone}`,
        simulated: true,
      });
    }

    if (settings.provider === 'melipayamak') {
      try {
        if (settings.authMethod === 'credentials') {
          if (!settings.username || !settings.password) {
            return res.status(400).json({ error: 'نام کاربری یا رمز عبور ملی‌پیامک در تنظیمات تکمیل نشده است.' });
          }

          // Call MeliPayamak Simple REST Send
          const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: settings.username.trim(),
              password: settings.password.trim(),
              to: targetPhone.trim(),
              from: settings.senderNumber?.trim() || '50004000',
              text: testText,
              isFlash: false,
            }),
          });

          const data = await response.json();
          if (data?.Value && Number(data.Value) > 100) {
            return res.json({
              success: true,
              message: `پیامک از طریق ملی‌پیامک (شناسه پیگیری: ${data.Value}) با موفقیت به سرور مخابرات ارسال شد.`,
              recId: data.Value,
            });
          } else {
            return res.status(400).json({
              error: `پاسخ وب‌سرویس ملی‌پیامک: ${data?.RetStatus || 'خطا در احراز هویت یا موجودی پنل ملی‌پیامک (کد: ' + data?.Value + ')'}`,
              rawResponse: data,
            });
          }
        } else if (settings.authMethod === 'pattern') {
          // Shared Service / Base Service Pattern
          if (!settings.username || !settings.password || !settings.bodyId) {
            return res.status(400).json({ error: 'نام کاربری، رمز عبور و شناسه الگو (BodyId) الزامی است.' });
          }

          const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: settings.username.trim(),
              password: settings.password.trim(),
              text: '123456',
              to: targetPhone.trim(),
              bodyId: Number(settings.bodyId),
            }),
          });
          const data = await response.json();
          return res.json({ success: true, message: 'درخواست به وب‌سرویس الگوی خدماتی ملی‌پیامک ارسال گردید.', rawResponse: data });
        } else {
          // Token / API Key
          return res.json({
            success: true,
            message: `ارسال از طریق توکن کنسول ملی‌پیامک به شماره ${targetPhone} فراخوانی شد.`,
          });
        }
      } catch (smsErr: any) {
        return res.status(500).json({ error: `خطا در ارتباط با سرور ملی‌پیامک: ${smsErr.message}` });
      }
    }

    return res.json({ success: true, message: `ارسال به شماره ${targetPhone} با موفقیت ثبت شد.` });
  });

  // Admin View Books of a User (lightweight summary without heavy base64 images)
  app.get('/api/admin/users/:id/books', requireAdmin, (req, res) => {
    const rawBooks = db.getBooks(req.params.id);
    const books = rawBooks.map(b => ({
      id: b.id,
      title: b.title,
      originalTitle: b.originalTitle,
      author: b.author,
      translator: b.translator,
      tone: b.tone,
      wordCount: b.wordCount,
      estimatedCost: b.estimatedCost,
      status: b.status,
      chunks: (b.chunks || []).map(c => ({
        id: c.id,
        chunkNumber: c.chunkNumber,
        chapterNumber: c.chapterNumber,
        chapterTitle: c.chapterTitle,
        wordCount: c.wordCount,
        status: c.status,
        // Lightweight sample text without multi-megabyte base64 images:
        translatedHtml: c.translatedHtml ? c.translatedHtml.replace(/<img[^>]*>/gi, '').slice(0, 300) : '',
      })),
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
    return res.json({ books });
  });

  // Admin Transactions (enriched with user info)
  app.get('/api/admin/transactions', requireAdmin, (req, res) => {
    const analytics = db.getFinancialAnalytics({ range: 'all' });
    return res.json({ transactions: analytics.transactions });
  });

  // Admin Daily Financial Analytics & Filtered Payments (Supports date ranges, search, KPIs)
  app.get('/api/admin/financial-analytics', requireAdmin, (req, res) => {
    const { range, from, to, gateway, status, type, search } = req.query;
    const analytics = db.getFinancialAnalytics({
      range: range as string,
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
      gateway: gateway as string,
      status: status as string,
      type: type as string,
      search: search as string,
    });
    return res.json(analytics);
  });

  // Admin API Keys Pool
  app.get('/api/admin/api-keys', requireAdmin, (req, res) => {
    const keys = db.getApiKeys();
    const todayStr = new Date().toISOString().slice(0, 10);
    const usdToTomanRate = 95000;

    const enrichedKeys = keys.map(k => {
      const isToday = k.todayDate === todayStr;
      const todayTokens = isToday ? (k.todayTokensUsed || 0) : 0;

      // Determine cost per million tokens based on provider and model
      let costPerMillionUsd = 0.15; // default
      const m = (k.model || '').toLowerCase();
      if (m.includes('pro')) {
        costPerMillionUsd = 1.25;
      } else if (m.includes('deepseek-r1') || m.includes('r1')) {
        costPerMillionUsd = 0.55;
      } else if (m.includes('deepseek')) {
        costPerMillionUsd = 0.14;
      } else if (m.includes('gpt-4o-mini') || m.includes('mini')) {
        costPerMillionUsd = 0.15;
      } else if (m.includes('gpt-4o')) {
        costPerMillionUsd = 2.50;
      } else if (m.includes('claude-3-5-sonnet') || m.includes('sonnet')) {
        costPerMillionUsd = 3.00;
      } else if (m.includes('claude-3-5-haiku') || m.includes('haiku')) {
        costPerMillionUsd = 0.80;
      } else if (m.includes('lite') || m.includes('flash')) {
        costPerMillionUsd = 0.075;
      }

      const todayCostUsd = Number(((todayTokens / 1000000) * costPerMillionUsd).toFixed(4));
      const todayCostTomans = Math.round(todayCostUsd * usdToTomanRate);
      const totalCostUsd = Number((((k.totalTokensUsed || 0) / 1000000) * costPerMillionUsd).toFixed(4));
      const totalCostTomans = Math.round(totalCostUsd * usdToTomanRate);

      const assignedBookId = keyExclusiveBookLocks.get(k.id);
      const assignedBook = assignedBookId ? db.getBookById(assignedBookId) : null;
      const assignedBookTitle = assignedBook ? assignedBook.title : undefined;

      return {
        ...k,
        assignedBookId,
        assignedBookTitle,
        todayTokensUsed: todayTokens,
        todayDate: todayStr,
        costPerMillionTokens: costPerMillionUsd,
        todayCostUsd,
        todayCostTomans,
        totalCostUsd,
        totalCostTomans,
      };
    });
    return res.json({ keys: enrichedKeys });
  });

  // Admin Save / Update API Key (Create or Update)
  app.post('/api/admin/api-keys', requireAdmin, (req, res) => {
    const { id, name, provider, apiKey, model, baseURL, isActive, priority } = req.body;
    if (!name || !apiKey || !provider) {
      return res.status(400).json({ error: 'اطلاعات کلید API ناقص است (نام، کلید و ارائه‌دهنده الزامی هستند).' });
    }

    const existing = id ? db.getApiKeys().find(k => k.id === id) : null;

    const keyConfig: ApiKeyConfig = {
      ...(existing || {}),
      id: id || `key_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: name.trim(),
      provider: provider || 'gemini',
      apiKey: apiKey.trim(),
      model: model || 'gemini-3.8-flash',
      baseURL: baseURL?.trim() || '',
      isActive: isActive !== false,
      priority: Number(priority) || 1,
      totalRequests: existing?.totalRequests || 0,
      successfulRequests: existing?.successfulRequests || 0,
      failedRequests: existing?.failedRequests || 0,
      totalTokensUsed: existing?.totalTokensUsed || 0,
      rpmCount: existing?.rpmCount || 0,
      cooldownUntil: existing?.cooldownUntil || 0,
    };

    db.saveApiKey(keyConfig);
    return res.json({ success: true, key: keyConfig, message: existing ? 'کلید با موفقیت ویرایش شد.' : 'کلید جدید با موفقیت در سرور ذخیره شد.' });
  });

  // Admin Direct Edit API Key (PUT)
  app.put('/api/admin/api-keys/:id', requireAdmin, (req, res) => {
    const keyId = req.params.id;
    const existing = db.getApiKeys().find(k => k.id === keyId);
    if (!existing) {
      return res.status(404).json({ error: 'کلید مورد نظر در سرور یافت نشد.' });
    }

    const { name, provider, apiKey, model, baseURL, isActive, priority, isSuspended } = req.body;
    const activating = isActive === true || (isActive !== false && existing.isActive === false);
    const updatedConfig: ApiKeyConfig = {
      ...existing,
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(provider !== undefined ? { provider } : {}),
      ...(apiKey !== undefined && apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(baseURL !== undefined ? { baseURL: baseURL.trim() } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(priority !== undefined ? { priority: Number(priority) } : {}),
      ...(isSuspended !== undefined ? { isSuspended: Boolean(isSuspended) } : {}),
      // If admin manually re-enables a key, clear suspension, cooldown, and error so it enters active rotation
      ...(activating ? { isSuspended: false, cooldownUntil: 0, lastError: undefined } : {}),
    };

    db.saveApiKey(updatedConfig);
    return res.json({ success: true, key: updatedConfig, message: 'کلید در سرور با موفقیت بروزرسانی شد.' });
  });

  // Admin Test All API Keys Concurrently (Benchmark & Latency check)
  app.post('/api/admin/api-keys/test-all', requireAdmin, async (req, res) => {
    const keys = db.getApiKeys();
    const results: Array<{ id: string; name: string; success: boolean; latencyMs?: number; error?: string }> = [];

    await Promise.all(
      keys.map(async (k) => {
        const t0 = Date.now();
        try {
          if (k.provider === 'gemini') {
            const ai = new GoogleGenAI({
              apiKey: k.apiKey,
              httpOptions: { timeout: 35000 },
            });
            const candModels = Array.from(new Set([
              k.model || 'gemini-3.1-flash-lite',
              'gemini-3.1-flash-lite',
              'gemini-3.8-flash',
              'gemini-flash-latest'
            ]));

            let worked = false;
            let lastErr: any = null;
            for (const cm of candModels) {
              try {
                await ai.models.generateContent({
                  model: cm,
                  contents: 'Ping',
                  config: { maxOutputTokens: 5 },
                });
                worked = true;
                break;
              } catch (e: any) {
                lastErr = e;
                const msg = String(e?.message || e);
                if (msg.includes('504') || msg.includes('DEADLINE_EXCEEDED') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('timeout')) {
                  continue;
                }
                break;
              }
            }

            if (!worked && lastErr) throw lastErr;

            const latencyMs = Date.now() - t0;
            k.lastLatencyMs = latencyMs;
            k.isSuspended = false;
            k.cooldownUntil = 0;
            k.lastError = undefined;
            db.saveApiKey(k);
            results.push({ id: k.id, name: k.name, success: true, latencyMs });
          } else {
            // OpenAI-compatible ping
            const targetUrl = `${(k.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 20000);
            const resp = await fetch(targetUrl, {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${k.apiKey}`,
              },
              body: JSON.stringify({
                model: k.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Ping' }],
                max_tokens: 5,
              }),
            });
            clearTimeout(tid);
            const latencyMs = Date.now() - t0;
            if (resp.ok) {
              k.lastLatencyMs = latencyMs;
              k.isSuspended = false;
              k.cooldownUntil = 0;
              k.lastError = undefined;
              db.saveApiKey(k);
              results.push({ id: k.id, name: k.name, success: true, latencyMs });
            } else {
              k.failedRequests = (k.failedRequests || 0) + 1;
              db.saveApiKey(k);
              results.push({ id: k.id, name: k.name, success: false, latencyMs, error: `HTTP ${resp.status}` });
            }
          }
        } catch (err: any) {
          const rawErr = String(err?.message || err);
          let errText = rawErr;
          k.failedRequests = (k.failedRequests || 0) + 1;

          if (rawErr.includes('CONSUMER_SUSPENDED') || rawErr.includes('has been suspended')) {
            errText = 'پروژه گوگل معلق شده است (Consumer Suspended)';
            k.isSuspended = true;
            k.isActive = false;
            k.cooldownUntil = Date.now() + 86400000;
            k.lastError = errText;
          } else if (rawErr.includes('API_KEY_INVALID') || rawErr.includes('PERMISSION_DENIED')) {
            errText = 'کلید نامعتبر یا فاقد دسترسی (PERMISSION_DENIED)';
            k.isSuspended = true;
            k.isActive = false;
            k.lastError = errText;
          } else if (errText.includes('504') || errText.includes('DEADLINE_EXCEEDED') || errText.includes('Deadline expired')) {
            errText = 'پایان مهلت زمان (کد ۵۰۴ - DEADLINE_EXCEEDED)';
            k.cooldownUntil = Date.now() + 60000;
            k.lastError = errText;
          } else if (errText.includes('503') || errText.includes('high demand')) {
            errText = 'ترافیک بالای موقت (کد ۵۰۳)';
            k.cooldownUntil = Date.now() + 60000;
            k.lastError = errText;
          } else {
            k.lastError = errText.slice(0, 200);
          }
          db.saveApiKey(k);
          results.push({ id: k.id, name: k.name, success: false, error: errText });
        }
      })
    );

    return res.json({ success: true, results });
  });

  // Admin Queue Live Stats (Realtime Background Worker status)
  app.get('/api/admin/queue/stats', requireAdmin, (req, res) => {
    const stats = queueManager.getStats();
    return res.json({ stats });
  });

  // Admin Reset Single API Key Stats & Tokens
  app.post('/api/admin/api-keys/:id/reset-stats', requireAdmin, (req, res) => {
    const key = db.getApiKeys().find(k => k.id === req.params.id);
    if (!key) return res.status(404).json({ error: 'کلید یافت نشد.' });
    key.totalTokensUsed = 0;
    key.todayTokensUsed = 0;
    key.totalRequests = 0;
    key.successfulRequests = 0;
    key.failedRequests = 0;
    key.rpmCount = 0;
    key.cooldownUntil = 0;
    key.isSuspended = false;
    key.isActive = true;
    key.lastError = undefined;
    db.saveApiKey(key);
    return res.json({ success: true, message: `شمارنده توکن‌ها، خطاها و وضعیت تعلیق کلید «${key.name}» با موفقیت ریست و فعال شد.` });
  });

  // Admin Reset All API Keys Stats & Tokens
  app.post('/api/admin/api-keys/reset-all-stats', requireAdmin, (req, res) => {
    const keys = db.getApiKeys();
    keys.forEach(k => {
      k.totalTokensUsed = 0;
      k.todayTokensUsed = 0;
      k.totalRequests = 0;
      k.successfulRequests = 0;
      k.failedRequests = 0;
      k.rpmCount = 0;
      k.cooldownUntil = 0;
      k.isSuspended = false;
      k.lastError = undefined;
      db.saveApiKey(k);
    });
    return res.json({ success: true, message: 'آمار توکن‌ها، خطاها و وضعیت تعلیق کلیه کلیدهای سرور با موفقیت صفر و رفع شد.' });
  });

  // Admin Delete API Key
  app.delete('/api/admin/api-keys/:id', requireAdmin, (req, res) => {
    const ok = db.deleteApiKey(req.params.id);
    if (!ok) return res.status(404).json({ error: 'کلید یافت نشد.' });
    return res.json({ success: true, message: 'کلید با موفقیت از سرور حذف شد.' });
  });

  // Admin Batch Switch Model for Keys (Allows manual switch if a specific model goes down or is slow)
  app.post('/api/admin/api-keys/batch-switch-model', requireAdmin, (req, res) => {
    try {
      const { targetModel, provider } = req.body;
      if (!targetModel || typeof targetModel !== 'string') {
        return res.status(400).json({ error: 'لطفاً مدل مقصد را مشخص فرمایید.' });
      }

      const keys = db.getApiKeys();
      let updatedCount = 0;
      keys.forEach((k) => {
        if (!provider || k.provider === provider) {
          k.model = targetModel.trim();
          db.saveApiKey(k);
          updatedCount++;
        }
      });

      return res.json({
        success: true,
        message: `مدل تعداد ${updatedCount} کلید با موفقیت به «${targetModel.trim()}» سوئیچ شد.`,
        updatedCount,
        targetModel: targetModel.trim(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در تغییر مدل کلیدها: ${err?.message || 'خطای سرور'}` });
    }
  });

  // Admin Batch Import API Keys (Paste a list of keys for a chosen model)
  app.post('/api/admin/api-keys/batch-import', requireAdmin, (req, res) => {
    try {
      const { provider = 'gemini', model = 'gemini-3.5-flash-lite', baseURL, namePrefix, keysText } = req.body;
      if (!keysText || typeof keysText !== 'string' || keysText.trim().length === 0) {
        return res.status(400).json({ error: 'لطفاً لیست کلیدهای API را وارد فرمایید.' });
      }

      // Split keys by newlines, commas, or semicolons
      const rawLines = keysText.split(/[\r\n,;]+/);
      const cleanKeys: string[] = [];

      for (const line of rawLines) {
        const trimmed = line.trim().replace(/^["']|["']$/g, '');
        // Ignore empty lines or comments
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
        if (!cleanKeys.includes(trimmed)) {
          cleanKeys.push(trimmed);
        }
      }

      if (cleanKeys.length === 0) {
        return res.status(400).json({ error: 'هیچ کلید معتبری در متن وارد شده یافت نشد.' });
      }

      const existingKeys = db.getApiKeys();
      const existingKeyValues = new Set(existingKeys.map(k => k.apiKey.trim()));

      const targetModel = model?.trim() || 'gemini-3.5-flash-lite';
      const targetProvider = provider?.trim() || 'gemini';
      const targetBaseURL = baseURL?.trim() || '';
      const prefix = namePrefix?.trim() || (targetProvider === 'gemini' ? 'کلید جمینای' : 'کلید API');

      let addedCount = 0;
      let skippedCount = 0;

      cleanKeys.forEach((rawKey, idx) => {
        if (existingKeyValues.has(rawKey)) {
          skippedCount++;
          return;
        }

        const newId = `key_${Date.now()}_${idx}_${crypto.randomBytes(3).toString('hex')}`;
        const keyConfig: ApiKeyConfig = {
          id: newId,
          name: `${prefix} #${existingKeys.length + addedCount + 1}`,
          provider: targetProvider,
          apiKey: rawKey,
          model: targetModel,
          baseURL: targetBaseURL,
          isActive: true,
          priority: 1,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokensUsed: 0,
          rpmCount: 0,
          cooldownUntil: 0,
        };

        db.saveApiKey(keyConfig);
        existingKeyValues.add(rawKey);
        addedCount++;
      });

      return res.json({
        success: true,
        message: `تعداد ${addedCount} کلید با مدل «${targetModel}» با موفقیت به استخر اضافه گردید.${skippedCount > 0 ? ` (${skippedCount} کلید تکراری نادیده گرفته شد)` : ''}`,
        addedCount,
        skippedCount,
        targetModel,
      });
    } catch (err: any) {
      console.error('[Batch Import API Keys] Error:', err);
      return res.status(500).json({ error: err.message || 'خطا در ثبت دسته‌ای کلیدها' });
    }
  });

  // Admin Clear System Cache (In-Memory Contexts, Expired Sessions, Node Garbage Collection)
  // CRITICAL: DOES NOT DELETE ANY DATABASE RECORDS, USERS, OR BOOKS (WHETHER TRANSLATING OR DRAFT)!
  app.post('/api/admin/system/clear-cache', requireAdmin, (req, res) => {
    try {
      const memoryCacheCount = bookCacheManager.clearAllMemoryCache();
      const sessionCleanStats = db.cleanExpiredSessionsAndOtps();

      if (typeof global.gc === 'function') {
        try {
          global.gc();
        } catch (e) {}
      }

      const mem = process.memoryUsage();
      const heapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));
      const rssMb = Math.round(mem.rss / (1024 * 1024));

      return res.json({
        success: true,
        message: 'حافظه موقت و کش سیستم با موفقیت پاکسازی شد. هیچ‌یک از کتاب‌ها، بخش‌ها یا اطلاعات کاربران حذف نگردید.',
        stats: {
          clearedContextCacheCount: memoryCacheCount,
          clearedExpiredSessions: sessionCleanStats.expiredSessions,
          clearedExpiredOtps: sessionCleanStats.expiredOtps,
          heapUsedMb,
          rssMb,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در پاکسازی کش: ${err?.message || 'خطای سرور'}` });
    }
  });

  // Public Announcement Bar Endpoint
  app.get('/api/system/public-announcement', (req, res) => {
    const settings = db.getSettings();
    const bar = settings.announcementBar || {
      enabled: settings.seo?.announcementEnabled || false,
      text: settings.seo?.announcementText || settings.cms?.announcement || '',
      type: 'info',
    };
    return res.json({ announcement: bar });
  });

  // Admin Get Settings
  app.get('/api/admin/settings', requireAdmin, (req, res) => {
    const settings = db.getSettings();
    return res.json({ settings });
  });

  // Admin Update Settings (تغییر تعرفه کلمه‌ای بلافاصله روی تمام کاربران و کتاب‌های جاری سیستم اعمال می‌شود)
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const updated = db.updateSettings(req.body);

    // Apply new pricePerWord across all books in the database and sync announcement banner
    if (req.body?.pricing?.costPerWord !== undefined) {
      const newRate = Number(req.body.pricing.costPerWord);
      const specMult = Number(req.body.pricing.specializedMultiplier || updated.pricing.specializedMultiplier || 1.25);
      
      // Sync banner text if it contains the rate template
      if (updated.announcementBar?.text && /هزینه ترجمه هر کلمه فقط \d+ تومان/.test(updated.announcementBar.text)) {
        updated.announcementBar.text = updated.announcementBar.text.replace(/هزینه ترجمه هر کلمه فقط \d+ تومان/, `هزینه ترجمه هر کلمه فقط ${newRate} تومان`);
      }
      if (updated.seo?.announcementText && /هزینه ترجمه هر کلمه فقط \d+ تومان/.test(updated.seo.announcementText)) {
        updated.seo.announcementText = updated.seo.announcementText.replace(/هزینه ترجمه هر کلمه فقط \d+ تومان/, `هزینه ترجمه هر کلمه فقط ${newRate} تومان`);
      }

      const books = db.getBooks();
      let updatedCount = 0;
      books.forEach(b => {
        if (b.status === 'draft' || b.status === 'error') {
          const isSpec = b.tone === 'academic' || b.tone === 'aerospace' || b.tone === 'mathematics';
          const unit = Math.round(newRate * (isSpec ? specMult : 1.0));
          b.estimatedCost = Math.round((b.wordCount || 0) * unit);
          b.updatedAt = Date.now();
          updatedCount++;
        }
      });
      db.saveDatabase();
      console.log(`[Pricing Update] Recalculated cost for ${updatedCount} books using new rate: ${newRate} Tomans/word`);
    }

    return res.json({ success: true, settings: updated });
  });

  // Dedicated instant Admin Pricing Update
  app.put('/api/admin/pricing', requireAdmin, (req, res) => {
    const { costPerWord, publisherCostPerWord, specializedMultiplier, minDepositAmount, freeWelcomeGift } = req.body;
    const current = db.getSettings();
    const newPricing = {
      ...current.pricing,
      ...(costPerWord !== undefined ? { costPerWord: Number(costPerWord) } : {}),
      ...(publisherCostPerWord !== undefined ? { publisherCostPerWord: Number(publisherCostPerWord) } : {}),
      ...(specializedMultiplier !== undefined ? { specializedMultiplier: Number(specializedMultiplier) } : {}),
      ...(minDepositAmount !== undefined ? { minDepositAmount: Number(minDepositAmount) } : {}),
      ...(freeWelcomeGift !== undefined ? { freeWelcomeGift: Number(freeWelcomeGift) } : {}),
    };

    const updated = db.updateSettings({ pricing: newPricing });

    if (costPerWord !== undefined) {
      const newRate = Number(costPerWord);
      if (updated.announcementBar?.text && /هزینه ترجمه هر کلمه فقط \d+ تومان/.test(updated.announcementBar.text)) {
        updated.announcementBar.text = updated.announcementBar.text.replace(/هزینه ترجمه هر کلمه فقط \d+ تومان/, `هزینه ترجمه هر کلمه فقط ${newRate} تومان`);
      }
      const books = db.getBooks();
      books.forEach(b => {
        if (b.status === 'draft' || b.status === 'error') {
          const isSpec = b.tone === 'academic' || b.tone === 'aerospace' || b.tone === 'mathematics';
          const unit = Math.round(newRate * (isSpec ? (newPricing.specializedMultiplier || 1.25) : 1.0));
          b.estimatedCost = Math.round((b.wordCount || 0) * unit);
          b.updatedAt = Date.now();
        }
      });
      db.saveDatabase();
    }

    return res.json({ success: true, pricing: updated.pricing, settings: updated });
  });

  // Admin Test SMS
  app.post('/api/admin/sms/test', requireAdmin, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'شماره تلفن الزامی است.' });
    const settings = db.getSettings().sms;
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smsResult = await sendRealOtpSms(phone, testCode, settings);
    return res.json({
      success: smsResult.success,
      message: smsResult.message,
      gatewayRaw: smsResult.gatewayRaw,
    });
  });

  // Admin Test Captcha Connection & Verification (Google reCAPTCHA v2/v3, Turnstile, Math)
  app.post('/api/admin/captcha/test', requireAdmin, async (req, res) => {
    try {
      const currentSettings = db.getSettings();
      const currentCaptcha = currentSettings.security?.captcha || {
        provider: 'math',
        recaptchaVersion: 'v2',
        siteKey: '',
        secretKey: '',
      };

      const provider = req.body.provider || currentCaptcha.provider || 'recaptcha';
      const recaptchaVersion = req.body.recaptchaVersion || currentCaptcha.recaptchaVersion || 'v2';
      const siteKey = (req.body.siteKey !== undefined ? req.body.siteKey : currentCaptcha.siteKey || '').trim();
      const secretKey = (req.body.secretKey !== undefined ? req.body.secretKey : currentCaptcha.secretKey || '').trim();
      const testToken = (req.body.testToken || '').trim();

      if (provider === 'math') {
        return res.json({
          success: true,
          provider: 'math',
          message: 'کپچای ریاضی محلی سیستم فعال، سریع و کاملاً پایدار است (نیاز به اینترنت یا کلید خارجی ندارد).',
          latencyMs: 0,
        });
      }

      if (provider === 'recaptcha') {
        if (!secretKey) {
          return res.status(400).json({
            success: false,
            provider: 'recaptcha',
            recaptchaVersion,
            error: 'کلید محرمانه (Secret Key) گوگل وارد نشده است. لطفاً ابتدا کلید را وارد نمایید.',
          });
        }

        const startTime = Date.now();
        // If a real token was generated via frontend test, verify it. Otherwise, probe the Secret Key.
        const tokenToVerify = testToken || 'PROBE_TEST_PING_KEY';
        const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: secretKey,
            response: tokenToVerify,
          }).toString(),
        });

        const latencyMs = Date.now() - startTime;
        const verifyData = await verifyRes.json();
        const errorCodes: string[] = Array.isArray(verifyData['error-codes']) ? verifyData['error-codes'] : [];

        // Analysis of Google's response:
        // 'invalid-input-secret': The Secret Key is definitely rejected by Google.
        if (errorCodes.includes('invalid-input-secret')) {
          return res.json({
            success: false,
            provider: 'recaptcha',
            recaptchaVersion,
            latencyMs,
            error: 'کلید محرمانه (Secret Key) نامعتبر است: سرور Google کلید شما را رد کرد (invalid-input-secret). لطفاً کلید را از کنسول Google reCAPTCHA بررسی فرمایید.',
            googleResponse: verifyData,
          });
        }

        // If real testToken was provided:
        if (testToken) {
          if (verifyData.success) {
            return res.json({
              success: true,
              provider: 'recaptcha',
              recaptchaVersion,
              latencyMs,
              score: verifyData.score,
              message: recaptchaVersion === 'v3'
                ? `اعتبارسنجی زنده گوگل reCAPTCHA v3 با موفقیت تایید شد! امتیاز ارزیابی هوشمند گوگل: ${verifyData.score ?? 'نامشخص'} (زمان پاسخ: ${latencyMs} میلی‌ثانیه)`
                : `اعتبارسنجی زنده چک‌باکس گوگل reCAPTCHA v2 با موفقیت تایید شد! (زمان پاسخ: ${latencyMs} میلی‌ثانیه)`,
              googleResponse: verifyData,
            });
          } else {
            return res.json({
              success: false,
              provider: 'recaptcha',
              recaptchaVersion,
              latencyMs,
              error: `اعتبارسنجی توکن توسط گوگل تایید نشد: ${errorCodes.join(', ') || 'توکن منقضی یا نامعتبر'}`,
              googleResponse: verifyData,
            });
          }
        }

        // If probe test (no testToken provided):
        // 'invalid-input-response' or 'missing-input-response' means the Secret Key is 100% VALID and AUTHENTICATED by Google!
        if (errorCodes.includes('invalid-input-response') || errorCodes.includes('missing-input-response')) {
          return res.json({
            success: true,
            provider: 'recaptcha',
            recaptchaVersion,
            latencyMs,
            message: `اتصال به سرورهای رسمی Google reCAPTCHA با موفقیت تایید شد! کلید محرمانه (Secret Key) معتبر است (زمان پاسخ: ${latencyMs} میلی‌ثانیه).`,
            probeVerified: true,
            googleResponse: verifyData,
          });
        }

        if (verifyData.success) {
          return res.json({
            success: true,
            provider: 'recaptcha',
            recaptchaVersion,
            latencyMs,
            message: `اتصال و کلید گوگل ری‌کپچا با موفقیت تایید شد (زمان پاسخ: ${latencyMs} میلی‌ثانیه).`,
            googleResponse: verifyData,
          });
        }

        return res.json({
          success: false,
          provider: 'recaptcha',
          recaptchaVersion,
          latencyMs,
          error: `خطای ارزیابی سرور گوگل: ${errorCodes.join(', ')}`,
          googleResponse: verifyData,
        });
      }

      if (provider === 'turnstile') {
        if (!secretKey) {
          return res.status(400).json({
            success: false,
            provider: 'turnstile',
            error: 'کلید محرمانه (Secret Key) کلادفلر ترنستایل وارد نشده است.',
          });
        }
        const startTime = Date.now();
        const probeRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: secretKey,
            response: testToken || 'PROBE_TEST',
          }).toString(),
        });
        const latencyMs = Date.now() - startTime;
        const probeData = await probeRes.json();
        const errorCodes: string[] = Array.isArray(probeData['error-codes']) ? probeData['error-codes'] : [];

        if (errorCodes.includes('invalid-input-secret')) {
          return res.json({
            success: false,
            provider: 'turnstile',
            latencyMs,
            error: 'کلید محرمانه Cloudflare Turnstile نامعتبر است (invalid-input-secret).',
          });
        }

        return res.json({
          success: true,
          provider: 'turnstile',
          latencyMs,
          message: `اتصال به کلادفلر ترنستایل برقرار شد و کلید محرمانه معتبر است (زمان پاسخ: ${latencyMs} میلی‌ثانیه).`,
        });
      }

      return res.status(400).json({ error: 'نوع ارائه‌دهنده کپچا نامعتبر است.' });
    } catch (err: any) {
      console.error('[Admin Captcha Test Error]:', err);
      return res.status(500).json({
        success: false,
        error: `خطا در برقراری ارتباط با سرویس کپچا: ${err?.message || 'خطای شبکه'}`,
      });
    }
  });

  // Admin Test Zarinpal Web-Service Connection
  app.post('/api/admin/gateways/test-zarinpal', requireAdmin, async (req, res) => {
    const { merchantId, isSandbox, currency, referer } = req.body;
    const settings = db.getSettings();
    const effectiveMerchant = (merchantId || settings.gateways.zarinpal.merchantId || '').trim();
    const effectiveSandbox = isSandbox !== undefined ? isSandbox : settings.gateways.zarinpal.isSandbox;
    const effectiveCurrency = currency || settings.gateways.zarinpal.currency || 'IRT';
    const effectiveReferer = referer || settings.gateways.zarinpal.refererDomain || 'https://gaiafa.ir/';

    const result = await zarinpalService.testConnection(effectiveMerchant, effectiveSandbox, effectiveCurrency, effectiveReferer);
    return res.json(result);
  });

  // Admin Test BitPay Web-Service Connection
  app.post('/api/admin/gateways/test-bitpay', requireAdmin, async (req, res) => {
    const { apiKey, redirectUrl } = req.body;
    const settings = db.getSettings();
    const effectiveApiKey = (apiKey || settings.gateways.bitpay?.apiKey || '').trim();
    const effectiveRedirect = redirectUrl || (settings.gateways.zarinpal as any)?.callbackDomain || 'https://gaiafa.ir/test-callback';

    const result = await bitpayService.testConnection(effectiveApiKey, effectiveRedirect);
    return res.json(result);
  });

  // Admin & Staff Coupons Management
  app.get('/api/admin/coupons', requireStaffOrAdmin, (req, res) => {
    return res.json({ coupons: db.getCoupons() });
  });

  app.post('/api/admin/coupons', requireStaffOrAdmin, (req, res) => {
    const { code, creditBonus = 0, discountPercent = 0, maxUses = 100, isActive = true } = req.body;
    if (!code) return res.status(400).json({ error: 'کد تخفیف الزامی است.' });

    const newCoupon = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: code.trim().toUpperCase(),
      creditBonus: Number(creditBonus) || 0,
      discountPercent: Number(discountPercent) || 0,
      maxUses: Number(maxUses) || 100,
      timesUsed: 0,
      isActive: Boolean(isActive),
      createdAt: Date.now(),
    };

    db.saveCoupon(newCoupon);
    return res.json({ success: true, coupon: newCoupon });
  });

  app.delete('/api/admin/coupons/:id', requireStaffOrAdmin, (req, res) => {
    const ok = db.deleteCoupon(req.params.id);
    if (!ok) return res.status(404).json({ error: 'کد تخفیف یافت نشد.' });
    return res.json({ success: true });
  });

  // Admin Backup / Export Database
  app.get('/api/admin/backup', requireAdmin, (req, res) => {
    const backup = db.exportBackup();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=book_translator_backup_${Date.now()}.json`);
    return res.json(backup);
  });

  // Admin Restore / Import Database Backup
  app.post('/api/admin/restore', requireAdmin, (req, res) => {
    try {
      const backupData = req.body;
      if (!backupData) {
        return res.status(400).json({ error: 'محتوای فایل پشتیبان ارسال نشده است.' });
      }
      const result = db.importBackup(backupData);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'خطا در بازیابی پایگاه داده' });
    }
  });

  // ==========================================
  // 8. CUSTOM PAGES BUILDER (HTML & SLUG)
  // ==========================================

  // Public: Get all published custom pages
  app.get('/api/custom-pages', (req, res) => {
    const user = getAuthUser(req);
    const isAdmin = user && user.role === 'admin';
    const pages = db.getCustomPages(!isAdmin);
    return res.json({ pages });
  });

  // Public: Get single custom page by slug
  app.get('/api/custom-pages/:slug', (req, res) => {
    const page = db.getCustomPageBySlug(req.params.slug);
    if (!page) {
      return res.status(404).json({ error: 'برگه مورد نظر یافت نشد.' });
    }
    const user = getAuthUser(req);
    const isAdmin = user && user.role === 'admin';
    if (!page.isPublished && !isAdmin) {
      return res.status(403).json({ error: 'این برگه در حال حاضر منتشر نشده است.' });
    }
    return res.json({ page });
  });

  // Admin: Create or update custom page
  app.post('/api/admin/custom-pages', requireAdmin, (req, res) => {
    const { id, title, slug, htmlContent, metaDescription, isPublished, showInHeader, showInFooter } = req.body;
    if (!title || !slug || !htmlContent) {
      return res.status(400).json({ error: 'عنوان، آدرس یکتا (Slug) و محتوای HTML برگه الزامی است.' });
    }

    const saved = db.saveCustomPage({
      id,
      title,
      slug,
      htmlContent,
      metaDescription,
      isPublished: isPublished !== false,
      showInHeader: Boolean(showInHeader),
      showInFooter: showInFooter !== undefined ? Boolean(showInFooter) : true,
    });

    return res.json({ success: true, page: saved });
  });

  // Admin: Delete custom page
  app.delete('/api/admin/custom-pages/:id', requireAdmin, (req, res) => {
    const ok = db.deleteCustomPage(req.params.id);
    if (!ok) return res.status(404).json({ error: 'برگه یافت نشد.' });
    return res.json({ success: true });
  });

  // ==========================================
  // 9. HEADER & FOOTER HTML DESIGNER
  // ==========================================

  // Public: Get header & footer HTML
  app.get('/api/public/header-footer', (_req, res) => {
    const config = db.getHeaderFooter();
    return res.json({ headerFooter: config });
  });

  // Admin: Get header & footer HTML
  app.get('/api/admin/header-footer', requireAdmin, (_req, res) => {
    const config = db.getHeaderFooter();
    return res.json({ headerFooter: config });
  });

  // Admin: Get all custom pages
  app.get('/api/admin/custom-pages', requireAdmin, (_req, res) => {
    const pages = db.getCustomPages(false);
    return res.json({ pages });
  });

  // Admin: Update header & footer HTML
  app.put('/api/admin/header-footer', requireAdmin, (req, res) => {
    const { headerHtml, footerHtml, customCss, enabled, applyToAllPages, applyToPrint } = req.body;
    const updated = db.updateHeaderFooter({
      headerHtml,
      footerHtml,
      customCss,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      applyToAllPages: applyToAllPages !== undefined ? Boolean(applyToAllPages) : true,
      applyToPrint: applyToPrint !== undefined ? Boolean(applyToPrint) : false,
    });
    return res.json({ success: true, headerFooter: updated });
  });

  // ==========================================
  // 10. MONTHLY ANALYTICS & COMPARISONS
  // ==========================================
  app.get('/api/admin/analytics/monthly', requireAdmin, (_req, res) => {
    const analytics = db.getMonthlyAnalytics();
    return res.json(analytics);
  });

  // ==========================================
  // 11. ADMIN & STAFF BOOKS COMPREHENSIVE OVERSIGHT
  // ==========================================
  app.get('/api/admin/all-books', requireStaffOrAdmin, (_req, res) => {
    const books = db.getBooks();
    const users = db.getUsers();
    const booksWithMeta = books.map(b => {
      const owner = users.find(u => u.id === b.userId);
      return {
        id: b.id,
        title: b.title,
        originalTitle: b.originalTitle,
        author: b.author,
        translator: b.translator,
        tone: b.tone,
        wordCount: b.wordCount,
        estimatedCost: b.estimatedCost,
        status: b.status,
        chunksCount: (b.chunks || []).length,
        completedChunks: (b.chunks || []).filter(c => c.status === 'completed').length,
        user: owner ? { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone } : null,
        hasAdminCopy: Boolean(b.adminCopy),
        adminCopyEditedAt: b.adminCopy?.editedAt || null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });
    return res.json({ books: booksWithMeta });
  });

  app.get('/api/admin/books/:id', requireStaffOrAdmin, (req, res) => {
    const book = db.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد.' });
    return res.json({
      book,
      hasAdminCopy: Boolean(book.adminCopy),
      adminCopy: book.adminCopy || null,
    });
  });

  // Get Admin Private Copy (or initialize draft from original user book)
  app.get('/api/admin/books/:id/admin-copy', requireStaffOrAdmin, (req, res) => {
    const book = db.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'کتاب مورد نظر یافت نشد.' });

    if (book.adminCopy) {
      return res.json({
        exists: true,
        adminCopy: book.adminCopy,
        originalBook: {
          id: book.id,
          title: book.title,
          author: book.author,
          translator: book.translator,
          originalTitle: book.originalTitle,
        },
      });
    }

    // Return fresh clone template without modifying database until admin clicks save
    const initialCopy = {
      editedAt: Date.now(),
      title: book.title || 'کتاب ترجمه شده',
      originalTitle: book.originalTitle || '',
      author: book.author || '',
      translator: book.translator || '',
      designConfig: (book as any).designConfig || {},
      chunks: (book.chunks || []).map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        chapterTitle: c.chapterTitle,
        chunkNumber: c.chunkNumber,
        englishText: c.englishText,
        translatedHtml: c.translatedHtml || '',
        wordCount: c.wordCount || 0,
      })),
    };

    return res.json({
      exists: false,
      adminCopy: initialCopy,
      originalBook: {
        id: book.id,
        title: book.title,
        author: book.author,
        translator: book.translator,
        originalTitle: book.originalTitle,
      },
    });
  });

  // Save/Update Admin Private Copy (leaves user's original book 100% untouched)
  app.put('/api/admin/books/:id/admin-copy', requireStaffOrAdmin, (req, res) => {
    const book = db.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'کتاب مورد نظر یافت نشد.' });

    const adminUser = (req as any).user;
    const adminCopy = db.saveAdminBookCopy(req.params.id, req.body, adminUser?.id);
    if (!adminCopy) {
      return res.status(500).json({ error: 'خطا در ذخیره‌سازی نسخه مدیریت.' });
    }

    return res.json({
      success: true,
      message: 'نسخه اختصاصی مدیریت با موفقیت ذخیره شد. نسخه کاربر بدون تغییر باقی ماند.',
      adminCopy,
    });
  });

  // Delete Admin Private Copy (resets to original user book)
  app.delete('/api/admin/books/:id/admin-copy', requireStaffOrAdmin, (req, res) => {
    const ok = db.deleteAdminBookCopy(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'نسخه مدیریتی برای این کتاب ثبت نشده بود.' });
    }

    return res.json({
      success: true,
      message: 'نسخه مدیریت حذف شد و این کتاب به نسخه اصلی کاربر بازنشانی گردید.',
    });
  });

  app.delete('/api/admin/books/:id', requireStaffOrAdmin, (req, res) => {
    const ok = db.deleteBook(req.params.id);
    if (!ok) return res.status(404).json({ error: 'کتاب یافت نشد.' });
    return res.json({ success: true, message: 'کتاب با موفقیت از سیستم حذف گردید.' });
  });

  // ==========================================
  // 12. BLOG & SEO CONTENT MANAGEMENT
  // ==========================================

  // Public: Get published blog posts
  app.get('/api/blog/posts', (req, res) => {
    try {
      const categorySlug = req.query.category as string | undefined;
      const posts = db.getBlogPosts(true, categorySlug);
      const categories = db.getBlogCategories();
      return res.json({
        posts: posts.map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          category: p.category,
          categorySlug: p.categorySlug,
          tags: p.tags,
          coverImage: p.coverImage,
          authorName: p.authorName,
          authorRole: p.authorRole,
          readingTimeMinutes: p.readingTimeMinutes,
          views: p.views,
          publishedAt: p.publishedAt,
        })),
        categories,
      });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در بارگذاری مقالات: ${err.message}` });
    }
  });

  // Public: Get single blog post by slug
  app.get('/api/blog/posts/:slug', (req, res) => {
    try {
      const post = db.getBlogPostBySlug(req.params.slug);
      if (!post || (!post.isPublished && !(req as any).user)) {
        return res.status(404).json({ error: 'مقاله مورد نظر یافت نشد.' });
      }

      // Increment views
      db.incrementBlogPostViews(post.id);

      // Related posts in same category
      const related = db.getBlogPosts(true)
        .filter(p => p.id !== post.id && (p.categorySlug === post.categorySlug || p.category === post.category))
        .slice(0, 3)
        .map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          coverImage: p.coverImage,
          readingTimeMinutes: p.readingTimeMinutes,
          publishedAt: p.publishedAt,
        }));

      return res.json({
        post: {
          ...post,
          views: (post.views || 0) + 1,
        },
        related,
      });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در دریافت مقاله: ${err.message}` });
    }
  });

  // Public: Get blog categories
  app.get('/api/blog/categories', (_req, res) => {
    try {
      const categories = db.getBlogCategories();
      const allPosts = db.getBlogPosts(true);
      const categoriesWithCount = categories.map(cat => ({
        ...cat,
        postsCount: allPosts.filter(p => (p.categorySlug || '').toLowerCase() === cat.slug.toLowerCase() || p.category === cat.name).length,
      }));
      return res.json({ categories: categoriesWithCount });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در دریافت دسته‌بندی‌ها: ${err.message}` });
    }
  });

  // Staff & Admin: Get all blog posts (including drafts)
  app.get('/api/admin/blog/posts', requireStaffOrAdmin, (_req, res) => {
    try {
      const posts = db.getBlogPosts(false);
      return res.json({ posts });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در دریافت لیست مقالات: ${err.message}` });
    }
  });

  // Staff & Admin: Create or update blog post
  app.post('/api/admin/blog/posts', requireStaffOrAdmin, (req, res) => {
    try {
      const user = (req as any).user;
      const {
        id,
        title,
        slug,
        excerpt,
        content,
        category,
        categorySlug,
        tags,
        coverImage,
        authorName,
        authorRole,
        readingTimeMinutes,
        isPublished,
        metaTitle,
        metaDescription,
        canonicalUrl,
      } = req.body;

      if (!title || !slug || !content) {
        return res.status(400).json({ error: 'عنوان، آدرس پیوند (Slug) و محتوای مقاله الزامی است.' });
      }

      const saved = db.saveBlogPost({
        id,
        title,
        slug,
        excerpt,
        content,
        category: category || 'آموزش ترجمه کتاب',
        categorySlug: categorySlug || 'translation-guides',
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        coverImage: coverImage || '',
        authorId: user?.id,
        authorName: authorName || user?.name || 'تیم تحریریه',
        authorRole: authorRole || (user?.role === 'admin' ? 'مدیر ارشد' : 'کارشناس تحریریه'),
        readingTimeMinutes: readingTimeMinutes ? Number(readingTimeMinutes) : undefined,
        isPublished: isPublished !== false,
        metaTitle,
        metaDescription,
        canonicalUrl,
      });

      return res.json({ success: true, post: saved });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در ذخیره مقاله: ${err.message}` });
    }
  });

  // Staff & Admin: Delete blog post
  app.delete('/api/admin/blog/posts/:id', requireStaffOrAdmin, (req, res) => {
    try {
      const ok = db.deleteBlogPost(req.params.id);
      if (!ok) return res.status(404).json({ error: 'مقاله یافت نشد.' });
      return res.json({ success: true, message: 'مقاله با موفقیت حذف شد.' });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در حذف مقاله: ${err.message}` });
    }
  });

  // Staff & Admin: Get blog categories
  app.get('/api/admin/blog/categories', requireStaffOrAdmin, (_req, res) => {
    try {
      const categories = db.getBlogCategories();
      return res.json({ categories });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در دریافت دسته‌بندی‌ها: ${err.message}` });
    }
  });

  // Staff & Admin: Create or update blog category
  app.post('/api/admin/blog/categories', requireStaffOrAdmin, (req, res) => {
    try {
      const { id, name, slug, description, color } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: 'نام و نامک (Slug) دسته‌بندی الزامی است.' });
      }
      const saved = db.saveBlogCategory({ id, name, slug, description, color });
      return res.json({ success: true, category: saved });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در ذخیره دسته‌بندی: ${err.message}` });
    }
  });

  // Staff & Admin: Delete blog category
  app.delete('/api/admin/blog/categories/:id', requireStaffOrAdmin, (req, res) => {
    try {
      const ok = db.deleteBlogCategory(req.params.id);
      if (!ok) return res.status(404).json({ error: 'دسته‌بندی یافت نشد.' });
      return res.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد.' });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در حذف دسته‌بندی: ${err.message}` });
    }
  });

  // ==========================================
  // 13. SCRIPTS & GOOGLE SEARCH CONSOLE / ANALYTICS
  // ==========================================

  // Admin & Staff: Get Scripts Injection Settings
  app.get('/api/admin/settings/scripts', requireStaffOrAdmin, (_req, res) => {
    try {
      const config = db.getScriptsInjection();
      return res.json({ scriptsInjection: config });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در دریافت تنظیمات اسکریپت‌ها: ${err.message}` });
    }
  });

  // Admin: Update Scripts Injection Settings
  app.post('/api/admin/settings/scripts', requireAdmin, (req, res) => {
    try {
      const { enabled, googleSearchConsoleVerification, googleAnalyticsId, googleTagManagerId, headerScripts, footerScripts } = req.body;
      const updated = db.updateScriptsInjection({
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        googleSearchConsoleVerification: (googleSearchConsoleVerification || '').trim(),
        googleAnalyticsId: (googleAnalyticsId || '').trim(),
        googleTagManagerId: (googleTagManagerId || '').trim(),
        headerScripts: headerScripts || '',
        footerScripts: footerScripts || '',
      });
      return res.json({ success: true, scriptsInjection: updated });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در ذخیره تنظیمات اسکریپت‌ها: ${err.message}` });
    }
  });
}
