import { useState, useEffect, useCallback, useRef } from 'react';
import { Category, GenerationTask, TaskStatus, TaskType } from '../types';

export interface ResearchStatus {
  status: 'none' | 'running' | 'complete' | 'failed';
  progress: number;
  elapsedSeconds: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error?: string;
  content?: string;
}

interface UseResearchStatusOptions {
  category: Category | null;
  tasks: GenerationTask[];
  onComplete?: (categoryId: string) => void;
}

/**
 * Hook to track research status for a category
 * Polls elapsed time and calculates progress based on task status
 */
export function useResearchStatus({
  category,
  tasks,
  onComplete,
}: UseResearchStatusOptions): ResearchStatus {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const previousStatusRef = useRef<'running' | 'complete' | 'none' | 'failed'>('none');
  const completedCallbackFiredRef = useRef(false);

  // Find the research task for this category
  const researchTask = tasks.find(
    t => t.categoryId === category?.id &&
         t.type === TaskType.GOOGLE_DEEP_RESEARCH &&
         (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
  );

  // Determine status
  const isRunning = !!researchTask;
  const hasResearch = !!(
    category?.googleDeepResearch?.content &&
    category.googleDeepResearch.status === 'complete'
  );
  const hasFailed = category?.googleDeepResearch?.status === 'failed';

  const currentStatus: ResearchStatus['status'] = isRunning
    ? 'running'
    : hasResearch
      ? 'complete'
      : hasFailed
        ? 'failed'
        : 'none';

  // Get progress from task
  const progress = researchTask?.progress || (hasResearch ? 100 : 0);

  // Track start time when research begins
  useEffect(() => {
    if (isRunning && !startedAt) {
      setStartedAt(new Date());
      setElapsedSeconds(0);
      completedCallbackFiredRef.current = false;
    } else if (!isRunning && startedAt) {
      // Research finished
      setStartedAt(null);
    }
  }, [isRunning, startedAt]);

  // Update elapsed time every second while running
  useEffect(() => {
    if (!isRunning || !startedAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  // Fire completion callback when research finishes
  useEffect(() => {
    if (
      previousStatusRef.current === 'running' &&
      currentStatus === 'complete' &&
      !completedCallbackFiredRef.current &&
      category?.id
    ) {
      completedCallbackFiredRef.current = true;
      onComplete?.(category.id);
    }
    previousStatusRef.current = currentStatus;
  }, [currentStatus, category?.id, onComplete]);

  // Calculate completed timestamp
  const completedAt = hasResearch && category?.googleDeepResearch?.generatedAt
    ? category.googleDeepResearch.generatedAt.toDate?.() || null
    : null;

  return {
    status: currentStatus,
    progress,
    elapsedSeconds,
    startedAt,
    completedAt,
    error: category?.googleDeepResearch?.error,
    content: category?.googleDeepResearch?.content,
  };
}

/**
 * Hook to track research status for multiple categories
 */
export function useMultipleResearchStatus(
  categories: Category[],
  tasks: GenerationTask[],
  onComplete?: (categoryId: string) => void
): Map<string, ResearchStatus> {
  const [statusMap, setStatusMap] = useState<Map<string, ResearchStatus>>(new Map());

  useEffect(() => {
    const newMap = new Map<string, ResearchStatus>();

    categories.forEach(category => {
      // Find research task
      const researchTask = tasks.find(
        t => t.categoryId === category.id &&
             t.type === TaskType.GOOGLE_DEEP_RESEARCH &&
             (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
      );

      const isRunning = !!researchTask;
      const hasResearch = !!(
        category.googleDeepResearch?.content &&
        category.googleDeepResearch.status === 'complete'
      );
      const hasFailed = category.googleDeepResearch?.status === 'failed';

      const status: ResearchStatus['status'] = isRunning
        ? 'running'
        : hasResearch
          ? 'complete'
          : hasFailed
            ? 'failed'
            : 'none';

      // Check for completion transition
      const prevStatus = statusMap.get(category.id);
      if (prevStatus?.status === 'running' && status === 'complete') {
        onComplete?.(category.id);
      }

      newMap.set(category.id, {
        status,
        progress: researchTask?.progress || (hasResearch ? 100 : 0),
        elapsedSeconds: 0, // Would need per-category tracking for accurate timing
        startedAt: isRunning ? new Date() : null,
        completedAt: hasResearch && category.googleDeepResearch?.generatedAt
          ? category.googleDeepResearch.generatedAt.toDate?.() || null
          : null,
        error: category.googleDeepResearch?.error,
        content: category.googleDeepResearch?.content,
      });
    });

    setStatusMap(newMap);
  }, [categories, tasks]);

  return statusMap;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

export default useResearchStatus;
