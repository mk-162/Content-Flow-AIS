import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const DemoOutputStep: React.FC = () => {
  const { session, nextStep, loading } = useOnboarding();

  const profile = session?.businessProfile;
  const demoArticle = session?.demoArticle;
  const contentGaps = profile?.opportunityScore.contentGaps || 100;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          Here's a taste of what we can do...
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Your First Content Preview
        </h1>
        <p className="text-slate-400">
          Based on your profile, we've generated a sample article in your brand voice
        </p>
      </motion.div>

      {/* Article Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900 border border-slate-700 mb-6"
      >
        {/* Article Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs text-cyan-400 uppercase tracking-wider mb-3">
            <FileText className="w-4 h-4" />
            Article Preview
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {demoArticle?.title || 'Sample Article Title'}
          </h2>
        </div>

        {/* Article Content Preview */}
        <div className="p-6 border-b border-slate-800">
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
              {demoArticle?.preview || 'Sample content preview...'}
            </p>
          </div>
        </div>

        {/* Article Outline */}
        {demoArticle?.outline && demoArticle.outline.length > 0 && (
          <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              Full Article Outline
            </h3>
            <ul className="space-y-2">
              {demoArticle.outline.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-300 text-sm">
                  <span className="text-cyan-400 font-medium">{index + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Locked Content Indicator */}
        <div className="p-6 bg-slate-950/50">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Lock className="w-4 h-4" />
            <span className="text-sm">
              Full article available after creating your free account
            </span>
          </div>
        </div>
      </motion.div>

      {/* Opportunity Reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-cyan-500/5 border border-cyan-500/20 p-4 mb-6 text-center"
      >
        <p className="text-sm text-slate-300">
          This is just <span className="text-cyan-400 font-bold">ONE</span> of the{' '}
          <span className="text-cyan-400 font-bold">{contentGaps} content opportunities</span>{' '}
          we identified for your business.
        </p>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <button
          onClick={nextStep}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          Continue to Project Setup
          <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
};

export default DemoOutputStep;
