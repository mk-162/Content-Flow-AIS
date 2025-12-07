import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import { GlobalRole } from '../types';
import { Copy, Check, ChevronUp, ChevronDown, Database } from 'lucide-react';

interface DebugFooterProps {
  selectedPostId?: string | null;
  selectedCategoryId?: string | null;
}

export const DebugFooter: React.FC<DebugFooterProps> = ({
  selectedPostId,
  selectedCategoryId
}) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Only show for system admins
  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;
  if (!isSystemAdmin) return null;

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyableId = ({ label, value, field }: { label: string; value: string | undefined; field: string }) => {
    if (!value) return null;

    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-[10px] uppercase tracking-wider">{label}:</span>
        <code className="text-cyan-400 text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded">
          {value}
        </code>
        <button
          onClick={() => copyToClipboard(value, field)}
          className="text-slate-500 hover:text-white transition-colors"
          title="Copy to clipboard"
        >
          {copiedField === field ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    );
  };

  // Build Firestore path
  const getFirestorePath = () => {
    if (!currentOrg) return null;

    let path = `organizations/${currentOrg.id}`;
    if (currentProject) {
      path += `/projects/${currentProject.id}`;
      if (selectedCategoryId) {
        path += `/categories/${selectedCategoryId}`;
      }
      if (selectedPostId) {
        path += `/posts/${selectedPostId}`;
      }
    }
    return path;
  };

  const firestorePath = getFirestorePath();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute right-4 -top-6 bg-slate-900 border border-slate-700 border-b-0 px-3 py-1 rounded-t flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <Database className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wider font-medium">Debug</span>
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-1">
            <CopyableId label="User ID" value={user?.id} field="userId" />
            <CopyableId label="Org ID" value={currentOrg?.id} field="orgId" />
            <CopyableId label="Project ID" value={currentProject?.id} field="projectId" />
            {selectedCategoryId && (
              <CopyableId label="Category ID" value={selectedCategoryId} field="categoryId" />
            )}
            {selectedPostId && (
              <CopyableId label="Post ID" value={selectedPostId} field="postId" />
            )}

            {/* Full Firestore Path */}
            {firestorePath && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Path:</span>
                <code className="text-purple-400 text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded max-w-md truncate">
                  {firestorePath}
                </code>
                <button
                  onClick={() => copyToClipboard(firestorePath, 'path')}
                  className="text-slate-500 hover:text-white transition-colors"
                  title="Copy Firestore path"
                >
                  {copiedField === 'path' ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
