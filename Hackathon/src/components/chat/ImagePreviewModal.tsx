import React, { useEffect } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  src: string | null;
  alt: string;
  sourceUrl?: string;
  sourceName?: string;
  googleSearchUrl?: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  src,
  alt,
  sourceUrl,
  sourceName,
  googleSearchUrl,
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

  if (!isOpen || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image preview"
    >
      <div
        className="relative max-w-[95vw] md:max-w-[80vw] max-h-[85vh] flex flex-col items-center justify-center bg-surface-container-low/95 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close enlarged preview"
          className="absolute -top-4 -right-4 p-2 text-white/80 hover:text-white bg-black/80 hover:bg-black rounded-full transition-colors focus:ring-2 focus:ring-primary focus:outline-none shadow-xl border border-white/20"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <img
          src={src}
          alt={alt || 'Enlarged image attachment preview'}
          className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl border border-white/10"
        />

        <div className="mt-3 w-full flex flex-col items-center gap-2 text-center">
          {alt && (
            <p className="text-xs font-bold text-on-surface truncate max-w-full px-2">
              {alt}
            </p>
          )}

          {sourceName && (
            <span className="text-[10px] text-on-surface-variant font-mono">
              Source: {sourceName}
            </span>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-white/10 w-full">
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>View Source</span>
              </a>
            )}

            {googleSearchUrl && (
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-primary-container/30 border border-primary/30 hover:bg-primary-container/50 text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">search</span>
                <span>🔎 Search on Google Images</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
