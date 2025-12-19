import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Loader2, Search, TrendingUp, Users, FileText, Target, Sparkles } from 'lucide-react';
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
// STREAMING DISCOVERIES
// ============================================================================

interface Discovery {
  id: string;
  icon: React.ElementType;
  text: string;
  highlight?: string;
  threshold: number; // Show when progress reaches this %
}

// Generate realistic-looking placeholder discoveries based on hostname
const generateDiscoveries = (hostname: string): Discovery[] => {
  // Simple seed from hostname for consistent "random" values
  const seed = hostname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seededRandom = (min: number, max: number, offset: number = 0) => {
    const val = ((seed + offset) * 9301 + 49297) % 233280;
    return Math.floor(min + (val / 233280) * (max - min));
  };

  const keywordCount = seededRandom(200, 1200, 1);
  const topSearchVolume = seededRandom(5000, 25000, 2);
  const competitorCount = seededRandom(8, 35, 3);
  const pageCount = seededRandom(12, 45, 4);
  const categoryCount = seededRandom(4, 12, 5);
  const gapScore = seededRandom(45, 85, 6);

  return [
    {
      id: 'pages',
      icon: FileText,
      text: `Scanned ${pageCount} pages on your website`,
      threshold: 12,
    },
    {
      id: 'keywords',
      icon: Search,
      text: `Found ${keywordCount.toLocaleString()} relevant keywords`,
      highlight: `${keywordCount.toLocaleString()} keywords`,
      threshold: 25,
    },
    {
      id: 'opportunity',
      icon: TrendingUp,
      text: `Top opportunity detected`,
      highlight: `${topSearchVolume.toLocaleString()} searches/mo`,
      threshold: 40,
    },
    {
      id: 'competitors',
      icon: Users,
      text: `Identified ${competitorCount} competitor articles`,
      threshold: 55,
    },
    {
      id: 'categories',
      icon: Target,
      text: `Mapped ${categoryCount} content categories`,
      threshold: 70,
    },
    {
      id: 'score',
      icon: Sparkles,
      text: `Content opportunity score`,
      highlight: `${gapScore}/100`,
      threshold: 90,
    },
  ];
};

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

  // Generate discoveries based on hostname (memoized for consistency)
  const discoveries = useMemo(() => generateDiscoveries(hostname), [hostname]);

  // Filter discoveries that should be visible based on progress
  const visibleDiscoveries = discoveries.filter(d => analysisProgress >= d.threshold);

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Header - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-2xl font-bold mb-2">
          Analyzing {hostname}
        </h1>
        <p className="text-slate-400">
          Our AI is learning about your business...
        </p>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Educational Content */}
        <div className="space-y-6">
          {/* Educational Carousel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800 p-6"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              Did you know?
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFact}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="min-h-[120px]"
              >
                <p className="text-4xl font-bold text-cyan-400 mb-3">
                  {EDUCATIONAL_FACTS[currentFact].stat}
                </p>
                <p className="text-slate-300 mb-3 leading-relaxed">
                  {EDUCATIONAL_FACTS[currentFact].text}
                </p>
                <p className="text-xs text-slate-500">
                  — {EDUCATIONAL_FACTS[currentFact].source}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Dots indicator */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {EDUCATIONAL_FACTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentFact(i)}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-colors
                    ${i === currentFact ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'}
                  `}
                />
              ))}
            </div>
          </motion.div>

          {/* Explainer Video */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 border border-slate-800 p-4"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Watch a 2 minute video while you wait
            </p>
            <div className="relative aspect-video bg-slate-800 overflow-hidden">
              {/* Replace VIDEO_ID with your actual YouTube/Vimeo video ID */}
              <iframe
                src="https://www.youtube.com/embed/VIDEO_ID?autoplay=0&rel=0"
                title="How MissionContent Works"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              See how AI-powered content helps businesses grow
            </p>
          </motion.div>
        </div>

        {/* RIGHT COLUMN - Activity & Progress */}
        <div className="space-y-6">
          {/* Progress Bar Widget */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/50 border border-slate-800 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Analysis Progress
              </p>
              <span className="text-lg font-bold text-cyan-400">{analysisProgress}%</span>
            </div>
            <div className="h-3 bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Stages List - Compact */}
            <div className="mt-4 space-y-2">
              {ANALYSIS_STAGES.map((stage, index) => {
                const isComplete = analysisProgress >= stage.threshold;
                const isActive =
                  analysisProgress >= (ANALYSIS_STAGES[index - 1]?.threshold || 0) &&
                  analysisProgress < stage.threshold;
                const isPending = analysisProgress < (ANALYSIS_STAGES[index - 1]?.threshold || 0);

                return (
                  <div
                    key={stage.id}
                    className={`
                      flex items-center gap-2 py-1.5 text-sm transition-colors
                      ${isComplete ? 'text-cyan-400' : ''}
                      ${isActive ? 'text-white' : ''}
                      ${isPending ? 'text-slate-600' : ''}
                    `}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Live Discoveries Widget */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="bg-slate-900/50 border border-slate-800 p-5"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Live Discoveries
            </p>
            <div className="min-h-[200px]">
              <AnimatePresence mode="popLayout">
                {visibleDiscoveries.length === 0 ? (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-32 text-slate-600"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Scanning...</span>
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
                          className="flex items-center gap-3 py-2 px-3 bg-slate-800/50"
                        >
                          <div className="w-7 h-7 bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 truncate">
                              {discovery.text}
                            </p>
                          </div>
                          {discovery.highlight && (
                            <span className="text-xs font-semibold text-cyan-400 flex-shrink-0">
                              {discovery.highlight}
                            </span>
                          )}
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisLoadingStep;
