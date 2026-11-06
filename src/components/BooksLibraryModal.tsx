import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Library,
  PlusCircle,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Sparkles,
  FileText,
  Printer
} from 'lucide-react';
import { BookProject } from '../types.ts';
import { downloadDocx } from '../utils/exporter.ts';

interface BooksLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookProject[];
  activeBookId: string;
  onSelectBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onOpenNewBookModal: () => void;
  onExportPdf?: (book: BookProject) => void;
}

export const BooksLibraryModal: React.FC<BooksLibraryModalProps> = ({
  isOpen,
  onClose,
  books,
  activeBookId,
  onSelectBook,
  onDeleteBook,
  onOpenNewBookModal,
  onExportPdf,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredBooks = books.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.originalTitle.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Library className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">قفسه و کتابخانه کتاب‌های شما (Book Shelf)</h2>
              <p className="text-xs text-slate-400">
                تمام کتاب‌های آپلود شده و وضعیت ترجمه آن‌ها ذخیره شده و همیشه در دسترس هستند.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewBookModal();
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>افزودن کتاب جدید</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو در عنوان کتاب یا نویسنده..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">
            مجموع کتاب‌ها: <strong className="text-white font-mono">{books.length}</strong> کتاب
          </span>
        </div>

        {/* Books Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {filteredBooks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              کتابی در قفسه یافت نشد. می‌توانید با دکمه بالا یک کتاب جدید اضافه کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBooks.map(book => {
                const isActive = book.id === activeBookId;
                const totalWords = book.wordCount || (book.chunks ? book.chunks.reduce((acc, c) => acc + (c.wordCount || 0), 0) : 0);
                const totalChunks = (book as any).totalChunks !== undefined ? (book as any).totalChunks : (book.chunks?.length || 0);
                const completedChunks = (book as any).completedChunks !== undefined ? (book as any).completedChunks : (book.chunks ? book.chunks.filter(c => c.translatedHtml || c.status === 'completed').length : 0);
                const progress = (book as any).progressPercent !== undefined ? (book as any).progressPercent : (totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0);

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      onSelectBook(book.id);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition text-right flex flex-col justify-between ${
                      isActive
                        ? 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/40 shadow-lg'
                        : 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {book.tone}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ کتاب در حال ویرایش
                          </span>
                        )}
                      </div>

                      {/* Title & Author */}
                      <h3 className="font-bold text-sm text-white mb-0.5 line-clamp-1">{book.title}</h3>
                      <div className="text-xs text-slate-400 font-serif line-clamp-1" dir="ltr">
                        {book.originalTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        نویسنده: <span className="text-slate-300">{book.author || 'نامشخص'}</span>
                      </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="mt-4 pt-3 border-t border-slate-750 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{completedChunks} از {totalChunks} بخش ترجمه شده</span>
                        <span className="font-mono text-emerald-400 font-bold">{progress}٪</span>
                      </div>
                      
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {totalWords.toLocaleString('en-US')} کلمه
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDocx(book);
                            }}
                            disabled={completedChunks === 0}
                            className="p-1 rounded text-slate-400 hover:text-blue-400 transition disabled:opacity-30"
                            title="دانلود فایل Word این کتاب"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {onExportPdf && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportPdf(book);
                                onClose();
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                              title="دیزاین و چاپ PDF این کتاب"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {books.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`آیا مطمئن هستید که می‌خواهید کتاب «${book.title}» حذف شود؟`)) {
                                  onDeleteBook(book.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-red-400 transition"
                              title="حذف کتاب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
