import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Folder, Layers } from 'lucide-react';
import { Category, Post, PostStatus } from '../../types';

interface CategoryDropdownProps {
  categories: Category[];
  posts: Post[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categories = [],
  posts = [],
  selectedId,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure arrays are valid
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safePosts = Array.isArray(posts) ? posts : [];

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
  const topLevelCategories = safeCategories.filter(c => !c.parentId).sort((a, b) => a.order - b.order);

  // Get selected category name
  const selectedCategory = safeCategories.find(c => c.id === selectedId);

  // Calculate post count for a category (including children) - only non-launched posts
  const getCategoryPostCount = (categoryId: string): number => {
    const childIds = safeCategories
      .filter(c => c.parentId === categoryId)
      .map(c => c.id);

    const directCount = safePosts.filter(p =>
      p.categoryId === categoryId &&
      p.status !== PostStatus.PUBLISHED &&
      p.status !== PostStatus.ARCHIVED &&
      p.status !== PostStatus.SKIPPED
    ).length;

    const childCount = childIds.reduce((sum, childId) => sum + getCategoryPostCount(childId), 0);

    return directCount + childCount;
  };

  // Total non-launched posts
  const totalPosts = safePosts.filter(p =>
    p.status !== PostStatus.PUBLISHED &&
    p.status !== PostStatus.ARCHIVED &&
    p.status !== PostStatus.SKIPPED
  ).length;

  // Build tree structure for display
  const getCategoryWithChildren = (parentId: string | null): Category[] => {
    return safeCategories
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
