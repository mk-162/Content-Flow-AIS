import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import {
  Building2,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Folder,
  Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlobalRole } from '../types';
import { OrganizationSelector } from './OrganizationSelector';
import { motion, AnimatePresence } from 'framer-motion';
import MissionLogo from '../Mission.svg';

export const TopNav: React.FC = () => {
  const { user, signOut } = useAuth();
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  const handleSignOut = async () => {
    try {
      // Navigate to login FIRST to unmount protected components
      navigate('/login');
      // Then sign out
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Organization/Project */}
          <div className="flex items-center gap-4">
            <img src={MissionLogo} alt="MissionContent" className="h-10" />

            {/* Organization Selector */}
            {currentOrg && (
              <button
                onClick={() => setShowOrgSelector(true)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600
                         text-slate-200 transition-colors border border-slate-600"
              >
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{currentOrg.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Current Project Indicator */}
            {currentProject && (
              <div className="flex items-center gap-2 px-3 py-2 text-slate-400 text-sm">
                <Folder className="w-4 h-4" />
                <span>{currentProject.name}</span>
              </div>
            )}
          </div>

          {/* Right: User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                       transition-colors"
            >
              <div className="w-8 h-8 bg-cyan-500/20 flex items-center justify-center">
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
              <div className="text-left">
                <p className="text-sm font-medium text-slate-200">{user?.displayName}</p>
                <p className="text-xs text-slate-400 capitalize">
                  {user?.globalRole.toLowerCase().replace('_', ' ')}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700
                           shadow-xl overflow-hidden z-50"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        alert('Settings page coming soon! This will allow you to manage your account, notifications, and preferences.');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                               text-slate-200 text-sm transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    {isSystemAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/admin');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                                 text-purple-400 text-sm transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </button>
                    )}
                    <div className="border-t border-slate-700 my-1" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                               text-red-400 text-sm transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Organization Selector Modal */}
      <OrganizationSelector
        isOpen={showOrgSelector}
        onClose={() => setShowOrgSelector(false)}
      />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};
