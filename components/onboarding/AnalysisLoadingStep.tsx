import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Loader2 } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

// ============================================================================
// ANALYSIS STAGES
// ============================================================================

const ANALYSIS_STAGES = [
  { id: 'scan', label: 'Scanning page structure', threshold: 15 },
  { id: 'content', label: 'Analyzing content patterns', threshold: 30 },
  { id: 'audience', label: 'Identifying target audience', threshold: 45 },
  { id: 'voice', label: 'Detecting brand voice', threshold: 60 },
  { id: 'categories', label: 'Mapping product categories', threshold: 80 },
  { id: 'score', label: 'Calculating content gap', threshold: 100 },
];

// ============================================================================
// EDUCATIONAL FACTS
// ============================================================================

const EDUCATIONAL_FACTS = [
  {
    stat: '67%',
    text: 'of B2B buyers prefer getting information from AI assistants before talking to a salesperson.',
    source: 'Gartner 2024',
  },
  {
    stat: '3.2x',
    text: 'more likely to convert when content directly answers their specific question.',
    source: 'ContentFlow Research',
  },
  {
    stat: '85%',
    text: 'of product searches will happen through AI assistants by 2026.',
    source: 'McKinsey Digital',
  },
  {
    stat: '12 mins',
    text: 'Average time saved per content piece with AI-assisted generation.',
    source: 'Customer Data',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const AnalysisLoadingStep: React.FC = () => {
  const { session, analysisProgress } = useOnboarding();
  const [currentFact, setCurrentFact] = useState(0);

  // Rotate through facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % EDUCATIONAL_FACTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get hostname from URL for display
  const hostname = session?.websiteUrl
    ? new URL(session.websiteUrl.startsWith('http') ? session.websiteUrl : `https://${session.websiteUrl}`).hostname
    : 'your website';

  return (
    <div className="text-center max-w-2xl mx-auto py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="text-4xl mb-4">&#129504;</div>
        <h1 className="text-2xl font-bold mb-2">
          Analyzing {hostname}
        </h1>
        <p className="text-slate-400">
          Our AI is learning about your business...
        </p>
      </motion.div>

      {/* Educational Carousel - MOVED TO TOP */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/50 border border-slate-800 p-6 mb-8"
      >
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Did you know?
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFact}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-3xl font-bold text-cyan-400 mb-2">
              {EDUCATIONAL_FACTS[currentFact].stat}
            </p>
            <p className="text-slate-300 mb-2">
              {EDUCATIONAL_FACTS[currentFact].text}
            </p>
            <p className="text-xs text-slate-500">
              — {EDUCATIONAL_FACTS[currentFact].source}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {EDUCATIONAL_FACTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentFact(i)}
              className={`
                w-2 h-2 rounded-full transition-colors
                ${i === currentFact ? 'bg-cyan-500' : 'bg-slate-700'}
              `}
            />
          ))}
        </div>
      </motion.div>

      {/* Neural Network Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative h-32 mb-8 overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Animated circles */}
          <div className="relative w-48 h-48">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <div className="h-2 bg-slate-800 overflow-hidden mb-2">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${analysisProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-sm text-slate-500">{analysisProgress}% complete</p>
      </motion.div>

      {/* Stages List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 text-left"
      >
        {ANALYSIS_STAGES.map((stage, index) => {
          const isComplete = analysisProgress >= stage.threshold;
          const isActive =
            analysisProgress >= ANALYSIS_STAGES[index - 1]?.threshold &&
            analysisProgress < stage.threshold;
          const isPending = analysisProgress < (ANALYSIS_STAGES[index - 1]?.threshold || 0);

          return (
            <div
              key={stage.id}
              className={`
                flex items-center gap-3 py-2 px-4 transition-colors
                ${isComplete ? 'text-cyan-400' : ''}
                ${isActive ? 'text-white bg-slate-800/50' : ''}
                ${isPending ? 'text-slate-600' : ''}
              `}
            >
              {isComplete ? (
                <Check className="w-5 h-5 text-cyan-400" />
              ) : isActive ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-slate-700" />
              )}
              <span className="flex-1">{stage.label}</span>
              {isComplete && (
                <div className="w-20 h-1.5 bg-cyan-500/30 overflow-hidden">
                  <div className="h-full bg-cyan-500 w-full" />
                </div>
              )}
              {isActive && (
                <div className="w-20 h-1.5 bg-slate-700 overflow-hidden">
                  <motion.div
                    className="h-full bg-cyan-500"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3 }}
                  />
                </div>
              )}
              {isPending && (
                <div className="w-20 h-1.5 bg-slate-800" />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Divider */}
      <div className="border-t border-slate-800 mb-8" />
    </div>
  );
};

export default AnalysisLoadingStep;
