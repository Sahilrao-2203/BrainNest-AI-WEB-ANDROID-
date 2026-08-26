import React, { useEffect } from 'react';

interface TextViewerModalProps {
  isOpen: boolean;
  fileName: string;
  content: string;
  onClose: () => void;
}

export const TextViewerModal: React.FC<TextViewerModalProps> = ({
  isOpen,
  fileName,
  content,
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

  if (!isOpen || !content) return null;

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Full text content viewer for ${fileName}`}
    >
      <div
        className="glass-panel p-5 md:p-6 rounded-2xl border border-white/15 bg-surface-container-high/95 max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl relative text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <span className="material-symbols-outlined text-primary text-2xl shrink-0">
              article
            </span>
            <div className="flex flex-col truncate">
              <h3 className="text-base font-bold text-on-surface truncate">{fileName}</h3>
              <span className="text-[11px] font-mono text-on-surface-variant">
                {lineCount} lines • {charCount} characters
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close text viewer"
            className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-white/10 transition-colors shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Text Content Area */}
        <div className="mt-4 flex-1 overflow-hidden flex flex-col">
          <pre className="flex-1 font-mono text-xs md:text-sm text-on-surface bg-surface-container-lowest/90 p-4 rounded-xl border border-white/10 overflow-auto whitespace-pre select-text leading-relaxed shadow-inner">
            <code>{content}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-on-surface-variant shrink-0">
          <span className="font-mono text-[11px]">Plain Text & Code View</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
