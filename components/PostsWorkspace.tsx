import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Post, Category, PostStatus, GenerationTask, TaskStatus, ContentType, Tone } from '../types';
import {
    Search, Filter, User, CheckCircle, XCircle, Edit3, UploadCloud, Trash2,
    Loader2, ArrowRight, RefreshCw, Clock, Archive, X, GripVertical,
    Sparkles, Calendar, Hash, Type, AlignLeft, ChevronRight, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Timestamp } from 'firebase/firestore';
import { ImageInspectorControl } from './ImageInspectorControl';
import { ImageGenerationResult } from '../services/imageGenerationService';

interface Props {
    posts: Post[];
    categories: Category[];
    tasks: GenerationTask[];
    onUpdateStatus: (id: string, status: PostStatus) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => Promise<void> | void;
    onDeletePost: (id: string) => void;
    onQueueContent: (post: Post) => void;
}

const STATUS_FILTERS = [
    { label: 'All', value: 'ALL' },
    { label: 'In Queue', value: PostStatus.GENERATING },
    { label: 'Review', value: PostStatus.NEEDS_REVIEW },
    { label: 'Approved', value: PostStatus.APPROVED },
    { label: 'Scheduled', value: PostStatus.SCHEDULED },
    { label: 'Published', value: PostStatus.PUBLISHED },
    { label: 'Archived', value: PostStatus.ARCHIVED },
];

export const PostsWorkspace: React.FC<Props> = ({
    posts, categories, tasks,
    onUpdateStatus, onUpdatePost, onDeletePost, onQueueContent
}) => {
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<'info' | 'history'>('info');
    const [approvingPostId, setApprovingPostId] = useState<string | null>(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState<string>('');
    const [scheduleTime, setScheduleTime] = useState<string>('09:00');
    const [saving, setSaving] = useState(false);

    const handleUpdate = async (id: string, updates: Partial<Post>) => {
        setSaving(true);
        await onUpdatePost(id, updates);
        setTimeout(() => setSaving(false), 1000);
    };

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

    // Filter Posts - Exclude PENDING (stubs) from editorial queue
    // PENDING posts belong in Categories tab until user clicks "Generate"
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            // Exclude PENDING status - these are stubs that haven't been generated yet
            if (post.status === PostStatus.PENDING) return false;

            const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter;
            const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.editor?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        }).sort((a, b) => {
            // Priority: Review first, then Generating
            const score = (s: PostStatus) => {
                if (s === PostStatus.NEEDS_REVIEW) return 5;
                if (s === PostStatus.GENERATING) return 4;
                if (s === PostStatus.REJECTED) return 1;
                return 0;
            };
            return score(b.status) - score(a.status);
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

    // Publish immediately
    const handlePublishNow = async (postId: string) => {
        try {
            await onUpdatePost(postId, {
                status: PostStatus.PUBLISHED,
                publishedAt: Timestamp.now(),
                scheduledAt: undefined, // Clear any scheduled date
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

    // Schedule for future date
    const handleSchedule = async (postId: string) => {
        if (!scheduleDate) return;

        try {
            const [year, month, day] = scheduleDate.split('-').map(Number);
            const [hours, minutes] = scheduleTime.split(':').map(Number);
            const scheduledDateTime = new Date(year, month - 1, day, hours, minutes);

            await onUpdatePost(postId, {
                status: PostStatus.SCHEDULED,
                scheduledAt: Timestamp.fromDate(scheduledDateTime),
            });

            setShowScheduleModal(false);
            setScheduleDate('');
            setScheduleTime('09:00');
        } catch (error) {
            console.error('Failed to schedule post:', error);
        }
    };

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
                <div className="p-4 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Editorial Queue</h2>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search drafts..."
                            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        {/* Simplified Filters for Editorial */}
                        {[
                            { label: 'All', value: 'ALL' },
                            { label: 'Review', value: PostStatus.NEEDS_REVIEW },
                            { label: 'Generating', value: PostStatus.GENERATING },
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
                </div>

                {/* Post List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredPosts.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 text-xs">
                            No drafts found.
                        </div>
                    ) : (
                        filteredPosts.map(post => {
                            const activeTask = tasks.find(t => t.targetPostId === post.id && t.status === TaskStatus.PROCESSING);
                            return (
                                <div
                                    key={post.id}
                                    onClick={() => setSelectedPostId(post.id)}
                                    className={`
                                p-4 border-b border-slate-800/50 cursor-pointer transition-all hover:bg-slate-900/50
                                ${selectedPostId === post.id ? 'bg-slate-900 border-l-2 border-l-cyan-500' : 'border-l-2 border-l-transparent'}
                            `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                                            {getCategoryBreadcrumb(post.categoryId)}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase ${post.status === PostStatus.REJECTED ? 'text-red-500' :
                                            post.status === PostStatus.GENERATING ? 'text-cyan-500' : 'text-amber-500'
                                            }`}>
                                            {post.status === PostStatus.NEEDS_REVIEW ? 'REVIEW' :
                                                post.status === PostStatus.GENERATING ? 'QUEUE' :
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
                                </div>
                            );
                        })
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
                                        <h1 className="text-2xl font-bold text-slate-200 leading-snug mb-2 flex items-start gap-3">
                                            {selectedPost.title}
                                            <button
                                                onClick={() => setEditMode(!editMode)}
                                                className={`mt-1 p-1.5 rounded-md transition-colors ${editMode ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
                                                title={editMode ? "Finish Editing" : "Edit Content"}
                                            >
                                                {editMode ? <CheckCircle size={16} /> : <Edit3 size={16} />}
                                            </button>
                                            <div className="mt-1 p-1.5 text-cyan-500" title="AI Generated">
                                                <Sparkles size={16} />
                                            </div>
                                        </h1>
                                        <div className="text-xs text-slate-500 mb-4">
                                            {getCategoryBreadcrumb(selectedPost.categoryId)}
                                        </div>
                                        <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
                                            <div className="w-10 h-10 bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">
                                                {(selectedPost.editor || 'SJ').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                                    By {selectedPost.editor || 'Sarah Jenkins'}
                                                    <Edit3 size={12} className="text-slate-600 cursor-pointer hover:text-slate-400" />
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {selectedPost.submittedAt ? selectedPost.submittedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-8 py-6">
                                        {selectedPost.status === PostStatus.GENERATING ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                                <Loader2 size={40} className="animate-spin text-cyan-500 mb-4" />
                                                <p className="font-mono text-sm animate-pulse">AI_WRITER_IS_TYPING...</p>
                                            </div>
                                        ) : editMode ? (
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
                                            </div>
                                        ) : selectedPost.content ? (
                                            <div className="prose prose-invert prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-indigo-400">
                                                <MDEditor.Markdown
                                                    source={selectedPost.content.replace(new RegExp(`^#\\s*${selectedPost.title}\\s*`, 'i'), '').trim()}
                                                    style={{ backgroundColor: 'transparent', color: 'inherit' }}
                                                />
                                            </div>
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
                            <div className="flex items-center gap-1">
                                {selectedPost.status === PostStatus.NEEDS_REVIEW && (
                                    <button
                                        onClick={() => onUpdateStatus(selectedPost.id, PostStatus.REJECTED)}
                                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        title="Reject"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Context-aware action buttons */}
                        {selectedPost.status === PostStatus.NEEDS_REVIEW && (
                            <button
                                onClick={() => handleApprove(selectedPost.id)}
                                disabled={approvingPostId === selectedPost.id}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                {approvingPostId === selectedPost.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Approve for Publishing
                            </button>
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

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Publish Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="datetime-local"
                                            value={selectedPost.publishedAt ? new Date(selectedPost.publishedAt.toDate().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => {
                                                const date = e.target.value ? new Date(e.target.value) : null;
                                                handleUpdate(selectedPost.id, {
                                                    publishedAt: date ? Timestamp.fromDate(date) : undefined,
                                                    status: date && date > new Date() ? PostStatus.SCHEDULED : PostStatus.PUBLISHED
                                                });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-9 pr-3 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

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
                                if (selectedPost.scheduledAt && selectedPost.status === PostStatus.SCHEDULED) {
                                    history.push({ action: `Scheduled for ${selectedPost.scheduledAt.toDate().toLocaleDateString()}`, user: selectedPost.editor || 'Editor', time: selectedPost.updatedAt.toDate().toLocaleString(), active: true });
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

            {/* Schedule Modal */}
            <AnimatePresence>
                {showScheduleModal && selectedPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                        onClick={() => setShowScheduleModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-slate-700 p-6 w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-lg font-bold text-white mb-4">Schedule Publication</h2>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Publish Date</label>
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Publish Time</label>
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                {/* Publishing Queue Preview */}
                                <div className="bg-slate-950 border border-slate-800 p-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Publishing Queue</h3>
                                    <div className="space-y-2">
                                        {(() => {
                                            const scheduledPosts = posts.filter(p =>
                                                p.status === PostStatus.SCHEDULED && p.scheduledAt
                                            ).sort((a, b) =>
                                                (a.scheduledAt?.toDate().getTime() || 0) - (b.scheduledAt?.toDate().getTime() || 0)
                                            ).slice(0, 5);

                                            if (scheduledPosts.length === 0) {
                                                return <p className="text-xs text-slate-500">No posts scheduled</p>;
                                            }

                                            return scheduledPosts.map(p => (
                                                <div key={p.id} className="flex justify-between text-xs">
                                                    <span className="text-slate-400 truncate max-w-[200px]">{p.title}</span>
                                                    <span className="text-blue-400">
                                                        {p.scheduledAt?.toDate().toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSchedule(selectedPost.id)}
                                    disabled={!scheduleDate}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Schedule
                                </button>
                            </div>
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