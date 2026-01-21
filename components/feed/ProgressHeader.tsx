import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Loader2, ChevronDown, X, Layers, Image as ImageIcon, Target, Search, Check, Folder, Sparkles, ArrowUpDown, Calendar, FolderTree } from 'lucide-react';
import { feedColors, feedButton } from '../../styles/designTokens';
import { Category, Post, PostStatus } from '../../types';

interface ProgressStats {
  pitches: number;
  generating: number;
  ready: number;
  launched: number;
}

export type StatusFilter = 'all' | 'pitch' | 'generating' | 'ready';
export type SortOption = 'date' | 'category';

interface ProgressHeaderProps {
  stats: ProgressStats;
  categories: Category[];
  posts: Post[]; // Added to calculate category counts
  categoryBreadcrumb?: string[];
  onBulkGenerate: () => void;
  // Filter props
  activeStatusFilter: StatusFilter;
  activeCategoryFilter: string | null;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onCategoryFilterChange: (categoryId: string | null) => void;
  // Search props
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Sort props
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  // Category quick panel
  onOpenCategoryPanel?: () => void;
  // Scroll to ready section
  onScrollToReady?: () => void;
}

// Category dropdown component - styled like project dropdown
const CategoryDropdown: React.FC<{
  categories: Category[];
  posts: Post[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ categories, posts, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get top-level categories (no parent)
  const topLevelCategories = categories.filter(c => !c.parentId).sort((a, b) => a.order - b.order);

  // Get selected category name
  const selectedCategory = categories.find(c => c.id === selectedId);

  // Calculate post count for a category (including children) - only non-launched posts
  const getCategoryPostCount = (categoryId: string): number => {
    const childIds = categories
      .filter(c => c.parentId === categoryId)
      .map(c => c.id);

    const directCount = posts.filter(p =>
      p.categoryId === categoryId &&
      p.status !== PostStatus.PUBLISHED &&
      p.status !== PostStatus.ARCHIVED &&
      p.status !== PostStatus.SKIPPED
    ).length;

    const childCount = childIds.reduce((sum, childId) => sum + getCategoryPostCount(childId), 0);

    return directCount + childCount;
  };

  // Total non-launched posts
  const totalPosts = posts.filter(p =>
    p.status !== PostStatus.PUBLISHED &&
    p.status !== PostStatus.ARCHIVED &&
    p.status !== PostStatus.SKIPPED
  ).length;

  // Build tree structure for display
  const getCategoryWithChildren = (parentId: string | null): Category[] => {
    return categories
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const renderCategoryItem = (category: Category, depth: number = 0) => {
    const children = getCategoryWithChildren(category.id);
    const isSelected = selectedId === category.id;
    const postCount = getCategoryPostCount(category.id);
    const isEmpty = postCount === 0;

    return (
      <React.Fragment key={category.id}>
        <button
          onClick={() => {
            onSelect(category.id);
            setIsOpen(false);
          }}
          className={`
            w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-700 transition-colors
            ${isSelected ? 'text-cyan-400 bg-slate-700/50' : isEmpty ? 'text-slate-500' : 'text-slate-200'}
          `}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Folder className={`w-4 h-4 shrink-0 ${isEmpty ? 'text-slate-600' : 'text-slate-500'}`} />
            <span className="truncate">{category.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs tabular-nums ${isEmpty ? 'text-slate-600' : 'text-slate-400'}`}>
              {postCount}
            </span>
            {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
          </div>
        </button>
        {children.map(child => renderCategoryItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 hover:border-slate-600"
      >
        <Layers className="w-4 h-4 text-slate-400" />
        <span className="font-medium text-sm max-w-[150px] truncate">
          {selectedCategory?.name || 'All Categories'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-slate-800 border border-slate-700 shadow-xl shadow-black/40 z-50"
          >
            {/* All categories option */}
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700
                ${!selectedId ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-200'}
              `}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>All Categories</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 tabular-nums">{totalPosts}</span>
                {!selectedId && <Check className="w-4 h-4 text-cyan-400" />}
              </div>
            </button>

            {/* Category tree */}
            <div className="py-1">
              {topLevelCategories.map(cat => renderCategoryItem(cat))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  stats,
  categories,
  posts,
  categoryBreadcrumb,
  onBulkGenerate,
  activeStatusFilter,
  activeCategoryFilter,
  onStatusFilterChange,
  onCategoryFilterChange,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  onOpenCategoryPanel,
  onScrollToReady,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Local state for search input with debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when prop changes externally (e.g., clear)
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search handler
  const handleSearchInput = (value: string) => {
    setLocalSearchQuery(value);

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the actual search update (150ms delay)
    debounceTimeoutRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const totalInPipeline = stats.pitches + stats.generating + stats.ready;

  const hasActiveFilter = activeStatusFilter !== 'all' || activeCategoryFilter !== null || (searchQuery?.length ?? 0) > 0;

  // Get the selected category for showing research status
  const selectedCategory = activeCategoryFilter
    ? categories.find(c => c.id === activeCategoryFilter)
    : null;
  const hasResearch = selectedCategory?.googleDeepResearch?.status === 'complete';
  const hasImage = !!selectedCategory?.heroImage?.url;

  const clearAllFilters = () => {
    onStatusFilterChange('all');
    onCategoryFilterChange(null);
    onSearchChange('');
    setShowSearch(false);
  };

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <div
      className="border-b"
      style={{
        backgroundColor: feedColors.background.card,
        borderColor: feedColors.border.subtle,
      }}
    >
      {/* Single compact row */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Left: Category dropdown + search */}
        <div className="flex items-center gap-3 min-w-0">
          <CategoryDropdown
            categories={categories}
            posts={posts}
            selectedId={activeCategoryFilter}
            onSelect={onCategoryFilterChange}
          />

          {/* Search toggle/input */}
          <AnimatePresence mode="wait">
            {showSearch ? (
              <motion.div
                key="search-input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search posts..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {localSearchQuery && (
                  <button
                    onClick={() => {
                      setLocalSearchQuery('');
                      onSearchChange('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.button
                key="search-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSearch(true)}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 hover:border-slate-600"
                title="Search posts"
              >
                <Search size={16} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Category quick settings button - shows when category is selected */}
          {activeCategoryFilter && onOpenCategoryPanel && (
            <button
              onClick={onOpenCategoryPanel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
              title="Edit category image & research"
            >
              <ImageIcon size={12} />
              <Target size={12} />
              <span className="hidden sm:inline">Settings</span>
              {/* Status indicators */}
              {(hasImage || hasResearch) && (
                <span className="flex items-center gap-0.5 ml-1">
                  {hasImage && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Has image" />}
                  {hasResearch && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Research complete" />}
                </span>
              )}
            </button>
          )}

        </div>

        {/* Center: Progress indicator */}
        <div className="flex items-center gap-3">
          {/* Generating indicator */}
          {stats.generating > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20">
              <Loader2 size={14} className="text-blue-400 animate-spin" />
              <span className="text-sm font-medium text-blue-400 tabular-nums">{stats.generating}</span>
              <span className="text-xs text-blue-400/70 hidden sm:inline">generating</span>
            </div>
          )}
        </div>

        {/* Right: Sort + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => onSortChange(sortOption === 'date' ? 'category' : 'date')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 hover:border-slate-600"
              title="Sort posts"
            >
              <ArrowUpDown size={14} />
              {sortOption === 'date' ? (
                <>
                  <Calendar size={12} />
                  <span className="hidden sm:inline">Date</span>
                </>
              ) : (
                <>
                  <FolderTree size={12} />
                  <span className="hidden sm:inline">Category</span>
                </>
              )}
            </button>
          </div>
          <button
            onClick={onBulkGenerate}
            disabled={stats.pitches === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none"
          >
            <Sparkles size={14} />
            <span>Bulk Approve & Generate</span>
            <span className="tabular-nums">({stats.pitches})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
