import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// GLOBAL ONBOARDING PROGRESS INDICATOR
// Section 7: Modern Design Patterns - Global Progress Bar
// ============================================================================

interface OnboardingProgressBarProps {
  currentStep: string;
  steps: string[];
  visible?: boolean;
}

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  currentStep,
  steps,
  visible = true
}) => {
  if (!visible) return null;

  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex < 0) return null;

  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-800/80">
      <motion.div
        className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Animated glow effect at the progress tip */}
      <motion.div
        className="absolute top-0 h-1 w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent"
        initial={{ left: 0 }}
        animate={{ left: `calc(${progress}% - 16px)` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

export default OnboardingProgressBar;
