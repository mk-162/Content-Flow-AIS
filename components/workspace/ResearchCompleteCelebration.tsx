import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, FlaskConical, Search, TrendingUp, BookOpen, Target } from 'lucide-react';

interface ResearchCompleteCelebrationProps {
  show: boolean;
  categoryName: string;
  onComplete?: () => void;
  onViewReport?: () => void;
  onApplyToContent?: () => void;
  duration?: number;
  // Optional stats to display
  stats?: {
    keywordCount?: number;
    competitorGaps?: number;
    opportunities?: number;
    sources?: number;
  };
}

// Confetti particle component
const ConfettiParticle: React.FC<{ delay: number; x: number }> = ({ delay, x }) => (
  <motion.div
    className="absolute w-2 h-2"
    style={{ left: `${x}%` }}
    initial={{ y: -20, opacity: 1, rotate: 0 }}
    animate={{
      y: '100vh',
      opacity: [1, 1, 0],
      rotate: 720,
    }}
    transition={{
      duration: 2.5,
      delay,
      ease: 'easeIn',
    }}
  >
    <div
      className={`w-full h-full ${
        ['bg-violet-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'][
          Math.floor(Math.random() * 5)
        ]
      }`}
      style={{
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
      }}
    />
  </motion.div>
);

export const ResearchCompleteCelebration: React.FC<ResearchCompleteCelebrationProps> = ({
  show,
  categoryName,
  onComplete,
  onViewReport,
  onApplyToContent,
  duration = 5000,
  stats,
}) => {
  const [confetti, setConfetti] = useState<{ id: number; delay: number; x: number }[]>([]);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: Math.random() * 100,
      }));
      setConfetti(particles);

      // Show action buttons after a delay
      const actionsTimer = setTimeout(() => {
        setShowActions(true);
      }, 1500);

      // Auto-complete callback (but don't auto-dismiss if we have actions)
      const completeTimer = setTimeout(() => {
        if (!onViewReport && !onApplyToContent) {
          onComplete?.();
        }
      }, duration);

      return () => {
        clearTimeout(actionsTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setShowActions(false);
    }
  }, [show, duration, onComplete, onViewReport, onApplyToContent]);

  // Default stats if not provided
  const displayStats = stats || {
    keywordCount: Math.floor(Math.random() * 500) + 200,
    competitorGaps: Math.floor(Math.random() * 15) + 5,
    opportunities: Math.floor(Math.random() * 12) + 8,
    sources: Math.floor(Math.random() * 10) + 5,
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onComplete}
        >
          {/* Confetti */}
          {confetti.map((p) => (
            <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
          ))}

          {/* Center content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative text-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated rings */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ top: -60 }}
            >
              <motion.div
                className="w-32 h-32 border-2 border-emerald-400/30 rounded-full"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1, repeat: 2, repeatDelay: 0.5 }}
              />
            </motion.div>

            {/* Main badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="relative inline-block mb-6"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </motion.div>
              </div>

              {/* Sparkle icons */}
              <motion.div
                className="absolute -top-2 -right-2"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 20 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles className="w-6 h-6 text-amber-400" />
              </motion.div>
              <motion.div
                className="absolute -bottom-1 -left-3"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: -15 }}
                transition={{ delay: 0.6 }}
              >
                <FlaskConical className="w-5 h-5 text-violet-400" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Research Complete!
            </motion.h2>

            {/* Category name */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-zinc-400 mb-6"
            >
              "{categoryName}" is now supercharged
            </motion.p>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-zinc-900/80 border border-zinc-700/50 p-4 mb-6 max-w-md mx-auto"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                Discoveries
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-zinc-300">
                    {displayStats.keywordCount} keywords
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">
                    {displayStats.competitorGaps} gaps found
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-zinc-300">
                    {displayStats.opportunities} opportunities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-zinc-300">
                    {displayStats.sources} sources
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <AnimatePresence>
              {showActions && (onViewReport || onApplyToContent) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center justify-center gap-3"
                >
                  {onViewReport && (
                    <button
                      onClick={() => {
                        onViewReport();
                        onComplete?.();
                      }}
                      className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                    >
                      View Full Report
                    </button>
                  )}
                  {onApplyToContent && (
                    <button
                      onClick={() => {
                        onApplyToContent();
                        onComplete?.();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Apply to Content
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-xs text-zinc-600 mt-4"
            >
              Click anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResearchCompleteCelebration;
