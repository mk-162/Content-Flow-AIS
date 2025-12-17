import React, { useState } from 'react';
import { User, Building2, Folder } from 'lucide-react';
import { AppShell } from '../components/layout';
import { AccountSettings } from '../components/settings/AccountSettings';
import { OrganizationSettingsTab } from '../components/settings/OrganizationSettingsTab';
import { ProjectSettingsTab } from '../components/settings/ProjectSettingsTab';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import { GlobalRole, OrgMemberRole } from '../types';

type SettingsTab = 'account' | 'organization' | 'project';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Determine if user can see organization settings (owner or admin)
  // Must have an organization to show the tab
  const hasOrg = !!currentOrg;
  const isOrgOwner = currentOrg?.ownerId === user?.id;
  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;
  const canEditOrg = hasOrg && (isOrgOwner || isSystemAdmin);

  // Determine if user can see project settings (has a project selected)
  const hasProject = !!currentProject;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" />, show: true },
    { id: 'organization', label: 'Organization', icon: <Building2 className="w-4 h-4" />, show: canEditOrg },
    { id: 'project', label: 'Project', icon: <Folder className="w-4 h-4" />, show: hasProject },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <AppShell showProject={false}>
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
            <p className="text-slate-400 text-sm">
              Manage your account, organization, and project settings
            </p>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-slate-800 mb-8">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'organization' && canEditOrg && <OrganizationSettingsTab />}
            {activeTab === 'project' && hasProject && <ProjectSettingsTab />}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
