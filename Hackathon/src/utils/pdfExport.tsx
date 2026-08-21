import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import 'katex/dist/katex.min.css';

export interface PdfExportOptions {
  title: string;
  content: string;
  subjectCode?: string | null;
  subjectName?: string | null;
  tags?: string[];
  updatedAt?: string;
}

function preprocessMathForPdf(md: string): string {
  if (!md) return '';

  let processed = md;

  // 1. Convert long/complex inline math $...$ to display math $$...$$
  processed = processed.replace(/(?<!\$)\$([^\$]+)\$(?!\$)/g, (match, mathContent) => {
    const trimmed = mathContent.trim();
    const isComplex = /\\frac|\\sqrt|\\begin|\\matrix|\\cases|\\int|\\sum|\\prod|\\text|\\over/i.test(trimmed);
    const hasArrows = /\\Rightarrow|\\rightarrow|\\Leftarrow|\\leftarrow|\\iff|\\implies|\\to|\\gets/i.test(trimmed);
    const isLong = trimmed.length > 15;

    if (isComplex || hasArrows || isLong) {
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    }
    return match;
  });

  // 2. Convert long/complex inline math \(...\) to display math \[...\]
  processed = processed.replace(/\\\((.*?)\\\)/g, (match, mathContent) => {
    const trimmed = mathContent.trim();
    const isComplex = /\\frac|\\sqrt|\\begin|\\matrix|\\cases|\\int|\\sum|\\prod|\\text|\\over/i.test(trimmed);
    const hasArrows = /\\Rightarrow|\\rightarrow|\\Leftarrow|\\leftarrow|\\iff|\\implies|\\to|\\gets/i.test(trimmed);
    const isLong = trimmed.length > 15;

    if (isComplex || hasArrows || isLong) {
      return `\n\n\\[\n${trimmed}\n\\]\n\n`;
    }
    return match;
  });

  return processed;
}

interface PrintableStudyNoteProps {
  title: string;
  content: string;
  subjectCode?: string | null;
  subjectName?: string | null;
  tags?: string[];
  dateStr: string;
}

const PrintableStudyNote: React.FC<PrintableStudyNoteProps> = ({
  title,
  content,
  subjectCode,
  subjectName,
  tags = [],
  dateStr,
}) => {
  const preprocessedContent = React.useMemo(() => preprocessMathForPdf(content), [content]);
  return (
    <div
      style={{
        width: '760px',
        padding: '0',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        lineHeight: 1.6,
        boxSizing: 'border-box',
        fontSize: '10.5pt',
      }}
    >
      <style>{`
        /* KaTeX style overrides for proper layout in html2pdf */
        .katex-display {
          display: block !important;
          margin: 1.5em 0 !important;
          padding: 12px 0 !important;
          text-align: center !important;
          line-height: normal !important;
          overflow-x: auto !important;
          overflow-y: visible !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .katex-display > .katex {
          font-size: 1.15em !important;
          max-width: 100% !important;
          display: inline-block !important;
          overflow-x: auto !important;
          overflow-y: visible !important;
        }
        .katex-mathml {
          display: none !important;
        }
        .katex {
          font-size: 1em !important; /* Keep inline equations at normal size to prevent line squeezing */
          line-height: normal !important;
          text-indent: 0 !important;
          white-space: nowrap !important;
          display: inline-block !important;
        }
        .katex-html {
          display: inline-block !important;
          position: relative !important;
        }
        .katex .vlist-t {
          vertical-align: middle !important;
        }
        /* Page break controls */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          break-after: avoid-page !important;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        pre, blockquote, table {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        p, li, span, code, pre, a, blockquote {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
      `}</style>

      {/* Header Banner */}
      <div
        style={{
          borderBottom: '2.5px solid #2563eb',
          paddingBottom: '14px',
          marginBottom: '20px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#2563eb',
            }}
          >
            StudyFlow AI • Academic Study Note
          </span>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
            {dateStr}
          </span>
        </div>

        <h1
          style={{
            fontSize: '22pt',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 10px 0',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {subjectCode && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '3px 8px',
                borderRadius: '5px',
                border: '1px solid #bfdbfe',
              }}
            >
              {subjectCode}
              {subjectName ? ` • ${subjectName}` : ''}
            </span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '10px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontWeight: 500,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Markdown Body Content */}
      <div style={{ color: '#1e293b' }}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h1
                style={{
                  fontSize: '18pt',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: '22pt',
                  marginBottom: '10pt',
                  paddingBottom: '4pt',
                  borderBottom: '1.5px solid #e2e8f0',
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid-page',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2
                style={{
                  fontSize: '14pt',
                  fontWeight: 700,
                  color: '#1e3a8a',
                  marginTop: '18pt',
                  marginBottom: '8pt',
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid-page',
                }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                style={{
                  fontSize: '12pt',
                  fontWeight: 700,
                  color: '#334155',
                  marginTop: '14pt',
                  marginBottom: '6pt',
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid-page',
                }}
              >
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4
                style={{
                  fontSize: '11pt',
                  fontWeight: 700,
                  color: '#475569',
                  marginTop: '12pt',
                  marginBottom: '4pt',
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid-page',
                }}
              >
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p
                style={{
                  margin: '10pt 0',
                  lineHeight: 1.6,
                  color: '#334155',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  height: 'auto',
                  overflow: 'visible',
                }}
              >
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul
                style={{
                  margin: '8pt 0',
                  paddingLeft: '20pt',
                  listStyleType: 'disc',
                  color: '#334155',
                }}
              >
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol
                style={{
                  margin: '8pt 0',
                  paddingLeft: '20pt',
                  listStyleType: 'decimal',
                  color: '#334155',
                }}
              >
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li
                style={{
                  margin: '6pt 0',
                  lineHeight: 1.55,
                  color: '#334155',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  height: 'auto',
                  overflow: 'visible',
                }}
              >
                {children}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  borderLeft: '3.5px solid #2563eb',
                  backgroundColor: '#f8fafc',
                  padding: '10pt 14pt',
                  margin: '12pt 0',
                  borderRadius: '0 6px 6px 0',
                  color: '#1e3a8a',
                  fontStyle: 'normal',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  fontSize: '10pt',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {children}
              </blockquote>
            ),
            hr: () => (
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid #e2e8f0',
                  margin: '18pt 0',
                }}
              />
            ),
            strong: ({ children }) => (
              <strong style={{ fontWeight: 700, color: '#0f172a' }}>{children}</strong>
            ),
            em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#1e293b' }}>{children}</em>,
            code: ({ inline, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');

              if (inline) {
                return (
                  <code
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#0f172a',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                      fontSize: '9pt',
                      border: '1px solid #e2e8f0',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    margin: '12pt 0',
                    padding: '10pt 14pt',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                    fontSize: '9pt',
                    lineHeight: 1.4,
                    color: '#0f172a',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {match && (
                    <div
                      style={{
                        paddingBottom: '6px',
                        marginBottom: '8px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '8pt',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#64748b',
                        letterSpacing: '0.05em',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {match[1]}
                    </div>
                  )}
                  <pre
                    style={{
                      margin: 0,
                      padding: 0,
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      color: 'inherit',
                      whiteSpace: 'inherit',
                      wordBreak: 'inherit',
                      overflowWrap: 'inherit',
                      backgroundColor: 'transparent',
                    }}
                  >
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            },
            table: ({ children }) => (
              <div
                style={{
                  margin: '14pt 0',
                  overflow: 'hidden',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '9.5pt',
                    textAlign: 'left',
                  }}
                >
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead
                style={{
                  backgroundColor: '#f1f5f9',
                  borderBottom: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                }}
              >
                {children}
              </thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>{children}</tr>
            ),
            th: ({ children }) => (
              <th style={{ padding: '8pt 10pt', fontWeight: 700, color: '#0f172a' }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{ padding: '7px 10pt', color: '#334155' }}>{children}</td>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                style={{
                  color: '#2563eb',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                {children}
              </a>
            ),
          }}
        >
          {preprocessedContent}
        </ReactMarkdown>
      </div>

      {/* Footer Attribution */}
      <div
        style={{
          marginTop: '28px',
          paddingTop: '10px',
          borderTop: '1px solid #e2e8f0',
          fontSize: '9px',
          color: '#94a3b8',
          display: 'flex',
          justifyContent: 'space-between',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <span>Generated by StudyFlow AI</span>
        <span>MAKAUT B.Tech CSE Curriculum Grounded</span>
      </div>
    </div>
  );
};

export async function exportNoteToPdf(options: PdfExportOptions): Promise<void> {
  const { title, content, subjectCode, subjectName, tags = [], updatedAt } = options;

  if (!content || !content.trim()) {
    throw new Error('No note content to export.');
  }

  const cleanTitle = (title && title.trim()) || 'Untitled Note';
  const rawFilename = (title && title.trim())
    ? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
    : 'StudyFlow-AI-Notes.pdf';
  const filename = rawFilename.replace(/^-+|-+$/g, '') || 'StudyFlow-AI-Notes.pdf';

  const dateStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  console.log('[pdfExport] Render starting for:', {
    title: cleanTitle,
    length: content.length,
    snippet: content.substring(0, 100),
  });

  // Create temporary container attached to DOM
  const parent = document.createElement('div');
  parent.style.position = 'fixed';
  parent.style.left = '-9999px';
  parent.style.top = '-9999px';
  parent.style.width = '760px';
  parent.style.height = 'auto';
  parent.style.visibility = 'visible';
  parent.style.overflow = 'visible';
  document.body.appendChild(parent);

  const container = document.createElement('div');
  container.style.width = '760px';
  container.style.backgroundColor = '#ffffff';
  parent.appendChild(container);

  const root = createRoot(container);
  root.render(
    <PrintableStudyNote
      title={cleanTitle}
      content={content}
      subjectCode={subjectCode}
      subjectName={subjectName}
      tags={tags}
      dateStr={dateStr}
    />
  );

  // Wait for React to finish rendering DOM tree and fonts to load
  await new Promise((resolve) => setTimeout(resolve, 350));
  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
  } catch (fontErr) {
    console.warn('[pdfExport] Failed to wait for fonts:', fontErr);
  }

  // Capture and replace KaTeX equations with high-resolution atomic images
  // 1. Target all display math containers
  const displayMathElements = Array.from(container.querySelectorAll('.katex-display'));
  for (const displayEl of displayMathElements) {
    try {
      const rect = displayEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const canvas = await html2canvas(displayEl as HTMLElement, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = `${rect.width}px`;
      img.style.height = `${rect.height}px`;
      img.style.display = 'block';
      img.style.margin = '12px auto';
      img.style.pageBreakInside = 'avoid';
      img.style.breakInside = 'avoid';

      displayEl.parentNode?.replaceChild(img, displayEl);
    } catch (err) {
      console.error('[pdfExport] Error capturing display math element:', err);
    }
  }

  // 2. Target all inline math elements (.katex but NOT inside a .katex-display)
  const allKatexElements = Array.from(container.querySelectorAll('.katex'));
  const inlineMathElements = allKatexElements.filter((el) => !el.closest('.katex-display'));

  for (const inlineEl of inlineMathElements) {
    try {
      const rect = inlineEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const canvas = await html2canvas(inlineEl as HTMLElement, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = `${rect.width}px`;
      img.style.height = `${rect.height}px`;

      // Section 9: Safe conversion of long/wide inline formulas to display blocks
      const isTooWide = rect.width > 250;
      if (isTooWide) {
        img.style.display = 'block';
        img.style.margin = '12px auto';
      } else {
        img.style.display = 'inline-block';
        img.style.verticalAlign = 'middle';
        img.style.margin = '0 2px';
      }
      img.style.pageBreakInside = 'avoid';
      img.style.breakInside = 'avoid';

      inlineEl.parentNode?.replaceChild(img, inlineEl);
    } catch (err) {
      console.error('[pdfExport] Error capturing inline math element:', err);
    }
  }

  try {
    const opt = {
      margin: [15, 15, 18, 15] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: true,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait' as const,
        compress: true,
      },
      pagebreak: {
        mode: ['css', 'legacy'],
      },
    };

    const worker = (html2pdf as any)()
      .set(opt)
      .from(container)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);

          // Running Header (pages > 1)
          if (i > 1) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184); // #94a3b8
            pdf.text('StudyFlow AI', 15, 9.5);
            pdf.text(
              cleanTitle.length > 40 ? cleanTitle.substring(0, 37) + '...' : cleanTitle,
              210 - 15,
              9.5,
              { align: 'right' }
            );
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.2);
            pdf.line(15, 11.5, 210 - 15, 11.5);
          }

          // Running Footer (all pages)
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.2);
          pdf.line(15, 285, 210 - 15, 285);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(148, 163, 184);
          pdf.text('StudyFlow AI', 15, 290);
          pdf.text(`Page ${i} of ${totalPages}`, 210 - 15, 290, { align: 'right' });
        }
      })
      .save();

    await worker;
    console.log('[pdfExport] PDF saved successfully:', filename);
  } catch (err) {
    console.error('[pdfExport] error during PDF generation:', err);
    throw err;
  } finally {
    root.unmount();
    if (document.body.contains(parent)) {
      document.body.removeChild(parent);
    }
  }
}
