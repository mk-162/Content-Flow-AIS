import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Folder, Check, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProject } from '../../contexts/ProjectContext';
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
  const { currentOrg, organizations, setCurrentOrg } = useOrganization();
  const { currentProject, projects, setCurrentProject } = useProject();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOrgSelect = (orgId: string) => {
    setCurrentOrg(orgId);
    setShowOrgDropdown(false);
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProject(projectId);
    setShowProjectDropdown(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Organization/Project */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => navigate('/projects')}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={MissionLogo} alt="MissionContent" className="h-12" />
          </button>

          {/* Organization Dropdown */}
          {currentOrg && (
            <div className="relative" ref={orgDropdownRef}>
              <button
                onClick={() => {
                  setShowOrgDropdown(!showOrgDropdown);
                  setShowProjectDropdown(false);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700
                         text-slate-200 transition-colors border border-slate-700 hover:border-slate-600"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-sm">{currentOrg.name}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showOrgDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Organization Dropdown Menu */}
              {showOrgDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 shadow-xl z-50">
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSelect(org.id)}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-700 transition-colors ${
                          currentOrg.id === org.id ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{org.name}</span>
                        </div>
                        {currentOrg.id === org.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project Dropdown */}
          {showProject && currentProject && (
            <div className="relative" ref={projectDropdownRef}>
              <button
                onClick={() => {
                  setShowProjectDropdown(!showProjectDropdown);
                  setShowOrgDropdown(false);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700
                         text-slate-200 transition-colors border border-slate-700 hover:border-slate-600"
              >
                <Folder className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-sm">{currentProject.name}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Project Dropdown Menu */}
              {showProjectDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 shadow-xl z-50">
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSelect(project.id)}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-700 transition-colors ${
                          currentProject.id === project.id ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-slate-500" />
                          <span>{project.name}</span>
                        </div>
                        {currentProject.id === project.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-700">
                    <button
                      onClick={() => {
                        navigate('/projects');
                        setShowProjectDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Manage All Projects
                    </button>
                  </div>
                </div>
              )}
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
  );
};
