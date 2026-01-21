/**
 * CATEGORY QUICK PANEL
 *
 * A slide-in panel for the Feed view that provides quick access to
 * category-level features without leaving the content workflow:
 * - Hero image editing
 * - Deep research management
 * - Keyword preview
 *
 * Design: Dark industrial aesthetic with cyan/purple accents
 * matching the existing MissionContent design system.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Image as ImageIcon,
  Target,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Eye,
  Search,
  Zap,
  Sparkles,
  FolderOpen,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Category, KeywordData, Organization, Project } from '../../types';
import { ImageInspectorControl } from '../ImageInspectorControl';
import { deleteField, Timestamp } from 'firebase/firestore';
import { getCategoryResearch, fetchCategoryKeywords } from '../../services/categoryKeywordService';

interface CategoryQuickPanelProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onQueueGoogleDeepResearch?: (categoryId: string) => void;
  onNavigateToCategories: () => void;
  organization?: Organization;
  project?: Project;
}

// Loading bar component
const LoadingBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-1 bg-slate-700 rounded-full overflow-hidden ${className}`}>
    <motion.div
      className="h-full w-1/3 bg-cyan-500 rounded-full"
      animate={{ x: ['0%', '200%'] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

export const CategoryQuickPanel: React.FC<CategoryQuickPanelProps> = ({
  category,
  isOpen,
  onClose,
  onUpdateCategory,
  onQueueGoogleDeepResearch,
  onNavigateToCategories,
  organization,
  project,
}) => {
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [showResearchConfirm, setShowResearchConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Get research status
  const researchStatus = useMemo(() => {
    if (!category?.googleDeepResearch) return 'none';
    return category.googleDeepResearch.status === 'running' ? 'running' :
           category.googleDeepResearch.status === 'complete' ? 'complete' : 'none';
  }, [category?.googleDeepResearch]);

  // Timer for research duration
  useEffect(() => {
    if (researchStatus !== 'running' || !category?.googleDeepResearch?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = category.googleDeepResearch.startedAt.toDate().getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [researchStatus, category?.googleDeepResearch?.startedAt]);

  // Load keywords when category changes
  useEffect(() => {
    if (!category || !project || !organization) {
      setKeywords([]);
      return;
    }

    const loadKeywords = async () => {
      setKeywordsLoading(true);
      try {
        const result = await getCategoryResearch(category.id);
        if (result?.keywords?.length) {
          setKeywords(result.keywords);
        } else {
          setKeywords([]);
        }
      } catch (err) {
        console.error('Failed to load keywords:', err);
        setKeywords([]);
      } finally {
        setKeywordsLoading(false);
      }
    };

    loadKeywords();
  }, [category?.id, project, organization]);

  // Format elapsed time
  const formatElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Format volume
  const formatVolume = (volume: number | null): string => {
    if (volume === null) return '—';
    if (volume < 1000) return volume.toString();
    if (volume < 1000000) return `${(volume / 1000).toFixed(1)}K`;
    return `${(volume / 1000000).toFixed(1)}M`;
  };

  if (!category) return null;

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <FolderOpen className="text-purple-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{category.name}</h2>
                  <p className="text-xs text-slate-500">Category Settings</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Hero Image Section */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={16} className="text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Hero Image
                  </span>
                </div>

                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  <ImageInspectorControl
                    currentImage={category.heroImage ? {
                      url: category.heroImage.url,
                      prompt: category.heroImage.prompt || '',
                      altText: category.heroImage.altText || category.name
                    } : undefined}
                    postTitle={category.name}
                    postTeaser={category.description}
                    onImageUpdate={(image) => {
                      if (image) {
                        onUpdateCategory(category.id, {
                          heroImage: {
                            url: image.url,
                            prompt: image.prompt,
                            altText: image.altText,
                            generatedAt: image.generatedAt,
                            providerId: image.providerId,
                            aspectRatio: image.aspectRatio
                          }
                        });
                      } else {
                        onUpdateCategory(category.id, { heroImage: deleteField() } as unknown as Partial<Category>);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Deep Research Section */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Deep Research
                    </span>
                  </div>
                  {/* Status indicator */}
                  {researchStatus === 'running' ? (
                    <span className="text-xs text-amber-400 flex items-center gap-1 font-mono">
                      <RefreshCw size={12} className="animate-spin" /> {formatElapsed(elapsedSeconds)}
                    </span>
                  ) : researchStatus === 'complete' ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={12} /> Complete
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Not started</span>
                  )}
                </div>

                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  {researchStatus === 'running' ? (
                    <div className="space-y-3">
                      <LoadingBar />
                      <p className="text-sm text-slate-400 text-center">
                        Researching "{category.name}"...
                      </p>
                      <p className="text-xs text-slate-600 text-center">
                        This can take up to 10 minutes. You can continue working.
                      </p>
                    </div>
                  ) : researchStatus === 'complete' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <CheckCircle className="text-emerald-400" size={24} />
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 text-center">
                        Research complete! View full report in Categories view.
                      </p>
                      <button
                        onClick={onNavigateToCategories}
                        className="w-full px-4 py-2 text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg flex items-center justify-center gap-2 border border-purple-500/30 transition-colors"
                      >
                        <Eye size={14} /> View Full Report
                        <ExternalLink size={12} className="ml-1" />
                      </button>
                    </div>
                  ) : showResearchConfirm ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-300">
                        Deep Research conducts comprehensive market analysis including competitor content, search trends, and opportunities.
                      </p>
                      <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <Zap size={14} />
                        <span className="font-medium">20 credits</span>
                        <span className="text-slate-500">• Up to 10 minutes</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowResearchConfirm(false);
                            if (onQueueGoogleDeepResearch) {
                              onQueueGoogleDeepResearch(category.id);
                            }
                          }}
                          className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Target size={14} /> Start Research
                        </button>
                        <button
                          onClick={() => setShowResearchConfirm(false)}
                          className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowResearchConfirm(true)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Search size={14} /> Run Deep Research
                      <span className="text-slate-400 text-xs ml-1">(20 credits)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Keywords Preview Section */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Keywords
                    </span>
                  </div>
                  {keywords.length > 0 && (
                    <button
                      onClick={onNavigateToCategories}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      View All {keywords.length} <ChevronRight size={12} />
                    </button>
                  )}
                </div>

                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  {keywordsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <LoadingBar className="w-24" />
                      <span className="text-xs text-slate-500">Loading...</span>
                    </div>
                  ) : keywords.length > 0 ? (
                    <div className="space-y-2">
                      {keywords.slice(0, 5).map((kw, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 truncate flex-1 text-xs">
                            "{kw.keyword}"
                          </span>
                          <span className="text-cyan-400 font-mono text-[10px] shrink-0 ml-2">
                            {formatVolume(kw.searchVolume)}/mo
                          </span>
                        </div>
                      ))}
                      {keywords.length > 5 && (
                        <p className="text-xs text-slate-500 text-center pt-2">
                          +{keywords.length - 5} more keywords
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">
                      No keywords yet. Run Deep Research to discover opportunities.
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Quick Actions
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={onNavigateToCategories}
                    className="w-full px-4 py-3 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-between transition-colors border border-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen size={16} className="text-slate-400" />
                      Open Full Category View
                    </span>
                    <ExternalLink size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950">
              <p className="text-xs text-slate-500 text-center">
                For advanced options, open the full{' '}
                <button
                  onClick={onNavigateToCategories}
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  Categories view
                </button>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
