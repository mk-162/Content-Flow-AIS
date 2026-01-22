import React from 'react';
import { Building2, FolderOpen, AlertTriangle } from 'lucide-react';
import { useWorkspaceValidation } from '../../hooks/useWorkspaceValidation';

interface WorkspaceIndicatorProps {
  /**
   * Show full details (org + project) or compact mode
   */
  compact?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * WorkspaceIndicator - Shows current workspace context
 *
 * Displays the active organization and project in the header.
 * Shows warnings if workspace context is invalid or has mismatches.
 *
 * Usage:
 * ```tsx
 * <WorkspaceIndicator />
 * <WorkspaceIndicator compact />
 * ```
 */
export const WorkspaceIndicator: React.FC<WorkspaceIndicatorProps> = ({
  compact = false,
  className = '',
}) => {
  const { isValid, currentWorkspace, validationResult } = useWorkspaceValidation();

  const hasWarnings = validationResult.warnings.length > 0;
  const hasErrors = validationResult.errors.length > 0;

  // Don't show if no workspace at all
  if (!currentWorkspace.orgId && !currentWorkspace.projectId) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {hasErrors ? (
          <div className="flex items-center gap-1 text-red-400" title={validationResult.errors.join(', ')}>
            <AlertTriangle className="w-4 h-4" />
            <span>Invalid Workspace</span>
          </div>
        ) : hasWarnings ? (
          <div className="flex items-center gap-1 text-yellow-400" title={validationResult.warnings.join(', ')}>
            <AlertTriangle className="w-4 h-4" />
            <span>{currentWorkspace.projectName || currentWorkspace.orgName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <FolderOpen className="w-4 h-4" />
            <span>{currentWorkspace.projectName || currentWorkspace.orgName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {/* Organization */}
      {currentWorkspace.orgId && (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Building2 className="w-4 h-4" />
          <span className="font-medium">{currentWorkspace.orgName || 'Organization'}</span>
        </div>
      )}

      {/* Divider */}
      {currentWorkspace.orgId && currentWorkspace.projectId && (
        <div className="w-px h-4 bg-slate-700" />
      )}

      {/* Project */}
      {currentWorkspace.projectId && (
        <div className="flex items-center gap-1.5 text-slate-300">
          <FolderOpen className="w-4 h-4" />
          <span className="font-medium">{currentWorkspace.projectName || 'Project'}</span>
        </div>
      )}

      {/* Validation Status */}
      {(hasWarnings || hasErrors) && (
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            hasErrors
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
          }`}
          title={(hasErrors ? validationResult.errors : validationResult.warnings).join('\n')}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{hasErrors ? 'Invalid' : 'Warning'}</span>
        </div>
      )}
    </div>
  );
};
