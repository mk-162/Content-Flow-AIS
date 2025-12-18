import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Eye,
  X,
  Copy,
  Check,
  Database,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProject } from '../../contexts/ProjectContext';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { GlobalRole } from '../../types';

interface AdminPanelProps {
  /** Optional selected post ID for debug info */
  selectedPostId?: string | null;
  /** Optional selected category ID for debug info */
  selectedCategoryId?: string | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  selectedPostId,
  selectedCategoryId,
}) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { isImpersonating, impersonatedOrg, stopImpersonation } = useImpersonation();
  const [showPanel, setShowPanel] = useState(false);
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

  const CopyableId = ({ label, value, field }: { label: string; value: string | undefined; field: string }) => {
    if (!value) return null;

    return (
      <div className="flex items-center justify-between gap-3 py-1.5 px-3 hover:bg-slate-800/50">
        <span className="text-slate-500 text-xs uppercase tracking-wider shrink-0">{label}</span>
        <div className="flex items-center gap-2">
          <code className="text-cyan-400 text-xs font-mono bg-slate-800 px-2 py-0.5">
            {value}
          </code>
          <button
            onClick={() => copyToClipboard(value, field)}
            className="text-slate-500 hover:text-white transition-colors p-1"
            title="Copy to clipboard"
          >
            {copiedField === field ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Admin Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`flex items-center gap-2 px-3 py-2 transition-colors ${
          isImpersonating
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
        }`}
      >
        {isImpersonating ? (
          <>
            <Eye className="w-4 h-4" />
            <span className="text-xs font-medium">Viewing: {impersonatedOrg?.name}</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Admin</span>
          </>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${showPanel ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPanel(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-[420px] bg-slate-900 border border-slate-700 shadow-xl z-50"
            >
              {/* Impersonation Section */}
              {isImpersonating && impersonatedOrg && (
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-xs text-amber-400 font-medium">Viewing as Client</p>
                        <p className="text-sm text-white font-semibold">{impersonatedOrg.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        stopImpersonation();
                        setShowPanel(false);
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Exit
                    </button>
                  </div>
                </div>
              )}

              {/* Debug Section Header */}
              <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Debug IDs</span>
              </div>

              {/* Debug IDs */}
              <div className="py-1">
                <CopyableId label="User ID" value={user?.id} field="userId" />
                <CopyableId label="Org ID" value={currentOrg?.id} field="orgId" />
                <CopyableId label="Project ID" value={currentProject?.id} field="projectId" />
                {selectedCategoryId && (
                  <CopyableId label="Category ID" value={selectedCategoryId} field="categoryId" />
                )}
                {selectedPostId && (
                  <CopyableId label="Post ID" value={selectedPostId} field="postId" />
                )}
              </div>

              {/* Firestore Path */}
              {firestorePath && (
                <div className="border-t border-slate-800 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Firestore Path</span>
                    <button
                      onClick={() => copyToClipboard(firestorePath, 'path')}
                      className="text-slate-500 hover:text-white transition-colors p-1"
                      title="Copy Firestore path"
                    >
                      {copiedField === 'path' ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <code className="block text-purple-400 text-xs font-mono bg-slate-800 px-2 py-1.5 break-all">
                    {firestorePath}
                  </code>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
