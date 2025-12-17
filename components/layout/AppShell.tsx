import React from 'react';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  /** Show project indicator in TopBar */
  showProject?: boolean;
  /** Custom className for the main content area */
  contentClassName?: string;
}

/**
 * AppShell provides a consistent layout wrapper for authenticated pages.
 * It includes:
 * - TopBar with logo, org selector, user menu, credits/admin panel
 * - Main content area (children)
 */
export const AppShell: React.FC<AppShellProps> = ({
  children,
  showProject = true,
  contentClassName = '',
}) => {
  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Top Bar (includes Credits for users, Admin Panel for admins) */}
      <TopBar showProject={showProject} />

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
};

// Export all layout components for convenience
export { TopBar } from './TopBar';
export { UserMenu } from './UserMenu';
