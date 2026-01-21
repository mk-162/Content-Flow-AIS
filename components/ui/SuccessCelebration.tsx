import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Rocket } from 'lucide-react';

// ============================================================================
// SUCCESS CELEBRATION COMPONENT
// Section 7: Modern Design Patterns - Celebratory Moments
// ============================================================================

interface SuccessCelebrationProps {
  show: boolean;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
  duration?: number;
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
        ['bg-cyan-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-rose-400'][
          Math.floor(Math.random() * 5)
        ]
      }`}
      style={{
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
      }}
    />
  </motion.div>
);

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  show,
  title = 'Success!',
  subtitle = 'You did it!',
  onComplete,
  duration = 3000,
}) => {
  const [confetti, setConfetti] = useState<{ id: number; delay: number; x: number }[]>([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: Math.random() * 100,
      }));
      setConfetti(particles);

      // Auto-dismiss
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
        >
          {/* Confetti */}
          {confetti.map((p) => (
            <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
          ))}

          {/* Center celebration badge */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              className="relative"
            >
              {/* Animated rings */}
              <motion.div
                className="absolute inset-0 border-2 border-cyan-400/30"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1, repeat: 2, repeatDelay: 0.5 }}
                style={{ borderRadius: '50%', width: 120, height: 120, margin: -20 }}
              />

              {/* Main badge */}
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <Check className="w-10 h-10 text-white" strokeWidth={3} />
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
                <Rocket className="w-5 h-5 text-violet-400" />
              </motion.div>
            </motion.div>
          </div>

          {/* Text */}
          <div className="absolute inset-x-0 bottom-1/3 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mb-2"
            >
              {title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-slate-400"
            >
              {subtitle}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessCelebration;
