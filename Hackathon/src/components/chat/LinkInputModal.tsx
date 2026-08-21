import React, { useState, useEffect } from 'react';
import { isValidStudyUrl } from '../../services/fileProcessingService';

interface LinkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLink: (url: string) => void;
}

export const LinkInputModal: React.FC<LinkInputModalProps> = ({
  isOpen,
  onClose,
  onAddLink,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput('');
      setErrorMsg(null);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid URL.');
      return;
    }
    if (!isValidStudyUrl(trimmed)) {
      setErrorMsg('Please enter a valid URL.');
      return;
    }
    setErrorMsg(null);
    onAddLink(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add study link dialog"
    >
      <div
        className="glass-panel p-6 rounded-2xl border border-white/15 bg-surface-container-high/95 max-w-md w-full shadow-2xl relative flex flex-col gap-4 text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">link</span>
            <h3 className="text-base font-bold text-on-surface">Add a study link</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="study-url-input" className="text-xs font-semibold text-on-surface-variant">
              URL Link (http:// or https://)
            </label>
            <input
              id="study-url-input"
              type="text"
              autoFocus
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="https://example.com/topic"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/15 text-on-surface placeholder-on-surface-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {errorMsg && (
              <span className="text-xs font-medium text-error flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{errorMsg}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-on-surface text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-fixed-dim text-xs font-semibold transition-all shadow-md flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Link</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
