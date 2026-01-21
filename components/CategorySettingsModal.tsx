import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Sparkles, Target, RefreshCw, Info } from 'lucide-react';
import { Category, Project } from '../types';

interface CategorySettingsModalProps {
  category: Category;
  project: Project;
  onSave: (categoryId: string, settings: Category['contentSettings']) => void;
  onClose: () => void;
  onQueueTitles?: (categoryId: string, count: number) => void;
  onQueueResearch?: (categoryId: string) => void;
}

export const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({
  category,
  project,
  onSave,
  onClose,
  onQueueTitles,
  onQueueResearch
}) => {
  const projectDefault = project.settings?.autoGeneration?.stubThreshold ?? 5;

  const [useCustomTarget, setUseCustomTarget] = useState(
    category.contentSettings?.targetArticles !== undefined
  );
  const [targetArticles, setTargetArticles] = useState(
    category.contentSettings?.targetArticles ?? projectDefault
  );
  const [rollUpSubcategories, setRollUpSubcategories] = useState(
    category.contentSettings?.rollUpSubcategories ?? true
  );
  const [autoReplenish, setAutoReplenish] = useState(
    category.contentSettings?.autoReplenish ?? true
  );

  const handleSave = () => {
    const settings: Category['contentSettings'] = useCustomTarget
      ? {
          targetArticles,
          rollUpSubcategories,
          autoReplenish
        }
      : undefined;

    onSave(category.id, settings);
    onClose();
  };

  const effectiveTarget = useCustomTarget ? targetArticles : projectDefault;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center">
                <Settings className="text-cyan-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Category Settings</h2>
                <p className="text-sm text-slate-500">{category.name}</p>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Content Target Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Content Target
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              How many articles do you want in this category?
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  checked={!useCustomTarget}
                  onChange={() => setUseCustomTarget(false)}
                  className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm text-white">Use project default</span>
                  <span className="ml-2 text-sm text-slate-500">({projectDefault} articles)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  checked={useCustomTarget}
                  onChange={() => setUseCustomTarget(true)}
                  className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-white">Custom target</span>
              </label>
            </div>

            {useCustomTarget && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 pl-7"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Articles target:</span>
                  <span className="text-2xl font-bold text-cyan-400 font-mono">{targetArticles}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={targetArticles}
                  onChange={(e) => setTargetArticles(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(targetArticles / 50) * 100}%, #1e293b ${(targetArticles / 50) * 100}%, #1e293b 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
                  <span>1</span>
                  <span>50</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Subcategory Rollup */}
          <div className="border-t border-slate-800 pt-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rollUpSubcategories}
                onChange={(e) => setRollUpSubcategories(e.target.checked)}
                className="mt-1 w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 focus:ring-cyan-500"
              />
              <div>
                <span className="text-sm text-white group-hover:text-cyan-300 transition-colors">
                  Include subcategory articles in count
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  When enabled, articles in subcategories count toward this category's target.
                </p>
              </div>
            </label>
          </div>

          {/* Auto-Replenishment */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={16} className="text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Auto-Replenishment
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              When articles are published, automatically generate new stubs to maintain target?
            </p>

            <div className="flex gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  checked={autoReplenish}
                  onChange={() => setAutoReplenish(true)}
                  className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-white">Yes, maintain target</span>
              </label>

              <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  checked={!autoReplenish}
                  onChange={() => setAutoReplenish(false)}
                  className="w-4 h-4 text-slate-500 bg-slate-800 border-slate-600 focus:ring-slate-500"
                />
                <span className="text-sm text-white">No, manual only</span>
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-slate-800/50 border border-slate-700 p-4 flex gap-3">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Effective target: <span className="text-cyan-400 font-bold">{effectiveTarget} articles</span>
              {rollUpSubcategories && category.parentId === null && (
                <span className="text-slate-500"> (includes subcategory content)</span>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex gap-3">
          {onQueueResearch && (
            <button
              onClick={() => {
                onQueueResearch(category.id);
                onClose();
              }}
              className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider hover:bg-purple-600/30 transition-colors flex items-center gap-2"
            >
              <Sparkles size={14} />
              Research
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CategorySettingsModal;
