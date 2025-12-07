import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, FileText, Compass, BookOpen } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const WorkspaceIntroStep: React.FC = () => {
  const { session, clearSession } = useOnboarding();
  const navigate = useNavigate();

  const categories = session?.categories.filter(c => c.selected) || [];
  const subcategories = session?.subcategories || {};
  const projectName = session?.selectedProject?.name || 'Your Project';

  // Calculate totals
  const totalSubcategories = Object.values(subcategories).flat().length;
  const totalArticles = Object.values(subcategories)
    .flat()
    .reduce((sum, sub) => sum + sub.estimatedArticles, 0);

  const handleStartCreating = () => {
    // Clear onboarding session and redirect to main workspace
    clearSession();
    navigate('/');
  };

  const handleTakeTour = () => {
    // TODO: Implement tour
    clearSession();
    navigate('/');
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center"
      >
        <Check className="w-10 h-10 text-white" />
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          Your content workspace is ready!
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Welcome to ContentFlow AI
        </h1>
        <p className="text-slate-400">
          You've set up your first content project. Let's start creating!
        </p>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900 border border-slate-800 p-6 mb-8 text-left"
      >
        <h2 className="font-bold text-white mb-4">{projectName}</h2>

        <div className="space-y-2 mb-4">
          {categories.slice(0, 5).map((cat, i) => (
            <div key={cat.id} className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-1 h-4 bg-cyan-500" />
              <span>{cat.name}</span>
              {subcategories[cat.id]?.length > 0 && (
                <span className="text-slate-600">
                  ({subcategories[cat.id].length} subcategories)
                </span>
              )}
            </div>
          ))}
          {categories.length > 5 && (
            <p className="text-xs text-slate-600 ml-3">
              + {categories.length - 5} more categories
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            <span className="text-cyan-400 font-bold">~{totalArticles}</span> potential articles mapped
          </span>
          <span className="text-slate-500">
            <span className="text-white font-bold">5</span> free articles available
          </span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <p className="text-sm text-slate-500 mb-4">What would you like to do first?</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleStartCreating}
            className="p-4 bg-cyan-600 hover:bg-cyan-500 transition-colors text-left group"
          >
            <FileText className="w-6 h-6 text-white mb-2" />
            <h3 className="font-semibold text-white mb-1">Generate First Article</h3>
            <p className="text-xs text-cyan-200/70">
              Start creating content immediately
            </p>
            <div className="mt-2 flex items-center text-xs text-white/80 group-hover:text-white">
              Quick start <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </button>

          <button
            onClick={handleTakeTour}
            className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-left group"
          >
            <Compass className="w-6 h-6 text-slate-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">Take a Quick Tour</h3>
            <p className="text-xs text-slate-400">
              Learn how to use the workspace
            </p>
            <div className="mt-2 flex items-center text-xs text-slate-500 group-hover:text-slate-300">
              2 min tour <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </button>
        </div>
      </motion.div>

      {/* Free Tier Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-900/50 border border-slate-800 p-4 text-sm text-slate-500"
      >
        <BookOpen className="w-4 h-4 inline mr-2" />
        You have <span className="text-cyan-400 font-medium">5 free articles</span> to generate.
        Upgrade anytime for unlimited content generation.
      </motion.div>
    </div>
  );
};

export default WorkspaceIntroStep;
