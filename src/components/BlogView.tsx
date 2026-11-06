import React, { useState, useEffect } from 'react';
import { BlogPost, BlogCategory } from '../types';
import {
  BookOpen,
  Calendar,
  Clock,
  Eye,
  User,
  ArrowRight,
  Search,
  Tag,
  Share2,
  Check,
  ChevronLeft,
  Sparkles,
  Send,
  MessageCircle,
} from 'lucide-react';

interface BlogViewProps {
  currentSlug?: string | null;
  onNavigateHome: () => void;
  onNavigatePost: (slug: string) => void;
  onNavigateBlog: (categorySlug?: string) => void;
  onOpenAuthModal?: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({
  currentSlug,
  onNavigateHome,
  onNavigatePost,
  onNavigateBlog,
  onOpenAuthModal,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Single post view state
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Partial<BlogPost>[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load blog data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    if (currentSlug) {
      // Single post fetch
      fetch(`/api/blog/posts/${encodeURIComponent(currentSlug)}`)
        .then(res => {
          if (!res.ok) throw new Error('مقاله مورد نظر یافت نشد.');
          return res.json();
        })
        .then(data => {
          if (!isMounted) return;
          setCurrentPost(data.post);
          setRelatedPosts(data.related || []);
          setLoading(false);

          // Update SEO document title and meta description
          if (data.post) {
            document.title = `${data.post.metaTitle || data.post.title} | وبلاگ مترجم کتاب`;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
              metaDesc.setAttribute('content', data.post.metaDescription || data.post.excerpt);
            }
          }
        })
        .catch(err => {
          if (!isMounted) return;
          setError(err.message || 'خطا در دریافت مقاله');
          setLoading(false);
        });
    } else {
      // Posts list fetch
      setCurrentPost(null);
      document.title = 'وبلاگ تخصصی و مقالات ترجمه کتاب | سامانه هوشمند ترجمه';
      const url = selectedCategory !== 'all' ? `/api/blog/posts?category=${encodeURIComponent(selectedCategory)}` : '/api/blog/posts';

      Promise.all([
        fetch(url).then(r => r.json()),
        fetch('/api/blog/categories').then(r => r.json()),
      ])
        .then(([postsData, catsData]) => {
          if (!isMounted) return;
          setPosts(postsData.posts || []);
          setCategories(catsData.categories || []);
          setLoading(false);
        })
        .catch(err => {
          if (!isMounted) return;
          setError(err.message || 'خطا در بارگذاری وبلاگ');
          setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [currentSlug, selectedCategory]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(timestamp));
    } catch (e) {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  // Filter posts in list view
  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q) ||
      (post.tags && post.tags.some(t => t.toLowerCase().includes(q))) ||
      (post.category && post.category.toLowerCase().includes(q))
    );
  });

  // Schema.org Article JSON-LD for single article SEO
  const generateArticleSchema = (post: BlogPost) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://book.gaiafa.ir';
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': post.title,
      'description': post.excerpt,
      'image': post.coverImage || `${origin}/favicon.ico`,
      'datePublished': new Date(post.publishedAt || post.createdAt).toISOString(),
      'dateModified': new Date(post.updatedAt || post.publishedAt || post.createdAt).toISOString(),
      'author': {
        '@type': 'Person',
        'name': post.authorName,
        'jobTitle': post.authorRole,
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'سامانه هوشمند ترجمه کتاب',
        'url': origin,
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `${origin}/blog/${post.slug}`,
      },
      'keywords': post.tags.join(', '),
      'articleSection': post.category,
    };
  };

  // -------------------------------------------------------------
  // SINGLE ARTICLE DETAIL VIEW
  // -------------------------------------------------------------
  if (currentSlug && currentPost) {
    const articleSchema = generateArticleSchema(currentPost);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24" dir="rtl">
        {/* Inject Schema.org JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        {/* Top Floating Breadcrumb Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 overflow-x-auto no-scrollbar">
              <button
                onClick={onNavigateHome}
                className="hover:text-amber-400 transition-colors whitespace-nowrap"
              >
                صفحه اصلی
              </button>
              <span>/</span>
              <button
                onClick={() => onNavigateBlog()}
                className="hover:text-amber-400 transition-colors whitespace-nowrap"
              >
                وبلاگ
              </button>
              <span>/</span>
              <span className="text-amber-400/90 truncate max-w-[220px] sm:max-w-md">
                {currentPost.title}
              </span>
            </div>

            <button
              onClick={() => onNavigateBlog()}
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              بازگشت به مقالات
            </button>
          </div>
        </div>

        {/* Article Container */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
          {/* Category Badge & Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {currentPost.category}
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              خواندن در {currentPost.readingTimeMinutes || 5} دقیقه
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              {currentPost.views || 1} بازدید
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(currentPost.publishedAt || currentPost.createdAt)}
            </span>
          </div>

          {/* Article Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight sm:leading-snug mb-6">
            {currentPost.title}
          </h1>

          {/* Author Strip */}
          <div className="flex items-center justify-between py-4 border-y border-slate-800/80 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">{currentPost.authorName}</div>
                <div className="text-xs text-slate-400">{currentPost.authorRole}</div>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="کپی لینک مقاله"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? 'کپی شد!' : 'اشتراک‌گذاری'}</span>
              </button>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(currentPost.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-sky-900/30 hover:bg-sky-800/50 text-sky-400 border border-sky-800/40 transition"
                title="ارسال در تلگرام"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(currentPost.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-800/40 transition"
                title="ارسال در واتس‌اپ"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Cover Image */}
          {currentPost.coverImage && (
            <div className="mb-10 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 aspect-video max-h-[460px] w-full">
              <img
                src={currentPost.coverImage}
                alt={currentPost.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Excerpt Lead */}
          {currentPost.excerpt && (
            <div className="bg-slate-900/80 border-r-4 border-amber-500 p-5 rounded-l-xl mb-10 text-slate-300 text-base sm:text-lg leading-relaxed font-medium">
              {currentPost.excerpt}
            </div>
          )}

          {/* Rich HTML Content Body */}
          <article
            className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-amber-400 prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-800/80 prose-h2:pb-2 prose-h3:text-xl prose-p:text-slate-300 prose-p:leading-8 prose-p:mb-6 prose-strong:text-amber-300 prose-a:text-amber-400 hover:prose-a:underline prose-li:text-slate-300 prose-blockquote:border-r-amber-500 prose-blockquote:bg-slate-900/40 prose-blockquote:p-4 prose-blockquote:rounded-lg"
            dangerouslySetInnerHTML={{ __html: currentPost.content }}
          />

          {/* Tags */}
          {currentPost.tags && currentPost.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                برچسب‌ها:
              </span>
              {currentPost.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs border border-slate-800 transition cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA Banner: Translate a book */}
          <div className="mt-12 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                می‌خواهید کتاب خودتان را ترجمه و صفحه‌آرایی کنید؟
              </h3>
              <p className="text-slate-400 text-sm max-w-xl">
                با سامانه ابری ما، کتاب‌های انگلیسی قطور با هوش مصنوعی و لحن تخصصی، حفظ تصاویر و واژه‌نامه اختصاصی به فارسی برگردانده می‌شوند.
              </p>
            </div>
            <button
              onClick={() => onOpenAuthModal ? onOpenAuthModal() : onNavigateHome()}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition whitespace-nowrap text-sm"
            >
              شروع ترجمه کتاب
            </button>
          </div>

          {/* Related Articles */}
          {relatedPosts && relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-slate-800">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                مقالات مرتبط در همین زمینه
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {relatedPosts.map(rel => (
                  <div
                    key={rel.id}
                    onClick={() => rel.slug && onNavigatePost(rel.slug)}
                    className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-xl overflow-hidden cursor-pointer transition flex flex-col justify-between p-4"
                  >
                    <div>
                      {rel.coverImage && (
                        <div className="aspect-video w-full rounded-lg overflow-hidden mb-3 bg-slate-800">
                          <img
                            src={rel.coverImage}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition line-clamp-2 mb-2">
                        {rel.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {rel.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{rel.readingTimeMinutes} دقیقه</span>
                      <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-[-2px] transition">
                        مطالعه <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // BLOG LIST / ARCHIVE VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 group text-white font-bold text-base sm:text-lg"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md">
                تر
              </div>
              <span className="group-hover:text-amber-400 transition">سامانه هوشمند ترجمه</span>
            </button>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm text-slate-400 hidden sm:inline">
              وبلاگ و دانشنامه تخصصی
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              صفحه اصلی
            </button>
            <button
              onClick={() => onOpenAuthModal ? onOpenAuthModal() : onNavigateHome()}
              className="text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-lg shadow-sm transition"
            >
              ورود / ثبت‌نام
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/40 to-slate-950 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            مرجع مقالات و راهنماهای ترجمه هوش مصنوعی
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight sm:leading-snug">
            وبلاگ و دانشنامه تخصصی ترجمه کتاب
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8">
            آموزش‌ها، مقایسه تخصصی موتورهای زبانی هوش مصنوعی، اصول صفحه‌آرایی استاندارد چاپ و راهکارهای حفظ لحن و واژه‌نامه در کتاب‌های قطور.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو در بین مقالات، واژگان و برچسب‌ها..."
              className="w-full pr-12 pl-4 py-3 bg-slate-900/90 border border-slate-700/80 focus:border-amber-500 rounded-2xl text-slate-200 placeholder-slate-500 text-sm outline-none shadow-xl transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded-md"
              >
                پاک کردن
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap border ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            همه مقالات ({posts.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap border flex items-center gap-2 ${
                selectedCategory === cat.slug
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color || '#3b82f6' }}
              ></span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm">در حال بارگذاری مقالات وبلاگ...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-red-950/20 border border-red-900/40 rounded-2xl p-6">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs bg-slate-800 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-700 transition"
            >
              بارگذاری مجدد
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300 mb-2">مقاله‌ای یافت نشد</h3>
            <p className="text-slate-500 text-sm mb-4">
              با معیارهای جستجوی شما نتیجه‌ای پیدا نشد. می‌توانید عبارت دیگری را جستجو کنید.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg transition"
              >
                نمایش همه مقالات
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured Post (First one when no active search) */}
            {!searchQuery && selectedCategory === 'all' && filteredPosts[0] && (
              <div
                onClick={() => onNavigatePost(filteredPosts[0].slug)}
                className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl overflow-hidden cursor-pointer shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12"
              >
                <div className="lg:col-span-7 aspect-video lg:aspect-auto overflow-hidden bg-slate-950">
                  {filteredPosts[0].coverImage ? (
                    <img
                      src={filteredPosts[0].coverImage}
                      alt={filteredPosts[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                      <BookOpen className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                        مقاله ویژه
                      </span>
                      <span className="text-xs text-slate-400">
                        {filteredPosts[0].category}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-400 transition leading-snug mb-3">
                      {filteredPosts[0].title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-6">
                      {filteredPosts[0].excerpt}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span>{filteredPosts[0].authorName}</span>
                    </div>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-[-4px] transition">
                      مطالعه کامل <ChevronLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchQuery || selectedCategory !== 'all' ? filteredPosts : filteredPosts.slice(1)).map(post => (
                <div
                  key={post.id}
                  onClick={() => onNavigatePost(post.slug)}
                  className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Card Image */}
                    <div className="aspect-video w-full overflow-hidden bg-slate-800 relative">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <BookOpen className="w-10 h-10" />
                        </div>
                      )}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-950/80 backdrop-blur-md text-amber-400 border border-slate-700/60">
                        {post.category}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition leading-snug line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {post.tags.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3.5 border-t border-slate-800/60 bg-slate-950/30 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.readingTimeMinutes || 4} دقیقه</span>
                    </div>
                    <span className="text-amber-400 text-xs font-medium flex items-center gap-1 group-hover:translate-x-[-3px] transition">
                      مطالعه مقاله <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
