import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingTooltipProps {
  targetRef?: React.RefObject<HTMLElement>;
  onDismiss: () => void;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  targetRef,
  onDismiss,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Calculate position based on target element
    if (targetRef?.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2,
      });
    }
  }, [targetRef]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.removeItem('showOnboardingTooltip');
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Spotlight overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleDismiss}
          />

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: position.top || '50%',
              left: position.left || '50%',
              transform: 'translateX(-50%)',
            }}
            className="z-50 w-80"
          >
            {/* Arrow pointing up */}
            <div className="flex justify-center mb-1">
              <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-cyan-500" />
            </div>

            {/* Tooltip content */}
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-5 shadow-2xl shadow-cyan-900/50">
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 text-cyan-200 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-cyan-200" />
                <span className="text-sm font-semibold text-cyan-100 uppercase tracking-wider">
                  Welcome to Your Workspace
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Start by creating a category
              </h3>

              <p className="text-cyan-100 text-sm mb-4 leading-relaxed">
                Click the <strong className="text-white">+ Add Category</strong> button to create your first content category.
                Categories help organize your content and target specific keywords.
              </p>

              <div className="flex items-center gap-2 p-3 bg-white/10 mb-4">
                <div className="w-8 h-8 bg-cyan-500 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium">
                  Look for this button in the sidebar
                </span>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full py-2.5 bg-white hover:bg-cyan-50 text-cyan-700 font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
              >
                Got it, let's go!
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTooltip;
