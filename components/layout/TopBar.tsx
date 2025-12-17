import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Folder } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProject } from '../../contexts/ProjectContext';
import { OrganizationSelector } from '../OrganizationSelector';
import { UserMenu } from './UserMenu';
import { AdminPanel } from './AdminPanel';
import { CreditsButton } from './CreditsButton';
import { GlobalRole } from '../../types';
import MissionLogo from '../../Mission.svg';

interface TopBarProps {
  /** Show the project indicator */
  showProject?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ showProject = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const [showOrgSelector, setShowOrgSelector] = useState(false);

  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Organization/Project */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <button
              onClick={() => navigate('/projects')}
              className="hover:opacity-80 transition-opacity"
            >
              <img src={MissionLogo} alt="MissionContent" className="h-10" />
            </button>

            {/* Organization Selector */}
            {currentOrg && (
              <button
                onClick={() => setShowOrgSelector(true)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700
                         text-slate-200 transition-colors border border-slate-700 hover:border-slate-600"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-sm">{currentOrg.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Current Project Indicator */}
            {showProject && currentProject && (
              <div className="flex items-center gap-2 px-3 py-2 text-slate-400 text-sm">
                <Folder className="w-4 h-4" />
                <span>{currentProject.name}</span>
              </div>
            )}
          </div>

          {/* Right: Credits/Admin + User Menu */}
          <div className="flex items-center gap-2">
            {isSystemAdmin ? <AdminPanel /> : <CreditsButton />}
            <UserMenu dropdownPosition="bottom-right" />
          </div>
        </div>
      </header>

      {/* Organization Selector Modal */}
      <OrganizationSelector
        isOpen={showOrgSelector}
        onClose={() => setShowOrgSelector(false)}
      />
    </>
  );
};
