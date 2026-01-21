import React, { useMemo, useState } from 'react';
import { X, FileText, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Category, Post, PostStatus } from '../../types';
import { PitchCard } from '../feed/PitchCard';
import { GeneratingCard } from '../feed/GeneratingCard';

interface BriefsTabProps {
  posts: Post[];
  categories: Category[];
  filter?: {
    categoryId: string;
    categoryName: string;
  } | null;
  onClearFilter: () => void;
  onGenerate: (postId: string) => void;
  onBulkGenerate?: () => void;
  onSkip: (postId: string) => void;
  onUpdateBrief: (postId: string, updates: {
    title?: string;
    teaser?: string;
    keyPoints?: string[];
    metaDescription?: string;
    metaKeywords?: string[];
  }) => void;
  onImageUpdate?: (postId: string, image: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: any;
    providerId: string;
    aspectRatio: string;
  } | undefined) => void;
  onLaunch?: (postId: string) => void;
  onBackToCategories?: () => void;
}

export const BriefsTab: React.FC<BriefsTabProps> = ({
  posts,
  categories,
  filter,
  onClearFilter,
  onGenerate,
  onBulkGenerate,
  onSkip,
  onUpdateBrief,
  onImageUpdate,
  onLaunch,
  onBackToCategories,
}) => {
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Filter posts (exclude category pages)
  const filteredPosts = useMemo(() => {
    let result = posts.filter(p => !p.isCategoryPage);

    if (filter?.categoryId) {
      result = result.filter(p => p.categoryId === filter.categoryId);
    }

    // Sort by status: pitch/pending first, then generating, then ready
    const statusOrder: Record<string, number> = {
      [PostStatus.PITCH]: 0,
      [PostStatus.PENDING]: 1,
      [PostStatus.GENERATING]: 2,
      [PostStatus.READY]: 3,
      [PostStatus.NEEDS_REVIEW]: 3,
      [PostStatus.PUBLISHED]: 4,
      [PostStatus.SKIPPED]: 5,
    };

    return result.sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      return orderA - orderB;
    });
  }, [posts, filter]);

  // Get category info
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return { name: undefined, breadcrumb: undefined, image: null };

    // Build breadcrumb
    const breadcrumb: string[] = [];
    let current = category;
    while (current) {
      breadcrumb.unshift(current.name);
      current = categories.find(c => c.id === current?.parentId) as Category | undefined;
    }

    return {
      name: category.name,
      breadcrumb,
      image: category.heroImage ? {
        url: category.heroImage.url,
        altText: category.heroImage.altText,
      } : null,
    };
  };

  // Group by status for display
  // Note: READY/NEEDS_REVIEW posts appear ONLY in Launch Pad to avoid overlap
  const briefPosts = filteredPosts.filter(p =>
    p.status === PostStatus.PITCH || p.status === PostStatus.PENDING
  );
  const generatingPosts = filteredPosts.filter(p => p.status === PostStatus.GENERATING);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
      {/* Header - matching Categories tab style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Briefs
          </h2>
          <span className="text-sm text-zinc-500">
            ({briefPosts.length} pending{generatingPosts.length > 0 ? `, ${generatingPosts.length} generating` : ''})
          </span>
        </div>
        {/* Bulk Approve & Generate Button */}
        {onBulkGenerate && briefPosts.length > 0 && (
          <button
            onClick={() => setShowBulkConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/20"
          >
            <Sparkles size={14} />
            <span>Bulk Approve & Generate</span>
            <span className="tabular-nums">({briefPosts.length})</span>
          </button>
        )}
      </div>

      {/* Filter banner - only show when filter is active */}
      {filter && (
        <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded">
          <span className="text-sm text-zinc-400">Filtering by:</span>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full">
            {filter.categoryName}
          </span>
          <button
            onClick={onClearFilter}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        </div>
      )}

      {/* Content */}
      {briefPosts.length === 0 && generatingPosts.length === 0 ? (
        <EmptyBriefsState
          hasFilter={!!filter}
          categoryName={filter?.categoryName}
          onBackToCategories={onBackToCategories}
        />
      ) : (
        <div className="space-y-6">
          {/* Briefs (Pitch/Pending) */}
          {briefPosts.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Pending Briefs
                </h3>
                {generatingPosts.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20">
                    <Loader2 size={14} className="text-blue-400 animate-spin" />
                    <span className="text-sm font-medium text-blue-400 tabular-nums">{generatingPosts.length}</span>
                    <span className="text-xs text-blue-400/70">generating</span>
                  </div>
                )}
              </div>
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {briefPosts.map(post => {
                      const catInfo = getCategoryInfo(post.categoryId);
                      return (
                        <PitchCard
                          key={post.id}
                          post={post}
                          categoryName={catInfo.name}
                          categoryBreadcrumb={catInfo.breadcrumb}
                          categoryImage={catInfo.image}
                          onGenerate={onGenerate}
                          onSkip={onSkip}
                          onUpdate={onUpdateBrief}
                          onImageUpdate={onImageUpdate}
                          isExpanded={true}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Generating */}
            {generatingPosts.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                  Generating ({generatingPosts.length})
                </h3>
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {generatingPosts.map(post => {
                      const catInfo = getCategoryInfo(post.categoryId);
                      return (
                        <GeneratingCard
                          key={post.id}
                          post={post}
                          categoryName={catInfo.name}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}

      {/* Bulk Approve Confirmation Modal */}
      <AnimatePresence>
        {showBulkConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowBulkConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Bulk Approve & Generate</h2>
                  <p className="text-sm text-slate-400">
                    You are about to approve and generate content for <span className="text-cyan-400 font-semibold">{briefPosts.length} post{briefPosts.length !== 1 ? 's' : ''}</span>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 p-3 mb-6">
                <p className="text-xs text-slate-400">
                  This will start AI content generation for all pending briefs. Each post will use credits from your account.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowBulkConfirm(false);
                    onBulkGenerate?.();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-medium transition-all"
                >
                  Approve All {briefPosts.length}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Empty state component
interface EmptyBriefsStateProps {
  hasFilter: boolean;
  categoryName?: string;
  onBackToCategories?: () => void;
}

const EmptyBriefsState: React.FC<EmptyBriefsStateProps> = ({
  hasFilter,
  categoryName,
  onBackToCategories,
}) => (
  <div className="border border-dashed border-zinc-800 p-8 text-center">
    <div className="flex justify-center mb-4">
      <FileText size={32} className="text-zinc-600" />
    </div>
    <h3 className="text-base font-medium text-white mb-2">
      {hasFilter
        ? `No articles in "${categoryName}" yet`
        : 'No briefs yet'
      }
    </h3>
    <p className="text-sm text-zinc-500 mb-4">
      {hasFilter
        ? 'Go back and use "Generate Briefs" to create content'
        : 'Generate briefs from your categories to see them here'
      }
    </p>
    {hasFilter && onBackToCategories && (
      <button
        onClick={onBackToCategories}
        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Categories
      </button>
    )}
  </div>
);

export default BriefsTab;
