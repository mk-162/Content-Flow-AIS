
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Post, Category, PostStatus, GenerationTask, TaskStatus } from '../types';
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

interface Props {
    posts: Post[];
    categories: Category[];
    tasks: GenerationTask[];
    onUpdateStatus: (id: string, status: PostStatus) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => void;
    onDeletePost: (id: string) => void;
    onQueueContent: (post: Post) => void;
}

const STATUS_FILTERS = [
    { label: 'All', value: 'ALL' },
    { label: 'In Queue', value: PostStatus.GENERATING },
    { label: 'Review', value: PostStatus.NEEDS_REVIEW },
    { label: 'Published', value: PostStatus.PUBLISHED },
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
            const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter;
            const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.editor?.toLowerCase().includes(searchQuery.toLowerCase());
            const isActionable = post.status !== PostStatus.PENDING;
            return matchesStatus && matchesSearch && isActionable;
        }).sort((a, b) => {
            const score = (s: PostStatus) => {
                if (s === PostStatus.NEEDS_REVIEW) return 3;
                if (s === PostStatus.GENERATING) return 2;
                if (s === PostStatus.PUBLISHED) return 1;
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

    const handleApprove = (postId: string) => {
        setApprovingPostId(postId);
        setTimeout(() => {
            onUpdateStatus(postId, PostStatus.PUBLISHED);
            setApprovingPostId(null);

            // Auto-advance
            const currentIndex = filteredPosts.findIndex(p => p.id === postId);
            const nextPost = filteredPosts.find((p, idx) => idx > currentIndex && p.status === PostStatus.NEEDS_REVIEW);
            if (nextPost) setSelectedPostId(nextPost.id);
        }, 1500);
    };

    const getCategoryBreadcrumb = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat ? cat.name : 'Uncategorized';
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
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Blog Posts</h2>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        {STATUS_FILTERS.map(f => (
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
                    {filteredPosts.map(post => {
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
                                    <span className={`text-[10px] font-bold uppercase ${post.status === PostStatus.PUBLISHED ? 'text-emerald-500' :
                                        post.status === PostStatus.REJECTED ? 'text-red-500' :
                                            post.status === PostStatus.GENERATING ? 'text-cyan-500' : 'text-amber-500'
                                        }`}>
                                        {post.status === PostStatus.NEEDS_REVIEW ? 'REVIEW' : post.status === PostStatus.GENERATING ? 'QUEUE' : post.status}
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
                    })}
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
                                        <div className="flex justify-between items-start">
                                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">
                                                {getCategoryBreadcrumb(selectedPost.categoryId)}
                                            </div>
                                            <button
                                                onClick={() => setEditMode(!editMode)}
                                                className={`p-2 rounded-lg transition-colors ${editMode ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                                title={editMode ? "Finish Editing" : "Edit Content"}
                                            >
                                                {editMode ? <CheckCircle size={20} /> : <Edit3 size={20} />}
                                            </button>
                                        </div>
                                        <h1 className="text-4xl font-bold text-slate-50 font-serif leading-tight mb-6">
                                            {selectedPost.title}
                                        </h1>
                                        <div className="flex items-center gap-3 border-b border-slate-800 pb-8">
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
                                                <MDEditor.Markdown source={selectedPost.content} style={{ backgroundColor: 'transparent', color: 'inherit' }} />
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
                                    selectedPost.status === PostStatus.NEEDS_REVIEW ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-slate-800 text-slate-400'}
                            `}>
                                {selectedPost.status.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onUpdateStatus(selectedPost.id, PostStatus.REJECTED)}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Reject"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => handleApprove(selectedPost.id)}
                            disabled={approvingPostId === selectedPost.id}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {approvingPostId === selectedPost.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Approve & Publish
                        </button>
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
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Publishing Details</h3>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Editor</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            value={selectedPost.editor || 'Sarah Jenkins'}
                                            onChange={(e) => onUpdatePost(selectedPost.id, { editor: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-9 pr-3 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Submitted Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            readOnly
                                            value={selectedPost.submittedAt ? selectedPost.submittedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-9 pr-3 text-sm text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Category</label>
                                    <div className="relative">
                                        <select
                                            value={selectedPost.categoryId}
                                            onChange={(e) => onUpdatePost(selectedPost.id, { categoryId: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-3 pr-8 text-sm text-slate-200 focus:border-indigo-500 outline-none appearance-none"
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                                    </div>
                                </div>

                                <button
                                    onClick={() => onQueueContent(selectedPost)}
                                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all"
                                >
                                    <Sparkles size={14} /> Regenerate with AI
                                </button>
                            </section>

                            {/* SEO Metadata */}
                            <section className="space-y-4 pt-4 border-t border-slate-800">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SEO Metadata</h3>

                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <label className="text-xs text-slate-400 font-medium">Meta Title</label>
                                        <span className={`text-[10px] ${(selectedPost.title?.length || 0) > 60 ? 'text-red-400' : 'text-slate-600'}`}>
                                            {selectedPost.title?.length || 0}/60
                                        </span>
                                    </div>
                                    <input
                                        value={selectedPost.title}
                                        onChange={(e) => onUpdatePost(selectedPost.id, { title: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <label className="text-xs text-slate-400 font-medium">Meta Description</label>
                                        <span className={`text-[10px] ${(selectedPost.metaDescription?.length || 0) > 160 ? 'text-red-400' : 'text-slate-600'}`}>
                                            {selectedPost.metaDescription?.length || 0}/160
                                        </span>
                                    </div>
                                    <textarea
                                        rows={4}
                                        value={selectedPost.metaDescription || ''}
                                        onChange={(e) => onUpdatePost(selectedPost.id, { metaDescription: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Keywords</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-3 text-slate-500" size={14} />
                                        <input
                                            value={selectedPost.metaKeywords || ''}
                                            onChange={(e) => onUpdatePost(selectedPost.id, { metaKeywords: e.target.value })}
                                            placeholder="comma, separated, keywords"
                                            className="w-full bg-slate-950 border border-slate-700 py-2 pl-9 pr-3 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
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
            </div>
        </div>
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