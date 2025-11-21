import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderTree,
  FileText,
  ChevronLeft,
  ChevronRight,
  Folder,
  Building2,
  Settings,
  Terminal, // Added Terminal icon import
} from 'lucide-react';
import { CategoryWorkspace } from '../components/CategoryWorkspace';
import { PostsWorkspace } from '../components/PostsWorkspace';
import { TopNav } from '../components/TopNav';
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
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateCategoryTitles, generatePostOutline, GeneratedTitleData } from '../services/geminiService';
import { ProjectSettings } from '../components/ProjectSettings'; // Added ProjectSettings import

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const notify = (msg: string, type: 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36);
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  // Redirect to projects if no project selected
  useEffect(() => {
    if (!currentOrg || !currentProject) {
      navigate('/projects');
    } else {
      setLoading(false);
    }
  }, [currentOrg, currentProject, navigate]);

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
      },
      (error) => {
        console.error('Error listening to categories:', error);
        notify('Error loading categories', 'info');
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

  // Queue Processor - Process tasks client-side for now (will move to Cloud Functions)
  useEffect(() => {
    if (!currentOrg || !currentProject || !user) return;

    const activeTask = tasks.find((t) => t.status === TaskStatus.PROCESSING);
    if (activeTask) return;
    const nextTask = tasks.find((t) => t.status === TaskStatus.QUEUED);
    if (!nextTask) return;

    const processTask = async () => {
      console.log(`[Queue] Processing task:`, nextTask);

      const taskRef = doc(db, 'generationQueue', nextTask.id);
      console.log(`[Queue] Setting status to PROCESSING...`);
      await updateDoc(taskRef, {
        status: TaskStatus.PROCESSING,
        progress: 10,
      });

      try {
        if (nextTask.type === TaskType.GENERATE_TITLES) {
          console.log(`[Queue] Processing GENERATE_TITLES for category:`, nextTask.categoryId);

          await new Promise((r) => setTimeout(r, 1000));
          await updateDoc(taskRef, { progress: 40 });

          const category = categories.find((c) => c.id === nextTask.categoryId);
          if (category) {
            console.log(`[Queue] Found category:`, category.name);
            const descriptionContext = nextTask.contextOverride || category.description;
            const count = nextTask.requestedCount || 5;

            console.log(`[Queue] Calling generateCategoryTitles...`);
            const generatedData: GeneratedTitleData[] = await generateCategoryTitles(
              category.name,
              descriptionContext,
              count,
              currentOrg.id,
              currentProject.id,
              user.id
            );

            console.log(`[Queue] Generated ${generatedData.length} titles, saving to Firestore...`);
            await updateDoc(taskRef, { progress: 80 });

            const postsRef = collection(
              db,
              `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`
            );

            for (const item of generatedData) {
              console.log(`[Queue] Adding post:`, item.title);
              await addDoc(postsRef, {
                projectId: currentProject.id,
                organizationId: currentOrg.id,
                categoryId: category.id,
                title: item.title,
                teaser: item.teaser,
                tags: item.keywords,
                status: PostStatus.PENDING,
                createdBy: user.id,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }

            console.log(`[Queue] ✅ Successfully saved all titles`);
            notify(`Generated ${generatedData.length} ideas for ${category.name}`, 'success');
          } else {
            console.error(`[Queue] ❌ Category not found:`, nextTask.categoryId);
          }
        } else if (nextTask.type === TaskType.GENERATE_CONTENT) {
          const post = posts.find((p) => p.id === nextTask.targetPostId);
          if (post) {
            const content = await generatePostOutline(
              post.title,
              nextTask.categoryName,
              post.teaser,
              post.tags,
              currentOrg.id,
              currentProject.id,
              user.id,
              post.contentType,
              post.tone
            );
            await updateDoc(taskRef, { progress: 80 });

            const postRef = doc(
              db,
              `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
              post.id
            );
            await updateDoc(postRef, {
              content,
              status: PostStatus.NEEDS_REVIEW,
              generatedAt: Timestamp.now(),
              submittedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            notify(`Content ready for: ${post.title}`, 'success');
          }
        }

        console.log(`[Queue] Task completed successfully`);
        await updateDoc(taskRef, {
          status: TaskStatus.COMPLETED,
          progress: 100,
          completedAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('❌ [Queue] Task Failed:', err);
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        await updateDoc(taskRef, {
          status: TaskStatus.FAILED,
          progress: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });

        if (nextTask.type === TaskType.GENERATE_CONTENT && nextTask.targetPostId) {
          const postRef = doc(
            db,
            `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
            nextTask.targetPostId
          );
          await updateDoc(postRef, {
            status: PostStatus.PENDING,
            updatedAt: Timestamp.now(),
          });
          notify('Generation failed - Try again', 'info');
        }
      }
    };

    processTask();
  }, [tasks, categories, posts, currentOrg, currentProject, user]);

  // Actions
  const addCategory = async (name: string, parentId: string | null, description?: string) => {
    if (!currentOrg || !currentProject || !user) return;

    try {
      const categoriesRef = collection(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/categories`
      );

      await addDoc(categoriesRef, {
        projectId: currentProject.id,
        organizationId: currentOrg.id,
        name,
        description: description || 'Enter a description...',
        parentId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      notify(`Added category: ${name}`, 'success');
    } catch (error) {
      console.error('Error adding category:', error);
      notify('Failed to add category', 'info');
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
    } catch (error) {
      console.error('Error queuing content:', error);
      notify('Failed to queue content', 'info');
    }
  };

  const updatePostFields = async (postId: string, updates: Partial<Post>) => {
    if (!currentOrg || !currentProject) return;

    try {
      const postRef = doc(
        db,
        `organizations/${currentOrg.id}/projects/${currentProject.id}/posts`,
        postId
      );

      await updateDoc(postRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating post:', error);
      notify('Failed to update post', 'info');
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
    } catch (error) {
      console.error('Error updating post status:', error);
      notify('Failed to update post status', 'info');
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
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* SIDEBAR */}
      <aside
        className={`
            ${isSidebarCollapsed ? 'w-16' : 'w-64'}
            bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 z-50 transition-all duration-300 ease-in-out
          `}
      >
        <div className="flex flex-col py-6">
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start px-8'
              } mb-10 transition-all`}
          >
            {currentProject && (
              <>
                <div className="w-10 h-10 bg-cyan-500/20 flex items-center justify-center shrink-0">
                  <Folder className="text-cyan-400 w-6 h-6" />
                </div>
                {!isSidebarCollapsed && (
                  <span className="ml-4 font-bold text-white text-lg tracking-tight whitespace-nowrap overflow-hidden">
                    {currentProject.name}
                  </span>
                )}
              </>
            )}
          </div>

          <nav className="w-full">
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
              onClick={() => setCurrentScreen(Screen.SETTINGS)}
              icon={<Settings />}
              label="Project Settings"
              collapsed={isSidebarCollapsed}
            />
            <NavButton
              active={false} // Always navigates away
              onClick={() => navigate('/settings/organization')}
              icon={<Building2 />}
              label="Org Settings"
              collapsed={isSidebarCollapsed}
            />
            <NavButton
              active={false} // Always navigates away
              onClick={() => navigate('/admin/prompts')}
              icon={<Terminal />} // Using Terminal icon for Admin
              label="Admin Prompts"
              collapsed={isSidebarCollapsed}
            />
          </nav>
        </div>

        <div className="flex flex-col">
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            title={isSidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a] relative">
        {/* Notifications */}
        <div className="absolute top-0 right-0 z-50 p-6 flex flex-col items-end gap-2 pointer-events-none">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`
                    pointer-events-auto flex items-center p-4 border-l-4 shadow-2xl min-w-[300px] animate-in slide-in-from-right-10
                    ${n.type === 'success'
                  ? 'bg-[#020617] border-emerald-500 text-emerald-500'
                  : 'bg-[#020617] border-cyan-500 text-cyan-500'
                }
                `}
            >
              <span className="font-mono font-bold text-sm">{n.msg}</span>
            </div>
          ))}
        </div>

        {currentScreen === Screen.CATEGORIES && (
          <CategoryWorkspace
            categories={categories}
            posts={posts}
            tasks={tasks}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onQueueTitles={queueTitleGeneration}
            onQueueContent={queueContentGeneration}
            onUpdatePost={updatePostFields}
            onDeletePost={deletePost}
          />
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
          />
        )}

        {currentScreen === Screen.SETTINGS && currentProject && (
          <ProjectSettings
            project={currentProject}
            onUpdate={() => {
              notify('Project settings updated', 'success');
            }}
          />
        )}
      </main>
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
