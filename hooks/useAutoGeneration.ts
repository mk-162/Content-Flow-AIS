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
    const prevProjectIdRef = useRef<string | undefined>(undefined);

    // Fix #3: Clear tracked failures on project change to prevent memory leak
    useEffect(() => {
        if (project?.id !== prevProjectIdRef.current) {
            processedFailedTaskIds.current.clear();
            failureRecords.current.clear();
            prevProjectIdRef.current = project?.id;
        }
    }, [project?.id]);

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
        // Keep the set size bounded by removing stale entries (lower threshold for smaller projects)
        const MAX_TRACKED_FAILURES = 50;
        if (processedFailedTaskIds.current.size > MAX_TRACKED_FAILURES) {
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

            // If still too large, keep only the most recent half
            if (processedFailedTaskIds.current.size > MAX_TRACKED_FAILURES) {
                const entries = Array.from(processedFailedTaskIds.current);
                processedFailedTaskIds.current = new Set(entries.slice(-MAX_TRACKED_FAILURES / 2));
            }
        }
    }, [pendingTasks]);

    // Fix #1: Separate cooldown check from cleanup to avoid side effects during render
    // This function only checks - no side effects
    const isInCooldown = useCallback((categoryId: string): boolean => {
        const record = failureRecords.current.get(categoryId);
        if (!record) return false;

        const timeSinceFailure = Date.now() - record.lastFailedAt;

        // Still in cooldown
        if (record.count >= MAX_FAILURES_BEFORE_COOLDOWN && timeSinceFailure < FAILURE_COOLDOWN_MS) {
            return true;
        }

        return false;
    }, []);

    // Cleanup expired cooldown records in a separate effect (not during render)
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [categoryId, record] of failureRecords.current.entries()) {
                if (now - record.lastFailedAt >= FAILURE_COOLDOWN_MS) {
                    failureRecords.current.delete(categoryId);
                }
            }
        }, 60000); // Cleanup every minute

        return () => clearInterval(cleanupInterval);
    }, []);

    // Helper to count articles including subcategories (for rollup)
    const getArticleCountWithRollup = useCallback((categoryId: string, includeSubcategories: boolean): number => {
        let count = posts.filter(
            p => p.categoryId === categoryId && p.status === PostStatus.PENDING
        ).length;

        if (includeSubcategories) {
            const subcategories = categories.filter(c => c.parentId === categoryId);
            for (const sub of subcategories) {
                count += posts.filter(
                    p => p.categoryId === sub.id && p.status === PostStatus.PENDING
                ).length;
            }
        }

        return count;
    }, [categories, posts]);

    // Calculate which categories are below threshold
    const { categoriesBelowThreshold, totalStubsNeeded } = useMemo(() => {
        // Default to enabled if not explicitly set
        const autoGenEnabled = project?.settings?.autoGeneration?.enabled ?? true;
        if (!autoGenEnabled) {
            return { categoriesBelowThreshold: [], totalStubsNeeded: 0 };
        }

        const projectDefaultThreshold = project?.settings?.autoGeneration?.stubThreshold ?? 5;
        const results: Array<{ category: Category; currentCount: number; needed: number }> = [];

        for (const category of categories) {
            // Check if auto-replenish is explicitly disabled for this category
            if (category.contentSettings?.autoReplenish === false) {
                continue;
            }

            // Get per-category target or fall back to project default
            const threshold = category.contentSettings?.targetArticles ?? projectDefaultThreshold;

            // Determine whether to include subcategory counts (rollup)
            const shouldRollUp = category.contentSettings?.rollUpSubcategories ?? true;

            // Count stubs - with rollup if enabled
            const stubCount = getArticleCountWithRollup(category.id, shouldRollUp);

            // Check if there's already a pending generation task for this category
            const hasPendingTask = pendingTasks.some(
                t => t.categoryId === category.id &&
                    t.type === TaskType.GENERATE_TITLES &&
                    (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
            );

            // Check circuit breaker - skip categories in cooldown after repeated failures
            const inCooldown = isInCooldown(category.id);

            if (stubCount < threshold && !hasPendingTask && !inCooldown) {
                const needed = threshold - stubCount;
                results.push({ category, currentCount: stubCount, needed });
            }
        }

        const total = results.reduce((sum, r) => sum + r.needed, 0);
        return { categoriesBelowThreshold: results, totalStubsNeeded: total };
    }, [categories, posts, project, pendingTasks, isInCooldown, getArticleCountWithRollup]);

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

        // Check if research-first mode is enabled
        const researchFirstEnabled = project?.settings?.enableDeepResearch === true;

        // Separate categories by whether they need research first
        const needsResearch: typeof categoriesToGenerate = [];
        const readyForStubs: typeof categoriesToGenerate = [];

        for (const item of categoriesToGenerate) {
            const hasResearch = item.category.googleDeepResearch?.status === 'complete';
            const researchRunning = item.category.googleDeepResearch?.status === 'running';

            if (researchFirstEnabled && !hasResearch && !researchRunning) {
                needsResearch.push(item);
            } else if (!researchRunning) {
                // Either research-first is off, or category already has research
                readyForStubs.push(item);
            }
            // Skip categories with running research - stubs will be chained when research completes
        }

        // Calculate credit cost
        const RESEARCH_CREDIT_COST = 20;
        const stubCreditsNeeded = readyForStubs.reduce((sum, c) => sum + c.needed, 0);
        const researchCreditsNeeded = needsResearch.length * RESEARCH_CREDIT_COST;
        const totalCreditsNeeded = stubCreditsNeeded + researchCreditsNeeded;

        if (creditBalance < totalCreditsNeeded) {
            notify(`Insufficient credits. Need ${totalCreditsNeeded}, have ${creditBalance}`);
            return;
        }

        setIsGenerating(true);

        // Fix #6: Handle each write individually and report partial success
        const results = { researchSuccess: 0, researchFailed: 0, stubsSuccess: 0, stubsFailed: 0 };

        try {
            // Queue research for categories that need it (stubs will be chained after research)
            for (const { category } of needsResearch) {
                try {
                    await addDoc(collection(db, 'generationQueue'), {
                        type: TaskType.GOOGLE_DEEP_RESEARCH,
                        organizationId: orgId,
                        projectId: project.id,
                        categoryId: category.id,
                        categoryName: category.name,
                        status: TaskStatus.QUEUED,
                        progress: 0,
                        createdBy: userId,
                        startedAt: Timestamp.now(),
                    });
                    results.researchSuccess++;
                } catch (err) {
                    console.error(`[useAutoGeneration] Failed to queue research for ${category.name}:`, err);
                    results.researchFailed++;
                }
            }

            // Queue stubs for categories that already have research (or research-first is off)
            for (const { category, needed } of readyForStubs) {
                try {
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
                    results.stubsSuccess++;
                } catch (err) {
                    console.error(`[useAutoGeneration] Failed to queue stubs for ${category.name}:`, err);
                    results.stubsFailed++;
                }
            }

            // Build notification message with success/failure counts
            const totalFailed = results.researchFailed + results.stubsFailed;
            if (totalFailed > 0 && results.researchSuccess + results.stubsSuccess === 0) {
                notify('Failed to queue auto-generation');
            } else if (totalFailed > 0) {
                const successCount = results.researchSuccess + results.stubsSuccess;
                notify(`Queued ${successCount} tasks, ${totalFailed} failed`);
            } else {
                const parts: string[] = [];
                if (results.researchSuccess > 0) {
                    parts.push(`Deep research on ${results.researchSuccess} ${results.researchSuccess === 1 ? 'category' : 'categories'} (stubs will follow)`);
                }
                if (results.stubsSuccess > 0) {
                    const totalStubs = readyForStubs.reduce((sum, c) => sum + c.needed, 0);
                    parts.push(`${totalStubs} article ideas across ${results.stubsSuccess} ${results.stubsSuccess === 1 ? 'category' : 'categories'}`);
                }
                notify(`Generating: ${parts.join(' + ')}`);
            }
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
