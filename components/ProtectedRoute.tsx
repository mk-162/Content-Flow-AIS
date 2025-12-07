import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GlobalRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: GlobalRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirement if specified
  if (requireRole) {
    const hasRequiredRole = (): boolean => {
      if (requireRole === GlobalRole.SYSTEM_ADMIN) {
        return user.globalRole === GlobalRole.SYSTEM_ADMIN;
      }
      if (requireRole === GlobalRole.ORG_OWNER) {
        return (
          user.globalRole === GlobalRole.ORG_OWNER ||
          user.globalRole === GlobalRole.SYSTEM_ADMIN
        );
      }
      return true;
    };

    if (!hasRequiredRole()) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-500 text-sm mb-6">
              You don't have permission to access this page.
            </p>
            <a
              href="/"
              className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider
                       py-3 px-6 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
