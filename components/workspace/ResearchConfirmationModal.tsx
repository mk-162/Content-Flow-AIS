import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, X, Clock, Coins, Search, Users, TrendingUp, BookOpen, Quote, Lightbulb } from 'lucide-react';

interface ResearchConfirmationModalProps {
  categoryName: string;
  creditCost?: number;
  currentCredits: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const RESEARCH_BENEFITS = [
  { icon: Search, text: 'Search landscape analysis' },
  { icon: TrendingUp, text: 'Competitor content gaps' },
  { icon: Users, text: 'Target audience insights' },
  { icon: BookOpen, text: 'Data-backed keyword recommendations' },
  { icon: Quote, text: 'Expert sources to cite' },
  { icon: Lightbulb, text: 'Content opportunity discovery' },
];

export const ResearchConfirmationModal: React.FC<ResearchConfirmationModalProps> = ({
  categoryName,
  creditCost = 20,
  currentCredits,
  onConfirm,
  onCancel,
}) => {
  const hasEnoughCredits = currentCredits >= creditCost;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-900 border border-zinc-800 shadow-2xl max-w-lg w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/20 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Run Deep Research</h2>
                <p className="text-sm text-zinc-400">for "{categoryName}"</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-5">
            {/* Description */}
            <p className="text-sm text-zinc-300 leading-relaxed">
              Our AI will analyze market trends, competitor content, and search patterns
              to optimize your content strategy for this category.
            </p>

            {/* Benefits list */}
            <div className="bg-zinc-800/50 border border-zinc-700/50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                What you'll get
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RESEARCH_BENEFITS.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <benefit.icon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-zinc-300">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time and cost callouts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 border border-zinc-700/50 p-4 text-center">
                <Clock className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">5-10 min</p>
                <p className="text-xs text-zinc-500">Processing time</p>
              </div>
              <div className={`border p-4 text-center ${
                hasEnoughCredits
                  ? 'bg-zinc-800/50 border-zinc-700/50'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <Coins className={`w-5 h-5 mx-auto mb-2 ${
                  hasEnoughCredits ? 'text-cyan-400' : 'text-red-400'
                }`} />
                <p className="text-lg font-bold text-white">{creditCost} credits</p>
                <p className={`text-xs ${hasEnoughCredits ? 'text-zinc-500' : 'text-red-400'}`}>
                  {hasEnoughCredits
                    ? `You have ${currentCredits} credits`
                    : `Need ${creditCost - currentCredits} more`
                  }
                </p>
              </div>
            </div>

            {/* Reassurance */}
            <div className="flex items-start gap-2 p-3 bg-violet-500/10 border border-violet-500/20">
              <Lightbulb className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-300">
                You can navigate away - we'll notify you when the research is complete.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!hasEnoughCredits}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-medium transition-all ${
                hasEnoughCredits
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              Start Research ({creditCost} cr)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResearchConfirmationModal;
