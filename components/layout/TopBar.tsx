import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { UserMenu } from './UserMenu';
import { AdminPanel } from './AdminPanel';
import { CreditsButton } from './CreditsButton';
import { WorkspaceIndicator } from '../ui/WorkspaceIndicator';
import { GlobalRole } from '../../types';
// Logo is served from public folder
const MissionLogo = '/MissionLogo.svg';

interface TopBarProps {
  /** Show the org selector (only if user has multiple orgs) */
  showOrgSelector?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  showOrgSelector = true,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg, organizations, setCurrentOrg } = useOrganization();
  const { isImpersonating, impersonatedOrg } = useImpersonation();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const orgDropdownRef = useRef<HTMLDivElement>(null);

  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  // Only show org selector if user has multiple orgs or is impersonating
  const hasMultipleOrgs = organizations.length > 1 || isImpersonating;

  // When impersonating, include the impersonated org in the dropdown list
  const displayOrganizations = React.useMemo(() => {
    if (isImpersonating && impersonatedOrg) {
      // Check if impersonated org is already in the list
      const alreadyInList = organizations.some(org => org.id === impersonatedOrg.id);
      if (!alreadyInList) {
        return [impersonatedOrg, ...organizations];
      }
    }
    return organizations;
  }, [organizations, isImpersonating, impersonatedOrg]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOrgSelect = (orgId: string) => {
    setCurrentOrg(orgId);
    setShowOrgDropdown(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Organization (only if multi-org) */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => navigate('/projects')}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={MissionLogo} alt="MissionContent" className="h-14" />
          </button>

          {/* Organization Dropdown - only show if multi-org or impersonating */}
          {showOrgSelector && hasMultipleOrgs && currentOrg && (
            <div className="relative" ref={orgDropdownRef}>
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
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
                    {displayOrganizations.map((org) => (
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
        </div>

        {/* Center: Workspace Indicator */}
        <div className="flex-1 flex items-center justify-center px-4">
          <WorkspaceIndicator />
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
