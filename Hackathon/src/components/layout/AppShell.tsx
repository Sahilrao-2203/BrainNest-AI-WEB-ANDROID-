import React from 'react';
import { BackgroundOrbs } from './BackgroundOrbs';
import { TopAppBar } from './TopAppBar';
import { BottomNavBar } from './BottomNavBar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  hideTopNav?: boolean;
  hideBottomNav?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  hideTopNav = false,
  hideBottomNav = false,
}) => {
  return (
    <div className="min-h-screen relative font-sans text-body-md text-on-background bg-background antialiased flex flex-col">
      <BackgroundOrbs />
      {!hideTopNav && <Sidebar />}
      {!hideTopNav && <TopAppBar />}
      <main className={`w-full flex-1 ${!hideTopNav ? 'md:pl-[280px]' : ''}`}>
        {children}
      </main>
      {!hideBottomNav && <BottomNavBar />}
    </div>
  );
};
