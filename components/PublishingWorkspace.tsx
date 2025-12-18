
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePaneWidth } from '../hooks/usePaneWidth';
import { Post, Category, PostStatus, GenerationTask, TaskStatus, ContentType, Tone, Project, Organization } from '../types';
import {
    Search, Filter, User, CheckCircle, XCircle, Edit3, UploadCloud, Trash2,
    Loader2, ArrowRight, RefreshCw, Clock, Archive, X, GripVertical,
    Sparkles, Hash, Type, AlignLeft, ChevronRight, Layout, Rocket, Globe
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
    { label: 'Live', value: 'LIVE' },
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

    // Filter Posts
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            let matchesStatus = false;
            if (statusFilter === 'QUEUED') {
                matchesStatus = post.status === PostStatus.APPROVED;
            } else if (statusFilter === 'LIVE') {
                matchesStatus = post.status === PostStatus.PUBLISHED;
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
    }, [posts, statusFilter, searchQuery]);

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
            if (confirm("⚠️ You are editing a LIVE post.\n\nThis will push the post back into the launch queue. Changes will go live on the next launch.\n\nDo you want to proceed?")) {
                await onUpdatePost(selectedPost.id, { content });
                await onUpdateStatus(selectedPost.id, PostStatus.APPROVED);
                setEditMode(false);
            }
        } else {
            await onUpdatePost(selectedPost.id, { content });
            setEditMode(false);
        }
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
                    <div className="mb-4">
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Launch Pad</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Publish Content</p>
                    </div>

                    {project?.settings?.deployment?.webhookUrl ? (
                        <div className="mb-4 space-y-2">
                            <button
                                onClick={handleTriggerBuild}
                                disabled={isBuilding}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                            >
                                {isBuilding ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                                {isBuilding ? 'Launching...' : 'Launch All'}
                            </button>
                            {(() => {
                                const queuedCount = posts.filter(p => p.status === PostStatus.APPROVED).length;
                                if (queuedCount > 0) {
                                    return (
                                        <p className="text-[10px] text-slate-500 text-center">
                                            {queuedCount} post{queuedCount !== 1 ? 's' : ''} ready to publish
                                        </p>
                                    );
                                }
                                return <p className="text-[10px] text-slate-500 text-center">All posts are up to date</p>;
                            })()}
                        </div>
                    ) : (
                        <div className="mb-4 py-3 px-3 bg-slate-800/50 border border-slate-700 text-center">
                            <p className="text-xs text-slate-400">Deployment not configured</p>
                            <p className="text-[10px] text-slate-500 mt-1">Contact admin to set up CloudFlare deployment</p>
                        </div>
                    )}

                    <div className="relative mb-3">
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
                        <AnimatePresence>
                            {filteredPosts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 1, y: 0 }}
                                    animate={isLaunching ? {
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
                                        <span className={`text-[10px] font-bold uppercase ${post.status === PostStatus.PUBLISHED ? 'text-emerald-500' :
                                                post.status === PostStatus.APPROVED ? 'text-purple-400' :
                                                    'text-slate-500'
                                            }`}>
                                            {post.status === PostStatus.APPROVED ? 'QUEUED' : post.status}
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
                                            <span className="text-xs text-slate-600">
                                                {post.publishedAt ? `Updated: ${post.publishedAt.toDate().toLocaleDateString()}` :
                                                        `Approved: ${post.updatedAt?.toDate().toLocaleDateString()}`}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
                                            <div className="mb-4 flex items-center gap-2 p-2 bg-emerald-950/30 border border-emerald-900/50 rounded-sm">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-xs text-emerald-400 font-medium">This post is LIVE on the website.</span>
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
                                                    {(selectedPost.editor || 'SJ').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-300">
                                                        By {selectedPost.editor || 'Sarah Jenkins'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {selectedPost.publishedAt ? selectedPost.publishedAt.toDate().toLocaleDateString() : selectedPost.updatedAt?.toDate().toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
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
                                                    onClick={() => {
                                                        if (confirm('Remove this post from the website? It will be queued for removal in the next launch.')) {
                                                            onUpdateStatus(selectedPost.id, PostStatus.ARCHIVED);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-700 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors"
                                                >
                                                    Remove Post
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-[10px] text-slate-500 space-y-1">
                                            <p><span className="text-slate-400 font-medium">Edit:</span> Changes push post back into launch queue and update the site on next launch.</p>
                                            <p><span className="text-slate-400 font-medium">Remove:</span> Adds removal request to queue for action on next launch.</p>
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
                        <div className="flex items-center justify-between">
                            <span className={`
                                px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                ${selectedPost.status === PostStatus.PUBLISHED ? 'bg-emerald-500/10 text-emerald-500' :
                                        selectedPost.status === PostStatus.APPROVED ? 'bg-purple-500/10 text-purple-500' :
                                            'bg-slate-800 text-slate-400'}
                            `}>
                                {selectedPost.status === PostStatus.APPROVED ? 'READY TO PUBLISH' : selectedPost.status.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1">
                                {selectedPost.status !== PostStatus.ARCHIVED && (
                                    <button
                                        onClick={() => onUpdateStatus(selectedPost.id, PostStatus.ARCHIVED)}
                                        className="p-1.5 text-slate-400 hover:bg-slate-700 transition-colors"
                                        title="Archive"
                                    >
                                        <Archive size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Context-aware action buttons */}
                        {selectedPost.status === PostStatus.APPROVED && (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onUpdateStatus(selectedPost.id, PostStatus.NEEDS_REVIEW)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        <RefreshCw size={14} />
                                        Send Back to Review
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 text-center">
                                    This post will go live when you click "Publish All" above
                                </p>
                            </div>
                        )}

                        {selectedPost.status === PostStatus.PUBLISHED && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => onUpdateStatus(selectedPost.id, PostStatus.NEEDS_REVIEW)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    <RefreshCw size={14} />
                                    Unpublish (Back to Review)
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
