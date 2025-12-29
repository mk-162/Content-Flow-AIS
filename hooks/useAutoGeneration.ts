import { useState, useEffect, useMemo, useCallback } from 'react';
import { Category, Post, Project, PostStatus, TaskType, TaskStatus } from '../types';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    pendingTasks: Array<{ categoryId?: string; type: string; status: string }>,
    notify: (message: string) => void
): UseAutoGenerationResult {
    const [isGenerating, setIsGenerating] = useState(false);

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

            if (stubCount < threshold && !hasPendingTask) {
                const needed = threshold - stubCount;
                results.push({ category, currentCount: stubCount, needed });
            }
        }

        const total = results.reduce((sum, r) => sum + r.needed, 0);
        return { categoriesBelowThreshold: results, totalStubsNeeded: total };
    }, [categories, posts, project, pendingTasks]);

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
