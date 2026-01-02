import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Category, Post, Project, PostStatus, TaskType, TaskStatus } from '../types';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Circuit breaker: track failures per category to prevent infinite retry loops
interface FailureRecord {
    count: number;
    lastFailedAt: number;
}

const FAILURE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown after failure
const MAX_FAILURES_BEFORE_COOLDOWN = 2; // Allow 2 failures before cooldown

interface AutoGenerationState {
    categoriesBelowThreshold: Array<{ category: Category; currentCount: number; needed: number }>;
    totalStubsNeeded: number;
    showMigrationPrompt: boolean;
    isGenerating: boolean;
}

interface UseAutoGenerationResult extends AutoGenerationState {
    triggerAutoGeneration: (categoryIds?: string[]) => Promise<void>;
    confirmMigration: () => Promise<void>;
    dismissMigration: () => Promise<void>;
}

export function useAutoGeneration(
    categories: Category[],
    posts: Post[],
    project: Project | null,
    orgId: string | undefined,
    userId: string | undefined,
    creditBalance: number,
    pendingTasks: Array<{ categoryId?: string; type: string; status: string; error?: string }>,
    notify: (message: string) => void
): UseAutoGenerationResult {
    const [isGenerating, setIsGenerating] = useState(false);
    const failureRecords = useRef<Map<string, FailureRecord>>(new Map());
    const processedFailedTaskIds = useRef<Set<string>>(new Set());

    // Track failed tasks and update failure records (circuit breaker)
    useEffect(() => {
        const failedTasks = pendingTasks.filter(
            t => t.type === TaskType.GENERATE_TITLES &&
                 t.status === TaskStatus.FAILED &&
                 t.categoryId &&
                 !processedFailedTaskIds.current.has(`${t.categoryId}-${t.status}`)
        );

        for (const task of failedTasks) {
            if (task.categoryId) {
                processedFailedTaskIds.current.add(`${task.categoryId}-${task.status}`);
                const existing = failureRecords.current.get(task.categoryId) || { count: 0, lastFailedAt: 0 };
                failureRecords.current.set(task.categoryId, {
                    count: existing.count + 1,
                    lastFailedAt: Date.now()
                });
                console.log(`[useAutoGeneration] Circuit breaker: ${task.categoryId} failures = ${existing.count + 1}`);
            }
        }

        // Cleanup: remove entries for tasks that are no longer in pendingTasks to prevent memory growth
        // Keep the set size bounded by removing stale entries
        if (processedFailedTaskIds.current.size > 100) {
            const currentFailedCategoryIds = new Set(
                pendingTasks
                    .filter(t => t.status === TaskStatus.FAILED && t.categoryId)
                    .map(t => `${t.categoryId}-${t.status}`)
            );

            for (const key of processedFailedTaskIds.current) {
                if (!currentFailedCategoryIds.has(key)) {
                    processedFailedTaskIds.current.delete(key);
                }
            }
        }
    }, [pendingTasks]);

    // Check if a category is in cooldown and cleanup expired records
    // Note: This function has a side effect - it removes expired cooldown records
    const checkAndCleanupCooldown = useCallback((categoryId: string): boolean => {
        const record = failureRecords.current.get(categoryId);
        if (!record) return false;

        const timeSinceFailure = Date.now() - record.lastFailedAt;

        // Still in cooldown - return true without cleanup
        if (record.count >= MAX_FAILURES_BEFORE_COOLDOWN && timeSinceFailure < FAILURE_COOLDOWN_MS) {
            return true;
        }

        // Cooldown expired - cleanup the record and return false
        if (timeSinceFailure >= FAILURE_COOLDOWN_MS) {
            failureRecords.current.delete(categoryId);
        }

        return false;
    }, []);

    // Calculate which categories are below threshold
    const { categoriesBelowThreshold, totalStubsNeeded } = useMemo(() => {
        // Default to enabled if not explicitly set
        const autoGenEnabled = project?.settings?.autoGeneration?.enabled ?? true;
        if (!autoGenEnabled) {
            return { categoriesBelowThreshold: [], totalStubsNeeded: 0 };
        }

        const threshold = project?.settings?.autoGeneration?.stubThreshold ?? 5;
        const results: Array<{ category: Category; currentCount: number; needed: number }> = [];

        for (const category of categories) {
            // Count PENDING posts (stubs) for this category
            const stubCount = posts.filter(
                p => p.categoryId === category.id && p.status === PostStatus.PENDING
            ).length;

            // Check if there's already a pending generation task for this category
            const hasPendingTask = pendingTasks.some(
                t => t.categoryId === category.id &&
                    t.type === TaskType.GENERATE_TITLES &&
                    (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
            );

            // Check circuit breaker - skip categories in cooldown after repeated failures
            const inCooldown = checkAndCleanupCooldown(category.id);

            if (stubCount < threshold && !hasPendingTask && !inCooldown) {
                const needed = threshold - stubCount;
                results.push({ category, currentCount: stubCount, needed });
            }
        }

        const total = results.reduce((sum, r) => sum + r.needed, 0);
        return { categoriesBelowThreshold: results, totalStubsNeeded: total };
    }, [categories, posts, project, pendingTasks, checkAndCleanupCooldown]);

    // Determine if migration prompt should be shown
    const showMigrationPrompt = useMemo(() => {
        const autoGenEnabled = project?.settings?.autoGeneration?.enabled ?? true;
        if (!autoGenEnabled) return false;
        if (project?.settings?.autoGeneration?.migrationPromptShown) return false;
        return totalStubsNeeded > 20;
    }, [project, totalStubsNeeded]);

    // Trigger auto-generation for specific categories or all below threshold
    const triggerAutoGeneration = useCallback(async (categoryIds?: string[]) => {
        if (!orgId || !project || !userId) return;
        if (isGenerating) return;

        const categoriesToGenerate = categoryIds
            ? categoriesBelowThreshold.filter(c => categoryIds.includes(c.category.id))
            : categoriesBelowThreshold;

        if (categoriesToGenerate.length === 0) return;

        // Check credit balance
        const totalNeeded = categoriesToGenerate.reduce((sum, c) => sum + c.needed, 0);
        if (creditBalance < totalNeeded) {
            notify(`Insufficient credits. Need ${totalNeeded}, have ${creditBalance}`);
            return;
        }

        setIsGenerating(true);

        try {
            // Queue generation for each category
            for (const { category, needed } of categoriesToGenerate) {
                await addDoc(collection(db, 'generationQueue'), {
                    type: TaskType.GENERATE_TITLES,
                    organizationId: orgId,
                    projectId: project.id,
                    categoryId: category.id,
                    categoryName: category.name,
                    status: TaskStatus.QUEUED,
                    progress: 0,
                    createdBy: userId,
                    startedAt: Timestamp.now(),
                    requestedCount: needed,
                });
            }

            const totalStubs = categoriesToGenerate.reduce((sum, c) => sum + c.needed, 0);
            notify(`Auto-generating ${totalStubs} stubs across ${categoriesToGenerate.length} categories`);
        } catch (error) {
            console.error('[useAutoGeneration] Error queuing generation:', error);
            notify('Failed to queue auto-generation');
        } finally {
            setIsGenerating(false);
        }
    }, [orgId, project, userId, categoriesBelowThreshold, creditBalance, isGenerating, notify]);

    // Confirm migration - mark as shown and trigger generation
    const confirmMigration = useCallback(async () => {
        if (!orgId || !project) return;

        try {
            // Mark migration prompt as shown
            const projectRef = doc(db, `organizations/${orgId}/projects`, project.id);
            await updateDoc(projectRef, {
                'settings.autoGeneration.migrationPromptShown': true
            });

            // Trigger generation for all categories below threshold
            await triggerAutoGeneration();
        } catch (error) {
            console.error('[useAutoGeneration] Error confirming migration:', error);
        }
    }, [orgId, project, triggerAutoGeneration]);

    // Dismiss migration - mark as shown but disable auto-generation
    const dismissMigration = useCallback(async () => {
        if (!orgId || !project) return;

        try {
            const projectRef = doc(db, `organizations/${orgId}/projects`, project.id);
            await updateDoc(projectRef, {
                'settings.autoGeneration.migrationPromptShown': true,
                'settings.autoGeneration.enabled': false
            });
            notify('Auto-generation disabled. You can enable it in Project Settings.');
        } catch (error) {
            console.error('[useAutoGeneration] Error dismissing migration:', error);
        }
    }, [orgId, project, notify]);

    return {
        categoriesBelowThreshold,
        totalStubsNeeded,
        showMigrationPrompt,
        isGenerating,
        triggerAutoGeneration,
        confirmMigration,
        dismissMigration
    };
}
