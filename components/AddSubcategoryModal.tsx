import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, RefreshCw, Loader2, TrendingUp, Check } from 'lucide-react';
import { Category, Project, SubcategorySuggestion } from '../types';
import { suggestCategories } from '../services/geminiService';

interface AddSubcategoryModalProps {
  parentCategory: Category;
  existingCategories: Category[];
  project: Project;
  organizationId: string;
  onAddSubcategory: (name: string, description: string, targetArticles?: number) => void;
  onAddMultipleSubcategories: (subcategories: Array<{ name: string; description: string; targetArticles?: number }>) => void;
  onClose: () => void;
}

export const AddSubcategoryModal: React.FC<AddSubcategoryModalProps> = ({
  parentCategory,
  existingCategories,
  project,
  organizationId,
  onAddSubcategory,
  onAddMultipleSubcategories,
  onClose
}) => {
  const [mode, setMode] = useState<'quick' | 'ai'>('ai');
  const [quickName, setQuickName] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [suggestions, setSuggestions] = useState<SubcategorySuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetArticles, setTargetArticles] = useState(
    project.settings?.autoGeneration?.stubThreshold ?? 5
  );

  // Get existing subcategory names for this parent
  const existingSubcategoryNames = existingCategories
    .filter(c => c.parentId === parentCategory.id)
    .map(c => c.name.toLowerCase());

  // Load AI suggestions automatically when modal opens (since AI tab is default)
  useEffect(() => {
    if (mode === 'ai' && suggestions.length === 0 && !isLoading) {
      loadSuggestions();
    }
  }, []); // Only run on mount

  const loadSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // suggestCategories(query, parentCategoryName, organizationId, projectId, parentCategoryDescription)
      const result = await suggestCategories(
        project.businessProfile?.targetAudience?.primary || project.websiteUrl || 'content',
        parentCategory.name,
        organizationId,
        project.id,
        parentCategory.description
      );

      // Map AI suggestions to our format (AI only provides name/description/reason)
      const mappedSuggestions: SubcategorySuggestion[] = result.map((s, index) => ({
        id: `suggestion-${index}`,
        parentCategoryId: parentCategory.id,
        name: s.name,
        description: s.description || s.reason || '',
        demandScore: 70, // Default - would need research API for real data
        demandLevel: 'Medium' as const,
        audienceMatch: 'medium' as const,
        selected: false,
        estimatedArticles: 5
      }));

      setSuggestions(mappedSuggestions);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setError('Failed to load suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleQuickAdd = () => {
    if (!quickName.trim()) return;
    onAddSubcategory(quickName.trim(), quickDescription.trim(), targetArticles);
    onClose();
  };

  const handleAddSelected = () => {
    const selected = suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .map(s => ({
        name: s.name,
        description: s.description,
        targetArticles
      }));

    if (selected.length > 0) {
      onAddMultipleSubcategories(selected);
      onClose();
    }
  };

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'High':
      case 'Very High':
        return 'text-emerald-400';
      case 'Medium':
      case 'Medium-High':
        return 'text-amber-400';
      case 'Low':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  const getDemandBars = (score: number) => {
    const filled = Math.round((score / 100) * 10);
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-3 ${i < filled ? 'bg-emerald-500' : 'bg-slate-700'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 flex items-center justify-center">
                <Plus className="text-purple-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Add Subcategory</h2>
                <p className="text-sm text-slate-500">to "{parentCategory.name}"</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === 'quick'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Quick Add
          </button>
          <button
            onClick={() => {
              setMode('ai');
              if (suggestions.length === 0 && !isLoading) {
                loadSuggestions();
              }
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
              mode === 'ai'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles size={14} />
            AI Suggestions
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {mode === 'quick' ? (
              <motion.div
                key="quick"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Subcategory Name
                  </label>
                  <input
                    type="text"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="e.g., Kitchen Renovations"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Description <span className="text-slate-600">(optional)</span>
                  </label>
                  <textarea
                    value={quickDescription}
                    onChange={(e) => setQuickDescription(e.target.value)}
                    placeholder="Brief description of what this subcategory covers..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Content Target: <span className="text-cyan-400">{targetArticles} articles</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={targetArticles}
                    onChange={(e) => setTargetArticles(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                    style={{
                      background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(targetArticles / 25) * 100}%, #1e293b ${(targetArticles / 25) * 100}%, #1e293b 100%)`
                    }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ai"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={32} className="text-purple-400 animate-spin mb-4" />
                    <p className="text-sm text-slate-400">Analyzing "{parentCategory.name}"...</p>
                    <p className="text-xs text-slate-500 mt-1">Finding relevant subcategories</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                      onClick={loadSuggestions}
                      className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider hover:bg-purple-600/30 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={14} />
                      Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-400">
                        Select subcategories to add:
                      </p>
                      <button
                        onClick={loadSuggestions}
                        className="p-2 hover:bg-slate-800 transition-colors text-slate-400 hover:text-purple-400"
                        title="Refresh suggestions"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => toggleSuggestion(suggestion.id)}
                          className={`w-full p-4 border transition-all text-left ${
                            selectedSuggestions.has(suggestion.id)
                              ? 'bg-purple-500/10 border-purple-500/50'
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                                  selectedSuggestions.has(suggestion.id)
                                    ? 'bg-purple-500 border-purple-500'
                                    : 'border-slate-600'
                                }`}>
                                  {selectedSuggestions.has(suggestion.id) && (
                                    <Check size={14} className="text-white" />
                                  )}
                                </div>
                                <span className="font-medium text-white">{suggestion.name}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 ml-7">
                                {suggestion.description}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-xs font-bold ${getDemandColor(suggestion.demandLevel)}`}>
                                {suggestion.demandLevel} demand
                              </div>
                              <div className="mt-1">
                                {getDemandBars(suggestion.demandScore)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {suggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Content target for new subcategories: <span className="text-cyan-400">{targetArticles} articles each</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={targetArticles}
                          onChange={(e) => setTargetArticles(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                          style={{
                            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(targetArticles / 25) * 100}%, #1e293b ${(targetArticles / 25) * 100}%, #1e293b 100%)`
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          {mode === 'quick' ? (
            <button
              onClick={handleQuickAdd}
              disabled={!quickName.trim()}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              Create Subcategory
            </button>
          ) : (
            <button
              onClick={handleAddSelected}
              disabled={selectedSuggestions.size === 0}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              Add Selected ({selectedSuggestions.size})
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AddSubcategoryModal;
