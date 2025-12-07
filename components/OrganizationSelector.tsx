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
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-md max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  Select Organization
                </h2>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">Loading organizations...</p>
                  </div>
                ) : showCreateForm ? (
                  // Create Organization Form
                  <form onSubmit={handleCreateOrg} className="space-y-4">
                    <div>
                      <label
                        htmlFor="orgName"
                        className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2"
                      >
                        Organization Name
                      </label>
                      <input
                        id="orgName"
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="My Organization"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                                 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500
                                 transition-colors"
                        disabled={creating}
                        autoFocus
                      />
                    </div>

                    {error && (
                      <p className="text-red-400 text-xs">{error}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={creating}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4
                                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-2.5 px-4
                                 transition-colors"
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
                        <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm mb-4">No organizations yet</p>
                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500
                                   text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 transition-colors"
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
                            className={`w-full flex items-center justify-between p-4
                                     border transition-colors ${
                                       currentOrg?.id === org.id
                                         ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                         : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                                     }`}
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-medium text-sm">{org.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
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
                          className="w-full flex items-center justify-center gap-2 p-4
                                   border border-dashed border-slate-700 text-slate-500
                                   hover:bg-slate-950 hover:border-slate-600 hover:text-slate-400
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
