import React from 'react';
import { Folder, AlertCircle } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { ProjectSettings } from '../ProjectSettings';

/**
 * ProjectSettingsTab wraps the existing ProjectSettings component
 * for use within the unified Settings page.
 */
export const ProjectSettingsTab: React.FC = () => {
  const { currentProject } = useProject();
  const { currentOrg } = useOrganization();

  if (!currentOrg) {
    return (
      <div className="flex items-center gap-3 p-6 bg-slate-900 border border-slate-800 text-slate-400">
        <AlertCircle className="w-5 h-5" />
        <span>No organization selected.</span>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 text-center">
        <Folder className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Project Selected</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Select a project from the workspace to configure its settings. Project settings include
          business context, publishing velocity, AI rules, and WordPress integration.
        </p>
      </div>
    );
  }

  return (
    <div className="-m-8">
      {/* Negative margin to undo the Settings page padding, letting ProjectSettings use its own styling */}
      <ProjectSettings
        project={currentProject}
        onUpdate={() => {
          // Optional: Add notification or other feedback
        }}
      />
    </div>
  );
};
