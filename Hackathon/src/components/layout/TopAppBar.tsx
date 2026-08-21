import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { ThemeSelector } from './ThemeSelector';
import logo from '../../assets/logo.png';

interface TopAppBarProps {
  title?: string;
  showDesktopNav?: boolean;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ showDesktopNav = true }) => {
  const { isAuthenticated, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className="md:hidden bg-surface/80 dark:bg-surface/80 backdrop-blur-2xl fixed top-0 w-full z-50 border-b border-white/15 shadow-sm h-16 flex justify-between items-center px-margin-mobile md:px-margin-desktop">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <img
              alt="StudyFlow AI Logo"
              className="w-full h-full object-contain"
              src={logo}
            />
          </div>
          <NavLink to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed hover:opacity-90">
            StudyFlow AI
          </NavLink>
        </div>

        {showDesktopNav && (
          <nav className="hidden md:flex items-center gap-8">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `font-label-sm text-label-sm uppercase tracking-wider transition-opacity hover:opacity-80 ${
                  isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/companion"
              className={({ isActive }) =>
                `font-label-sm text-label-sm uppercase tracking-wider transition-opacity hover:opacity-80 ${
                  isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant'
                }`
              }
            >
              Companion
            </NavLink>
            <NavLink
              to="/notes"
              className={({ isActive }) =>
                `font-label-sm text-label-sm uppercase tracking-wider transition-opacity hover:opacity-80 ${
                  isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant'
                }`
              }
            >
              AI Notes
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `font-label-sm text-label-sm uppercase tracking-wider transition-opacity hover:opacity-80 ${
                  isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant'
                }`
              }
            >
              Profile
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg bg-surface-variant border border-white/10 hover:bg-error-container/20 hover:text-error text-on-surface-variant text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Sign out of your StudyFlow account"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold flex items-center gap-1 transition-colors shadow-md"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              <span>Sign In</span>
            </button>
          )}

          <ThemeSelector />

          <button
            aria-label="Notifications"
            className="text-primary dark:text-primary-fixed hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center p-2 rounded-full"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
