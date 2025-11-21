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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-slate-200 mb-4">Access Denied</h1>
            <p className="text-slate-400 mb-6">
              You don't have permission to access this page.
            </p>
            <a
              href="/"
              className="inline-block bg-cyan-500 hover:bg-cyan-600 text-white font-medium
                       py-3 px-6 rounded-lg transition-colors"
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
