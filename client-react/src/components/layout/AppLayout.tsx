import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';

export interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks & Deadlines',
  '/events': 'Campus Events',
  '/announcements': 'Batch Announcements',
  '/projects': 'Project Hub',
  '/resources': 'Resource Library',
  '/members': 'Batch Members',
  '/profile': 'My Profile',
  '/cr-panel': 'Cohort Administration',
  '/admin/batches': 'Admin Control Center',
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('batchhub_sidebar_collapsed') === 'true';
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const location = useLocation();

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('batchhub_sidebar_collapsed', String(next));
      return next;
    });
  };

  const resolvedTitle =
    (title && title !== 'Dashboard' ? title : null) ||
    ROUTE_TITLES[location.pathname] ||
    title ||
    'Dashboard';

  return (
    <div className="min-h-screen bg-[#090e0b] text-[#d6ded8] flex">
      {/* Sidebar Rail */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Topbar
          title={resolvedTitle}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenCommand={() => setIsCommandOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
};


