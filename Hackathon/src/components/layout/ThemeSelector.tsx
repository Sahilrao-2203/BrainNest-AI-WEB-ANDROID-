import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeMode } from '../../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: 'light_mode' },
    { mode: 'dark', label: 'Dark', icon: 'dark_mode' },
    { mode: 'system', label: 'System', icon: 'desktop_windows' },
  ];

  const currentOption = options.find((opt) => opt.mode === themeMode) || options[2];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-variant/40 dark:bg-surface-container/60 hover:bg-surface-variant/80 dark:hover:bg-surface-container border border-white/10 text-on-surface-variant dark:text-on-surface text-xs font-semibold transition-all active:scale-95"
        aria-label="Select theme"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="material-symbols-outlined text-[16px]">{currentOption.icon}</span>
        <span className="hidden sm:inline capitalize">{currentOption.label}</span>
        <span className="material-symbols-outlined text-[12px] opacity-70">expand_more</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-32 rounded-lg bg-surface dark:bg-surface-container-high border border-white/10 dark:border-white/5 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100"
          role="listbox"
        >
          {options.map((opt) => {
            const isSelected = opt.mode === themeMode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setThemeMode(opt.mode);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-surface-variant/50 dark:hover:bg-surface-container-highest transition-colors ${
                  isSelected
                    ? 'text-primary dark:text-secondary font-bold'
                    : 'text-on-surface-variant dark:text-on-surface'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ThemeSelector;
