import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Check, ArrowRight } from 'lucide-react';

interface UpgradeLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'categories' | 'articles' | 'credits' | 'projects';
  currentUsage: number;
  limit: number;
}

export const UpgradeLimitModal: React.FC<UpgradeLimitModalProps> = ({
  isOpen,
  onClose,
  limitType,
  currentUsage,
  limit,
}) => {
  const navigate = useNavigate();

  const limitMessages = {
    categories: {
      title: 'Category Limit Reached',
      description: `You've created ${currentUsage} of ${limit} categories available on the free plan.`,
      cta: 'Upgrade to create unlimited categories',
    },
    articles: {
      title: 'Article Limit Reached',
      description: `You've generated ${currentUsage} of ${limit} articles available on the free plan.`,
      cta: 'Upgrade for unlimited AI-generated content',
    },
    credits: {
      title: 'Free Credits Used',
      description: `You've used ${currentUsage} of your ${limit} free credits.`,
      cta: 'Upgrade to continue generating content',
    },
    projects: {
      title: 'Project Limit Reached',
      description: `You've created ${currentUsage} of ${limit} projects available on the free plan.`,
      cta: 'Upgrade to create more projects',
    },
  };

  const message = limitMessages[limitType];

  const handleUpgrade = () => {
    onClose();
    navigate('/upgrade');
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{message.title}</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-slate-400 mb-6">{message.description}</p>

                {/* Usage Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Usage</span>
                    <span className="text-amber-400 font-medium">{currentUsage} / {limit}</span>
                  </div>
                  <div className="h-2 bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Pro Benefits */}
                <div className="bg-slate-800/50 border border-slate-700 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">Upgrade to Pro</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-slate-400">
                      <Check className="w-4 h-4 text-green-400" />
                      Unlimited categories and subcategories
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <Check className="w-4 h-4 text-green-400" />
                      Unlimited AI-generated articles
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <Check className="w-4 h-4 text-green-400" />
                      Advanced SEO analysis
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <Check className="w-4 h-4 text-green-400" />
                      Priority support
                    </li>
                  </ul>
                </div>

                {/* CTA */}
                <button
                  onClick={handleUpgrade}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  {message.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2 mt-3 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpgradeLimitModal;
