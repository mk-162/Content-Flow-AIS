import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, X, RefreshCw, FolderTree, Check } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CategorySuggestion, SubcategorySuggestion } from '../../types';

// ============================================================================
// CATEGORY TREE ITEM
// ============================================================================

interface CategoryTreeItemProps {
  category: CategorySuggestion;
  subcategories: SubcategorySuggestion[];
  isExpanded: boolean;
  onToggle: () => void;
  onGenerateSubcategories: () => void;
  onToggleSubcategory: (subId: string) => void;
  onRemoveSubcategory: (subId: string) => void;
  onUpdateSubcategory: (subId: string, updates: Partial<SubcategorySuggestion>) => void;
  loading: boolean;
}

const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({
  category,
  subcategories,
  isExpanded,
  onToggle,
  onGenerateSubcategories,
  onToggleSubcategory,
  onRemoveSubcategory,
  onUpdateSubcategory,
  loading,
}) => {
  const hasSubcategories = subcategories.length > 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (sub: SubcategorySuggestion) => {
    setEditingId(sub.id);
    setEditName(sub.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdateSubcategory(editingId, { name: editName.trim() });
      setEditingId(null);
    }
  };

  return (
    <div className="border border-slate-800 mb-3">
      {/* Category Header */}
      <div className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/50 transition-colors">
        {/* Clickable area for toggle */}
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="font-medium text-white">{category.name}</span>
          {hasSubcategories && (
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs flex items-center gap-1">
              <Check className="w-3 h-3" />
              {subcategories.length} subcategories
            </span>
          )}
          {loading && !hasSubcategories && (
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs">
              Generating...
            </span>
          )}
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerateSubcategories}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Generate 5
          </button>
          <button
            onClick={() => {
              // TODO: Add subcategory manually
            }}
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subcategories List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800 bg-slate-950/50">
              {loading && subcategories.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Generating subcategories...</p>
                </div>
              ) : subcategories.length === 0 ? (
                <div className="p-4 text-center text-slate-600 text-sm">
                  No subcategories yet. Click "Generate 5" to create some.
                </div>
              ) : (
                <div className="p-2">
                  {subcategories.map((sub, index) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-2 hover:bg-slate-800/50 group"
                    >
                      <div className="flex items-center gap-3 ml-4 flex-1">
                        <div className="w-1 h-4 bg-slate-700" />
                        {editingId === sub.id ? (
                          <div className="flex gap-2 items-center flex-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                              autoFocus
                            />
                            <button
                              onClick={saveEdit}
                              className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-500"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-slate-300">{sub.name}</span>
                            <button
                              onClick={() => startEditing(sub)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
                              title="Edit Subcategory"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      {editingId !== sub.id && (
                        <button
                          onClick={() => onRemoveSubcategory(sub.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SubcategoryGenerationStep: React.FC = () => {
  const {
    session,
    generateSubcategories,
    toggleSubcategory,
    removeSubcategory,
    updateSubcategory,
    nextStep,
    previousStep,
    loading,
  } = useOnboarding();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(session?.categories.filter(c => c.selected).map(c => c.id) || [])
  );
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [generatedCategories, setGeneratedCategories] = useState<Set<string>>(new Set());
  const autoGenerateStarted = useRef(false);

  const categories = session?.categories.filter(c => c.selected) || [];
  const subcategories = session?.subcategories || {};

  // Auto-generate subcategories for all categories on mount
  useEffect(() => {
    if (autoGenerateStarted.current || categories.length === 0) return;
    autoGenerateStarted.current = true;

    const generateAll = async () => {
      for (const category of categories) {
        // Skip if already has subcategories
        if (subcategories[category.id]?.length > 0) {
          setGeneratedCategories(prev => new Set(prev).add(category.id));
          continue;
        }

        setLoadingCategory(category.id);
        try {
          await generateSubcategories(category.id);
          setGeneratedCategories(prev => new Set(prev).add(category.id));
        } catch (err) {
          console.error(`Failed to generate subcategories for ${category.name}:`, err);
        }
      }
      setLoadingCategory(null);
    };

    generateAll();
  }, [categories.length]);

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleGenerateSubcategories = async (categoryId: string) => {
    setLoadingCategory(categoryId);
    setExpandedCategories(prev => new Set(prev).add(categoryId));
    try {
      await generateSubcategories(categoryId);
      setGeneratedCategories(prev => new Set(prev).add(categoryId));
    } finally {
      setLoadingCategory(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-4">
          <FolderTree className="w-4 h-4" />
          Build Your Content Structure
        </div>

        <h1 className="text-2xl font-bold mb-2">
          Define Subcategories
        </h1>
        <p className="text-slate-400">
          Each category expands into specific topics. These become your content pillars
          — each subcategory can generate dozens of articles.
        </p>
      </motion.div>

      {/* Category Tree */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        {categories.map((category) => (
          <CategoryTreeItem
            key={category.id}
            category={category}
            subcategories={subcategories[category.id] || []}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleExpanded(category.id)}
            onGenerateSubcategories={() => handleGenerateSubcategories(category.id)}
            onToggleSubcategory={(subId) => toggleSubcategory(category.id, subId)}
            onRemoveSubcategory={(subId) => removeSubcategory(category.id, subId)}
            onUpdateSubcategory={(subId, updates) => updateSubcategory(category.id, subId, updates)}
            loading={loadingCategory === category.id}
          />
        ))}
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center gap-4"
      >
        <div className="flex justify-center gap-4">
          <button
            onClick={previousStep}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            Finish Setup
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SubcategoryGenerationStep;
