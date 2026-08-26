import React, { useEffect } from 'react';

interface PdfViewerModalProps {
  isOpen: boolean;
  fileName: string;
  pdfUrl: string | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  fileName,
  pdfUrl,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-5 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Viewer for ${fileName}`}
    >
      <div
        className="glass-panel p-4 md:p-5 rounded-2xl border border-white/15 bg-surface-container-high/95 max-w-5xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl relative text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <span className="material-symbols-outlined text-primary text-2xl shrink-0">
              picture_as_pdf
            </span>
            <div className="flex flex-col truncate">
              <h3 className="text-base font-bold text-on-surface truncate">{fileName}</h3>
              <span className="text-[11px] font-mono text-on-surface-variant">PDF Document Viewer</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={fileName}
              className="px-3 py-1.5 rounded-lg bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span className="hidden sm:inline">Open External</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF viewer"
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* PDF Frame Viewer */}
        <div className="mt-3 flex-1 overflow-hidden flex flex-col min-h-[60vh]">
          <iframe
            src={pdfUrl}
            title={fileName}
            className="w-full flex-1 min-h-[60vh] rounded-xl border border-white/10 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
