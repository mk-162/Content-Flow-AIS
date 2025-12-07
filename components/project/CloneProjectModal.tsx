import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Folder, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { Project, Category } from '../../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrganization } from '../../contexts/OrganizationContext';

interface CloneProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onClone: (
    sourceProjectId: string,
    newName: string,
    newDescription: string,
    options: CloneOptions
  ) => Promise<void>;
}

export interface CloneOptions {
  includeCategories: boolean;
  includeSubcategories: boolean;
  includeSettings: boolean;
  includeBusinessProfile: boolean;
}

interface CategoryWithChildren extends Category {
  subcategories?: Category[];
}

export const CloneProjectModal: React.FC<CloneProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  onClone,
}) => {
  const { currentOrg } = useOrganization();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);

  const [options, setOptions] = useState<CloneOptions>({
    includeCategories: true,
    includeSubcategories: true,
    includeSettings: true,
    includeBusinessProfile: true,
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Load categories when project is selected
  useEffect(() => {
    if (!selectedProjectId || !currentOrg) {
      setCategories([]);
      return;
    }

    const loadCategories = async () => {
      setLoadingPreview(true);
      try {
        const categoriesSnapshot = await getDocs(
          collection(db, `organizations/${currentOrg.id}/projects/${selectedProjectId}/categories`)
        );

        const allCategories = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];

        // Organize into parent/child structure
        const parentCategories = allCategories.filter(c => !c.parentId);
        const subcategories = allCategories.filter(c => c.parentId);

        const categoriesWithChildren: CategoryWithChildren[] = parentCategories.map(parent => ({
          ...parent,
          subcategories: subcategories.filter(sub => sub.parentId === parent.id),
        }));

        // Sort by order
        categoriesWithChildren.sort((a, b) => a.order - b.order);

        setCategories(categoriesWithChildren);
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadCategories();
  }, [selectedProjectId, currentOrg]);

  // Update name when project is selected
  useEffect(() => {
    if (selectedProject) {
      setNewName(`${selectedProject.name} (Copy)`);
      setNewDescription(selectedProject.description || '');
    }
  }, [selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProjectId) {
      setError('Please select a project to clone');
      return;
    }

    if (!newName.trim()) {
      setError('Please enter a name for the new project');
      return;
    }

    setLoading(true);
    try {
      await onClone(selectedProjectId, newName.trim(), newDescription.trim(), options);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clone project');
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (key: keyof CloneOptions) => {
    setOptions(prev => {
      const newOptions = { ...prev, [key]: !prev[key] };

      // If categories is disabled, disable subcategories too
      if (key === 'includeCategories' && !newOptions.includeCategories) {
        newOptions.includeSubcategories = false;
      }

      // If subcategories is enabled, enable categories too
      if (key === 'includeSubcategories' && newOptions.includeSubcategories) {
        newOptions.includeCategories = true;
      }

      return newOptions;
    });
  };

  if (!isOpen) return null;

  const totalSubcategories = categories.reduce(
    (acc, cat) => acc + (cat.subcategories?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center">
              <Copy className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Clone Project</h2>
              <p className="text-sm text-slate-500">
                Copy structure from an existing project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Source Project Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Source Project
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 text-left flex items-center justify-between hover:border-slate-600 transition-colors"
                >
                  {selectedProject ? (
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-200">{selectedProject.name}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Select a project to clone...</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProjectDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-700 shadow-xl z-10 max-h-48 overflow-y-auto">
                    {projects.map(project => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setShowProjectDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-800 transition-colors ${
                          project.id === selectedProjectId ? 'bg-slate-800' : ''
                        }`}
                      >
                        <Folder className="w-4 h-4 text-cyan-400" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-slate-500 truncate">{project.description}</p>
                          )}
                        </div>
                        {project.id === selectedProjectId && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project Preview */}
            {selectedProjectId && (
              <div className="p-4 bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-3">
                  <Folder className="w-3 h-3" />
                  <span>Project Structure Preview</span>
                </div>

                {loadingPreview ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                  </div>
                ) : categories.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {categories.map(cat => (
                      <div key={cat.id}>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                          {cat.name}
                          {cat.subcategories && cat.subcategories.length > 0 && (
                            <span className="text-xs text-slate-500">
                              ({cat.subcategories.length} subcategories)
                            </span>
                          )}
                        </div>
                        {options.includeSubcategories && cat.subcategories && cat.subcategories.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {cat.subcategories.slice(0, 3).map(sub => (
                              <div key={sub.id} className="flex items-center gap-2 text-xs text-slate-500">
                                <div className="w-1 h-1 bg-slate-600 rounded-full" />
                                {sub.name}
                              </div>
                            ))}
                            {cat.subcategories.length > 3 && (
                              <span className="text-xs text-slate-600 ml-3">
                                +{cat.subcategories.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No categories in this project</p>
                )}

                {/* Stats summary */}
                <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700">
                  <span className="text-xs text-slate-500">
                    {categories.length} categories
                  </span>
                  <span className="text-xs text-slate-500">
                    {totalSubcategories} subcategories
                  </span>
                </div>
              </div>
            )}

            {/* Clone Options */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                What to Clone
              </label>
              <div className="space-y-2">
                {[
                  { key: 'includeCategories' as const, label: 'Categories', description: 'Copy all category structure' },
                  { key: 'includeSubcategories' as const, label: 'Subcategories', description: 'Include subcategories within categories', disabled: !options.includeCategories },
                  { key: 'includeSettings' as const, label: 'Project Settings', description: 'Copy positioning statement, rules, and configuration' },
                  { key: 'includeBusinessProfile' as const, label: 'Business Profile', description: 'Copy analyzed business profile data (if available)' },
                ].map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => !option.disabled && toggleOption(option.key)}
                    disabled={option.disabled}
                    className={`w-full p-3 text-left border transition-colors flex items-center gap-3 ${
                      option.disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-900/50 border-slate-800'
                        : options[option.key]
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${
                      options[option.key]
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-600'
                    }`}>
                      {options[option.key] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* New Project Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  New Project Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your project..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedProjectId || !newName.trim()}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-wider py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Clone Project
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-3 px-4 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CloneProjectModal;
