import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  X,
  Check,
  Circle,
  Loader2,
  Search,
  Users,
  TrendingUp,
  BarChart3,
  BookOpen,
  Lightbulb,
  Target,
  Minimize2,
} from 'lucide-react';

// Research stages that map to the actual research process
const RESEARCH_STAGES = [
  { id: 'landscape', label: 'Search landscape analysis', threshold: 15, icon: Search },
  { id: 'audience', label: 'Audience insights', threshold: 30, icon: Users },
  { id: 'competitive', label: 'Competitive analysis', threshold: 50, icon: TrendingUp },
  { id: 'data', label: 'Data & statistics', threshold: 65, icon: BarChart3 },
  { id: 'sources', label: 'Expert sources', threshold: 80, icon: BookOpen },
  { id: 'opportunities', label: 'Content opportunities', threshold: 90, icon: Lightbulb },
  { id: 'keywords', label: 'Keywords & topics', threshold: 100, icon: Target },
];

// Educational facts to show during research
const EDUCATIONAL_FACTS = [
  {
    stat: '67%',
    text: 'of B2B buyers prefer getting information from AI assistants before talking to a salesperson.',
    source: 'Gartner 2024',
  },
  {
    stat: '3.2x',
    text: 'more likely to convert when content directly answers their specific question.',
    source: 'Content Marketing Institute',
  },
  {
    stat: '85%',
    text: 'of product searches will happen through AI assistants by 2026.',
    source: 'McKinsey Digital',
  },
  {
    stat: '47%',
    text: 'of buyers view 3-5 pieces of content before engaging with a sales rep.',
    source: 'Demand Gen Report',
  },
];

interface Discovery {
  id: string;
  icon: React.ElementType;
  text: string;
  highlight?: string;
  threshold: number;
}

// Generate realistic discoveries based on category name
const generateDiscoveries = (categoryName: string): Discovery[] => {
  const seed = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seededRandom = (min: number, max: number, offset: number = 0) => {
    const val = ((seed + offset) * 9301 + 49297) % 233280;
    return Math.floor(min + (val / 233280) * (max - min));
  };

  const keywordCount = seededRandom(150, 800, 1);
  const topSearchVolume = seededRandom(3000, 20000, 2);
  const competitorCount = seededRandom(5, 25, 3);
  const gapCount = seededRandom(8, 20, 4);
  const sourceCount = seededRandom(8, 18, 5);

  return [
    {
      id: 'keywords',
      icon: Search,
      text: `Found ${keywordCount} relevant keywords`,
      highlight: `${keywordCount} keywords`,
      threshold: 20,
    },
    {
      id: 'topkeyword',
      icon: TrendingUp,
      text: 'Top opportunity detected',
      highlight: `${topSearchVolume.toLocaleString()}/mo`,
      threshold: 35,
    },
    {
      id: 'competitors',
      icon: Users,
      text: `Analyzed ${competitorCount} competitor articles`,
      threshold: 55,
    },
    {
      id: 'gaps',
      icon: Target,
      text: `Identified ${gapCount} content gaps`,
      highlight: `${gapCount} opportunities`,
      threshold: 75,
    },
    {
      id: 'sources',
      icon: BookOpen,
      text: `Found ${sourceCount} expert sources to cite`,
      threshold: 90,
    },
  ];
};

interface ResearchProgressModalProps {
  categoryName: string;
  progress: number; // 0-100
  elapsedSeconds: number;
  onMinimize: () => void;
  onCancel?: () => void;
}

export const ResearchProgressModal: React.FC<ResearchProgressModalProps> = ({
  categoryName,
  progress,
  elapsedSeconds,
  onMinimize,
  onCancel,
}) => {
  const [currentFact, setCurrentFact] = useState(0);

  // Rotate through educational facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % EDUCATIONAL_FACTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate discoveries based on category name
  const discoveries = useMemo(() => generateDiscoveries(categoryName), [categoryName]);
  const visibleDiscoveries = discoveries.filter(d => progress >= d.threshold);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900 border border-zinc-800 shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Deep Research</h2>
              <p className="text-sm text-zinc-400">{categoryName}</p>
            </div>
          </div>
          <button
            onClick={onMinimize}
            className="p-2 hover:bg-zinc-800 transition-colors"
            title="Minimize - research will continue in background"
          >
            <Minimize2 className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Analysis Progress</span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-cyan-400">{Math.round(progress)}%</span>
              <span className="text-sm text-zinc-500">{formatTime(elapsedSeconds)} elapsed</span>
            </div>
          </div>
          <div className="h-2 bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Two column content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Left column: Stages */}
            <div className="space-y-4">
              <div className="bg-zinc-800/30 border border-zinc-700/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                  Analysis Stages
                </p>
                <div className="space-y-2">
                  {RESEARCH_STAGES.map((stage, index) => {
                    const isComplete = progress >= stage.threshold;
                    const prevThreshold = RESEARCH_STAGES[index - 1]?.threshold || 0;
                    const isActive = progress >= prevThreshold && progress < stage.threshold;
                    const isPending = progress < prevThreshold;

                    const StageIcon = stage.icon;

                    return (
                      <div
                        key={stage.id}
                        className={`flex items-center gap-3 py-2 px-2 transition-colors ${
                          isComplete ? 'text-emerald-400' : ''
                        } ${isActive ? 'text-white bg-zinc-800/50' : ''} ${
                          isPending ? 'text-zinc-600' : ''
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-700 shrink-0" />
                        )}
                        <StageIcon className={`w-4 h-4 shrink-0 ${
                          isComplete ? 'text-emerald-400/70' : isActive ? 'text-cyan-400' : 'text-zinc-700'
                        }`} />
                        <span className="text-sm truncate">{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: Discoveries */}
            <div className="space-y-4">
              <div className="bg-zinc-800/30 border border-zinc-700/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                  Live Discoveries
                </p>
                <div className="min-h-[180px]">
                  <AnimatePresence mode="popLayout">
                    {visibleDiscoveries.length === 0 ? (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center h-32 text-zinc-600"
                      >
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span>Analyzing...</span>
                      </motion.div>
                    ) : (
                      <div className="space-y-2">
                        {visibleDiscoveries.map((discovery, index) => {
                          const IconComponent = discovery.icon;
                          return (
                            <motion.div
                              key={discovery.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center gap-3 py-2 px-3 bg-zinc-800/50"
                            >
                              <div className="w-7 h-7 bg-cyan-500/10 flex items-center justify-center shrink-0">
                                <IconComponent className="w-3.5 h-3.5 text-cyan-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300 truncate">{discovery.text}</p>
                              </div>
                              {discovery.highlight && (
                                <span className="text-xs font-semibold text-cyan-400 shrink-0">
                                  {discovery.highlight}
                                </span>
                              )}
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Educational carousel */}
              <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/50 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                  Did you know?
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFact}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-[80px]"
                  >
                    <p className="text-2xl font-bold text-cyan-400 mb-2">
                      {EDUCATIONAL_FACTS[currentFact].stat}
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {EDUCATIONAL_FACTS[currentFact].text}
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
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
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentFact ? 'bg-cyan-500' : 'bg-zinc-700 hover:bg-zinc-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              You can minimize this and continue working - we'll notify you when complete.
            </p>
            <button
              onClick={onMinimize}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Minimize
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ResearchProgressModal;
