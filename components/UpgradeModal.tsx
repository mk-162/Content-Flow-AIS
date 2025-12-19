import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, Crown, TrendingUp, BarChart3, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'articles' | 'categories' | 'titles' | 'general';
  currentUsage?: {
    articles?: number;
    categories?: number;
    titles?: number;
  };
  limits?: {
    articles: number;
    categories: number;
    titles: number;
  };
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  limitType,
  currentUsage = {},
  limits = { articles: 5, categories: 10, titles: 20 }
}) => {
  const limitMessages = {
    articles: {
      title: "You've reached your article limit",
      description: "Upgrade to generate unlimited AI-powered articles.",
      icon: Sparkles
    },
    categories: {
      title: "Category limit reached",
      description: "Upgrade for unlimited content categories.",
      icon: BarChart3
    },
    titles: {
      title: "Title generation limit reached",
      description: "Upgrade to generate unlimited article titles.",
      icon: TrendingUp
    },
    general: {
      title: "Upgrade to unlock more features",
      description: "Get unlimited access to all MissionContent features.",
      icon: Crown
    }
  };

  const message = limitMessages[limitType];
  const IconComponent = message.icon;

  const proFeatures = [
    "Unlimited AI article generation",
    "Unlimited content categories",
    "Real search volume data (DataForSEO)",
    "SERP competitor analysis",
    "Priority support",
    "WordPress integration"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500/10 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{message.title}</h2>
                    <p className="text-sm text-slate-400">{message.description}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="p-6 border-b border-slate-800 bg-slate-800/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Your Free Tier Usage</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {currentUsage.articles || 0}/{limits.articles}
                  </div>
                  <p className="text-xs text-slate-500">Articles</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {currentUsage.categories || 0}/{limits.categories}
                  </div>
                  <p className="text-xs text-slate-500">Categories</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {currentUsage.titles || 0}/{limits.titles}
                  </div>
                  <p className="text-xs text-slate-500">Titles</p>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="p-6">
              <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border border-cyan-500/30 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-cyan-400" />
                  <span className="text-lg font-bold text-white">Pro Plan</span>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded">
                    RECOMMENDED
                  </span>
                </div>

                <ul className="space-y-2 mb-6">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check size={14} className="text-cyan-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    // TODO: Navigate to billing page when built
                    alert('Billing page coming soon!');
                  }}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 px-4 font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  Upgrade to Pro
                </button>

                <p className="text-center text-xs text-slate-500 mt-3">
                  Cancel anytime. No contracts.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={onClose}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
