import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderTree,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
  Globe,
  Zap,
} from 'lucide-react';
import { CategoryWorkspace } from '../components/CategoryWorkspace';
import { PostsWorkspace } from '../components/PostsWorkspace';
import { LivePostsWorkspace } from '../components/LivePostsWorkspace';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import {
  Screen,
  Category,
  Post,
  GenerationTask,
  TaskStatus,
  TaskType,
  PostStatus,
  ContentType,
} from '../types';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
// Note: Content generation now handled by Cloud Function (processGenerationQueue)
import { ProjectSettings } from '../components/ProjectSettings';
import { TopBar } from '../components/layout';
import { creditService, CREDIT_COSTS } from '../services/creditService';
import { imageGenerationService } from '../services/imageGenerationService';
import { CreditManagementModal } from '../components/CreditManagementModal';
import { MigrationConfirmationModal } from '../components/MigrationConfirmationModal';
import { useAutoGeneration } from '../hooks/useAutoGeneration';

interface ExtendedGenerationTask extends GenerationTask {
  requestedCount?: number;
  contextOverride?: string;
}

export const MainWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();

  const [currentScreen, setCurrentScreen] = useState<Screen>(
    (location.state as any)?.initialScreen || Screen.CATEGORIES
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<ExtendedGenerationTask[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; msg: string; type: 'success' | 'info' }[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [generatingPostIds, setGeneratingPostIds] = useState<Set<string>>(new Set());
  const [notifiedFailedTasks, setNotifiedFailedTasks] = useState<Set<string>>(new Set());
  const [notifiedDegradedTasks, setNotifiedDegradedTasks] = useState<Set<string>>(new Set());
  const initialLoadCompleteRef = React.useRef(false);
  const initialFailedTaskIdsRef = React.useRef<Set<string>>(new Set());
  const initialDegradedTaskIdsRef = React.useRef<Set<string>>(new Set());

  const notify = (msg: string, type: 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36);
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  // Auto-generation hook
  const autoGen = useAutoGeneration(
    categories,
    posts,
    currentProject,
    currentOrg?.id,
    user?.id,
    currentOrg?.credits?.balance ?? 0,
    tasks.map(t => ({ categoryId: t.categoryId, type: t.type, status: t.status, error: t.error })),
    notify
  );

  // Show migration modal when needed
  useEffect(() => {
    if (autoGen.showMigrationPrompt && !loading && categories.length > 0) {
      setShowMigrationModal(true);
    }
  }, [autoGen.showMigrationPrompt, loading, categories.length]);

  // Redirect to projects if no project selected
  useEffect(() => {
    if (!currentOrg || !currentProject) {
      navigate('/projects');
    } else {
      setLoading(false);
    }
  }, [currentOrg, currentProject, navigate]);

  // Clear data and show loading when org/project changes to prevent stale data flash
  const prevOrgIdRef = React.useRef(currentOrg?.id);
  const prevProjectIdRef = React.useRef(currentProject?.id);

  useEffect(() => {
    const orgChanged = prevOrgIdRef.current !== currentOrg?.id;
    const projectChanged = prevProjectIdRef.current !== currentProject?.id;

    if (orgChanged || projectChanged) {
      setCategories([]);
      setPosts([]);
      setTasks([]);
      // Show loading during transition to prevent empty state flash
      if (currentOrg && currentProject) {
        setLoading(true);
      }
    }

    prevOrgIdRef.current = currentOrg?.id;
    prevProjectIdRef.current = currentProject?.id;
  }, [currentOrg?.id, currentProject?.id]);

  // Real-time listener for categories
  useEffect(() => {
    if (!currentOrg || !currentProject) return;

    const categoriesRef = collection(
      db,
      `organizations/${currentOrg.id}/projects/${currentProject.id}/categories`
    );

    const unsubscribe = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(categoriesData);
        // Clear loading state after first data arrives
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to categories:', error);
        notify('Error loading categories', 'info');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentOrg, currentProject]);

  // Real-time listener for posts
  useEffect(() => {
    if (!currentOrg || !currentProject) return;

    const postsRef = collection(
      db,
      `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`
    );

    const unsubscribe = onSnapshot(
      postsRef,
      (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setPosts(postsData);
      },
      (error) => {
        console.error('Error listening to posts:', error);
        notify('Error loading posts', 'info');
      }
    );

    return unsubscribe;
  }, [currentOrg, currentProject]);

  // Real-time listener for generation queue
  useEffect(() => {
    if (!currentOrg || !currentProject) return;

    const queueRef = collection(db, 'generationQueue');
    const q = query(
      queueRef,
      where('organizationId', '==', currentOrg.id),
      where('projectId', '==', currentProject.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExtendedGenerationTask[];
        setTasks(tasksData);
      },
      (error) => {
        console.error('Error listening to queue:', error);
      }
    );

    return unsubscribe;
  }, [currentOrg, currentProject]);

  // Monitor for failed tasks and notify user (only NEW failures, not historical ones)
  useEffect(() => {
    const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED);

    // On first load, capture existing failed task IDs without notifying
    if (!initialLoadCompleteRef.current && failedTasks.length > 0) {
      initialFailedTaskIdsRef.current = new Set(failedTasks.map(t => t.id));
      initialLoadCompleteRef.current = true;
      return;
    }

    // Mark initial load complete even if no failed tasks
    if (!initialLoadCompleteRef.current) {
      initialLoadCompleteRef.current = true;
    }

    for (const task of failedTasks) {
      // Skip tasks that existed on initial load (historical failures)
      if (initialFailedTaskIdsRef.current.has(task.id)) continue;
      // Skip already notified tasks
      if (notifiedFailedTasks.has(task.id)) continue;

      // Show notification based on error type with user-friendly messages
      const errorMsg = task.error || 'Unknown error';
      const errorLower = errorMsg.toLowerCase();
      const taskName = task.categoryName || 'task';

      let userMessage: string;
      if (errorLower.includes('insufficient credits')) {
        userMessage = 'Generation failed: Insufficient credits. Add more credits to continue.';
        setIsCreditModalOpen(true);
      } else if (errorLower.includes('timed out') || errorLower.includes('timeout')) {
        userMessage = `"${taskName}" timed out. The AI is busy - please try again.`;
      } else if (errorLower.includes('rate limit') || errorLower.includes('quota')) {
        userMessage = `"${taskName}" hit rate limit. Please wait a moment and retry.`;
      } else if (errorLower.includes('network') || errorLower.includes('fetch')) {
        userMessage = `Network error for "${taskName}". Check your connection and retry.`;
      } else if (errorLower.includes('parse') || errorLower.includes('json')) {
        userMessage = `"${taskName}" failed: AI response was invalid. Please retry.`;
      } else if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
        userMessage = `Permission denied for "${taskName}". You may need to re-login.`;
      } else if (errorLower.includes('unknown task type')) {
        userMessage = `"${taskName}" failed: Backend needs update. Please redeploy Cloud Functions.`;
      } else if (errorLower.includes('connection error') || errorLower.includes('openai api error')) {
        userMessage = `"${taskName}" failed: AI service temporarily unavailable. Please retry.`;
      } else {
        // Fallback: show first 80 chars but ensure we don't cut mid-word
        const maxLen = 80;
        const truncated = errorMsg.length > maxLen
          ? errorMsg.substring(0, errorMsg.lastIndexOf(' ', maxLen) || maxLen) + '...'
          : errorMsg;
        userMessage = `"${taskName}" failed: ${truncated}`;
      }

      notify(userMessage, 'info');
      setNotifiedFailedTasks(prev => new Set([...prev, task.id]));
    }
  }, [tasks, notifiedFailedTasks]);

  // Monitor for completed tasks with degraded mode (only NEW, not historical)
  useEffect(() => {
    const degradedTasks = tasks.filter(
      t => t.status === TaskStatus.COMPLETED &&
           t.result?.degradedMode === true
    );

    // Capture initial degraded task IDs on first load without notifying
    if (initialDegradedTaskIdsRef.current.size === 0 && degradedTasks.length > 0) {
      initialDegradedTaskIdsRef.current = new Set(degradedTasks.map(t => t.id));
      return;
    }

    for (const task of degradedTasks) {
      // Skip tasks that existed on initial load
      if (initialDegradedTaskIdsRef.current.has(task.id)) continue;
      // Skip already notified tasks
      if (notifiedDegradedTasks.has(task.id)) continue;

      const taskName = task.categoryName || 'task';
      notify(
        `"${taskName}" titles generated without keyword optimization. SEO quality may be affected.`,
        'info'
      );
      setNotifiedDegradedTasks(prev => new Set([...prev, task.id]));
    }
  }, [tasks, notifiedDegradedTasks]);

  // Cleanup: Reset orphaned posts and stale tasks (runs periodically, not on every state change)
  const cleanedUpItemsRef = React.useRef<Set<string>>(new Set());
  const lastCleanupRef = React.useRef<number>(0);
  const tasksRef = React.useRef(tasks);
  const postsRef = React.useRef(posts);

  // Keep refs up to date
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  useEffect(() => {
    if (!currentOrg || !currentProject || !user) return;

    const runCleanup = async () => {
      // Throttle: only run cleanup every 30 seconds max
      const now = Date.now();
      if (now - lastCleanupRef.current < 30000) return;
      lastCleanupRef.current = now;

      const currentTasks = tasksRef.current;
      const currentPosts = postsRef.current;

      // 1. Reset stale PROCESSING tasks (older than 5 minutes)
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
      const staleTasks = currentTasks.filter(t =>
        t.status === TaskStatus.PROCESSING &&
        t.startedAt && t.startedAt.toDate() < fiveMinutesAgo &&
        !cleanedUpItemsRef.current.has(`task-${t.id}`)
      );

      for (const task of staleTasks) {
        console.log(`[Cleanup] Resetting stale PROCESSING task: ${task.id}`);
        cleanedUpItemsRef.current.add(`task-${task.id}`);
        try {
          const taskRef = doc(db, 'generationQueue', task.id);
          await updateDoc(taskRef, {
            status: TaskStatus.FAILED,
            error: 'Task timed out (stale)',
          });

          // Reset associated post if it's a content generation task
          if (task.type === TaskType.GENERATE_CONTENT && task.targetPostId) {
            const postRef = doc(
              db,
              `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
              task.targetPostId
            );
            await updateDoc(postRef, {
              status: PostStatus.PENDING,
              updatedAt: Timestamp.now(),
            });
          }
        } catch (err) {
          console.error('[Cleanup] Failed to reset task:', err);
        }
      }

      // 2. Reset orphaned posts stuck in GENERATING with no active task
      const generatingPosts = currentPosts.filter(p =>
        p.status === PostStatus.GENERATING &&
        !cleanedUpItemsRef.current.has(`post-${p.id}`)
      );

      for (const post of generatingPosts) {
        const hasActiveTask = currentTasks.some(
          t => t.targetPostId === post.id &&
          (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
        );

        if (!hasActiveTask) {
          console.log(`[Cleanup] Resetting orphaned post: ${post.title}`);
          cleanedUpItemsRef.current.add(`post-${post.id}`);
          try {
            const postRef = doc(
              db,
              `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
              post.id
            );
            await updateDoc(postRef, {
              status: PostStatus.PENDING,
              updatedAt: Timestamp.now(),
            });
          } catch (err) {
            console.error('[Cleanup] Failed to reset post:', err);
          }
        }
      }
    };

    // Run cleanup once after initial load, then periodically
    const initialTimeout = setTimeout(runCleanup, 3000);
    const interval = setInterval(runCleanup, 60000); // Check every 60 seconds

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [currentOrg?.id, currentProject?.id, user?.id]); // Only re-setup on org/project change

  // Queue Processing now happens server-side via Cloud Function (processGenerationQueue)
  // The client just displays task status from Firestore real-time updates

  // Actions
  const addCategory = async (name: string, parentId: string | null, description?: string) => {
    if (!currentOrg || !currentProject || !user) return;

    // Debounce: prevent duplicate submissions
    if (isAddingCategory) {
      notify('Category creation in progress...', 'info');
      return;
    }

    // Validate parent category exists (if specified)
    if (parentId !== null) {
      const parentExists = categories.some(c => c.id === parentId);
      if (!parentExists) {
        notify('Parent category not found', 'info');
        return;
      }
    }

    // Check for duplicate name at same level
    const normalizedName = name.trim().toLowerCase();
    const duplicateExists = categories.some(
      c => c.name.trim().toLowerCase() === normalizedName && c.parentId === parentId
    );
    if (duplicateExists) {
      notify(`Category "${name}" already exists at this level`, 'info');
      return;
    }

    setIsAddingCategory(true);

    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      // 1. Create category document
      const categoryRef = doc(collection(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/categories`
      ));

      batch.set(categoryRef, {
        projectId: currentProject.id,
        organizationId: currentOrg.id,
        name: name.trim(),
        description: description?.trim() || '',
        parentId,
        createdAt: now,
        updatedAt: now,
      });

      // 2. Create category page post
      const creditBalance = currentOrg.credits?.balance ?? 0;
      const hasCreditsForCategoryPage = creditBalance >= 1;

      const categoryPageRef = doc(collection(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`
      ));

      batch.set(categoryPageRef, {
        projectId: currentProject.id,
        organizationId: currentOrg.id,
        categoryId: categoryRef.id,
        title: name.trim(),
        contentType: ContentType.CATEGORY_PAGE,
        isCategoryPage: true,
        status: hasCreditsForCategoryPage ? PostStatus.GENERATING : PostStatus.PENDING,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        categoryPageContent: {
          introduction: '',
          aiInstructions: description?.trim() || ''
        }
      });

      // 3. Queue category page generation (if credits available)
      if (hasCreditsForCategoryPage) {
        const taskRef = doc(collection(db, 'generationQueue'));
        batch.set(taskRef, {
          type: TaskType.GENERATE_CATEGORY_PAGE,
          organizationId: currentOrg.id,
          projectId: currentProject.id,
          categoryId: categoryRef.id,
          categoryName: name.trim(),
          targetPostId: categoryPageRef.id,
          status: TaskStatus.QUEUED,
          progress: 0,
          createdBy: user.id,
          startedAt: now,
        });
      }

      // 4. Queue auto-generation stubs (if enabled and has credits)
      const autoGenSettings = currentProject.settings?.autoGeneration;
      const autoGenEnabled = autoGenSettings?.enabled ?? true;
      const threshold = autoGenSettings?.stubThreshold ?? 5;

      if (autoGenEnabled && creditBalance >= threshold + 1) {
        const stubTaskRef = doc(collection(db, 'generationQueue'));
        batch.set(stubTaskRef, {
          type: TaskType.GENERATE_TITLES,
          organizationId: currentOrg.id,
          projectId: currentProject.id,
          categoryId: categoryRef.id,
          categoryName: name.trim(),
          status: TaskStatus.QUEUED,
          progress: 0,
          createdBy: user.id,
          startedAt: now,
          requestedCount: threshold,
        });
      }

      // Commit all operations atomically
      await batch.commit();

      notify(`Added category: ${name}`, 'success');
      if (autoGenEnabled && creditBalance >= threshold + 1) {
        notify(`Auto-generating ${threshold} stubs for ${name}`);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      notify('Failed to add category', 'info');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (!currentOrg || !currentProject) return;

    try {
      const categoryRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/categories`,
        id
      );

      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating category:', error);
      notify('Failed to update category', 'info');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!currentOrg || !currentProject) return;
    try {
      const categoryRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/categories`,
        categoryId
      );
      await deleteDoc(categoryRef);
      notify('Category deleted', 'success');
    } catch (error) {
      console.error('Error deleting category:', error);
      notify('Failed to delete category', 'info');
    }
  };

  const moveCategory = async (id: string, newParentId: string | null, reorderedSiblings: { id: string; order: number; }[]) => {
    console.log('moveCategory called:', { id, newParentId, reorderedSiblings });

    if (!currentOrg || !currentProject) {
      console.log('No org or project');
      return;
    }

    try {
      // Update parent if changed
      const category = categories.find(c => c.id === id);
      if (category && category.parentId !== newParentId) {
        console.log('Updating parent');
        const catRef = doc(db, 'organizations', currentOrg.id, 'projects', currentProject.id, 'categories', id);
        await updateDoc(catRef, { parentId: newParentId });
      }

      // Update order for all siblings
      console.log('Updating order for', reorderedSiblings.length, 'siblings');
      const batch = writeBatch(db);
      for (const sibling of reorderedSiblings) {
        const siblingRef = doc(db, 'organizations', currentOrg.id, 'projects', currentProject.id, 'categories', sibling.id);
        batch.update(siblingRef, { order: sibling.order });
      }
      await batch.commit();
      console.log('Batch committed successfully');
    } catch (error) {
      console.error('Failed to reorder categories:', error);
      notify('Failed to reorder categories', 'info');
    }
  };

  const queueTitleGeneration = async (
    categoryId: string,
    count: number = 5,
    contextOverride?: string
  ) => {
    if (!currentOrg || !currentProject || !user) return;

    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;

    try {
      await addDoc(collection(db, 'generationQueue'), {
        type: TaskType.GENERATE_TITLES,
        organizationId: currentOrg.id,
        projectId: currentProject.id,
        categoryId,
        categoryName: cat.name,
        status: TaskStatus.QUEUED,
        progress: 0,
        createdBy: user.id,
        startedAt: Timestamp.now(),
        requestedCount: count,
        contextOverride,
      });

      notify(`Queued ${count} titles for ${cat.name}`);
    } catch (error) {
      console.error('Error queuing titles:', error);
      notify('Failed to queue titles', 'info');
    }
  };

  const queueContentGeneration = async (post: Post) => {
    if (!currentOrg || !currentProject || !user) return;

    // Debounce: prevent duplicate submissions for same post
    if (generatingPostIds.has(post.id)) {
      notify('Generation already in progress for this post', 'info');
      return;
    }

    // Check balance
    const hasCredits = await creditService.checkBalance(currentOrg.id, CREDIT_COSTS.ARTICLE_GENERATION);
    if (!hasCredits) {
      notify('Insufficient credits', 'info');
      setIsCreditModalOpen(true);
      return;
    }

    // Mark as generating to prevent duplicates
    setGeneratingPostIds(prev => new Set([...prev, post.id]));

    const cat = categories.find((c) => c.id === post.categoryId);

    try {
      await addDoc(collection(db, 'generationQueue'), {
        type: TaskType.GENERATE_CONTENT,
        organizationId: currentOrg.id,
        projectId: currentProject.id,
        categoryId: post.categoryId,
        categoryName: cat?.name || 'Unknown',
        targetPostId: post.id,
        status: TaskStatus.QUEUED,
        progress: 0,
        createdBy: user.id,
        startedAt: Timestamp.now(),
      });

      const postRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
        post.id
      );
      await updateDoc(postRef, {
        status: PostStatus.GENERATING,
        updatedAt: Timestamp.now(),
      });

      notify('Moved to Posts queue');

      // Auto-replenish stubs if below threshold (defaults to enabled)
      const autoGenSettings = currentProject.settings?.autoGeneration;
      const autoGenEnabled = autoGenSettings?.enabled ?? true;
      if (autoGenEnabled && post.categoryId) {
        // Trigger check for this specific category
        // The hook will handle the logic - we just need to trigger it
        setTimeout(() => {
          autoGen.triggerAutoGeneration([post.categoryId]);
        }, 1000); // Small delay to let state update
      }
    } catch (error) {
      console.error('Error queuing content:', error);
      notify('Failed to queue content', 'info');
    } finally {
      // Remove from generating set after a short delay
      setTimeout(() => {
        setGeneratingPostIds(prev => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }, 2000);
    }
  };

  // Queue category page regeneration
  const queueCategoryPageRegenerate = async (post: Post) => {
    if (!currentOrg || !currentProject || !user) return;

    // Check balance
    const hasCredits = await creditService.checkBalance(currentOrg.id, CREDIT_COSTS.CATEGORY_PAGE_GENERATION);
    if (!hasCredits) {
      notify('Insufficient credits', 'info');
      setIsCreditModalOpen(true);
      return;
    }

    const cat = categories.find((c) => c.id === post.categoryId);

    try {
      await addDoc(collection(db, 'generationQueue'), {
        type: TaskType.GENERATE_CATEGORY_PAGE,
        organizationId: currentOrg.id,
        projectId: currentProject.id,
        categoryId: post.categoryId,
        categoryName: cat?.name || 'Unknown',
        targetPostId: post.id,
        status: TaskStatus.QUEUED,
        progress: 0,
        createdBy: user.id,
        startedAt: Timestamp.now(),
      });

      const postRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
        post.id
      );
      await updateDoc(postRef, {
        status: PostStatus.GENERATING,
        updatedAt: Timestamp.now(),
      });

      notify('Regenerating category page...');
    } catch (error) {
      console.error('Error queuing category page regeneration:', error);
      notify('Failed to queue regeneration', 'info');
    }
  };

  // Queue Google Deep Research
  const queueGoogleDeepResearch = async (categoryId: string) => {
    if (!currentOrg || !currentProject || !user) return;

    // Check balance for deep research
    const hasCredits = await creditService.checkBalance(currentOrg.id, CREDIT_COSTS.GOOGLE_DEEP_RESEARCH);
    if (!hasCredits) {
      notify('Insufficient credits (20 required)', 'info');
      setIsCreditModalOpen(true);
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);

    try {
      // Update category status to show research is running
      const catRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/categories`,
        categoryId
      );
      await updateDoc(catRef, {
        'googleDeepResearch.status': 'running',
        'googleDeepResearch.startedAt': Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Queue the research task
      await addDoc(collection(db, 'generationQueue'), {
        type: TaskType.GOOGLE_DEEP_RESEARCH,
        organizationId: currentOrg.id,
        projectId: currentProject.id,
        categoryId: categoryId,
        categoryName: cat?.name || 'Unknown',
        status: TaskStatus.QUEUED,
        progress: 0,
        createdBy: user.id,
        startedAt: Timestamp.now(),
      });

      notify('Deep research started...');
    } catch (error) {
      console.error('Error queuing deep research:', error);
      notify('Failed to start research', 'info');
    }
  };

  // Create category page for existing category that doesn't have one
  const createCategoryPage = async (categoryId: string, categoryName: string, description?: string) => {
    if (!currentOrg || !currentProject || !user) return;

    try {
      const postsRef = collection(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`
      );

      // Check credits before creating category page
      const creditBalance = currentOrg.credits?.balance ?? 0;
      const hasCreditsForCategoryPage = creditBalance >= 1;

      const categoryPageRef = await addDoc(postsRef, {
        projectId: currentProject.id,
        organizationId: currentOrg.id,
        categoryId: categoryId,
        title: categoryName,
        contentType: ContentType.CATEGORY_PAGE,
        isCategoryPage: true,
        status: hasCreditsForCategoryPage ? PostStatus.GENERATING : PostStatus.PENDING,
        createdBy: user.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        categoryPageContent: {
          introduction: '',
          aiInstructions: description || ''
        }
      });

      // Auto-queue category page generation if we have credits
      if (hasCreditsForCategoryPage) {
        await addDoc(collection(db, 'generationQueue'), {
          type: TaskType.GENERATE_CATEGORY_PAGE,
          organizationId: currentOrg.id,
          projectId: currentProject.id,
          categoryId: categoryId,
          categoryName: categoryName,
          targetPostId: categoryPageRef.id,
          status: TaskStatus.QUEUED,
          progress: 0,
          createdBy: user.id,
          startedAt: Timestamp.now(),
        });
        notify('Category page created and queued for generation');
      } else {
        notify('Category page created (no credits for auto-generation)');
      }
    } catch (error) {
      console.error('Error creating category page:', error);
      notify('Failed to create category page', 'info');
    }
  };

  const updatePostFields = async (postId: string, updates: Partial<Post>): Promise<void> => {
    if (!currentOrg || !currentProject) return;

    try {
      const postRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
        postId
      );

      // Don't update updatedAt when only changing publishedAt (publishing action)
      // This prevents false "has changes" indicators
      const shouldUpdateTimestamp = !('publishedAt' in updates) ||
        Object.keys(updates).some(k => !['publishedAt', 'status'].includes(k));

      await updateDoc(postRef, {
        ...updates,
        ...(shouldUpdateTimestamp && { updatedAt: Timestamp.now() }),
      });
    } catch (error: any) {
      console.error('Error updating post:', error);
      // Provide specific error message based on error type
      const errorMsg = error?.message?.toLowerCase() || '';
      let userMessage = 'Failed to update post. Changes were not saved.';
      if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
        userMessage = 'Permission denied. You may not have access to edit this post.';
      } else if (errorMsg.includes('network') || errorMsg.includes('offline')) {
        userMessage = 'Network error. Check your connection and try again.';
      } else if (errorMsg.includes('not found') || errorMsg.includes('no document')) {
        userMessage = 'Post not found. It may have been deleted.';
      }
      notify(userMessage, 'info');
      // Re-throw so callers can handle errors (e.g., for rollback)
      throw error;
    }
  };

  const deletePost = async (postId: string) => {
    if (!currentOrg || !currentProject) return;

    try {
      const postRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
        postId
      );

      await deleteDoc(postRef);
      notify('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      notify('Failed to delete post', 'info');
    }
  };

  const updatePostStatus = async (postId: string, status: PostStatus) => {
    if (!currentOrg || !currentProject) return;

    try {
      const postRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
        postId
      );

      const updateData: any = {
        status,
        updatedAt: Timestamp.now(),
      };

      if (status === PostStatus.PUBLISHED) {
        updateData.publishedAt = Timestamp.now();
      } else if (status === PostStatus.NEEDS_REVIEW) {
        updateData.submittedAt = Timestamp.now();
      }

      await updateDoc(postRef, updateData);

      if (status === PostStatus.PUBLISHED) notify('Post published!', 'success');
    } catch (error: any) {
      console.error('Error updating post status:', error);
      const errorMsg = error?.message?.toLowerCase() || '';
      let userMessage = 'Failed to update post status. Please try again.';
      if (errorMsg.includes('permission')) {
        userMessage = 'Permission denied. You may not have access to change this post.';
      } else if (errorMsg.includes('network')) {
        userMessage = 'Network error. Check your connection and try again.';
      }
      notify(userMessage, 'info');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentOrg || !currentProject) {
    return null; // Will redirect via useEffect
  }

  const activeTaskCount = tasks.filter(
    (t) => t.status === TaskStatus.PROCESSING || t.status === TaskStatus.QUEUED
  ).length;
  const reviewCount = posts.filter((p) => p.status === PostStatus.NEEDS_REVIEW).length;

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* TOP BAR */}
      <TopBar showProject={true} />

      {/* MAIN AREA: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* TOOLS SIDEBAR */}
        <aside
          className={`
              ${isSidebarCollapsed ? 'w-16' : 'w-64'}
              bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-40 transition-all duration-300 ease-in-out
            `}
        >
          {/* Header: Collapse Toggle + Project Selector */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-slate-800`}>
            {!isSidebarCollapsed && (
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Workspace</span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title={isSidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <NavButton
              active={currentScreen === Screen.CATEGORIES}
              onClick={() => setCurrentScreen(Screen.CATEGORIES)}
              icon={<FolderTree />}
              label="Categories"
              collapsed={isSidebarCollapsed}
            />
            <NavButton
              active={currentScreen === Screen.POSTS}
              onClick={() => setCurrentScreen(Screen.POSTS)}
              icon={<FileText />}
              label="Posts"
              badge={
                activeTaskCount > 0
                  ? activeTaskCount
                  : reviewCount > 0
                    ? reviewCount
                    : undefined
              }
              badgeColor={activeTaskCount > 0 ? 'bg-cyan-500' : 'bg-emerald-500'}
              collapsed={isSidebarCollapsed}
            />
            <NavButton
              active={currentScreen === Screen.LIVE_POSTS}
              onClick={() => setCurrentScreen(Screen.LIVE_POSTS)}
              icon={<Globe />}
              label="Live Posts"
              badge={posts.filter(p => p.status === PostStatus.PUBLISHED).length || undefined}
              badgeColor="bg-emerald-500"
              collapsed={isSidebarCollapsed}
            />
            <div className="my-2 mx-4 border-b border-slate-800" />
            <NavButton
              active={currentScreen === Screen.SETTINGS}
              onClick={() => setCurrentScreen(Screen.SETTINGS)}
              icon={<Settings />}
              label="Project Settings"
              collapsed={isSidebarCollapsed}
            />
          </nav>

          {/* Credits Button - Bottom Left */}
          <div className="border-t border-slate-800 p-2">
            <button
              onClick={() => setIsCreditModalOpen(true)}
              className={`
                w-full flex items-center gap-2 px-3 py-2.5
                bg-indigo-500/10 hover:bg-indigo-500/20
                border border-indigo-500/20 hover:border-indigo-500/40
                text-indigo-400 transition-all group
                ${isSidebarCollapsed ? 'justify-center' : ''}
              `}
              title="Manage credits"
            >
              <Zap size={16} className="shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-bold">{currentOrg?.credits?.balance ?? 0}</span>
                  <span className="text-[10px] text-indigo-400/60 uppercase tracking-wider">Credits</span>
                </div>
              )}
            </button>
          </div>
        </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a] relative">
        {/* Credit Modal (for insufficient credits) */}
        <CreditManagementModal
          isOpen={isCreditModalOpen}
          onClose={() => setIsCreditModalOpen(false)}
        />

        {/* Migration Confirmation Modal */}
        <MigrationConfirmationModal
          isOpen={showMigrationModal}
          onClose={() => setShowMigrationModal(false)}
          onConfirm={async () => {
            await autoGen.confirmMigration();
            setShowMigrationModal(false);
          }}
          onDisable={async () => {
            await autoGen.dismissMigration();
            setShowMigrationModal(false);
          }}
          categoriesNeedingStubs={autoGen.categoriesBelowThreshold}
          totalStubsNeeded={autoGen.totalStubsNeeded}
          creditBalance={currentOrg?.credits?.balance ?? 0}
          isLoading={autoGen.isGenerating}
        />

        {/* Notifications */}
        <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`
                    pointer-events-auto flex items-center justify-center px-6 py-3 shadow-2xl min-w-[300px] animate-in slide-in-from-top-5 duration-200
                    ${n.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-cyan-400 border-b border-cyan-500'
                }
                `}
            >
              <span className="font-mono font-bold text-sm">{n.msg}</span>
            </div>
          ))}
        </div>

        {currentScreen === Screen.CATEGORIES && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <CategoryWorkspace
              categories={categories}
              posts={posts}
              tasks={tasks}
              isAddingCategory={isAddingCategory}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              onMoveCategory={moveCategory}
              onQueueTitles={queueTitleGeneration}
              onQueueContent={queueContentGeneration}
              onQueueCategoryPageRegenerate={queueCategoryPageRegenerate}
              onQueueGoogleDeepResearch={queueGoogleDeepResearch}
              onCreateCategoryPage={createCategoryPage}
              onUpdatePost={updatePostFields}
              onDeletePost={deletePost}
              organizationId={currentOrg?.id}
              projectId={currentProject?.id}
              organization={currentOrg || undefined}
              project={currentProject || undefined}
            />
          </div>
        )}

        {currentScreen === Screen.POSTS && (
          <PostsWorkspace
            posts={posts}
            categories={categories}
            tasks={tasks}
            onUpdateStatus={updatePostStatus}
            onUpdatePost={updatePostFields}
            onDeletePost={deletePost}
            onQueueContent={queueContentGeneration}
            project={currentProject}
            organization={currentOrg}
          />
        )}

        {currentScreen === Screen.LIVE_POSTS && (
          <LivePostsWorkspace
            posts={posts}
            categories={categories}
            onUpdateStatus={updatePostStatus}
            onUpdatePost={updatePostFields}
            onDeletePost={deletePost}
            project={currentProject}
            organization={currentOrg}
          />
        )}

        {currentScreen === Screen.SETTINGS && currentProject && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <ProjectSettings
              project={currentProject}
              onUpdate={() => {
                notify('Project settings updated', 'success');
              }}
            />
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, badge, badgeColor = 'bg-cyan-500', collapsed }: any) => (
  <button
    onClick={onClick}
    className={`
      relative w-full flex items-center py-4 transition-all duration-200 group border-l-4
      ${collapsed ? 'justify-center px-0' : 'justify-start px-8'}
      ${active
        ? 'bg-[#1e293b] border-cyan-500 text-cyan-400'
        : 'border-transparent text-slate-500 hover:bg-[#1e293b] hover:text-slate-300'
      }
    `}
    title={collapsed ? label : undefined}
  >
    {React.cloneElement(icon, { size: 20, strokeWidth: active ? 2.5 : 2 })}

    {!collapsed && (
      <span
        className={`ml-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden ${active ? 'text-white' : ''
          }`}
      >
        {label}
      </span>
    )}

    {badge !== undefined && (
      <span
        className={`
          flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black
          ${collapsed ? 'absolute top-2 right-2' : 'ml-auto'}
          ${badgeColor}
        `}
      >
        {badge}
      </span>
    )}
  </button>
);
