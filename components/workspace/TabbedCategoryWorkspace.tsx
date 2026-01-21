import React, { useState, useCallback } from 'react';
import { WorkspaceTabs, WorkspaceTab } from './WorkspaceTabs';
import { CategoriesTab } from './CategoriesTab';
import { BriefsTab } from './BriefsTab';
import {
  Category,
  Post,
  GenerationTask,
  Project,
  Organization,
  PostStatus,
} from '../../types';

interface TabbedCategoryWorkspaceProps {
  categories: Category[];
  posts: Post[];
  tasks: GenerationTask[];
  project: Project | null;
  organization: Organization | null;
  isAddingCategory?: boolean;
  onAddCategory: (name: string, parentId: string | null, description?: string, runResearchFirst?: boolean) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onQueueTitles: (categoryId: string, count: number, contextOverride?: string) => void;
  onQueueContent: (post: Post) => void;
  onQueueGoogleDeepResearch: (categoryId: string) => void;
  onUpdatePost: (postId: string, updates: Partial<Post>) => void;
  onUpdatePostStatus: (postId: string, status: PostStatus) => void;
  onDeletePost: (postId: string) => void;
  onImageUpdate?: (postId: string, image: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: any;
    providerId: string;
    aspectRatio: string;
  } | undefined) => void;
}

export const TabbedCategoryWorkspace: React.FC<TabbedCategoryWorkspaceProps> = ({
  categories,
  posts,
  tasks,
  project,
  organization,
  isAddingCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onQueueTitles,
  onQueueContent,
  onQueueGoogleDeepResearch,
  onUpdatePost,
  onUpdatePostStatus,
  onDeletePost,
  onImageUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('categories');
  const [briefFilter, setBriefFilter] = useState<{
    categoryId: string;
    categoryName: string;
  } | null>(null);

  // Count actionable briefs only (PITCH or PENDING status - not yet written)
  const actionableBriefCount = posts.filter(p =>
    !p.isCategoryPage &&
    (p.status === PostStatus.PITCH || p.status === PostStatus.PENDING)
  ).length;

  // Handle "View Articles" from category card
  const handleViewArticles = useCallback((categoryId: string, categoryName: string) => {
    setBriefFilter({ categoryId, categoryName });
    setActiveTab('briefs');
  }, []);

  // Clear filter when manually changing tabs
  const handleTabChange = useCallback((tab: WorkspaceTab) => {
    if (tab === 'categories') {
      setBriefFilter(null);
    }
    setActiveTab(tab);
  }, []);

  // Clear filter
  const handleClearFilter = useCallback(() => {
    setBriefFilter(null);
  }, []);

  // Back to categories
  const handleBackToCategories = useCallback(() => {
    setBriefFilter(null);
    setActiveTab('categories');
  }, []);

  // Handle generate content
  const handleGenerate = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      onQueueContent(post);
    }
  }, [posts, onQueueContent]);

  // Handle bulk generate - generate all pitch/pending posts
  const handleBulkGenerate = useCallback(() => {
    const pitchPosts = posts.filter(p =>
      !p.isCategoryPage &&
      (p.status === PostStatus.PITCH || p.status === PostStatus.PENDING) &&
      (!briefFilter || p.categoryId === briefFilter.categoryId)
    );

    if (pitchPosts.length === 0) return;

    // Confirm bulk action
    if (!confirm(`Generate content for ${pitchPosts.length} briefs? This will use credits for each article.`)) {
      return;
    }

    // Queue all posts for generation
    pitchPosts.forEach(post => {
      onQueueContent(post);
    });
  }, [posts, briefFilter, onQueueContent]);

  // Handle skip/delete
  const handleSkip = useCallback((postId: string) => {
    onDeletePost(postId);
  }, [onDeletePost]);

  // Handle update brief
  const handleUpdateBrief = useCallback((postId: string, updates: {
    title?: string;
    teaser?: string;
    keyPoints?: string[];
    metaDescription?: string;
    metaKeywords?: string[];
  }) => {
    const updateData: Partial<Post> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.teaser !== undefined) updateData.teaser = updates.teaser;
    if (updates.metaDescription !== undefined) updateData.metaDescription = updates.metaDescription;
    if (updates.metaKeywords !== undefined) updateData.metaKeywords = updates.metaKeywords;
    if (updates.keyPoints !== undefined) {
      updateData.pitch = {
        ...posts.find(p => p.id === postId)?.pitch,
        headline: updates.title || '',
        keyPoints: updates.keyPoints,
        targetKeywords: [],
      };
    }
    onUpdatePost(postId, updateData);
  }, [posts, onUpdatePost]);

  // Handle launch
  const handleLaunch = useCallback((postId: string) => {
    onUpdatePostStatus(postId, PostStatus.PUBLISHED);
  }, [onUpdatePostStatus]);

  // Handle add category
  const handleAddClick = useCallback(() => {
    console.log('[TabbedCategoryWorkspace] handleAddClick called, activeTab:', activeTab);
    if (activeTab === 'categories') {
      const name = prompt('Enter category name:');
      console.log('[TabbedCategoryWorkspace] User entered name:', name);
      if (name?.trim()) {
        console.log('[TabbedCategoryWorkspace] Calling onAddCategory with:', name.trim());
        onAddCategory(name.trim(), null, '', false);
      }
    }
  }, [activeTab, onAddCategory]);

  // Handle add subcategory
  const handleAddSubcategory = useCallback((parentId: string, name: string, description: string) => {
    onAddCategory(name, parentId, description, false);
  }, [onAddCategory]);

  // Handle generate briefs
  const handleGenerateStubs = useCallback((categoryId: string, count: number) => {
    onQueueTitles(categoryId, count);
  }, [onQueueTitles]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0f]">
      {/* Tab bar */}
      <WorkspaceTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        briefCount={actionableBriefCount}
        onAddClick={activeTab === 'categories' ? handleAddClick : undefined}
      />

      {/* Tab content */}
      {activeTab === 'categories' ? (
        <CategoriesTab
          categories={categories}
          posts={posts}
          tasks={tasks}
          project={project}
          organization={organization}
          creditBalance={organization?.credits?.balance || 0}
          onResearch={onQueueGoogleDeepResearch}
          onGenerateStubs={handleGenerateStubs}
          onViewArticles={handleViewArticles}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          onAddCategory={onAddCategory}
          onAddSubcategory={handleAddSubcategory}
        />
      ) : (
        <BriefsTab
          posts={posts}
          categories={categories}
          filter={briefFilter}
          onClearFilter={handleClearFilter}
          onGenerate={handleGenerate}
          onBulkGenerate={handleBulkGenerate}
          onSkip={handleSkip}
          onUpdateBrief={handleUpdateBrief}
          onImageUpdate={onImageUpdate}
          onLaunch={handleLaunch}
          onBackToCategories={handleBackToCategories}
        />
      )}
    </div>
  );
};

export default TabbedCategoryWorkspace;
