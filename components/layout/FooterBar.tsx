import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Zap, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { CreditManagementModal } from '../CreditManagementModal';

export const FooterBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentOrg } = useOrganization();
  const [showCreditModal, setShowCreditModal] = useState(false);

  const handleSignOut = async () => {
    navigate('/login');
    await signOut();
  };

  return (
    <>
      <footer className="bg-slate-950 border-t border-slate-800 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Credits + Settings */}
          <div className="flex items-center gap-1">
            {/* Credits Button */}
            {currentOrg && (
              <button
                onClick={() => setShowCreditModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-900 transition-colors text-sm"
                title="Manage credits"
              >
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-400">Credits:</span>
                <span className="font-semibold text-white">{currentOrg?.credits?.balance ?? 0}</span>
              </button>
            )}

            {/* Settings Link */}
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-900 transition-colors text-sm text-slate-400 hover:text-white"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* Right: User + Sign Out */}
          <div className="flex items-center gap-3">
            {/* User Display */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-500/20 flex items-center justify-center shrink-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-3 h-3 text-cyan-400" />
                )}
              </div>
              <span className="text-sm text-slate-300">{user?.displayName}</span>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-900 transition-colors text-sm text-red-400 hover:text-red-300"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Credit Management Modal */}
      <CreditManagementModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </>
  );
};
