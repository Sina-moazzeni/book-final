import React, { useState } from 'react';
import {
  Book,
  Sparkles,
  BookMarked,
  CheckCircle,
  Clock,
  Settings,
  Languages,
  PenLine,
  Calculator,
  ShieldCheck,
  Palette,
  Replace,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BookProject, ToneId } from '../types.ts';
import { TONE_DEFINITIONS } from '../constants/tones.ts';

interface ProjectHeaderProps {
  project: BookProject;
  onUpdateProject: (updates: Partial<BookProject>) => void;
  onOpenGlossaryModal: () => void;
  onOpenTokenModal: () => void;
  onOpenExportModal?: () => void;
  onOpenFindReplaceModal?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onUpdateProject,
  onOpenGlossaryModal,
  onOpenTokenModal,
  onOpenExportModal,
  onOpenFindReplaceModal,
}) => {
  const [showDetailsMobile, setShowDetailsMobile] = useState(false);
  const currentTone = TONE_DEFINITIONS.find(t => t.id === project?.tone) || TONE_DEFINITIONS[0];

  const chunks = project?.chunks || [];
  const glossary = project?.glossary || [];

  const totalWords = chunks.reduce((acc, c) => acc + (c.wordCount || 0), 0);
  const completedChunks = chunks.filter(c => c.translatedHtml && c.translatedHtml.trim().length > 0);
  const completedWords = completedChunks.reduce((acc, c) => acc + (c.wordCount || 0), 0);
  const progressPercent = totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0;

  return (
    <div className="no-print bg-slate-850/95 border-b border-slate-700/80 px-3 sm:px-6 lg:px-8 py-3 backdrop-blur-md shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Book Title & Core Info */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
              کتاب در حال ویرایش
            </span>
            <input
              type="text"
              value={project.title}
              onChange={e => onUpdateProject({ title: e.target.value })}
              className="font-bold text-base sm:text-lg lg:text-xl text-white bg-slate-800/60 hover:bg-slate-700/60 focus:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700 focus:border-indigo-500 transition outline-none w-full sm:w-auto flex-1 max-w-xl"
              placeholder="عنوان فارسی کتاب را وارد کنید..."
              title="ویرایش عنوان کتاب"
            />
            {/* Mobile accordion toggle for metadata */}
            <button
              onClick={() => setShowDetailsMobile(!showDetailsMobile)}
              className="sm:hidden px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition"
              title="نمایش یا بستن مشخصات کتاب"
            >
              <span>مشخصات</span>
              {showDetailsMobile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Book Metadata Fields (Responsive Grid on Mobile / Flex on Desktop) */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 pt-0.5 ${showDetailsMobile ? 'block' : 'hidden sm:grid'}`}>
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] shrink-0">نام لاتین:</span>
              <input
                type="text"
                value={project.originalTitle}
                onChange={e => onUpdateProject({ originalTitle: e.target.value })}
                className="text-slate-200 bg-transparent px-1 py-0.5 rounded border-0 outline-none w-full truncate font-sans text-left"
                dir="ltr"
                placeholder="Original Title"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] shrink-0">نویسنده:</span>
              <input
                type="text"
                value={project.author}
                onChange={e => onUpdateProject({ author: e.target.value })}
                className="text-slate-200 bg-transparent px-1 py-0.5 rounded border-0 outline-none w-full truncate"
                placeholder="نام نویسنده"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] shrink-0">مترجم:</span>
              <input
                type="text"
                value={project.translator}
                onChange={e => onUpdateProject({ translator: e.target.value })}
                className="text-slate-200 bg-transparent px-1 py-0.5 rounded border-0 outline-none w-full truncate"
                placeholder="مترجم یا ویراستار"
              />
            </div>
          </div>
        </div>

        {/* Action Controls & Tones: Fully Visible and Responsive on Mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 lg:pt-0">

          {/* Tone Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700/90 shadow-sm shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] text-slate-400 shrink-0">لحن:</span>
            <select
              value={project.tone}
              onChange={e => onUpdateProject({ tone: e.target.value as ToneId })}
              className="bg-slate-800 text-xs text-white px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
            >
              {TONE_DEFINITIONS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Glossary Manager Trigger */}
          <button
            onClick={onOpenGlossaryModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-indigo-500/60 transition group shadow-sm shrink-0"
            title="مدیریت واژه‌نامه تخصصی و اصطلاحات اختصاصی کتاب"
          >
            <BookMarked className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition shrink-0" />
            <span>واژه‌نامه</span>
            <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {glossary.length}
            </span>
          </button>

          {/* Global Find & Replace in Book Trigger */}
          {onOpenFindReplaceModal && (
            <button
              onClick={onOpenFindReplaceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/60 transition group shadow-sm shrink-0"
              title="جستجو و جایگزینی سراسری کلمات یا اسامی شخصیت‌ها در کل کتاب"
            >
              <Replace className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
              <span>جایگزینی در کل کتاب</span>
            </button>
          )}

          {/* Book Design & Export Studio Trigger */}
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition shadow-sm shrink-0"
              title="تنظیم هدر، فوتر، تم چاپی و خروجی Word و PDF"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>دیزاین و چاپ PDF</span>
            </button>
          )}
        </div>

      </div>

      {/* Progress & Policy Summary Bar */}
      <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400">
        
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">پیشرفت:</span>
            <strong className="text-white font-mono">{completedChunks.length}</strong>
            <span className="text-slate-500">از</span>
            <strong className="text-white font-mono">{chunks.length} بخش</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-400">کلمات:</span>
            <strong className="text-white font-mono">{completedWords.toLocaleString('en-US')}</strong>
            <span className="text-slate-500">از</span>
            <strong className="text-white font-mono">{totalWords.toLocaleString('en-US')}</strong>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-emerald-400/90 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>بدون خلاصه‌سازی • بدون سانسور متن کتاب</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto sm:min-w-[200px]">
          <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400 min-w-[2.5rem] text-left">
            {progressPercent}٪
          </span>
        </div>

      </div>
    </div>
  );
};
