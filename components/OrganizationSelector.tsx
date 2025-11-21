import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Check, X } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

interface OrganizationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentOrg, organizations, setCurrentOrg, createOrganization, loading } =
    useOrganization();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSelectOrg = (orgId: string) => {
    setCurrentOrg(orgId);
    onClose();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newOrgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setCreating(true);
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setShowCreateForm(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  Select Organization
                </h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading organizations...</p>
                  </div>
                ) : showCreateForm ? (
                  // Create Organization Form
                  <form onSubmit={handleCreateOrg} className="space-y-4">
                    <div>
                      <label
                        htmlFor="orgName"
                        className="block text-sm font-medium text-slate-300 mb-2"
                      >
                        Organization Name
                      </label>
                      <input
                        id="orgName"
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="My Organization"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg
                                 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500
                                 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
                        disabled={creating}
                        autoFocus
                      />
                    </div>

                    {error && (
                      <p className="text-red-400 text-sm">{error}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={creating}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2.5 px-4
                                 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creating ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewOrgName('');
                          setError('');
                        }}
                        disabled={creating}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-4
                                 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // Organization List
                  <div className="space-y-2">
                    {organizations.length === 0 ? (
                      <div className="text-center py-8">
                        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 mb-4">No organizations yet</p>
                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600
                                   text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Create Organization
                        </button>
                      </div>
                    ) : (
                      <>
                        {organizations.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => handleSelectOrg(org.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-lg
                                     border transition-colors ${
                                       currentOrg?.id === org.id
                                         ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                         : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                                     }`}
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-medium">{org.name}</p>
                                <p className="text-xs text-slate-400 capitalize">
                                  {org.subscriptionTier.toLowerCase()} Plan
                                </p>
                              </div>
                            </div>
                            {currentOrg?.id === org.id && (
                              <Check className="w-5 h-5 text-cyan-400" />
                            )}
                          </button>
                        ))}

                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="w-full flex items-center justify-center gap-2 p-4 rounded-lg
                                   border border-dashed border-slate-600 text-slate-400
                                   hover:bg-slate-900 hover:border-slate-500 hover:text-slate-300
                                   transition-colors mt-4"
                        >
                          <Plus className="w-4 h-4" />
                          Create New Organization
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
