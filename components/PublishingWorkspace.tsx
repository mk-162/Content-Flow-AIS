
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePaneWidth } from '../hooks/usePaneWidth';
import { Post, Category, PostStatus, GenerationTask, TaskStatus, ContentType, Tone, Project, Organization } from '../types';
import {
    Search, Filter, User, CheckCircle, XCircle, Edit3, UploadCloud, Trash2,
    Loader2, ArrowRight, RefreshCw, Clock, Archive, X, GripVertical,
    Sparkles, Hash, Type, AlignLeft, ChevronRight, Layout, Rocket, Globe, RotateCcw,
    Pencil, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiptapEditor, TiptapViewer } from './TiptapEditor';
import { Timestamp } from 'firebase/firestore';
import { ImageInspectorControl } from './ImageInspectorControl';
import { exportToWordPress, WordPressConfig } from '../services/wordpressService';
import { triggerBuild } from '../services/deploymentService';
import { useAuth } from '../contexts/AuthContext';

interface Props {
    posts: Post[];
    categories: Category[];
    onUpdateStatus: (id: string, status: PostStatus) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => Promise<void> | void;
    onDeletePost: (id: string) => void;
    project?: Project;
    organization?: Organization;
}

const PUBLISHING_FILTERS = [
    { label: 'Queued', value: 'QUEUED' },
    { label: 'Drafts', value: 'DRAFTS' },
    { label: 'Archived', value: 'ARCHIVED' },
];

export const PublishingWorkspace: React.FC<Props> = ({
    posts, categories,
    onUpdateStatus, onUpdatePost, onDeletePost,
    project, organization
}) => {
    const { user } = useAuth();
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('QUEUED');
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<'info' | 'history'>('info');
    const [isBuilding, setIsBuilding] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [successModal, setSuccessModal] = useState<{ show: boolean; published: number; updated: number } | null>(null);

    // WordPress export state
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

    // Action overlay notification
    const [actionOverlay, setActionOverlay] = useState<{
        show: boolean;
        type: 'edit' | 'delete' | 'archive';
        message: string;
    } | null>(null);

    // "Exclude drafts" toggle - when ON (default), drafts are excluded from launch
    const [excludeDrafts, setExcludeDrafts] = useState(true);

    // Author name editing state
    const [isEditingAuthor, setIsEditingAuthor] = useState(false);
    const [editAuthorName, setEditAuthorName] = useState('');


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

    // Filter Posts and split into launch-ready and drafts
    // QUEUED now includes: READY, NEEDS_REVIEW, and APPROVED (all are "ready to launch")
    const { filteredPosts, totalQueuedCount } = useMemo(() => {
        if (!posts || !Array.isArray(posts)) {
            return { filteredPosts: [], totalQueuedCount: 0 };
        }
        const filtered = posts.filter(post => {
            // Exclude category pages
            if (post.isCategoryPage) return false;

            let matchesStatus = false;
            if (statusFilter === 'QUEUED') {
                // Include READY, NEEDS_REVIEW, and APPROVED - all are content ready for launch (exclude drafts)
                matchesStatus = (post.status === PostStatus.READY ||
                                post.status === PostStatus.NEEDS_REVIEW ||
                                post.status === PostStatus.APPROVED) && !post.isDraft;
            } else if (statusFilter === 'DRAFTS') {
                // Show posts marked as drafts
                matchesStatus = (post.status === PostStatus.READY ||
                                post.status === PostStatus.NEEDS_REVIEW ||
                                post.status === PostStatus.APPROVED) && post.isDraft;
            } else if (statusFilter === 'ARCHIVED') {
                matchesStatus = post.status === PostStatus.ARCHIVED;
            }

            const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.editor?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        }).sort((a, b) => {
            // Sort by updated/published date
            const dateA = a.publishedAt || a.updatedAt;
            const dateB = b.publishedAt || b.updatedAt;
            return (dateB?.toMillis() || 0) - (dateA?.toMillis() || 0);
        });

        // Count posts for launch
        const totalQueued = filtered.length;

        return { filteredPosts: filtered, totalQueuedCount: totalQueued };
    }, [posts, statusFilter, searchQuery]);

    // Toggle draft status
    const handleToggleDraft = async (postId: string, isDraft: boolean) => {
        await onUpdatePost(postId, { isDraft });
    };

    const selectedPost = posts.find(p => p.id === selectedPostId);

    // Auto-select first post if none selected
    useEffect(() => {
        if (!selectedPostId && filteredPosts.length > 0) {
            setSelectedPostId(filteredPosts[0].id);
        }
    }, [filteredPosts, selectedPostId]);

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

                // Get posts ready to launch (READY, NEEDS_REVIEW, or APPROVED)
                // Exclude drafts and respect "only reviewed" toggle
                const postsToLaunch = posts.filter(p => {
                    // Must be in a launchable state
                    const isLaunchable = p.status === PostStatus.READY ||
                                        p.status === PostStatus.NEEDS_REVIEW ||
                                        p.status === PostStatus.APPROVED;
                    if (!isLaunchable) return false;

                    // If "exclude drafts" is ON (default), skip drafts
                    if (excludeDrafts && p.isDraft) return false;

                    // Exclude category pages
                    if (p.isCategoryPage) return false;

                    return true;
                });

                // Legacy: also handle APPROVED posts for backward compatibility
                const approvedPosts = postsToLaunch;

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

                // Reset launch animation and switch to Live view
                setIsLaunching(false);
                if (postsPublished > 0) {
                    setStatusFilter('LIVE');
                    setSelectedPostId(null);
                }

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

    const handleSave = async (content: string) => {
        if (!selectedPost) return;

        if (selectedPost.status === PostStatus.PUBLISHED) {
            // For live posts, flag as pending edit and show overlay
            await onUpdatePost(selectedPost.id, {
                content,
                pendingAction: 'edit'
            });
            setEditMode(false);
            setActionOverlay({
                show: true,
                type: 'edit',
                message: 'Moved to Launch Pad. Edit will go live on next launch.'
            });
            // Auto-dismiss after 3 seconds
            setTimeout(() => setActionOverlay(null), 3000);
        } else {
            await onUpdatePost(selectedPost.id, { content });
            setEditMode(false);
        }
    };

    const handleDeleteLivePost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        if (post.status === PostStatus.PUBLISHED) {
            // For live posts, flag as pending delete instead of immediate delete
            await onUpdatePost(postId, { pendingAction: 'delete' });
            setActionOverlay({
                show: true,
                type: 'delete',
                message: 'Flagged for deletion. Will be removed on next launch.'
            });
            setTimeout(() => setActionOverlay(null), 3000);
        } else {
            // For non-live posts, delete immediately
            if (confirm('Delete this post? This action cannot be undone.')) {
                onDeletePost(postId);
            }
        }
    };

    const handleArchiveLivePost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        if (post.status === PostStatus.PUBLISHED) {
            // Archive and show overlay
            await onUpdateStatus(postId, PostStatus.ARCHIVED);
            setActionOverlay({
                show: true,
                type: 'archive',
                message: 'Moved to Launch Pad. Will be unpublished on next launch.'
            });
            setTimeout(() => setActionOverlay(null), 3000);
        } else {
            if (confirm('Archive this post? It will be removed from the launch queue.')) {
                onUpdateStatus(postId, PostStatus.ARCHIVED);
            }
        }
    };

    const getCategoryBreadcrumb = (catId: string) => {
        if (!categories || categories.length === 0) return 'Uncategorized';

        const trail: string[] = [];
        let current = categories.find(c => c.id === catId);

        while (current) {
            trail.unshift(current.name);
            current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
        }

        return trail.length > 0 ? trail.join(' / ') : 'Uncategorized';
    };

    const handleImageUpdate = async (image: any) => {
        if (!selectedPostId) return;
        await onUpdatePost(selectedPostId, { heroImage: image });
    };

    const handleWordPressExport = async () => {
        if (!selectedPost || !project?.settings?.wordpress) return;

        setIsExporting(true);
        setExportResult(null);

        try {
            const config: WordPressConfig = {
                siteUrl: project.settings.wordpress.siteUrl,
                username: project.settings.wordpress.username,
                appPassword: project.settings.wordpress.appPassword,
                defaultStatus: project.settings.wordpress.defaultStatus
            };

            const result = await exportToWordPress(selectedPost, config);

            if (result.success) {
                // Update post with export timestamp
                await onUpdatePost(selectedPost.id, {
                    wordpressExportedAt: Timestamp.now(),
                    wordpressPostId: result.wordpressId
                });
                setExportResult({ success: true, message: `Exported! WP ID: ${result.wordpressId}` });
            } else {
                setExportResult({ success: false, message: result.error || 'Export failed' });
            }
        } catch (error: any) {
            setExportResult({ success: false, message: error.message || 'Export failed' });
        } finally {
            setIsExporting(false);
        }
    };

    // Check if WordPress is configured
    const isWordPressConfigured = organization?.wordpressEnabled && project?.settings?.wordpress?.siteUrl;

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
                    {/* Top row: Title + Launch Button */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Launch Pad</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Publish Content</p>
                        </div>

                        {/* Launch Button - Always visible, disabled if no deployment */}
                        {(() => {
                            const hasDeployment = !!project?.settings?.deployment?.webhookUrl;
                            const launchableCount = totalQueuedCount;
                            const isDisabled = isBuilding || launchableCount === 0 || !hasDeployment || statusFilter !== 'QUEUED';

                            return (
                                <button
                                    onClick={handleTriggerBuild}
                                    disabled={isDisabled}
                                    title={!hasDeployment ? 'Deployment not configured' : undefined}
                                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
                                        isDisabled
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                                    }`}
                                >
                                    {isBuilding ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                                    {isBuilding ? 'Launching...' : launchableCount > 0 ? `Launch ${launchableCount}` : 'Launch'}
                                </button>
                            );
                        })()}
                    </div>

                    <div className="relative mb-3 mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search pending posts..."
                            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        {PUBLISHING_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`
                            px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border border-transparent
                            ${statusFilter === f.value
                                        ? 'bg-purple-950 text-purple-400 border-purple-900'
                                        : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
                        `}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Post List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative overflow-x-hidden">
                    {/* Launch Rocket Animation - follows behind the posts */}
                    <AnimatePresence>
                        {isLaunching && (
                            <motion.div
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: -1200 }}
                                transition={{
                                    duration: 1.8,
                                    delay: (filteredPosts.length * 0.08) + 0.1,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                                style={{ top: filteredPosts.length * 100 }}
                            >
                                <div className="relative">
                                    <Rocket size={64} className="text-purple-500 -rotate-45" />
                                    {/* Flame trail */}
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
                            No posts found in {statusFilter.toLowerCase()}
                        </div>
                    ) : (
                        <>
                            {/* Launch-Ready Posts */}
                            <AnimatePresence>
                                {filteredPosts.map((post, index) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 1, y: 0 }}
                                        animate={isLaunching && statusFilter === 'QUEUED' ? {
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
                                        onClick={() => !isLaunching && setSelectedPostId(post.id)}
                                        className={`
                                            p-4 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-900/50
                                            ${selectedPostId === post.id ? 'bg-slate-900 border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'}
                                            ${isLaunching ? 'pointer-events-none' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                                                {getCategoryBreadcrumb(post.categoryId)}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase text-purple-400">
                                                {statusFilter === 'DRAFTS' ? 'DRAFT' : 'QUEUED'}
                                            </span>
                                        </div>
                                        <h3 className={`text-sm font-medium leading-snug mb-2 ${selectedPostId === post.id ? 'text-white' : 'text-slate-400'}`}>
                                            {post.title}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-600">
                                                {post.updatedAt?.toDate().toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {/* Draft toggle - next to launch area */}
                                                {statusFilter === 'QUEUED' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleDraft(post.id, !post.isDraft);
                                                        }}
                                                        className="flex items-center gap-1.5 group"
                                                        title={post.isDraft ? "Release to launch queue" : "Mark as draft"}
                                                    >
                                                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-400">Draft</span>
                                                        <div className={`w-7 h-4 rounded-full relative transition-colors ${
                                                            post.isDraft ? 'bg-amber-500/30' : 'bg-slate-700'
                                                        }`}>
                                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                                                                post.isDraft ? 'right-0.5 bg-amber-400' : 'left-0.5 bg-slate-500'
                                                            }`} />
                                                        </div>
                                                    </button>
                                                )}
                                                {/* Delete button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Delete this post? This action cannot be undone.')) {
                                                            onDeletePost(post.id);
                                                        }
                                                    }}
                                                    className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                                    title="Delete post"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>

            {/* Resizer */}
            <div
                onMouseDown={() => setIsResizingLeft(true)}
                className="w-1 bg-slate-950 hover:bg-purple-500/50 cursor-col-resize transition-colors z-20"
            />

            {/* 2. CENTER STAGE (MAIN CONTENT) */}
            <div className="flex-1 flex flex-col bg-slate-950 min-w-0 relative">
                {selectedPost ? (
                    <>
                        {/* Content Stage */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 custom-scrollbar">
                            <div className="max-w-3xl mx-auto">
                                {/* Preview Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={selectedPost.id}
                                    className="bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden min-h-[800px]"
                                >
                                    {/* Internal Header */}
                                    <div className="p-8 pb-4 relative">
                                        {selectedPost.status === PostStatus.PUBLISHED && (
                                            <div className="mb-4 space-y-2">
                                                <div className="flex items-center gap-2 p-2 bg-emerald-950/30 border border-emerald-900/50 rounded-sm">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs text-emerald-400 font-medium">This post is LIVE on the website.</span>
                                                </div>
                                                {selectedPost.pendingAction === 'edit' && (
                                                    <div className="flex items-center gap-2 p-2 bg-blue-950/30 border border-blue-900/50 rounded-sm">
                                                        <Pencil size={14} className="text-blue-400" />
                                                        <span className="text-xs text-blue-400 font-medium">EDIT PENDING — Changes will go live on next launch.</span>
                                                    </div>
                                                )}
                                                {selectedPost.pendingAction === 'delete' && (
                                                    <div className="flex items-center gap-2 p-2 bg-rose-950/30 border border-rose-900/50 rounded-sm">
                                                        <Trash2 size={14} className="text-rose-400" />
                                                        <span className="text-xs text-rose-400 font-medium">DELETE PENDING — Will be removed on next launch.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {selectedPost.isDraft && selectedPost.status === PostStatus.APPROVED && (
                                            <div className="mb-4 flex items-center gap-2 p-2 bg-amber-950/30 border border-amber-900/50 rounded-sm">
                                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                <span className="text-xs text-amber-400 font-medium">This post is a DRAFT and won't launch until the toggle is turned off.</span>
                                            </div>
                                        )}

                                        <h1 className="text-2xl font-bold text-slate-200 leading-snug mb-2">
                                            {selectedPost.title}
                                        </h1>
                                        <div className="text-xs text-slate-500 mb-4">
                                            {getCategoryBreadcrumb(selectedPost.categoryId)}
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
                                                    {(selectedPost.authorName || project?.settings?.defaultAuthorName || 'AU').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    {isEditingAuthor ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editAuthorName}
                                                                onChange={(e) => setEditAuthorName(e.target.value)}
                                                                className="bg-slate-800 border border-slate-600 px-2 py-1 text-sm text-slate-200 focus:border-purple-500 outline-none w-40"
                                                                placeholder="Author name"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        onUpdatePost(selectedPost.id, { authorName: editAuthorName.trim() || undefined });
                                                                        setIsEditingAuthor(false);
                                                                    } else if (e.key === 'Escape') {
                                                                        setIsEditingAuthor(false);
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    onUpdatePost(selectedPost.id, { authorName: editAuthorName.trim() || undefined });
                                                                    setIsEditingAuthor(false);
                                                                }}
                                                                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                                                                title="Save"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setIsEditingAuthor(false)}
                                                                className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-medium text-slate-300">
                                                                By {selectedPost.authorName || project?.settings?.defaultAuthorName || 'Unknown Author'}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setEditAuthorName(selectedPost.authorName || project?.settings?.defaultAuthorName || '');
                                                                    setIsEditingAuthor(true);
                                                                }}
                                                                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                                                                title="Edit author name"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-slate-500">
                                                        {selectedPost.publishedAt ? selectedPost.publishedAt.toDate().toLocaleDateString() : selectedPost.updatedAt?.toDate().toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Draft toggle - left of Edit button */}
                                                {(selectedPost.status === PostStatus.READY ||
                                                  selectedPost.status === PostStatus.NEEDS_REVIEW ||
                                                  selectedPost.status === PostStatus.APPROVED) && (
                                                    <button
                                                        onClick={() => handleToggleDraft(selectedPost.id, !selectedPost.isDraft)}
                                                        className="flex items-center gap-2 px-3 py-1.5 group"
                                                        title={selectedPost.isDraft ? "Move to launch queue" : "Move to drafts"}
                                                    >
                                                        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300">Draft</span>
                                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${
                                                            selectedPost.isDraft ? 'bg-amber-500/30' : 'bg-slate-700'
                                                        }`}>
                                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                                                                selectedPost.isDraft ? 'right-0.5 bg-amber-400' : 'left-0.5 bg-slate-500'
                                                            }`} />
                                                        </div>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        if (editMode) {
                                                            handleSave(selectedPost.content || '');
                                                        } else {
                                                            setEditMode(true);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                                                        editMode
                                                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                                    }`}
                                                >
                                                    {editMode ? 'Save' : 'Edit'}
                                                </button>
                                                <button
                                                    onClick={() => handleArchiveLivePost(selectedPost.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                    title="Archive post"
                                                >
                                                    <Archive size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-8 py-6">
                                        {editMode ? (
                                            <div>
                                                <TiptapEditor
                                                    content={selectedPost.content || ''}
                                                    onChange={(val) => onUpdatePost(selectedPost.id, { content: val })}
                                                    placeholder="Start writing your post..."
                                                />
                                                <div className="mt-4 flex justify-end">
                                                    <button
                                                        onClick={() => handleSave(selectedPost.content || '')}
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider"
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <TiptapViewer content={selectedPost.content || ''} />
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600">
                        <p>Select a post to view details</p>
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
                        <div>
                            {/* Status Badge */}
                            {(() => {
                                const isQueued = selectedPost.status === PostStatus.READY ||
                                                 selectedPost.status === PostStatus.NEEDS_REVIEW ||
                                                 selectedPost.status === PostStatus.APPROVED;
                                const isDraft = isQueued && selectedPost.isDraft;
                                return (
                                    <span className={`
                                        px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                        ${selectedPost.status === PostStatus.PUBLISHED ? 'bg-emerald-500/10 text-emerald-500' :
                                                isDraft ? 'bg-amber-500/10 text-amber-400' :
                                                isQueued ? 'bg-purple-500/10 text-purple-500' :
                                                    'bg-slate-800 text-slate-400'}
                                    `}>
                                        {isDraft ? 'DRAFT' : isQueued ? 'QUEUED' : selectedPost.status.replace('_', ' ')}
                                    </span>
                                );
                            })()}
                        </div>

                        {selectedPost.status === PostStatus.PUBLISHED && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => onUpdateStatus(selectedPost.id, PostStatus.READY)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    <RefreshCw size={14} />
                                    Unpublish (Back to Queue)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setInspectorTab('info')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${inspectorTab === 'info' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Layout size={14} /> Info
                    </button>
                    <button
                        onClick={() => setInspectorTab('history')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${inspectorTab === 'history' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
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
                                <ImageInspectorControl
                                    currentImage={selectedPost.heroImage}
                                    postTitle={selectedPost.title}
                                    postTeaser={selectedPost.teaser}
                                    onImageUpdate={handleImageUpdate}
                                />
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SEO & Linking</h3>

                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <label className="text-xs text-slate-400 font-medium">Meta Description</label>
                                        <span className={`text-[10px] ${(selectedPost.metaDescription?.length || 0) > 160 ? 'text-red-400' : 'text-slate-600'}`}>
                                            {selectedPost.metaDescription?.length || 0}/160
                                        </span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={selectedPost.metaDescription || ''}
                                        onChange={(e) => onUpdatePost(selectedPost.id, { metaDescription: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-purple-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Meta Keywords</label>
                                    <input
                                        value={selectedPost.metaKeywords?.join(', ') || ''}
                                        onChange={(e) => onUpdatePost(selectedPost.id, {
                                            metaKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                                        })}
                                        placeholder="keyword1, keyword2, keyword3"
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-purple-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-600">Comma-separated keywords for SEO</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Commercial Tag</label>
                                    <input
                                        value={selectedPost.commercialTag || ''}
                                        onChange={(e) => onUpdatePost(selectedPost.id, { commercialTag: e.target.value })}
                                        placeholder="e.g. summer-sale, new-arrivals"
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-purple-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-600">Links content to banners & products in Astro</p>
                                </div>
                            </section>
                        </div>
                    )}

                    {selectedPost && inspectorTab === 'history' && (
                        <div className="relative pl-4 border-l border-slate-800 space-y-8 my-2">
                            {/* History items would go here - simplified for brevity */}
                            <p className="text-xs text-slate-500">History log...</p>
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
                                <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Rocket size={40} className="text-purple-500" />
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
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider transition-colors"
                            >
                                Got it
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Overlay Notification */}
            <AnimatePresence>
                {actionOverlay?.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className={`px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
                            actionOverlay.type === 'edit' ? 'bg-blue-900/95 border border-blue-700' :
                            actionOverlay.type === 'delete' ? 'bg-rose-900/95 border border-rose-700' :
                            'bg-amber-900/95 border border-amber-700'
                        }`}>
                            {actionOverlay.type === 'edit' && <Pencil size={20} className="text-blue-400" />}
                            {actionOverlay.type === 'delete' && <Trash2 size={20} className="text-rose-400" />}
                            {actionOverlay.type === 'archive' && <Archive size={20} className="text-amber-400" />}
                            <span className={`text-sm font-medium ${
                                actionOverlay.type === 'edit' ? 'text-blue-200' :
                                actionOverlay.type === 'delete' ? 'text-rose-200' :
                                'text-amber-200'
                            }`}>
                                {actionOverlay.message}
                            </span>
                            <button
                                onClick={() => setActionOverlay(null)}
                                className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                <X size={16} className="text-white/70" />
                            </button>
                        </div>
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
