import React, { useState } from 'react';
import {
  ListFilter,
  CheckCircle2,
  Clock,
  Play,
  RotateCw,
  AlertCircle,
  Search,
  Hash,
  Layers,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';
import { BookChunk } from '../types.ts';
import { cleanChapterTitle } from '../utils/exporter.ts';

interface ChunkListSidebarProps {
  chunks: BookChunk[];
  activeChunkId: string | null;
  onSelectChunk: (id: string) => void;
  onTranslateChunk: (id: string) => void;
  isBatchTranslating: boolean;
  onDeleteChunk?: (id: string) => void;
  onToggleExcludeChunk?: (id: string) => void;
  onOpenAddPageModal?: (targetChunkId?: string, defaultPosition?: 'after' | 'before' | 'start' | 'end') => void;
  isLoadingChunks?: boolean;
  onRetryFailedChunks?: () => void;
}

export const ChunkListSidebar: React.FC<ChunkListSidebarProps> = ({
  chunks = [],
  activeChunkId,
  onSelectChunk,
  onTranslateChunk,
  isBatchTranslating,
  onDeleteChunk,
  onToggleExcludeChunk,
  onOpenAddPageModal,
  isLoadingChunks = false,
  onRetryFailedChunks,
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [search, setSearch] = useState('');

  const safeChunks = chunks || [];
  const failedCount = safeChunks.filter(c => c && (c.status === 'error' || (!c.translatedHtml && !!c.errorMessage))).length;
  const incompleteCount = safeChunks.filter(c => !c || !c.translatedHtml || typeof c.translatedHtml !== 'string' || c.translatedHtml.trim().length === 0).length;

  const filteredChunks = safeChunks.filter(c => {
    if (!c) return false;
    const hasHtml = Boolean(c.translatedHtml && typeof c.translatedHtml === 'string' && c.translatedHtml.trim().length > 0);
    if (filter === 'completed' && !hasHtml) return false;
    if (filter === 'pending' && hasHtml) return false;
    if (filter === 'failed' && c.status !== 'error' && (!c.errorMessage || hasHtml)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (c.chapterTitle ? String(c.chapterTitle) : '').toLowerCase().includes(q);
      const matchText = (c.englishText ? String(c.englishText) : '').toLowerCase().includes(q);
      if (!matchTitle && !matchText) return false;
    }
    return true;
  });

  return (
    <aside className="no-print w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full md:h-[calc(100vh-8rem)] overflow-hidden">
      
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/90">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-bold flex items-center gap-1.5 text-white">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>بخش‌ها و فصول کتاب</span>
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            {filteredChunks.length} بخش
          </span>
        </div>

        {/* Add Page Button */}
        {onOpenAddPageModal && (
          <button
            type="button"
            onClick={() => onOpenAddPageModal(activeChunkId || undefined, 'after')}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ افزودن صفحه یا تصویر به کتاب</span>
          </button>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو در فصول یا متن..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded font-medium transition ${
              filter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            همه ({chunks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 py-1 rounded font-medium transition ${
              filter === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            در انتظار ({chunks.filter(c => !c.translatedHtml).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-1 rounded font-medium transition ${
              filter === 'completed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            ترجمه‌شده ({chunks.filter(c => c.translatedHtml).length})
          </button>
          {failedCount > 0 && (
            <button
              onClick={() => setFilter('failed')}
              className={`py-1 px-2 rounded font-medium transition flex items-center gap-1 ${
                filter === 'failed' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>خطادار ({failedCount})</span>
            </button>
          )}
        </div>

        {/* Retry Failed / Incomplete Chunks Quick Banner */}
        {incompleteCount > 0 && onRetryFailedChunks && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium truncate">
                {failedCount > 0
                  ? `${failedCount} بخش خطادار و ${incompleteCount} بخش ناقص باقی‌مانده`
                  : `${incompleteCount} بخش ترجمه‌نشده در این کتاب باقی‌مانده`}
              </span>
            </div>
            <button
              type="button"
              onClick={onRetryFailedChunks}
              disabled={isBatchTranslating}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
              title="ادامه خودکار ترجمه بخش‌های باقی‌مانده و ناقص با چرخش بین مدل‌های Gemini تا تکمیل ۱۰۰٪"
            >
              <RotateCw className="w-3 h-3" />
              <span>⚡ ادامه و تکمیل ({incompleteCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Chunk List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {isLoadingChunks ? (
          <div className="py-16 text-center text-xs text-indigo-450 flex flex-col items-center justify-center gap-2 text-indigo-400">
            <RotateCw className="w-5 h-5 animate-spin text-indigo-400" />
            <span>در حال بارگذاری بخش‌های کتاب...</span>
          </div>
        ) : filteredChunks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            بخشی با این مشخصات یافت نشد.
          </div>
        ) : (
          filteredChunks.map(chunk => {
            const isActive = chunk.id === activeChunkId;
            const isCompleted = !!chunk.translatedHtml;
            const isTranslating = chunk.status === 'translating';
            const hasError = chunk.status === 'error';

            return (
              <div
                key={chunk.id}
                onClick={() => onSelectChunk(chunk.id)}
                className={`p-3 rounded-xl cursor-pointer transition border text-right ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-850 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-slate-200">
                    <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[170px]" title={chunk.chapterTitle}>
                      {cleanChapterTitle(chunk.chapterTitle)}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1">
                    {chunk.isExcludedFromBook && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0" title="این بخش از خروجی نهایی کتاب و PDF حذف شده است">
                        <EyeOff className="w-2.5 h-2.5" />
                        <span>حذف از کتاب</span>
                      </span>
                    )}

                    {isTranslating ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                        <RotateCw className="w-2.5 h-2.5 animate-spin" />
                        <span>درحال ترجمه</span>
                      </span>
                    ) : hasError ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>خطا</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>تکمیل شد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        <span>در صف</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle & Words & Images */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span>بخش {chunk.chunkNumber}</span>
                    {chunk.hasImages && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-sans" title={`این بخش دارای ${chunk.imageCount || 1} تصویر کتاب است`}>
                        <ImageIcon className="w-2.5 h-2.5 text-amber-400" />
                        <span>{chunk.imageCount || 1} تصویر</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{chunk.wordCount} کلمه</span>
                    <span>•</span>
                    <span>~{chunk.estimatedTokens} توکن</span>
                  </div>
                </div>

                {/* Quick Translate & Delete Action Buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {onDeleteChunk && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`آیا از حذف صفحه ${chunk.chunkNumber} (${cleanChapterTitle(chunk.chapterTitle)}) اطمینان دارید؟`)) {
                            onDeleteChunk(chunk.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="حذف آنلاین این صفحه"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {onToggleExcludeChunk && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExcludeChunk(chunk.id);
                        }}
                        className={`p-1 rounded transition ${chunk.isExcludedFromBook ? 'text-rose-400 bg-rose-500/20 hover:bg-rose-500/30' : 'text-slate-500 hover:text-amber-300 hover:bg-slate-800'}`}
                        title={chunk.isExcludedFromBook ? 'این صفحه از کتاب و PDF حذف شده است (کلیک برای بازگرداندن)' : 'حذف این صفحه از خروجی کتاب و PDF'}
                      >
                        {chunk.isExcludedFromBook ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                    {onOpenAddPageModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddPageModal(chunk.id, 'after');
                        }}
                        className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                        title="افزودن صفحه جدید بعد از این بخش"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                      {chunk.englishText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 35)}...
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTranslateChunk(chunk.id);
                    }}
                    disabled={isTranslating || isBatchTranslating}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                      isCompleted
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isTranslating ? (
                      <RotateCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Play className="w-2.5 h-2.5 fill-current" />
                    )}
                    <span>{isCompleted ? 'ترجمه مجدد' : 'ترجمه'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </aside>
  );
};
