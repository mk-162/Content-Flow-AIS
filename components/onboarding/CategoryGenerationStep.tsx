import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderTree, X, Plus, ChevronRight, TrendingUp, Target, Lightbulb, RefreshCw, BarChart3, Zap, Info, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { generateOnboardingCategories } from '../../services/websiteAnalysisService';
import { CategorySuggestion } from '../../types';

// ============================================================================
// FUN LOADING MESSAGES
// ============================================================================

const LOADING_MESSAGES = [
  {
    emoji: '🧠',
    text: 'Brainstorming killer content ideas...',
  },
  {
    emoji: '🎯',
    text: 'Finding the topics your audience actually cares about...',
  },
  {
    emoji: '✨',
    text: 'Crafting categories that spark curiosity...',
  },
  {
    emoji: '🔥',
    text: 'Hunting for content goldmines...',
  },
  {
    emoji: '🚀',
    text: 'Mapping out your content empire...',
  },
  {
    emoji: '💡',
    text: 'Connecting the dots between ideas...',
  },
];

// ============================================================================
// SKELETON LOADER COMPONENT
// ============================================================================

const CategorySkeleton: React.FC = () => (
  <div className="p-4 border border-slate-800 bg-slate-900/30 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-5 h-5 bg-slate-800 rounded" />
      <div className="flex-1">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-3" />
        <div className="h-3 bg-slate-800/50 rounded w-full mb-2" />
        <div className="h-3 bg-slate-800/50 rounded w-2/3" />
      </div>
    </div>
  </div>
);

// ============================================================================
// HELPER FUNCTIONS FOR PLACEHOLDER DATA
// ============================================================================

// Generate placeholder metrics for mockup (will be replaced with real DataForSEO data)
const generatePlaceholderMetrics = (categoryName: string) => {
  // Use category name as seed for consistent random values
  const seed = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);

  return {
    searchVolume: Math.floor(random(1000, 45000)),
    difficulty: Math.floor(random(25, 75)),
    trend: ['rising', 'stable', 'declining'][Math.floor(random(0, 2.5))] as 'rising' | 'stable' | 'declining',
    trafficPotential: Math.floor(random(200, 8000)),
    competitorCount: Math.floor(random(15, 60))
  };
};

// Format number with K/M suffix
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// ============================================================================
// CATEGORY CARD COMPONENT
// ============================================================================

interface CategoryCardProps {
  category: CategorySuggestion;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<CategorySuggestion>) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onToggle, onRemove, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editDesc, setEditDesc] = useState(category.description);

  // Generate or use existing placeholder metrics
  const metrics = category.searchVolume !== undefined
    ? {
        searchVolume: category.searchVolume || 0,
        difficulty: category.difficulty || 50,
        trend: category.trend || 'stable',
        trafficPotential: category.trafficPotential || 0,
        competitorCount: category.competitorCount || 0
      }
    : generatePlaceholderMetrics(category.name);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate({ name: editName.trim(), description: editDesc.trim() });
      setIsEditing(false);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 30) return 'text-green-400';
    if (difficulty < 50) return 'text-cyan-400';
    if (difficulty < 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 30) return 'Easy';
    if (difficulty < 50) return 'Medium';
    if (difficulty < 70) return 'Hard';
    return 'Very Hard';
  };

  const TrendIcon = metrics.trend === 'rising' ? ArrowUpRight : metrics.trend === 'declining' ? ArrowDownRight : Minus;
  const trendColor = metrics.trend === 'rising' ? 'text-green-400' : metrics.trend === 'declining' ? 'text-red-400' : 'text-slate-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        relative p-4 border transition-colors
        ${category.selected
          ? 'bg-slate-900 border-slate-700'
          : 'bg-slate-950 border-slate-800 opacity-60'
        }
      `}
    >
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 text-slate-600 hover:text-red-400 transition-colors"
        title="Remove category"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`
            w-5 h-5 mt-0.5 border-2 flex items-center justify-center flex-shrink-0
            ${category.selected
              ? 'border-cyan-500 bg-cyan-500'
              : 'border-slate-600 hover:border-slate-500'
            }
          `}
        >
          {category.selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Category name..."
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (what content belongs in this category?)..."
                rows={3}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-500"
                >
                  Save
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditName(category.name); setEditDesc(category.description); }}
                  className="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1 group/title">
                <h3 className="font-semibold text-white">{category.name}</h3>
                {category.isUserAdded && (
                  <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] uppercase">
                    Custom
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
                  title="Edit Category"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              {category.description && (
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">{category.description}</p>
              )}
            </>
          )}

          {/* NEW: Enhanced Metrics Grid */}
          {!isEditing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-800">
              {/* Monthly Searches */}
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-white">{formatNumber(metrics.searchVolume)}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Searches/mo</p>
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-2">
                <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                <div>
                  <p className={`text-sm font-medium capitalize ${trendColor}`}>{metrics.trend}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Trend</p>
                </div>
              </div>

              {/* Difficulty */}
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <p className={`text-sm font-medium ${getDifficultyColor(metrics.difficulty)}`}>
                    {getDifficultyLabel(metrics.difficulty)} <span className="text-slate-500">({metrics.difficulty})</span>
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">Difficulty</p>
                </div>
              </div>

              {/* Traffic Potential */}
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-500" />
                <div>
                  <p className="text-sm font-medium text-cyan-400">~{formatNumber(metrics.trafficPotential)}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Traffic/mo</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Source Indicator */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-2">
              {category.dataSource === 'dataforseo' ? (
                <span className="text-[10px] text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Real data
                </span>
              ) : (
                <span className="text-[10px] text-yellow-500 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  Estimated
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CategoryGenerationStep: React.FC = () => {
  const {
    session,
    toggleCategory,
    addCustomCategory,
    removeCategory,
    updateCategory,
    generateMoreCategories,
    nextStep,
    previousStep,
    loading,
  } = useOnboarding();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isGeneratingInitial, setIsGeneratingInitial] = useState(false);

  const categories = session?.categories || [];
  const selectedCount = categories.filter(c => c.selected).length;
  const profile = session?.businessProfile;
  const projectName = session?.selectedProject?.name || 'Your Project';

  // Generate initial categories if empty
  useEffect(() => {
    const generateInitial = async () => {
      // Wait for selectedProject to be set (either from selection or auto-assigned)
      if (categories.length === 0 && profile && session?.selectedProject && !isGeneratingInitial && !loading) {
        setIsGeneratingInitial(true);
        console.log('[CategoryGeneration] Auto-generating initial categories for:', session.selectedProject.name);
        try {
          await generateMoreCategories();
        } catch (err) {
          console.error('[CategoryGeneration] Failed to generate initial categories:', err);
        } finally {
          setIsGeneratingInitial(false);
        }
      }
    };
    generateInitial();
  }, [profile, session?.selectedProject, loading]);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCustomCategory(newCategoryName.trim(), newCategoryDesc.trim());
      setNewCategoryName('');
      setNewCategoryDesc('');
      setShowAddForm(false);
    }
  };

  // Rotate loading messages
  const [currentMessage, setCurrentMessage] = useState(0);
  useEffect(() => {
    if (loading && categories.length === 0) {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading, categories.length]);

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
          Step 2 of 2: Define Your Categories
        </div>

        {/* Value Proposition */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div>
              <h2 className="font-bold text-white mb-2">Build Your Content Empire</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Great content starts with smart categories. Think of each one as a home for stories your audience is already searching for.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                The best categories feel like a gateway to exploration—inspiring both readers and writers alike.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">
          Define your content categories for <span className="text-cyan-400">{projectName}</span>
        </h1>
        <p className="text-slate-400">
          Categories are the main topics your content will cover. We'll generate subcategories and article ideas from these.
        </p>
      </motion.div>

      {/* Categories List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3 mb-6"
      >
        {(loading && categories.length === 0) ? (
          <div className="space-y-6">
            {/* Fun Loading Messages */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-4xl mb-3">
                    {LOADING_MESSAGES[currentMessage].emoji}
                  </span>
                  <p className="text-lg text-slate-300 font-medium">
                    {LOADING_MESSAGES[currentMessage].text}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center justify-center gap-2 mt-6">
                {LOADING_MESSAGES.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentMessage ? 'bg-cyan-500' : 'bg-slate-700'}`}
                  />
                ))}
              </div>
            </div>

            {/* Time estimate */}
            <div className="text-center">
              <p className="text-xs text-slate-600">Usually takes 10-15 seconds</p>
            </div>

            {/* Skeleton Loaders */}
            <div className="space-y-3">
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onToggle={() => toggleCategory(category.id)}
                onRemove={() => removeCategory(category.id)}
                onUpdate={(updates) => updateCategory(category.id, updates)}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Add Custom Category */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full p-3 border border-dashed border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add custom category
          </button>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 p-4">
            <div className="space-y-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                >
                  Add Category
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCategoryName('');
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Generate More Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center mb-8"
      >
        <button
          onClick={generateMoreCategories}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Generate 5 More Categories
        </button>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/50 border border-slate-800 p-4 mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">
              <span className="text-white font-bold">{selectedCount}</span> categories selected
            </span>
          </div>
          <TrendingUp className="w-4 h-4 text-cyan-400" />
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        {/* Warning if no categories selected */}
        {categories.length > 0 && selectedCount === 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
            Please select at least one category to continue
          </div>
        )}

        {/* Error if no categories generated and not loading */}
        {categories.length === 0 && !loading && !isGeneratingInitial && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            No categories generated. Please click "Generate 5 More Categories" or add a custom category.
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={previousStep}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={loading || isGeneratingInitial || selectedCount === 0}
            className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save & Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {selectedCount === 0
            ? 'Select at least one category to continue'
            : 'Next: Generate subcategories for your selected categories'
          }
        </p>
      </motion.div>
    </div>
  );
};

export default CategoryGenerationStep;
