import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePaneWidth } from '../hooks/usePaneWidth';
import { Post, Category, PostStatus, GenerationTask, TaskStatus, ContentType, Tone, Project, Organization } from '../types';
import {
    Search, Filter, User, CheckCircle, XCircle, Edit3, UploadCloud, Trash2,
    Loader2, ArrowRight, RefreshCw, Clock, Archive, X, GripVertical,
    Sparkles, Calendar, Hash, Type, AlignLeft, ChevronRight, Layout, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiptapEditor, TiptapViewer } from './TiptapEditor';
import { Timestamp } from 'firebase/firestore';
import { ImageInspectorControl } from './ImageInspectorControl';
import { ImageGenerationResult } from '../services/imageGenerationService';
import { triggerBuild } from '../services/deploymentService';
import { useAuth } from '../contexts/AuthContext';

// Helper to strip title from content (both markdown and HTML formats)
// Since title is displayed separately above, we strip ALL leading H1/H2 headings
const stripTitleFromContent = (content: string, title: string): string => {
    if (!content) return content;

    let result = content.trim();

    // Strip ALL leading H1 tags (regardless of content - title is shown above)
    // Loop to handle multiple consecutive H1s
    while (result.match(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i)) {
        result = result.replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '').trim();
    }

    // Strip ALL leading H2 tags that appear right after H1 removal
    // (AI often puts title as both H1 and H2)
    while (result.match(/^<h2[^>]*>[\s\S]*?<\/h2>\s*/i)) {
        // Only strip if the H2 content looks like a title (short, no periods)
        const h2Match = result.match(/^<h2[^>]*>([\s\S]*?)<\/h2>\s*/i);
        if (h2Match && h2Match[1].length < 150 && !h2Match[1].includes('.')) {
            result = result.replace(/^<h2[^>]*>[\s\S]*?<\/h2>\s*/i, '').trim();
        } else {
            break; // This H2 looks like actual content, keep it
        }
    }

    // Also handle markdown format (# Title and ## Title at start)
    result = result.replace(/^#{1,2}\s+[^\n]+\n*/m, '').trim();

    return result;
};

interface Props {
    posts: Post[];
    categories: Category[];
    tasks: GenerationTask[];
    onUpdateStatus: (id: string, status: PostStatus) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => Promise<void> | void;
    onDeletePost: (id: string) => void;
    onQueueContent: (post: Post) => void;
    project?: Project;
    organization?: Organization;
}

const STATUS_FILTERS = [
    { label: 'Generating', value: PostStatus.GENERATING },
    { label: 'Review', value: PostStatus.NEEDS_REVIEW },
    { label: 'Approved', value: PostStatus.APPROVED },
    { label: 'Rejected', value: PostStatus.REJECTED },
];

export const PostsWorkspace: React.FC<Props> = ({
    posts, categories, tasks,
    onUpdateStatus, onUpdatePost, onDeletePost, onQueueContent,
    project, organization
}) => {
    const { user } = useAuth();
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<PostStatus>(PostStatus.GENERATING);
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<'info' | 'history'>('info');
    const [approvingPostId, setApprovingPostId] = useState<string | null>(null);
    const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isBuilding, setIsBuilding] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [successModal, setSuccessModal] = useState<{ show: boolean; published: number; updated: number } | null>(null);

    const handleUpdate = async (id: string, updates: Partial<Post>) => {
        setSaving(true);
        await onUpdatePost(id, updates);
        setTimeout(() => setSaving(false), 1000);
    };

    // Layout resizing - shared across workspaces
    const [leftPaneWidth, setLeftPaneWidth] = usePaneWidth('leftPane');
    const [inspectorWidth, setInspectorWidth] = usePaneWidth('inspector');
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle Resizing Logic
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isResizingLeft && containerRef.current) {
            const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
            if (newWidth > 250 && newWidth < 500) {
                setLeftPaneWidth(newWidth);
            }
        }
    };

    const handleMouseUp = () => {
        setIsResizingLeft(false);
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsResizingLeft(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Filter Posts - This workspace handles: GENERATING, NEEDS_REVIEW, APPROVED, REJECTED
    // PENDING = Categories tab, PUBLISHED/ARCHIVED = Live Posts tab
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            // Exclude PENDING (stubs in Categories), PUBLISHED and ARCHIVED (in Live Posts)
            if (post.status === PostStatus.PENDING) return false;
            if (post.status === PostStatus.PUBLISHED) return false;
            if (post.status === PostStatus.ARCHIVED) return false;

            const matchesStatus = post.status === statusFilter;
            const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.editor?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        }).sort((a, b) => {
            // Sort by updated date, newest first
            const dateA = a.updatedAt?.toMillis() || 0;
            const dateB = b.updatedAt?.toMillis() || 0;
            return dateB - dateA;
        });
    }, [posts, statusFilter, searchQuery]);

    const selectedPost = posts.find(p => p.id === selectedPostId);

    // Auto-select first post if none selected
    useEffect(() => {
        if (!selectedPostId && filteredPosts.length > 0) {
            setSelectedPostId(filteredPosts[0].id);
        }
    }, [filteredPosts, selectedPostId]);

    // Calculate Recommended Publish Date
    const recommendedPublishDate = useMemo(() => {
        if (!selectedPost) return new Date();

        // Default velocity to 10 if not set
        const velocity = 10; // In a real app, this would come from project.settings.publishVelocity

        // Get all currently published posts
        const publishedPosts = posts.filter(p => p.status === PostStatus.APPROVED && p.approvedAt);

        // Group by date
        const postsByDate: Record<string, number> = {};
        publishedPosts.forEach(p => {
            const dateStr = p.approvedAt!.toDate().toLocaleDateString();
            postsByDate[dateStr] = (postsByDate[dateStr] || 0) + 1;
        });

        // Find next available slot starting from today
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        while (true) {
            const dateStr = checkDate.toLocaleDateString();
            const count = postsByDate[dateStr] || 0;

            if (count < velocity) {
                return checkDate;
            }

            // Move to next day
            checkDate.setDate(checkDate.getDate() + 1);
        }
    }, [posts, selectedPost]);

    // Approve -> Moves to Publishing Queue
    const handleApprove = async (postId: string) => {
        setApprovingPostId(postId);

        try {
            // Brief delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 1500));

            await onUpdatePost(postId, {
                status: PostStatus.APPROVED,
                approvedAt: Timestamp.now()
            });

            // Auto-advance on success
            const currentIndex = filteredPosts.findIndex(p => p.id === postId);
            const nextPost = filteredPosts.find((p, idx) => idx > currentIndex && p.status === PostStatus.NEEDS_REVIEW);
            if (nextPost) setSelectedPostId(nextPost.id);
            else setSelectedPostId(null);

        } catch (error) {
            console.error('Failed to approve post:', error);
        } finally {
            setApprovingPostId(null);
        }
    };

    // Reject -> Moves to Rejected
    const handleReject = async (postId: string) => {
        setRejectingPostId(postId);

        try {
            // Brief delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 800));

            await onUpdatePost(postId, {
                status: PostStatus.REJECTED
            });

            // Auto-advance on success
            const currentIndex = filteredPosts.findIndex(p => p.id === postId);
            const nextPost = filteredPosts.find((p, idx) => idx > currentIndex && p.status === PostStatus.NEEDS_REVIEW);
            if (nextPost) setSelectedPostId(nextPost.id);
            else setSelectedPostId(null);

        } catch (error) {
            console.error('Failed to reject post:', error);
        } finally {
            setRejectingPostId(null);
        }
    };

    // Publish immediately (manual publish - mostly used for testing)
    const handlePublishNow = async (postId: string) => {
        try {
            await onUpdatePost(postId, {
                status: PostStatus.PUBLISHED,
                publishedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Failed to publish post:', error);
        }
    };

    // Unpublish - back to review
    const handleUnpublish = async (postId: string) => {
        try {
            await onUpdatePost(postId, {
                status: PostStatus.NEEDS_REVIEW,
                publishedAt: undefined,
            });
        } catch (error) {
            console.error('Failed to unpublish post:', error);
        }
    };

    // Launch all approved posts
    const handleTriggerBuild = async () => {
        if (!organization || !project || !user) {
            alert('Missing organization, project, or user context');
            return;
        }

        // Check if webhook is configured
        if (!project.settings?.deployment?.webhookUrl) {
            alert('Your website has not yet been configured.\n\nEmail support@missioncontent.io for more information.');
            return;
        }

        setIsBuilding(true);
        try {
            const webhookUrl = project.settings?.deployment?.webhookUrl;
            const result = await triggerBuild(organization.id, project.id, user.id, webhookUrl!);

            if (result.success) {
                // Update post statuses after successful build
                const now = Timestamp.now();
                let postsPublished = 0;
                let postsUpdated = 0;

                // Mark APPROVED posts as PUBLISHED
                const approvedPosts = posts.filter(p => p.status === PostStatus.APPROVED);

                // Trigger launch animation if there are posts to publish
                if (approvedPosts.length > 0) {
                    setIsLaunching(true);

                    // Wait for animation to complete before updating statuses
                    await new Promise(resolve => setTimeout(resolve, 2200));
                }

                for (const post of approvedPosts) {
                    await onUpdatePost(post.id, {
                        status: PostStatus.PUBLISHED,
                        publishedAt: now
                    });
                    postsPublished++;
                }

                // Update publishedAt for PUBLISHED posts with pending changes
                const publishedWithChanges = posts.filter(p =>
                    p.status === PostStatus.PUBLISHED &&
                    p.updatedAt && p.publishedAt &&
                    p.updatedAt.toMillis() > p.publishedAt.toMillis()
                );
                for (const post of publishedWithChanges) {
                    await onUpdatePost(post.id, {
                        publishedAt: now
                    });
                    postsUpdated++;
                }

                // Reset launch animation
                setIsLaunching(false);
                setSelectedPostId(null);

                // Show success modal
                setSuccessModal({ show: true, published: postsPublished, updated: postsUpdated });
            } else {
                alert(`Build failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Error triggering build:', error);
            alert('Failed to trigger build. Check console for details.');
        } finally {
            setIsBuilding(false);
        }
    };

    // Count approved posts ready to launch
    const approvedCount = posts.filter(p => p.status === PostStatus.APPROVED).length;

    const handleImageUpdate = async (image: any) => {
        if (!selectedPostId) return;
        await onUpdatePost(selectedPostId, { heroImage: image });
    };

    const getCategoryBreadcrumb = (catId: string) => {
        const trail: string[] = [];
        let current = categories.find(c => c.id === catId);

        while (current) {
            trail.unshift(current.name);
            current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
        }

        return trail.length > 0 ? trail.join(' / ') : 'Uncategorized';
    };

    return (
        <div
            ref={containerRef}
            className={`flex h-full bg-slate-950 overflow-hidden ${isResizingLeft ? 'cursor-col-resize select-none' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* 1. LEFT NAVIGATION SIDEBAR */}
            <div
                style={{ width: leftPaneWidth }}
                className="flex flex-col border-r border-slate-800 bg-slate-950 shrink-0"
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                    <div className="mb-4">
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Content Engine</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Review, Approve & Launch</p>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search posts..."
                            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        {[
                            { label: 'Generating', value: PostStatus.GENERATING },
                            { label: 'Review', value: PostStatus.NEEDS_REVIEW },
                            { label: 'Approved', value: PostStatus.APPROVED },
                            { label: 'Rejected', value: PostStatus.REJECTED },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`
                            px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border border-transparent
                            ${statusFilter === f.value
                                        ? 'bg-cyan-950 text-cyan-400 border-cyan-900'
                                        : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
                        `}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Launch Button - Only shown on Approved tab */}
                    {statusFilter === PostStatus.APPROVED && (
                        <div className="mt-3 pt-3 border-t border-slate-800">
                            {project?.settings?.deployment?.webhookUrl ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={handleTriggerBuild}
                                        disabled={isBuilding || approvedCount === 0}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                    >
                                        {isBuilding ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                                        {isBuilding ? 'Launching...' : 'Launch Approved Posts'}
                                    </button>
                                    <p className="text-[10px] text-slate-500 text-center">
                                        {approvedCount > 0
                                            ? `${approvedCount} Post${approvedCount !== 1 ? 's' : ''} Approved`
                                            : 'No posts approved'}
                                    </p>
                                </div>
                            ) : (
                                <div className="py-3 px-3 bg-slate-800/50 border border-slate-700 text-center">
                                    <p className="text-xs text-slate-400">Deployment not configured</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Contact admin to set up deployment</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Post List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative overflow-x-hidden">
                    {/* Launch Rocket Animation */}
                    <AnimatePresence>
                        {isLaunching && (
                            <motion.div
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: -1200 }}
                                transition={{
                                    duration: 1.8,
                                    delay: (filteredPosts.filter(p => p.status === PostStatus.APPROVED).length * 0.08) + 0.1,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                                style={{ top: filteredPosts.filter(p => p.status === PostStatus.APPROVED).length * 100 }}
                            >
                                <div className="relative">
                                    <Rocket size={64} className="text-cyan-500 -rotate-45" />
                                    <motion.div
                                        initial={{ height: 32, opacity: 0.7 }}
                                        animate={{ height: 80, opacity: 0.95 }}
                                        transition={{ duration: 0.15, repeat: Infinity, repeatType: "reverse" }}
                                        className="absolute top-12 left-6 w-5 bg-gradient-to-b from-orange-500 via-yellow-400 to-transparent blur-sm rounded-full"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {filteredPosts.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 text-xs">
                            No posts found.
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredPosts.map((post, index) => {
                                const activeTask = tasks.find(t => t.targetPostId === post.id && t.status === TaskStatus.PROCESSING);
                                const isApproved = post.status === PostStatus.APPROVED;
                                return (
                                    <motion.div
                                        key={post.id}
                                        layout
                                        initial={{ opacity: 1, x: 0 }}
                                        animate={isLaunching && isApproved ? {
                                            y: -1000,
                                            opacity: 0,
                                            transition: {
                                                duration: 1.8,
                                                delay: index * 0.08,
                                                ease: [0.4, 0, 0.2, 1]
                                            }
                                        } : {
                                            y: 0,
                                            opacity: 1
                                        }}
                                        exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        onClick={() => !isLaunching && setSelectedPostId(post.id)}
                                        className={`
                                            p-4 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-900/50
                                            ${selectedPostId === post.id ? 'bg-slate-900 border-l-2 border-l-cyan-500' : 'border-l-2 border-l-transparent'}
                                            ${isLaunching ? 'pointer-events-none' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                                                {getCategoryBreadcrumb(post.categoryId)}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase ${
                                                post.status === PostStatus.REJECTED ? 'text-red-500' :
                                                post.status === PostStatus.GENERATING ? 'text-cyan-500' :
                                                post.status === PostStatus.APPROVED ? 'text-emerald-500' :
                                                'text-amber-500'
                                            }`}>
                                                {post.status === PostStatus.NEEDS_REVIEW ? 'REVIEW' :
                                                    post.status === PostStatus.GENERATING ? 'GENERATING' :
                                                    post.status === PostStatus.APPROVED ? 'READY' :
                                                    post.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <h3 className={`text-sm font-medium leading-snug mb-2 ${selectedPostId === post.id ? 'text-white' : 'text-slate-400'}`}>
                                            {post.title}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                    {(post.editor || 'SJ').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-xs text-slate-600">{post.updatedAt?.toDate().toLocaleDateString()}</span>
                                            </div>
                                            {activeTask && <Loader2 size={14} className="animate-spin text-cyan-500" />}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Resizer */}
            <div
                onMouseDown={() => setIsResizingLeft(true)}
                className="w-1 bg-slate-950 hover:bg-cyan-500/50 cursor-col-resize transition-colors z-20"
            />

            {/* 2. CENTER STAGE (MAIN CONTENT) */}
            <div className="flex-1 flex flex-col bg-slate-950 min-w-0 relative">
                {selectedPost ? (
                    <>


                        {/* Content Stage */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 custom-scrollbar overflow-x-hidden">
                            <div className="max-w-3xl mx-auto">
                                {/* Preview Card */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedPost.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 100 }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                        className="bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden min-h-[800px]"
                                    >
                                    {/* Internal Header */}
                                    <div className="p-8 pb-4 relative">
                                        <h1 className="text-2xl font-bold text-slate-200 leading-snug mb-2">
                                            {selectedPost.title}
                                        </h1>
                                        <div className="text-xs text-slate-500 mb-4">
                                            {getCategoryBreadcrumb(selectedPost.categoryId)}
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">
                                                    {(selectedPost.editor || 'SJ').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-300">
                                                        By {selectedPost.editor || 'Sarah Jenkins'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {selectedPost.submittedAt ? selectedPost.submittedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditMode(!editMode)}
                                                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                                                        editMode
                                                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                                    }`}
                                                >
                                                    {editMode ? 'Save' : 'Edit'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('This will regenerate the article content using AI. Your current content will be overwritten. Continue?')) {
                                                            onQueueContent(selectedPost);
                                                        }
                                                    }}
                                                    disabled={selectedPost.status === PostStatus.GENERATING}
                                                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Regenerate
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-8 pt-2 pb-6">
                                        {selectedPost.status === PostStatus.GENERATING ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                                <Loader2 size={40} className="animate-spin text-cyan-500 mb-4" />
                                                <p className="font-mono text-sm animate-pulse">AI_WRITER_IS_TYPING...</p>
                                            </div>
                                        ) : editMode ? (
                                            <TiptapEditor
                                                content={stripTitleFromContent(selectedPost.content || '', selectedPost.title)}
                                                onChange={(val) => onUpdatePost(selectedPost.id, { content: val })}
                                                placeholder="Start writing your post..."
                                            />
                                        ) : selectedPost.content ? (
                                            <TiptapViewer
                                                content={stripTitleFromContent(selectedPost.content, selectedPost.title)}
                                            />
                                        ) : (
                                            <div className="text-center py-20 border-2 border-dashed border-slate-800">
                                                <p className="text-slate-500 mb-4">No content generated yet.</p>
                                                <button
                                                    onClick={() => onQueueContent(selectedPost)}
                                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold uppercase tracking-wider"
                                                >
                                                    Generate with AI
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600">
                        <p>Select a draft to view details</p>
                    </div>
                )}
            </div>

            {/* 3. RIGHT INSPECTOR PANEL */}
            <div
                style={{ width: inspectorWidth }}
                className="border-l border-slate-800 bg-slate-950 flex flex-col shrink-0"
            >
                {/* Actions Header */}
                {selectedPost && (
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={`
                                px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                ${selectedPost.status === PostStatus.NEEDS_REVIEW ? 'bg-amber-500/10 text-amber-500' :
                                    selectedPost.status === PostStatus.REJECTED ? 'bg-red-500/10 text-red-500' :
                                        'bg-slate-800 text-slate-400'}
                            `}>
                                {selectedPost.status.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Context-aware action buttons */}
                        {selectedPost.status === PostStatus.NEEDS_REVIEW && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleReject(selectedPost.id)}
                                    disabled={rejectingPostId === selectedPost.id || approvingPostId === selectedPost.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    {rejectingPostId === selectedPost.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedPost.id)}
                                    disabled={approvingPostId === selectedPost.id || rejectingPostId === selectedPost.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    {approvingPostId === selectedPost.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Approve
                                </button>
                            </div>
                        )}

                        {selectedPost.status === PostStatus.REJECTED && (
                            <button
                                onClick={() => onUpdateStatus(selectedPost.id, PostStatus.NEEDS_REVIEW)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <RefreshCw size={14} />
                                Restore to Review
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setInspectorTab('info')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${inspectorTab === 'info' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Layout size={14} /> Info
                    </button>
                    <button
                        onClick={() => setInspectorTab('history')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${inspectorTab === 'history' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Clock size={14} /> History
                    </button>
                </div>

                {/* Inspector Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {selectedPost && inspectorTab === 'info' && (
                        <div className="space-y-8">
                            {/* Publishing Details */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Editorial Details</h3>
                                    <AnimatePresence>
                                        {saving ? (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-400"
                                            >
                                                <Loader2 size={10} className="animate-spin" />
                                                <span>Saving...</span>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500"
                                            >
                                                <CheckCircle size={10} />
                                                <span>Saved</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Hero Image Section - Moved to Top */}
                                <div className="space-y-2 pb-4 border-b border-slate-800">
                                    <ImageInspectorControl
                                        currentImage={selectedPost.heroImage}
                                        postTitle={selectedPost.title}
                                        postTeaser={selectedPost.teaser}
                                        onImageUpdate={handleImageUpdate}
                                    />
                                </div>

                                {/* Published Date - Read Only Display */}
                                {selectedPost.publishedAt && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-medium">Published</label>
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <Calendar size={14} className="text-slate-500" />
                                            {selectedPost.publishedAt.toDate().toLocaleDateString()}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Category</label>
                                    <div className="relative">
                                        <select
                                            value={selectedPost.categoryId}
                                            onChange={(e) => handleUpdate(selectedPost.id, { categoryId: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-3 pr-8 text-sm text-slate-200 focus:border-indigo-500 outline-none appearance-none"
                                        >
                                            {categories.map(c => {
                                                // Calculate depth for visual hierarchy
                                                let depth = 0;
                                                let current = c;
                                                while (current.parentId) {
                                                    depth++;
                                                    const parent = categories.find(cat => cat.id === current.parentId);
                                                    if (parent) current = parent;
                                                    else break;
                                                }
                                                const prefix = depth > 0 ? '-'.repeat(depth) + ' ' : '';

                                                return (
                                                    <option key={c.id} value={c.id}>
                                                        {prefix}{c.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                                    </div>
                                </div>
                            </section>

                            {/* SEO & Meta Data */}
                            <section className="space-y-4 pt-4 border-t border-slate-800">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SEO & Meta Data</h3>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Meta Description</label>
                                    <textarea
                                        value={selectedPost.metaDescription || ''}
                                        onChange={(e) => handleUpdate(selectedPost.id, { metaDescription: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none min-h-[100px] resize-y"
                                        placeholder="Enter meta description..."
                                    />
                                    <div className="flex justify-end">
                                        <span className={`text-[10px] ${(selectedPost.metaDescription?.length || 0) > 160 ? 'text-red-500' : 'text-slate-600'}`}>
                                            {selectedPost.metaDescription?.length || 0}/160
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Meta Keywords (comma separated)</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="text"
                                            defaultValue={Array.isArray(selectedPost.metaKeywords) ? selectedPost.metaKeywords.join(', ') : (selectedPost.metaKeywords || '')}
                                            onBlur={(e) => {
                                                const val = e.target.value;
                                                const keywords = val.split(',').map(k => k.trim()).filter(k => k.length > 0);
                                                handleUpdate(selectedPost.id, { metaKeywords: keywords });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-9 pr-3 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                            placeholder="keyword1, keyword2, keyword3"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 pt-1">Click outside to save</p>
                                </div>
                            </section>
                        </div>
                    )}

                    {selectedPost && inspectorTab === 'history' && (
                        <div className="relative pl-4 border-l border-slate-800 space-y-8 my-2">
                            {(() => {
                                const history = [];
                                if (selectedPost.publishedAt) {
                                    history.push({ action: 'Published', user: 'System', time: selectedPost.publishedAt.toDate().toLocaleString(), active: selectedPost.status === PostStatus.PUBLISHED });
                                }
                                if (selectedPost.approvedAt) {
                                    history.push({ action: 'Approved', user: selectedPost.editor || 'Editor', time: selectedPost.approvedAt.toDate().toLocaleString(), active: selectedPost.status === PostStatus.APPROVED });
                                }
                                if (selectedPost.submittedAt) {
                                    history.push({ action: 'Submitted for Review', user: selectedPost.editor || 'Editor', time: selectedPost.submittedAt.toDate().toLocaleString(), active: selectedPost.status === PostStatus.NEEDS_REVIEW });
                                }
                                if (selectedPost.generatedAt) {
                                    history.push({ action: 'Content Generated', user: 'AI Assistant', time: selectedPost.generatedAt.toDate().toLocaleString(), active: false });
                                }
                                history.push({ action: 'Created', user: selectedPost.createdBy || 'System', time: selectedPost.createdAt.toDate().toLocaleString(), active: false });

                                return history.map((h, i) => (
                                    <HistoryItem
                                        key={i}
                                        action={h.action}
                                        user={h.user}
                                        time={h.time}
                                        active={h.active}
                                    />
                                ));
                            })()}
                        </div>
                    )}

                    {!selectedPost && (
                        <div className="text-center text-slate-600 mt-10">
                            <p className="text-sm">No post selected</p>
                        </div>
                    )}
                </div>
            </div >

            {/* Success Modal */}
            <AnimatePresence>
                {successModal?.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                        onClick={() => setSuccessModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-slate-700 p-8 max-w-md w-full mx-4 text-center"
                        >
                            <div className="mb-6">
                                <div className="w-20 h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Rocket size={40} className="text-cyan-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Launch Successful!</h2>
                                <p className="text-slate-400">
                                    Your site will be updated in ~2 minutes.
                                </p>
                            </div>

                            {(successModal.published > 0 || successModal.updated > 0) && (
                                <div className="bg-slate-800/50 border border-slate-700 p-4 mb-6 space-y-2">
                                    {successModal.published > 0 && (
                                        <p className="text-sm text-emerald-400">
                                            {successModal.published} post{successModal.published !== 1 ? 's' : ''} published
                                        </p>
                                    )}
                                    {successModal.updated > 0 && (
                                        <p className="text-sm text-blue-400">
                                            {successModal.updated} post{successModal.updated !== 1 ? 's' : ''} updated
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => setSuccessModal(null)}
                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors"
                            >
                                Got it
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

const ChevronDownIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const HistoryItem = ({ action, user, time, active }: { action: string, user: string, time: string, active?: boolean }) => (
    <div className="relative">
        <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 border-2 ${active ? 'bg-cyan-500 border-cyan-500' : 'bg-slate-950 border-slate-700'}`} />
        <p className={`text-sm font-medium ${active ? 'text-cyan-400' : 'text-slate-300'}`}>{action}</p>
        <p className="text-xs text-slate-500 mt-0.5">by {user}</p>
        <p className="text-[10px] text-slate-600 mt-1 font-mono">{time}</p>
    </div>
);