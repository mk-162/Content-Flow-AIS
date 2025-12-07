
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Post, Category, PostStatus, GenerationTask, TaskStatus, ContentType, Tone, Project, Organization } from '../types';
import {
    Search, Filter, User, CheckCircle, XCircle, Edit3, UploadCloud, Trash2,
    Loader2, ArrowRight, RefreshCw, Clock, Archive, X, GripVertical,
    Sparkles, Calendar, Hash, Type, AlignLeft, ChevronRight, Layout, Rocket, AlertTriangle, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Timestamp } from 'firebase/firestore';
import { ImageInspectorControl } from './ImageInspectorControl';
import { exportToWordPress, WordPressConfig } from '../services/wordpressService';

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
    { label: 'Exported', value: 'EXPORTED' },
    { label: 'Live', value: 'LIVE' },
    { label: 'Archived', value: 'ARCHIVED' },
];

export const PublishingWorkspace: React.FC<Props> = ({
    posts, categories,
    onUpdateStatus, onUpdatePost, onDeletePost,
    project, organization
}) => {
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('QUEUED');
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<'info' | 'history'>('info');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState<string>('');
    const [scheduleTime, setScheduleTime] = useState<string>('09:00');
    const [isBuilding, setIsBuilding] = useState(false);
    const [nextBuildTime, setNextBuildTime] = useState<Date>(new Date(Date.now() + 45 * 60000)); // Mock 45 mins from now

    // WordPress export state
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

    // Layout resizing
    const [leftPaneWidth, setLeftPaneWidth] = useState(320);
    const [inspectorWidth, setInspectorWidth] = useState(350);
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
                // Exclude exported posts from queue
                matchesStatus = (post.status === PostStatus.APPROVED || post.status === PostStatus.SCHEDULED) && !post.wordpressExportedAt;
            } else if (statusFilter === 'EXPORTED') {
                // Show only posts that have been exported to WordPress
                matchesStatus = !!post.wordpressExportedAt;
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

    const handleTriggerBuild = () => {
        setIsBuilding(true);
        setTimeout(() => {
            setIsBuilding(false);
            // In a real app, this would trigger a webhook
            alert('Build triggered! Site will be updated in ~2 minutes.');
        }, 2000);
    };

    const handleSave = async (content: string) => {
        if (!selectedPost) return;

        if (selectedPost.status === PostStatus.PUBLISHED) {
            if (confirm("⚠️ You are editing a LIVE post.\n\nSaving this will update the content for the next build, but it won't be visible immediately until the site rebuilds.\n\nDo you want to proceed?")) {
                await onUpdatePost(selectedPost.id, { content });
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Rocket size={16} className="text-purple-500" /> Publishing
                        </h2>
                        <div className="text-[10px] font-mono text-slate-500">
                            Next Build: <span className="text-slate-300">{nextBuildTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleTriggerBuild}
                        disabled={isBuilding}
                        className="w-full mb-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all rounded-sm"
                    >
                        {isBuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {isBuilding ? 'Building Site...' : 'Trigger Build Now'}
                    </button>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search published posts..."
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
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredPosts.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 text-xs">
                            No posts found in {statusFilter.toLowerCase()}
                        </div>
                    ) : (
                        filteredPosts.map(post => (
                            <div
                                key={post.id}
                                onClick={() => setSelectedPostId(post.id)}
                                className={`
                            p-4 border-b border-slate-800/50 cursor-pointer transition-all hover:bg-slate-900/50
                            ${selectedPostId === post.id ? 'bg-slate-900 border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'}
                        `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                                        {getCategoryBreadcrumb(post.categoryId)}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase ${post.status === PostStatus.PUBLISHED ? 'text-emerald-500' :
                                        post.status === PostStatus.SCHEDULED ? 'text-blue-500' :
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
                                            {post.publishedAt ? `Live: ${post.publishedAt.toDate().toLocaleDateString()}` :
                                                post.scheduledAt ? `Due: ${post.scheduledAt.toDate().toLocaleDateString()}` :
                                                    `Approved: ${post.updatedAt?.toDate().toLocaleDateString()}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
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
                                        <div className="flex justify-end items-start mb-4">
                                            <button
                                                onClick={() => setEditMode(!editMode)}
                                                className={`p-2 transition-colors ${editMode ? 'bg-purple-500/10 text-purple-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                                title={editMode ? "Finish Editing" : "Edit Content"}
                                            >
                                                {editMode ? <CheckCircle size={20} /> : <Edit3 size={20} />}
                                            </button>
                                        </div>

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
                                    </div>

                                    {/* Body */}
                                    <div className="px-8 py-6">
                                        {editMode ? (
                                            <div className="min-h-[500px]" data-color-mode="dark">
                                                <MDEditor
                                                    value={selectedPost.content || ''}
                                                    onChange={(val) => onUpdatePost(selectedPost.id, { content: val })}
                                                    preview="edit"
                                                    height={600}
                                                    style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                                                    textareaProps={{
                                                        placeholder: 'Start writing your post...'
                                                    }}
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
                                            <div className="prose prose-invert prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-indigo-400">
                                                <MDEditor.Markdown source={selectedPost.content} style={{ backgroundColor: 'transparent', color: 'inherit' }} />
                                            </div>
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
                                    selectedPost.status === PostStatus.SCHEDULED ? 'bg-blue-500/10 text-blue-500' :
                                        selectedPost.status === PostStatus.APPROVED ? 'bg-purple-500/10 text-purple-500' :
                                            'bg-slate-800 text-slate-400'}
                            `}>
                                {selectedPost.status.replace('_', ' ')}
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
                                        onClick={() => setShowScheduleModal(true)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        <Calendar size={14} />
                                        Schedule
                                    </button>
                                    <button
                                        onClick={() => onUpdateStatus(selectedPost.id, PostStatus.NEEDS_REVIEW)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        <RefreshCw size={14} />
                                        Unapprove
                                    </button>
                                </div>

                                {/* WordPress Export Button */}
                                {isWordPressConfigured && !selectedPost.wordpressExportedAt && (
                                    <button
                                        onClick={handleWordPressExport}
                                        disabled={isExporting}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                        {isExporting ? 'Exporting...' : 'Export to WordPress'}
                                    </button>
                                )}
                                {selectedPost.wordpressExportedAt && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs">
                                        <CheckCircle size={14} />
                                        Exported {selectedPost.wordpressExportedAt.toDate().toLocaleDateString()}
                                    </div>
                                )}
                                {exportResult && (
                                    <div className={`px-3 py-2 text-xs ${exportResult.success ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'}`}>
                                        {exportResult.message}
                                    </div>
                                )}
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
