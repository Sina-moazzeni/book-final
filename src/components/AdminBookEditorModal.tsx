import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Download,
  Printer,
  RotateCcw,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Check,
  RefreshCw,
  Eye,
  Type,
  BookOpen,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { BookDesignConfig, AdminBookCopy, AdminBookChunkCopy } from '../types.ts';
import { downloadDocx } from '../utils/exporter.ts';

interface AdminBookEditorModalProps {
  book: any;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function AdminBookEditorModal({
  book,
  token,
  isOpen,
  onClose,
  onSaveSuccess,
}: AdminBookEditorModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasExistingCopy, setHasExistingCopy] = useState(false);

  // Editable fields for admin version
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('');
  const [chunks, setChunks] = useState<AdminBookChunkCopy[]>([]);
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load admin copy or clone on open
  useEffect(() => {
    if (!isOpen || !book?.id) return;
    setLoading(true);
    setSaveSuccess(false);

    fetch(`/api/admin/books/${book.id}/admin-copy`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.adminCopy) {
          setTitle(data.adminCopy.title || book.title || '');
          setOriginalTitle(data.adminCopy.originalTitle || book.originalTitle || '');
          setAuthor(data.adminCopy.author || book.author || '');
          setTranslator(data.adminCopy.translator || book.translator || '');
          setChunks(data.adminCopy.chunks || []);
          setHasExistingCopy(Boolean(data.exists));
        } else {
          setTitle(book.title || '');
          setOriginalTitle(book.originalTitle || '');
          setAuthor(book.author || '');
          setTranslator(book.translator || '');
          setChunks(
            (book.chunks || []).map((c: any) => ({
              id: c.id,
              chapterNumber: c.chapterNumber,
              chapterTitle: c.chapterTitle,
              chunkNumber: c.chunkNumber,
              englishText: c.englishText,
              translatedHtml: c.translatedHtml || '',
              wordCount: c.wordCount || 0,
            }))
          );
          setHasExistingCopy(false);
        }
        setSelectedChunkIndex(0);
      })
      .catch((err) => {
        console.error('Error fetching admin book copy:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, book, token]);

  if (!isOpen) return null;

  const currentChunk = chunks[selectedChunkIndex] || null;

  // Handle chunk title change
  const handleChunkTitleChange = (newTitle: string) => {
    if (selectedChunkIndex < 0 || selectedChunkIndex >= chunks.length) return;
    const updated = [...chunks];
    updated[selectedChunkIndex] = {
      ...updated[selectedChunkIndex],
      chapterTitle: newTitle,
    };
    setChunks(updated);
  };

  // Handle chunk content change
  const handleChunkContentChange = (newContent: string) => {
    if (selectedChunkIndex < 0 || selectedChunkIndex >= chunks.length) return;
    const updated = [...chunks];
    updated[selectedChunkIndex] = {
      ...updated[selectedChunkIndex],
      translatedHtml: newContent,
    };
    setChunks(updated);
  };

  // Add new chunk / page
  const handleAddNewChunk = () => {
    const newIdx = chunks.length + 1;
    const newChunk: AdminBookChunkCopy = {
      id: `admin_chunk_${Date.now()}`,
      chapterNumber: newIdx,
      chapterTitle: `فصل جدید ${newIdx}`,
      chunkNumber: newIdx,
      englishText: '',
      translatedHtml: `<p>متن فصل جدید را در این قسمت وارد نمایید.</p>`,
      wordCount: 10,
    };
    const updated = [...chunks, newChunk];
    setChunks(updated);
    setSelectedChunkIndex(updated.length - 1);
  };

  // Delete chunk
  const handleDeleteChunk = (index: number) => {
    if (chunks.length <= 1) {
      alert('کتاب باید حداقل دارای یک بخش باشد.');
      return;
    }
    if (!confirm(`آیا از حذف بخش «${chunks[index]?.chapterTitle || `فصل ${index + 1}`}» از نسخه مدیریت مطمئن هستید؟`)) {
      return;
    }
    const updated = chunks.filter((_, idx) => idx !== index);
    setChunks(updated);
    if (selectedChunkIndex >= updated.length) {
      setSelectedChunkIndex(updated.length - 1);
    }
  };

  // Save admin copy
  const handleSaveAdminCopy = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/admin/books/${book.id}/admin-copy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          originalTitle: originalTitle.trim(),
          author: author.trim(),
          translator: translator.trim(),
          chunks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ذخیره‌سازی نسخه مدیریت');

      setSaveSuccess(true);
      setHasExistingCopy(true);
      onSaveSuccess();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Reset to original user book (Discard admin copy)
  const handleResetToUserVersion = async () => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید نسخه مدیریت را حذف و این کتاب را دقیقاً به نسخه اصلی کاربر بازنشانی کنید؟')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/books/${book.id}/admin-copy`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در بازنشانی کتاب');

      // Reload from original book
      setTitle(book.title || '');
      setOriginalTitle(book.originalTitle || '');
      setAuthor(book.author || '');
      setTranslator(book.translator || '');
      setChunks(
        (book.chunks || []).map((c: any) => ({
          id: c.id,
          chapterNumber: c.chapterNumber,
          chapterTitle: c.chapterTitle,
          chunkNumber: c.chunkNumber,
          englishText: c.englishText,
          translatedHtml: c.translatedHtml || '',
          wordCount: c.wordCount || 0,
        }))
      );
      setHasExistingCopy(false);
      onSaveSuccess();
      alert('کتاب با موفقیت به نسخه اصلی کاربر بازنشانی شد.');
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Download DOCX from current admin copy
  const handleDownloadDocxFromAdminCopy = async () => {
    const projectForExport = {
      id: book.id,
      title: title || 'کتاب ترجمه شده',
      originalTitle: originalTitle || '',
      author: author || '',
      translator: translator || 'مدیریت سامانه',
      chunks: chunks.map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        chapterTitle: c.chapterTitle,
        chunkNumber: c.chunkNumber,
        englishText: c.englishText || '',
        translatedHtml: c.translatedHtml || '',
        status: 'completed' as const,
        wordCount: c.wordCount || 0,
        estimatedTokens: 0,
      })),
      glossary: book.glossary || [],
      model: 'admin-export',
      tone: 'formal' as any,
      createdAt: book.createdAt || Date.now(),
      updatedAt: Date.now(),
      designConfig: {
        textAlignment: 'right' as const,
        fontFamily: 'Vazirmatn Medium',
        themeId: 'spiritual' as any,
        showHeader: true,
        showFooter: true,
        headerText: title || 'کتاب ترجمه شده',
        footerText: 'نسخه رسمی ویرایش مدیریت',
      },
    };

    try {
      await downloadDocx(projectForExport as any);
    } catch (e: any) {
      alert(`خطا در دانلود فایل ورد: ${e.message}`);
    }
  };

  // Print PDF from current admin copy
  const handlePrintPdfFromAdminCopy = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('لطفاً اجازه باز شدن پنجره پاپ‌آپ چاپ را صادر فرمایید.');
      return;
    }

    const chaptersHtml = chunks
      .map(
        (ch, idx) => `
        <div class="chapter-page">
          <div class="chapter-header">
            <span class="chap-num">بخش ${idx + 1}</span>
            <h2 class="chap-title">${ch.chapterTitle || `فصل ${idx + 1}`}</h2>
          </div>
          <div class="chapter-body">
            ${ch.translatedHtml || '<p>متنی ثبت نشده است.</p>'}
          </div>
        </div>
      `
      )
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>${title} - نسخه اختصاصی مدیریت</title>
        <style>
          @page { size: A4; margin: 2cm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Vazirmatn', Tahoma, sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 2.1;
            font-size: 13pt;
            color: #1e293b;
            margin: 0;
            padding: 20px;
          }
          .title-cover {
            text-align: center;
            padding: 80px 20px;
            page-break-after: always;
          }
          h1 { font-size: 26pt; color: #0f172a; margin-bottom: 12px; }
          .meta { font-size: 13pt; color: #64748b; margin-top: 8px; }
          .badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 10pt; font-weight: bold; margin-top: 20px; }
          .chapter-page { page-break-before: always; padding-top: 20px; }
          .chapter-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; }
          .chap-num { font-size: 11pt; color: #b45309; font-weight: bold; }
          .chap-title { font-size: 18pt; color: #1e3a8a; margin: 4px 0 0 0; }
          .chapter-body { text-align: right; }
          .chapter-body p { margin-bottom: 18px; }
          .chapter-body h1, .chapter-body h2, .chapter-body h3 { text-align: right; }
          img { max-width: 90%; height: auto; display: block; margin: 20px auto; border-radius: 8px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="title-cover">
          <h1>${title}</h1>
          ${originalTitle ? `<div class="meta" dir="ltr">${originalTitle}</div>` : ''}
          ${author ? `<div class="meta">نویسنده: ${author}</div>` : ''}
          ${translator ? `<div class="meta">مترجم و ویراستار: ${translator}</div>` : ''}
          <div class="badge">نسخه اختصاصی ویرایش مدیریت سامانه</div>
        </div>
        ${chaptersHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 font-['Vazirmatn']">
      <div
        className={`w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-6xl h-[92vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                  ویرایش نسخه اختصاصی مدیریت: {title || book.title}
                </h3>
                {hasExistingCopy ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                    نسخه فعال مدیریت
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                    پیش‌نویس اولیه از روی کتاب کاربر
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تغییرات این بخش منحصراً برای مدیریت ذخیره می‌شود و هیچ تغییری روی کتاب و پنل کاربر اعمال نخواهد شد.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Button */}
            <button
              onClick={handleSaveAdminCopy}
              disabled={saving || loading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? 'در حال ذخیره...' : saveSuccess ? 'ذخیره شد!' : 'ذخیره نسخه مدیریت'}</span>
            </button>

            {/* Word DOCX Download */}
            <button
              onClick={handleDownloadDocxFromAdminCopy}
              title="دانلود فایل استاندارد Word (.docx) از این نسخه"
              className="px-3 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروجی Word</span>
            </button>

            {/* PDF Print */}
            <button
              onClick={handlePrintPdfFromAdminCopy}
              title="چاپ و دانلود مستقیم PDF از این نسخه"
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Reset to User version */}
            {hasExistingCopy && (
              <button
                onClick={handleResetToUserVersion}
                disabled={saving}
                title="حذف نسخه مدیریت و بازگشت به کتاب اصلی کاربر"
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Alert */}
        <div className="bg-purple-950/30 border-b border-purple-500/20 px-5 py-2 flex items-center justify-between text-xs text-purple-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>حفاظت از نسخه کاربر:</strong> کاربر نسخه اصلی خود را می‌بیند. هر گونه تصحیح، بازنویسی، افزودن تصویر یا تغییر تیترها در اینجا، فقط در دسترس مدیریت خواهد بود.
            </span>
          </div>
          <span className="text-[11px] text-purple-400/80 font-mono">
            {chunks.length} فصل / بخش در نسخه مدیریت
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
              <span>در حال فراخوانی اطلاعات کتاب...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar: Chapters & Metadata */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
              {/* Metadata Inputs */}
              <div className="p-4 border-b border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    عنوان کتاب در نسخه مدیریت:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      نویسنده:
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      مترجم/ویراستار:
                    </label>
                    <input
                      type="text"
                      value={translator}
                      onChange={(e) => setTranslator(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Chapters List Title & Add Button */}
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  فهرست بخش‌های کتاب ({chunks.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewChunk}
                  className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1 transition"
                  title="افزودن فصل/صفحه جدید به نسخه مدیریت"
                >
                  <Plus className="w-3 h-3" />
                  <span>فصل جدید</span>
                </button>
              </div>

              {/* Chapters List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
                {chunks.map((ch, idx) => {
                  const isSelected = idx === selectedChunkIndex;
                  return (
                    <div
                      key={ch.id || idx}
                      onClick={() => setSelectedChunkIndex(idx)}
                      className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 text-xs ${
                        isSelected
                          ? 'bg-purple-600/20 border border-purple-500/40 text-purple-200 shadow-sm'
                          : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-lg bg-slate-800 font-mono text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold truncate">
                          {ch.chapterTitle || `فصل ${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {ch.wordCount ? (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ch.wordCount} کلمه
                          </span>
                        ) : null}
                        {chunks.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChunk(idx);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="حذف این فصل از نسخه مدیریت"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
              {currentChunk ? (
                <>
                  {/* Active Chapter Header Controls */}
                  <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        عنوان این بخش / فصل (تیتر راست‌چین بدون کشیدگی):
                      </label>
                      <input
                        type="text"
                        value={currentChunk.chapterTitle}
                        onChange={(e) => handleChunkTitleChange(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          previewMode
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{previewMode ? 'حالت ویرایش متن' : 'پیش‌نمایش چاپ'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Editor or Preview */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    {previewMode ? (
                      /* Live Print Preview */
                      <div className="max-w-3xl mx-auto bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 min-h-full">
                        <div className="border-b border-slate-200 pb-4 mb-6">
                          <span className="text-xs font-bold text-amber-700">بخش {selectedChunkIndex + 1}</span>
                          <h2 className="text-2xl font-bold text-slate-900 mt-1">
                            {currentChunk.chapterTitle || `فصل ${selectedChunkIndex + 1}`}
                          </h2>
                        </div>
                        <div
                          className="prose prose-slate max-w-none text-right leading-loose text-base font-['Vazirmatn'] space-y-4"
                          dangerouslySetInnerHTML={{
                            __html: currentChunk.translatedHtml || '<p class="text-slate-400">متنی برای این بخش ثبت نشده است.</p>',
                          }}
                        />
                      </div>
                    ) : (
                      /* Code / Text Editor */
                      <div className="h-full flex flex-col space-y-2">
                        {/* Quick formatting toolbar */}
                        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800 text-xs">
                          <span className="text-[11px] text-slate-500 ml-2">ابزارهای درج سریع:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const tag = '<p>متن پاراگراف جدید...</p>';
                              handleChunkContentChange((currentChunk.translatedHtml || '') + '\n' + tag);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            + پاراگراف (p)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tag = '<h2>عنوان فرعی بخش</h2>';
                              handleChunkContentChange((currentChunk.translatedHtml || '') + '\n' + tag);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            + تیتر فرعی (h2)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tag = '<blockquote>نقل قول مهم از کتاب...</blockquote>';
                              handleChunkContentChange((currentChunk.translatedHtml || '') + '\n' + tag);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            + نقل‌قول
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tag = '<div style="page-break-before: always;"></div>';
                              handleChunkContentChange((currentChunk.translatedHtml || '') + '\n' + tag);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            + شکست صفحه
                          </button>
                        </div>

                        <textarea
                          value={currentChunk.translatedHtml || ''}
                          onChange={(e) => handleChunkContentChange(e.target.value)}
                          placeholder="محتوا یا کدهای HTML این فصل را در اینجا ویرایش نمایید..."
                          className="flex-1 w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-sans leading-relaxed focus:border-purple-500 focus:outline-none resize-none"
                          dir="rtl"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  لطفاً فصلی را از منوی سمت راست انتخاب فرمایید.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
