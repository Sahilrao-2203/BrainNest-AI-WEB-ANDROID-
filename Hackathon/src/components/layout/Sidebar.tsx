import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { ThemeSelector } from './ThemeSelector';
import logo from '../../assets/logo.png';

export const Sidebar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard', exact: true },
    { label: 'Companion', path: '/companion', icon: 'psychology', exact: false },
    { label: 'AI Notes', path: '/notes', icon: 'menu_book', exact: false },
    { label: 'Flashcards', path: '/flashcards', icon: 'style', exact: false },
    { label: 'Profile', path: '/profile', icon: 'person', exact: false },
  ];

  return (
    <>
      <nav className="hidden md:flex flex-col p-4 gap-stack-sm h-screen fixed left-0 top-0 w-[280px] z-40 bg-surface-container-lowest dark:bg-surface/90 backdrop-blur-md border-r border-outline-variant shadow-md">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 py-6 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-sm shrink-0">
            <img
              alt="StudyFlow AI Logo"
              className="w-7 h-7 object-contain"
              src={logo}
            />
          </div>
          <div>
            <h1 className="font-headline-md text-base font-bold text-primary dark:text-primary-fixed-dim tracking-tight">StudyFlow AI</h1>
            <p className="font-label-sm text-[10px] text-on-surface-variant">AI-Driven Learning</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-container/20 text-primary dark:text-primary-fixed-dim shadow-sm translate-x-1'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:translate-x-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined text-xl"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Pro CTA Card */}
        <div className="mb-6">
          <div className="bg-primary-container/10 border border-primary-container/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span className="font-label-md text-label-md font-bold text-primary dark:text-primary-fixed-dim">Pro Features</span>
            </div>
            <p className="font-label-sm text-[11px] text-on-surface-variant leading-relaxed">
              Unlock advanced AI tutoring and unlimited practice tests.
            </p>
            <button 
              onClick={() => navigate('/plans')}
              className="w-full py-2 bg-primary text-on-primary dark:bg-primary-container dark:text-on-primary-container rounded-lg font-label-md text-xs font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* Footer & Actions */}
        <div className="border-t border-outline-variant pt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between px-4 py-2 text-on-surface-variant">
            <span className="font-label-md text-label-md">Theme</span>
            <ThemeSelector />
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-error-container/20 hover:text-error rounded-lg transition-colors cursor-pointer w-full text-left"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span className="font-label-md text-label-md">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-3 px-4 py-2.5 text-primary dark:text-primary-fixed-dim hover:bg-surface-container rounded-lg transition-colors cursor-pointer w-full text-left font-bold"
            >
              <span className="material-symbols-outlined text-xl">login</span>
              <span className="font-label-md text-label-md">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
