import React from 'react';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useAuth } from '../contexts/AuthContext';
import { GlobalRole } from '../types';
import { Eye, X } from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { user } = useAuth();
  const { isImpersonating, impersonatedOrg, stopImpersonation } = useImpersonation();

  // Only show for system admins who are impersonating
  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;
  if (!isSystemAdmin || !isImpersonating || !impersonatedOrg) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5" />
          <span className="font-medium text-sm">
            Viewing as: <strong>{impersonatedOrg.name}</strong>
          </span>
          <span className="text-xs opacity-75 font-mono">
            (ID: {impersonatedOrg.id})
          </span>
        </div>
        <button
          onClick={stopImpersonation}
          className="flex items-center gap-2 bg-black/20 hover:bg-black/30 px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Exit View Mode
        </button>
      </div>
    </div>
  );
};
