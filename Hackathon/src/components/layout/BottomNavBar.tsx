import React from 'react';
import { NavLink } from 'react-router-dom';

export const BottomNavBar: React.FC = () => {
  const navItems = [
    { label: 'Home', path: '/', icon: 'home', exact: true },
    { label: 'Companion', path: '/companion', icon: 'smart_toy', exact: false },
    { label: 'AI Notes', path: '/notes', icon: 'edit_note', exact: false },
    { label: 'Flashcards', path: '/flashcards', icon: 'style', exact: false },
    { label: 'Profile', path: '/profile', icon: 'person', exact: false },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container/60 dark:bg-surface-container/60 backdrop-blur-3xl border-t border-white/15 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex justify-around items-center h-20 pb-safe px-4">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          end={item.exact}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-all active:scale-90 px-4 py-1 rounded-xl ${
              isActive
                ? 'text-primary dark:text-primary-fixed bg-primary-container/20'
                : 'text-on-surface-variant opacity-70 hover:bg-white/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined mb-1"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
