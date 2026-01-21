import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Filter, CheckCircle } from 'lucide-react';
import { Post, PostStatus, Category } from '../../types';
import { feedColors, feedButton } from '../../styles/designTokens';
import { PitchCard } from './PitchCard';
import { GeneratingCard } from './GeneratingCard';
import { ReadyCard } from './ReadyCard';
import { StatusFilter, SortOption } from './ProgressHeader';

export interface ContentFeedHandle {
  scrollToReady: () => void;
}

interface ContentFeedProps {
  posts: Post[];
  categories: Category[];
  onGenerate: (id: string) => void;
  onSkip: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  onApprove?: (id: string) => void;
  onUpdateStub?: (id: string, updates: { title?: string; teaser?: string; keyPoints?: string[]; metaDescription?: string; metaKeywords?: string[] }) => void;
  onImageUpdate?: (postId: string, image: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: any;
    providerId: string;
    aspectRatio: string;
  } | undefined) => void;
  // Filter props
  statusFilter?: StatusFilter;
  categoryFilter?: string | null;
  searchQuery?: string;
  sortOption?: SortOption;
}

export const ContentFeed = forwardRef<ContentFeedHandle, ContentFeedProps>(({
  posts,
  categories,
  onGenerate,
  onSkip,
  onCancel,
  onDelete,
  onPreview,
  onApprove,
  onUpdateStub,
  onImageUpdate,
  statusFilter = 'all',
  categoryFilter = null,
  searchQuery = '',
  sortOption = 'date',
}, ref) => {
  const readySectionRef = useRef<HTMLDivElement>(null);

  // Expose scrollToReady method
  useImperativeHandle(ref, () => ({
    scrollToReady: () => {
      readySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }));

  // Helper to get category name
  const getCategoryName = (categoryId: string): string | undefined => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name;
  };

  // Helper to build category breadcrumb (parent > child)
  const getCategoryBreadcrumb = (categoryId: string): string[] => {
    const breadcrumb: string[] = [];
    let current = categories.find((c) => c.id === categoryId);

    while (current) {
      breadcrumb.unshift(current.name);
      current = current.parentId
        ? categories.find((c) => c.id === current!.parentId)
        : undefined;
    }

    return breadcrumb;
  };

  // Helper to check if a category matches the filter (including subcategories)
  const categoryMatchesFilter = (postCategoryId: string, filterCategoryId: string): boolean => {
    // Direct match
    if (postCategoryId === filterCategoryId) return true;

    // Check if post's category is a child of the filter category
    let current = categories.find(c => c.id === postCategoryId);
    while (current?.parentId) {
      if (current.parentId === filterCategoryId) return true;
      current = categories.find(c => c.id === current!.parentId);
    }

    return false;
  };

  // Map status filter to PostStatus values
  const getStatusesForFilter = (filter: StatusFilter): PostStatus[] => {
    switch (filter) {
      case 'pitch':
        return [PostStatus.PITCH, PostStatus.PENDING];
      case 'generating':
        return [PostStatus.GENERATING];
      case 'ready':
        return [PostStatus.READY, PostStatus.NEEDS_REVIEW];
      case 'all':
      default:
        return [
          PostStatus.PITCH,
          PostStatus.PENDING,
          PostStatus.GENERATING,
          PostStatus.READY,
          PostStatus.NEEDS_REVIEW,
        ];
    }
  };

  // Filter and sort posts by status for the feed
  const feedPosts = posts
    .filter((p) => {
      // Status filter
      const allowedStatuses = getStatusesForFilter(statusFilter);
      if (!allowedStatuses.includes(p.status)) return false;

      // Category filter (includes subcategories)
      if (categoryFilter && !categoryMatchesFilter(p.categoryId, categoryFilter)) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (p.pitch?.headline || p.title || '').toLowerCase();
        const teaser = (p.teaser || '').toLowerCase();
        const category = getCategoryName(p.categoryId)?.toLowerCase() || '';

        if (!title.includes(query) && !teaser.includes(query) && !category.includes(query)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Primary sort by status (pitch -> generating -> ready)
      const statusOrder: Record<string, number> = {
        [PostStatus.PITCH]: 1,
        [PostStatus.PENDING]: 1, // Legacy, treat as PITCH
        [PostStatus.GENERATING]: 2,
        [PostStatus.READY]: 3,
        [PostStatus.NEEDS_REVIEW]: 3, // Legacy, treat as READY
      };
      const aOrder = statusOrder[a.status] ?? 99;
      const bOrder = statusOrder[b.status] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Secondary sort by user preference
      if (sortOption === 'category') {
        const aCat = getCategoryName(a.categoryId) || '';
        const bCat = getCategoryName(b.categoryId) || '';
        return aCat.localeCompare(bCat);
      } else {
        // Sort by date (newest first)
        const aDate = a.createdAt?.toMillis?.() || 0;
        const bDate = b.createdAt?.toMillis?.() || 0;
        return bDate - aDate;
      }
    });

  // Split posts into pitch/generating and ready sections
  const pitchAndGeneratingPosts = feedPosts.filter(p =>
    p.status === PostStatus.PITCH ||
    p.status === PostStatus.PENDING ||
    p.status === PostStatus.GENERATING
  );

  const readyPosts = feedPosts.filter(p =>
    p.status === PostStatus.READY ||
    p.status === PostStatus.NEEDS_REVIEW
  );

  // Helper to get category image
  const getCategoryImage = (categoryId: string): { url: string; altText?: string } | null => {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.heroImage?.url) {
      return {
        url: category.heroImage.url,
        altText: category.heroImage.altText || category.name,
      };
    }
    return null;
  };

  // Render appropriate card based on status
  const renderCard = (post: Post) => {
    const categoryName = getCategoryName(post.categoryId);
    const categoryBreadcrumb = getCategoryBreadcrumb(post.categoryId);
    const categoryImage = getCategoryImage(post.categoryId);

    switch (post.status) {
      case PostStatus.PITCH:
      case PostStatus.PENDING: // Legacy support
        return (
          <PitchCard
            key={post.id}
            post={post}
            categoryName={categoryName}
            categoryBreadcrumb={categoryBreadcrumb}
            categoryImage={categoryImage}
            onGenerate={onGenerate}
            onSkip={onSkip}
            onUpdate={onUpdateStub}
            onImageUpdate={onImageUpdate}
          />
        );

      case PostStatus.GENERATING:
        return (
          <GeneratingCard
            key={post.id}
            post={post}
            progress={45} // TODO: Get actual progress from task
            onCancel={onCancel}
          />
        );

      case PostStatus.READY:
      case PostStatus.NEEDS_REVIEW: // Legacy support
        return (
          <ReadyCard
            key={post.id}
            post={post}
            categoryName={categoryName}
            categoryBreadcrumb={categoryBreadcrumb}
            categoryImage={categoryImage}
            onApprove={onApprove}
            onPreview={onPreview}
            onDelete={onDelete}
            onUpdate={onUpdateStub}
            onImageUpdate={onImageUpdate}
          />
        );

      default:
        return null;
    }
  };

  // Empty state - different message if filters are active
  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== null || searchQuery.length > 0;

  if (feedPosts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full px-8 py-16"
        style={{ backgroundColor: feedColors.background.page }}
      >
        {hasActiveFilters ? (
          <>
            <div
              className="w-16 h-16 mb-6 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(113, 113, 122, 0.1)' }}
            >
              <Filter size={24} style={{ color: feedColors.text.muted }} />
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: feedColors.text.primary, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              No matching content
            </h3>
            <p
              className="text-sm text-center max-w-sm"
              style={{ color: feedColors.text.secondary }}
            >
              No posts match the current filters. Try adjusting or clearing your filters.
            </p>
          </>
        ) : (
          <>
            <div
              className="w-16 h-16 mb-6 flex items-center justify-center border-2 border-dashed"
              style={{ borderColor: feedColors.border.medium }}
            >
              <Plus size={24} style={{ color: feedColors.text.muted }} />
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: feedColors.text.primary, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              No content to review
            </h3>
            <p
              className="text-sm text-center max-w-sm mb-6"
              style={{ color: feedColors.text.secondary }}
            >
              Add categories to generate pitches, or wait for AI to create new content ideas.
            </p>
            <button className={feedButton.primary}>
              Add Category
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ backgroundColor: feedColors.background.page }}
    >
      {/* Wider feed container - max-w-4xl for better space utilization */}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Pitch and Generating posts */}
        <AnimatePresence mode="popLayout">
          {pitchAndGeneratingPosts.map((post) => renderCard(post))}
        </AnimatePresence>

        {/* Ready to Launch Section - with visual divider */}
        {readyPosts.length > 0 && (
          <div ref={readySectionRef}>
            {/* Section Divider */}
            <div className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Ready to Launch
                  </span>
                  <span className="text-xs text-emerald-400/70 font-medium tabular-nums">
                    {readyPosts.length}
                  </span>
                </div>
                <div className="flex-1 h-px bg-emerald-500/20" />
              </div>
            </div>

            {/* Ready posts */}
            <AnimatePresence mode="popLayout">
              {readyPosts.map((post) => renderCard(post))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
});

ContentFeed.displayName = 'ContentFeed';
