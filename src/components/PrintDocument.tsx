import React, { useEffect } from 'react';
import { BookProject } from '../types.ts';
import { BOOK_THEMES, DEFAULT_DESIGN_CONFIG } from '../constants/themes.ts';
import { groupChunksIntoChapters } from '../utils/exporter.ts';

interface PrintDocumentProps {
  project: BookProject;
}

export const PrintDocument: React.FC<PrintDocumentProps> = ({ project }) => {
  if (!project || !Array.isArray(project.chunks) || project.chunks.length === 0) {
    return null;
  }

  const design = project.designConfig || DEFAULT_DESIGN_CONFIG;
  const defaultThemeFallback = BOOK_THEMES.spiritual || {
    id: 'spiritual',
    name: 'معنوی و عرفانی',
    enName: 'Persian Illumination & Gold',
    category: 'معنوی و عرفانی',
    description: '',
    previewBg: 'bg-[#fbf6ea]',
    bgClass: 'bg-[#fbf6ea] text-[#241c14]',
    pageBgColor: '#fbf6ea',
    textColor: '#241c14',
    headingColor: '#1e3a8a',
    accentColor: '#b45309',
    borderColor: '#d4af37',
    dividerSymbol: '❦ ✤ ❦',
    borderStyle: 'border-2 border-double border-[#d4af37]',
    tagline: '',
  };

  const theme = (design?.themeId && BOOK_THEMES[design.themeId]) || defaultThemeFallback;
  const customColors = design.customColors || {};

  const pageBgColor = customColors.pageBgColor || theme?.pageBgColor || '#ffffff';
  const textColor = customColors.textColor || theme?.textColor || '#1e293b';
  const heading1Color = customColors.heading1Color || theme?.headingColor || '#1a365d';
  const heading2Color = customColors.heading2Color || theme?.accentColor || '#2b6cb0';
  const heading3Color = customColors.heading3Color || '#2c5282';
  const headerColor = customColors.headerColor || theme?.headingColor || '#718096';
  const footerColor = customColors.footerColor || textColor || '#718096';
  const borderColor = customColors.borderColor || theme?.borderColor || '#e2e8f0';
  const accentColor = customColors.accentColor || theme?.accentColor || '#b45309';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--print-page-bg', pageBgColor);
      document.body.style.setProperty('--print-page-bg', pageBgColor);
      return () => {
        document.documentElement.style.removeProperty('--print-page-bg');
        document.body.style.removeProperty('--print-page-bg');
      };
    }
  }, [pageBgColor]);

  const fontSizeClass =
    design.fontSize === 'small'
      ? 'text-[11pt]'
      : design.fontSize === 'large'
      ? 'text-[14pt]'
      : 'text-[12pt]';

  const lineSpacingStyle =
    design.lineSpacing === 'compact'
      ? '1.65'
      : design.lineSpacing === 'relaxed'
      ? '2.25'
      : '1.95';

  const fontFamily = design.fontFamily || 'Vazirmatn Medium';

  const showRunningHeader = design.showHeader && Boolean(design.headerText?.trim());
  const showRunningFooter = design.showFooter && (Boolean(design.footerText?.trim()) || design.showPageNumbers);

  // Top spacing calculations:
  // When running header is enabled: breathing room between header rule and chapter text
  // When running header is OFF: dedicated publishing top margin on every printed page (prevents text touching paper edge!)
  const headerGap =
    design.topMargin === 'compact'
      ? '8mm'
      : design.topMargin === 'generous'
      ? '16mm'
      : design.topMargin === 'extra_generous'
      ? '22mm'
      : '12mm';

  const noHeaderTopSpacer =
    design.topMargin === 'compact'
      ? '16mm'
      : design.topMargin === 'generous'
      ? '30mm'
      : design.topMargin === 'extra_generous'
      ? '40mm'
      : '22mm';

  // Dedicated physical margins in millimeters for book publishing.
  // Persian RTL books require a safe right margin (outer/binding margin) of at least 20-22mm
  // to ensure characters never clip off the page edge on any printer or PDF renderer.
  const horizontalMarginMm =
    design.pageMargin === 'compact'
      ? 16 // 16mm safe compact margin
      : design.pageMargin === 'generous'
      ? 28 // 28mm generous luxury margin
      : 22; // 22mm standard book publishing margin (default)

  const horizontalPaddingStyle = `${horizontalMarginMm}mm`;

  const paragraphSpacingClass = `p-spacing-${design.paragraphSpacing || 'normal'}`;

  const isJustified = design.textAlignment === 'both';
  const textAlignClass = isJustified ? 'text-justify book-align-both' : 'text-right book-align-right';

  return (
    <div
      className="print-only hidden min-h-screen text-right relative"
      style={{
        backgroundColor: pageBgColor,
        color: textColor,
        fontFamily: `'${fontFamily}', 'Vazirmatn', 'B Nazanin', 'Tahoma', sans-serif`,
        direction: 'rtl',
        ['--theme-h1-color' as any]: heading1Color,
        ['--theme-h2-color' as any]: heading2Color,
        ['--theme-h3-color' as any]: heading3Color,
        ['--theme-h1-size' as any]: `${design.heading1Size || 22}pt`,
        ['--theme-h2-size' as any]: `${design.heading2Size || 16.5}pt`,
        ['--theme-h3-size' as any]: `${design.heading3Size || 13.5}pt`,
        ['--theme-text-color' as any]: textColor,
      }}
    >
      {/* Optional Watermark Text across printed pages */}
      {design.watermarkText?.trim() && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden opacity-[0.06]">
          <div
            className="transform -rotate-45 text-5xl sm:text-7xl font-bold tracking-widest whitespace-nowrap"
            style={{ color: theme.headingColor }}
          >
            {design.watermarkText}
          </div>
        </div>
      )}

      {/* Subtle Spiritual / Arabesque Motif Background for Print */}
      {design.backgroundPattern === 'arabesque' && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0 flex items-center justify-center">
          <svg width="600" height="600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="50" cy="50" r="45" />
            <circle cx="50" cy="50" r="35" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="25" />
            <polygon points="50,5 63,38 95,50 63,62 50,95 37,62 5,50 37,38" />
            <polygon points="50,15 60,40 85,50 60,60 50,85 40,60 15,50 40,40" strokeDasharray="1 1" />
          </svg>
        </div>
      )}

      {design.backgroundPattern === 'geometry' && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0 flex items-center justify-center">
          <svg width="600" height="600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.4">
            <rect x="15" y="15" width="70" height="70" transform="rotate(45 50 50)" />
            <rect x="15" y="15" width="70" height="70" />
            <circle cx="50" cy="50" r="35" />
            <circle cx="50" cy="50" r="20" strokeDasharray="1 1" />
          </svg>
        </div>
      )}

      {/* Running Header & Footer are managed via CSS print table structure so they repeat gracefully and never overlap content */}
      <table className="w-full border-collapse print-doc-table">
        <thead className="print-table-header">
          {showRunningHeader ? (
            <tr>
              <th className="font-normal text-right p-0 border-0">
                <div
                  className="h-12 flex items-center justify-between text-[9pt] border-b"
                  style={{
                    paddingLeft: horizontalPaddingStyle,
                    paddingRight: horizontalPaddingStyle,
                    backgroundColor: pageBgColor,
                    color: headerColor,
                    borderColor,
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{design.headerText || project.title}</span>
                    {design.websiteUrl && (
                      <span className="opacity-70 text-[8pt] font-mono" dir="ltr">
                        • {design.websiteUrl}
                      </span>
                    )}
                  </div>
                  <span className="text-[8.5pt] opacity-75 font-medium">
                    {project.title}
                  </span>
                </div>
                {/* Generous breathing space between running header and book text */}
                <div style={{ height: headerGap }} />
              </th>
            </tr>
          ) : (
            /* When no running header is active, enforce standard publishing top margin on EVERY printed page! */
            <tr>
              <th className="font-normal text-right p-0 border-0">
                <div style={{ height: noHeaderTopSpacer }} />
              </th>
            </tr>
          )}
        </thead>

        <tfoot className="print-table-footer">
          {showRunningFooter ? (
            <tr>
              <td className="p-0 border-0">
                {/* Breathing space between book text and footer */}
                <div style={{ height: '8mm' }} />
                <div
                  className="h-12 flex items-center justify-between text-[9pt] border-t"
                  style={{
                    paddingLeft: horizontalPaddingStyle,
                    paddingRight: horizontalPaddingStyle,
                    backgroundColor: pageBgColor,
                    color: footerColor,
                    borderColor,
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{design.footerText || 'سامانه هوشمند ترجمه و چاپ کتاب'}</span>
                    {design.brandName && (
                      <span className="opacity-70 font-semibold">• {design.brandName}</span>
                    )}
                  </div>
                  {design.showPageNumbers && (
                    <span className="font-bold font-mono text-[8.5pt]">
                      صفحه چاپی
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            /* Bottom breathing margin on every printed page */
            <tr>
              <td className="p-0 border-0">
                <div style={{ height: '16mm' }} />
              </td>
            </tr>
          )}
        </tfoot>

        <tbody className="print-table-body">
          <tr>
            <td className="p-0 border-0 align-top">
              <div
                className="book-page-content-wrapper"
                style={{
                  paddingLeft: horizontalPaddingStyle,
                  paddingRight: horizontalPaddingStyle,
                  paddingTop: '4mm',
                  paddingBottom: '8mm',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  direction: 'rtl',
                }}
              >
              {/* Cover Page / Title Page (Fully customizable by user) */}
              {design.showCoverPage && (() => {
                const cover = design.coverPage || {};
                const coverLayout = cover.layout || 'center';
                const isRightAlign = coverLayout === 'right';
                const isFramed = coverLayout === 'frame';

                const coverTitle = cover.title || project.title || project.originalTitle || 'کتاب بدون عنوان';
                const coverSubtitle = cover.subtitle !== undefined ? cover.subtitle : project.originalTitle;
                const coverAuthor = cover.author !== undefined ? cover.author : project.author;
                const coverTranslator = cover.translator !== undefined ? cover.translator : project.translator;
                const coverPublisher = cover.publisher !== undefined ? cover.publisher : design.brandName;
                const coverNote = cover.note || cover.editionYear;

                const titleSizePt = cover.titleSize || 32;
                const subtitleSizePt = cover.subtitleSize || 16;
                const authorSizePt = cover.authorSize || 13;

                const titleColor = cover.titleColor || heading1Color || theme.headingColor;
                const subtitleColor = cover.subtitleColor || theme.accentColor || '#b45309';
                const authorColor = cover.authorColor || textColor;
                const showMotif = cover.showMotif ?? true;
                const showDivider = cover.showDivider ?? true;

                return (
                  <div
                    className={`book-chapter-break min-h-[85vh] flex flex-col py-16 my-auto ${
                      isRightAlign ? 'items-start text-right' : 'items-center justify-center text-center'
                    } ${isFramed ? 'p-10 border-4 border-double rounded-3xl m-4' : ''}`}
                    style={{
                      backgroundColor: cover.bgColor || undefined,
                      borderColor: cover.borderColor || borderColor,
                    }}
                  >
                    {/* Top Ornamental Frame / Motif */}
                    {showMotif && (
                      <div
                        className="text-3xl font-serif mb-6 opacity-85 select-none"
                        style={{ color: accentColor }}
                      >
                        {theme.dividerSymbol || '❦ ✤ ❦'}
                      </div>
                    )}

                    {/* Book Main Title */}
                    <h1
                      className="font-extrabold mb-3 tracking-tight leading-snug max-w-3xl"
                      style={{
                        fontSize: `${titleSizePt}pt`,
                        color: titleColor,
                        textAlign: isRightAlign ? 'right' : 'center',
                      }}
                    >
                      {coverTitle}
                    </h1>

                    {/* Book Subtitle / Original Title */}
                    {coverSubtitle && (
                      <h2
                        className="font-normal opacity-80 mb-5 font-serif"
                        dir="auto"
                        style={{
                          fontSize: `${subtitleSizePt}pt`,
                          color: subtitleColor,
                          textAlign: isRightAlign ? 'right' : 'center',
                        }}
                      >
                        {coverSubtitle}
                      </h2>
                    )}

                    {/* Decorative Divider */}
                    {showDivider && (
                      <div
                        className={`h-1.5 rounded-full my-6 opacity-80 ${isRightAlign ? 'w-48 ml-auto mr-0' : 'w-36 mx-auto'}`}
                        style={{ backgroundColor: accentColor }}
                      />
                    )}

                    {/* Metadata: Author, Translator, Publisher, Edition */}
                    <div
                      className="space-y-3 font-medium opacity-90 my-8 leading-relaxed"
                      style={{
                        fontSize: `${authorSizePt}pt`,
                        color: authorColor,
                        textAlign: isRightAlign ? 'right' : 'center',
                      }}
                    >
                      {coverAuthor && (
                        <p>
                          نویسنده: <strong style={{ color: titleColor }}>{coverAuthor}</strong>
                        </p>
                      )}
                      {coverTranslator && (
                        <p>
                          ترجمه و ویرایش: <strong>{coverTranslator}</strong>
                        </p>
                      )}
                      {coverPublisher && (
                        <p className="opacity-85 pt-1">
                          انتشارات / ناشر: <strong>{coverPublisher}</strong>
                        </p>
                      )}
                      {design.websiteUrl && (
                        <p className="opacity-80 font-mono tracking-wider pt-0.5 text-[10pt]" dir="ltr">
                          {design.websiteUrl}
                        </p>
                      )}
                      {coverNote && (
                        <p className="text-[10pt] opacity-75 pt-2 border-t border-slate-300/40 max-w-md mx-auto">
                          {coverNote}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

        {/* Chapters Content */}
        <div className="space-y-12">
          {groupChunksIntoChapters(project.chunks, design.excludedChunkIds).map((chapter, idx, allChapters) => (
            <div
              key={chapter.chapterKey}
              className={`book-chapter-break ${design.continuousFlow === false ? 'force-page-break' : ''} pt-6 ${
                design.borderStyle === 'ornate_spiritual'
                  ? 'p-6 rounded-2xl border-2 border-double my-6'
                  : design.borderStyle === 'double_classic'
                  ? 'p-6 rounded-xl border-4 border-double my-6'
                  : design.borderStyle === 'thin_modern'
                  ? 'p-6 rounded-xl border my-6'
                  : ''
              }`}
              style={{
                lineHeight: lineSpacingStyle,
                borderColor,
              }}
            >
              {/* Continuous Chapter Body with Preserved Colors, Subheadings & Spaced Paragraphs */}
              <div
                className={`book-render-content ${fontSizeClass} ${paragraphSpacingClass} ${textAlignClass}`}
                style={{
                  lineHeight: lineSpacingStyle,
                  textAlign: isJustified ? 'justify' : 'right',
                }}
                dangerouslySetInnerHTML={{ __html: chapter.htmlContent }}
              />

              {/* Section Separator */}
              {idx < allChapters.length - 1 && (
                <div
                  className="text-center my-10 text-sm opacity-60"
                  style={{ color: accentColor }}
                >
                  {theme.dividerSymbol}
                </div>
              )}
            </div>
          ))}
        </div>
              </div>
            </td>
          </tr>
        </tbody>
</table>
    </div>
  );
};
