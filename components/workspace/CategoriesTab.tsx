import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Folder, FolderOpen, Plus } from 'lucide-react';
import { Category, Post, GenerationTask, TaskStatus, TaskType, Project, Organization } from '../../types';
import { CategoryCard } from './CategoryCard';
import { AddSubcategoryModal } from '../AddSubcategoryModal';
import { ResearchConfirmationModal } from './ResearchConfirmationModal';
import { ResearchProgressModal } from './ResearchProgressModal';
import { ResearchReportModal } from './ResearchReportModal';
import { ResearchCompleteCelebration } from './ResearchCompleteCelebration';
import { ResearchToastContainer, useResearchToasts } from './ResearchToast';
import { useResearchStatus, formatRelativeTime } from '../../hooks/useResearchStatus';

interface CategoriesTabProps {
  categories: Category[];
  posts: Post[];
  tasks: GenerationTask[];
  project: Project | null;
  organization: Organization | null;
  creditBalance?: number;
  onResearch: (categoryId: string) => void;
  onGenerateStubs: (categoryId: string, count: number) => void;
  onViewArticles: (categoryId: string, categoryName: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onAddCategory: (name: string, parentId: string | null, description?: string, runResearchFirst?: boolean) => void;
  onAddSubcategory: (parentId: string, name: string, description: string) => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  posts,
  tasks,
  project,
  organization,
  creditBalance = 0,
  onResearch,
  onGenerateStubs,
  onViewArticles,
  onUpdateCategory,
  onDeleteCategory,
  onAddCategory,
  onAddSubcategory,
}) => {
  const [subcategoryParent, setSubcategoryParent] = useState<Category | null>(null);

  // Research modal state
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  const [progressCategory, setProgressCategory] = useState<Category | null>(null);
  const [reportCategory, setReportCategory] = useState<Category | null>(null);
  const [celebrateCategory, setCelebrateCategory] = useState<Category | null>(null);

  // Research toasts
  const { toasts, addToast, dismissToast } = useResearchToasts();

  // Track elapsed time for progress modal
  const [researchStartTime, setResearchStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time every second when research is running
  useEffect(() => {
    if (!progressCategory || !researchStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - researchStartTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [progressCategory, researchStartTime]);

  // Track when research completes for a category we're watching
  useEffect(() => {
    if (!progressCategory) return;

    const task = tasks.find(
      t => t.categoryId === progressCategory.id &&
           t.type === TaskType.GOOGLE_DEEP_RESEARCH
    );

    // Check if task completed
    if (task?.status === TaskStatus.COMPLETED) {
      // Find the updated category
      const updatedCategory = categories.find(c => c.id === progressCategory.id);
      if (updatedCategory?.googleDeepResearch?.status === 'complete') {
        setProgressCategory(null);
        setCelebrateCategory(updatedCategory);
      }
    }

    // Check for failed status
    if (task?.status === TaskStatus.FAILED) {
      setProgressCategory(null);
      addToast(progressCategory.id, progressCategory.name, 'error', 'Research failed');
    }
  }, [tasks, progressCategory, categories, addToast]);

  // Separate parent and subcategories
  const { parentCategories, subcategories } = useMemo(() => {
    const parents = categories.filter(c => c.parentId === null);
    const subs = categories.filter(c => c.parentId !== null);
    return { parentCategories: parents, subcategories: subs };
  }, [categories]);

  // Get article count per category
  const getArticleCount = (categoryId: string): number => {
    return posts.filter(p => p.categoryId === categoryId && !p.isCategoryPage).length;
  };

  // Check if research is running for a category
  const isResearchRunning = (categoryId: string): boolean => {
    return tasks.some(
      t => t.categoryId === categoryId &&
           t.type === TaskType.GOOGLE_DEEP_RESEARCH &&
           (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
    );
  };

  // Check if brief generation is running for a category
  const getBriefGenerationStatus = (categoryId: string): { isGenerating: boolean; count: number } => {
    const task = tasks.find(
      t => t.categoryId === categoryId &&
           t.type === TaskType.GENERATE_TITLES &&
           (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
    ) as (GenerationTask & { requestedCount?: number }) | undefined;

    return {
      isGenerating: !!task,
      count: task?.requestedCount || 5
    };
  };

  // Check if category has research
  const hasResearch = (category: Category): boolean => {
    return !!(category.googleDeepResearch?.content && category.googleDeepResearch.status === 'complete');
  };

  // Get parent name for subcategory
  const getParentName = (parentId: string | null): string | undefined => {
    if (!parentId) return undefined;
    const parent = categories.find(c => c.id === parentId);
    return parent?.name;
  };

  // Handle add multiple subcategories from modal
  const handleAddMultipleSubcategories = (
    parentId: string,
    subs: Array<{ name: string; description: string; targetArticles?: number }>
  ) => {
    subs.forEach(sub => {
      onAddCategory(sub.name, parentId, sub.description, false);
    });
  };

  // Get research progress for a category
  const getResearchProgress = (categoryId: string): number => {
    const task = tasks.find(
      t => t.categoryId === categoryId &&
           t.type === TaskType.GOOGLE_DEEP_RESEARCH &&
           (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
    );
    return task?.progress || 0;
  };

  // Get research completed timestamp
  const getResearchCompletedAt = (category: Category): Date | null => {
    if (category.googleDeepResearch?.generatedAt) {
      return category.googleDeepResearch.generatedAt.toDate?.() || null;
    }
    return null;
  };

  // Handle research button click - show confirmation
  const handleResearchClick = useCallback((category: Category) => {
    // If already running, show progress modal
    if (isResearchRunning(category.id)) {
      setProgressCategory(category);
      if (!researchStartTime) {
        setResearchStartTime(new Date());
      }
      return;
    }

    // If has research, show report
    if (hasResearch(category)) {
      setReportCategory(category);
      return;
    }

    // Otherwise show confirmation
    setConfirmCategory(category);
  }, [researchStartTime]);

  // Handle research confirmation
  const handleConfirmResearch = useCallback(() => {
    if (!confirmCategory) return;

    // Start research
    onResearch(confirmCategory.id);

    // Switch to progress modal
    setConfirmCategory(null);
    setProgressCategory(confirmCategory);
    setResearchStartTime(new Date());
    setElapsedSeconds(0);
  }, [confirmCategory, onResearch]);

  // Handle view research report
  const handleViewResearch = useCallback((category: Category) => {
    setReportCategory(category);
  }, []);

  // Handle toast view click
  const handleToastView = useCallback((categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setReportCategory(category);
    }
  }, [categories]);

  // Get subcategories for a parent
  const getSubcategoriesForParent = (parentId: string): Category[] => {
    return subcategories.filter(c => c.parentId === parentId);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Folder size={20} className="text-purple-400" />
        <h2 className="text-lg font-semibold text-white">
          Categories
        </h2>
        <span className="text-sm text-zinc-500">
          ({parentCategories.length} parent{parentCategories.length !== 1 ? 's' : ''}, {subcategories.length} sub)
        </span>
      </div>

      {parentCategories.length > 0 ? (
        <div className="space-y-6">
          {parentCategories.map(parent => {
            const childCategories = getSubcategoriesForParent(parent.id);

            return (
              <div key={parent.id} className="space-y-3">
                {/* Parent Category Card */}
                <CategoryCard
                  category={parent}
                  isParent={true}
                  articleCount={getArticleCount(parent.id)}
                  isResearchRunning={isResearchRunning(parent.id)}
                  hasResearch={hasResearch(parent)}
                  researchProgress={getResearchProgress(parent.id)}
                  researchElapsedSeconds={progressCategory?.id === parent.id ? elapsedSeconds : 0}
                  researchCompletedAt={getResearchCompletedAt(parent)}
                  onResearch={() => handleResearchClick(parent)}
                  onViewResearch={() => handleViewResearch(parent)}
                  onGenerateSubcategories={() => setSubcategoryParent(parent)}
                  onViewArticles={() => onViewArticles(parent.id, parent.name)}
                  onUpdateCategory={(updates) => onUpdateCategory(parent.id, updates)}
                  onDelete={() => {
                    if (confirm(`Delete "${parent.name}" and all its subcategories? This cannot be undone.`)) {
                      onDeleteCategory(parent.id);
                    }
                  }}
                />

                {/* Subcategories nested under parent */}
                {childCategories.length > 0 && (
                  <div className="ml-6 pl-4 border-l-2 border-purple-500/30 space-y-3">
                    {childCategories.map(subcat => {
                      const briefStatus = getBriefGenerationStatus(subcat.id);
                      return (
                        <CategoryCard
                          key={subcat.id}
                          category={subcat}
                          isParent={false}
                          parentName={parent.name}
                          categoryBreadcrumb={[parent.name, subcat.name]}
                          articleCount={getArticleCount(subcat.id)}
                          isResearchRunning={isResearchRunning(subcat.id)}
                          hasResearch={hasResearch(subcat)}
                          researchProgress={getResearchProgress(subcat.id)}
                          researchElapsedSeconds={progressCategory?.id === subcat.id ? elapsedSeconds : 0}
                          researchCompletedAt={getResearchCompletedAt(subcat)}
                          isGeneratingBriefs={briefStatus.isGenerating}
                          generatingBriefsCount={briefStatus.count}
                          onResearch={() => handleResearchClick(subcat)}
                          onViewResearch={() => handleViewResearch(subcat)}
                          onGenerateStubs={(count) => onGenerateStubs(subcat.id, count)}
                          onViewArticles={() => onViewArticles(subcat.id, subcat.name)}
                          onUpdateCategory={(updates) => onUpdateCategory(subcat.id, updates)}
                          onDelete={() => {
                            if (confirm(`Delete "${subcat.name}"? This cannot be undone.`)) {
                              onDeleteCategory(subcat.id);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Folder size={32} className="text-zinc-600" />}
          title="No categories yet"
          description="Create your first category to organize your content"
          actionLabel="Add Category"
          onAction={() => {
            const name = prompt('Enter category name:');
            if (name?.trim()) {
              onAddCategory(name.trim(), null, '', false);
            }
          }}
        />
      )}

      {/* Add Subcategory Modal */}
      {subcategoryParent && project && organization && (
        <AddSubcategoryModal
          parentCategory={subcategoryParent}
          existingCategories={categories}
          project={project}
          organizationId={organization.id}
          onAddSubcategory={(name, description, targetArticles) => {
            onAddCategory(name, subcategoryParent.id, description, false);
          }}
          onAddMultipleSubcategories={(subs) => {
            handleAddMultipleSubcategories(subcategoryParent.id, subs);
          }}
          onClose={() => setSubcategoryParent(null)}
        />
      )}

      {/* Research Confirmation Modal */}
      {confirmCategory && (
        <ResearchConfirmationModal
          categoryName={confirmCategory.name}
          creditCost={20}
          currentCredits={creditBalance}
          onConfirm={handleConfirmResearch}
          onCancel={() => setConfirmCategory(null)}
        />
      )}

      {/* Research Progress Modal */}
      {progressCategory && (
        <ResearchProgressModal
          categoryName={progressCategory.name}
          progress={getResearchProgress(progressCategory.id)}
          elapsedSeconds={elapsedSeconds}
          onMinimize={() => setProgressCategory(null)}
        />
      )}

      {/* Research Report Modal */}
      {reportCategory && reportCategory.googleDeepResearch?.content && (
        <ResearchReportModal
          categoryName={reportCategory.name}
          content={reportCategory.googleDeepResearch.content}
          generatedAt={getResearchCompletedAt(reportCategory)}
          onClose={() => setReportCategory(null)}
          onRefresh={() => {
            setReportCategory(null);
            setConfirmCategory(reportCategory);
          }}
          refreshCost={20}
        />
      )}

      {/* Research Complete Celebration */}
      {celebrateCategory && (
        <ResearchCompleteCelebration
          show={true}
          categoryName={celebrateCategory.name}
          onComplete={() => setCelebrateCategory(null)}
          onViewReport={() => {
            setCelebrateCategory(null);
            setReportCategory(celebrateCategory);
          }}
        />
      )}

      {/* Research Toast Notifications */}
      <ResearchToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onView={handleToastView}
      />
    </div>
  );
};

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="border border-dashed border-zinc-800 p-8 text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-base font-medium text-white mb-2">{title}</h3>
    <p className="text-sm text-zinc-500 mb-4">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
      >
        <Plus size={16} />
        {actionLabel}
      </button>
    )}
  </div>
);

export default CategoriesTab;
