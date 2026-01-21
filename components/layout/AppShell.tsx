import React from 'react';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  /** Custom className for the main content area */
  contentClassName?: string;
}

/**
 * AppShell provides a consistent layout wrapper for authenticated pages.
 * It includes:
 * - TopBar with logo, org selector (if multi-org), credits/admin panel, user menu
 * - Main content area (children)
 */
export const AppShell: React.FC<AppShellProps> = ({
  children,
  contentClassName = '',
}) => {
  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Top Bar - Simplified: Logo | Org (if multi-org) | spacer | Credits | User */}
      <TopBar />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
};

// Export all layout components for convenience
export { TopBar } from './TopBar';
export { UserMenu } from './UserMenu';
