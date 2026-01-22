import { useEffect, useState, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';

export interface WorkspaceValidationResult {
  isValid: boolean;
  hasOrg: boolean;
  hasProject: boolean;
  orgId: string | null;
  projectId: string | null;
  warnings: string[];
  errors: string[];
}

export interface WorkspaceValidationOptions {
  requireOrg?: boolean;
  requireProject?: boolean;
  checkLocalStorage?: boolean;
}

/**
 * Hook for validating workspace context before performing operations
 *
 * Usage:
 * ```tsx
 * const { validate, isValid, currentWorkspace } = useWorkspaceValidation();
 *
 * const handleCreateContent = async () => {
 *   const validation = validate();
 *   if (!validation.isValid) {
 *     console.error('Invalid workspace:', validation.errors);
 *     return;
 *   }
 *   // Proceed with content creation using currentWorkspace.orgId and currentWorkspace.projectId
 * }
 * ```
 */
export const useWorkspaceValidation = (options: WorkspaceValidationOptions = {}) => {
  const {
    requireOrg = true,
    requireProject = true,
    checkLocalStorage = true,
  } = options;

  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();

  const [validationResult, setValidationResult] = useState<WorkspaceValidationResult>({
    isValid: false,
    hasOrg: false,
    hasProject: false,
    orgId: null,
    projectId: null,
    warnings: [],
    errors: [],
  });

  /**
   * Validate current workspace context
   */
  const validate = useCallback((): WorkspaceValidationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check organization
    const hasOrg = !!currentOrg;
    const orgId = currentOrg?.id || null;

    if (requireOrg && !hasOrg) {
      errors.push('No organization selected');
    }

    // Check project
    const hasProject = !!currentProject;
    const projectId = currentProject?.id || null;

    if (requireProject && !hasProject) {
      errors.push('No project selected');
    }

    // Check localStorage consistency
    if (checkLocalStorage && hasOrg) {
      const storedOrgId = localStorage.getItem('currentOrganizationId');

      if (storedOrgId !== orgId) {
        warnings.push(`localStorage orgId mismatch: stored="${storedOrgId}" actual="${orgId}"`);
      }

      if (hasProject) {
        const storedProjectId = localStorage.getItem(`currentProjectId_${orgId}`);

        if (storedProjectId !== projectId) {
          warnings.push(`localStorage projectId mismatch: stored="${storedProjectId}" actual="${projectId}"`);
        }
      }
    }

    const result: WorkspaceValidationResult = {
      isValid: errors.length === 0,
      hasOrg,
      hasProject,
      orgId,
      projectId,
      warnings,
      errors,
    };

    setValidationResult(result);
    return result;
  }, [currentOrg, currentProject, requireOrg, requireProject, checkLocalStorage]);

  // Auto-validate on context changes
  useEffect(() => {
    validate();
  }, [validate]);

  /**
   * Ensure workspace is valid before proceeding with an operation
   * Throws an error if validation fails
   */
  const ensureValid = useCallback(() => {
    const result = validate();

    if (!result.isValid) {
      const errorMessage = `Invalid workspace context: ${result.errors.join(', ')}`;
      console.error('[WorkspaceValidation]', errorMessage, result);
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn('[WorkspaceValidation] Warnings:', result.warnings);
    }

    return result;
  }, [validate]);

  return {
    /**
     * Validate current workspace - returns validation result
     */
    validate,

    /**
     * Ensure workspace is valid - throws error if not
     */
    ensureValid,

    /**
     * Current validation status
     */
    isValid: validationResult.isValid,

    /**
     * Current workspace IDs (safe to use if isValid is true)
     */
    currentWorkspace: {
      orgId: validationResult.orgId,
      projectId: validationResult.projectId,
      orgName: currentOrg?.name || null,
      projectName: currentProject?.name || null,
    },

    /**
     * Full validation result with details
     */
    validationResult,
  };
};
