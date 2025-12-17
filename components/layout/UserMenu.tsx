import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GlobalRole } from '../../types';

interface UserMenuProps {
  /** Compact mode shows only avatar */
  compact?: boolean;
  /** Position of dropdown */
  dropdownPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const UserMenu: React.FC<UserMenuProps> = ({
  compact = false,
  dropdownPosition = 'bottom-right',
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  const handleSignOut = async () => {
    setShowMenu(false);
    navigate('/login');
    await signOut();
  };

  const handleNavigate = (path: string) => {
    setShowMenu(false);
    navigate(path);
  };

  // Position classes for dropdown
  const positionClasses = {
    'bottom-right': 'top-full right-0 mt-2',
    'bottom-left': 'top-full left-0 mt-2',
    'top-right': 'bottom-full right-0 mb-2',
    'top-left': 'bottom-full left-0 mb-2',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-3 hover:bg-slate-800 transition-colors ${
          compact ? 'p-2' : 'px-3 py-2'
        }`}
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-cyan-500/20 flex items-center justify-center shrink-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-cyan-400" />
          )}
        </div>

        {/* Name and role (when not compact) */}
        {!compact && (
          <>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">{user?.displayName}</p>
              <p className="text-xs text-slate-400 capitalize">
                {user?.globalRole?.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: dropdownPosition.startsWith('bottom') ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition.startsWith('bottom') ? -10 : 10 }}
              className={`absolute ${positionClasses[dropdownPosition]} w-56 bg-slate-900 border border-slate-700 shadow-xl z-50`}
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-sm font-medium text-white truncate">{user?.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="p-2">
                {/* Settings */}
                <button
                  onClick={() => handleNavigate('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 text-slate-200 text-sm transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                {/* Admin Panel (System Admin only) */}
                {isSystemAdmin && (
                  <button
                    onClick={() => handleNavigate('/admin')}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 text-purple-400 text-sm transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}

                {/* Divider */}
                <div className="border-t border-slate-700 my-1" />

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 text-red-400 text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
