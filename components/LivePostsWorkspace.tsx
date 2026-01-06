import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePaneWidth } from '../hooks/usePaneWidth';
import { Post, Category, PostStatus, Project, Organization } from '../types';
import {
    Search, CheckCircle, Edit3, Trash2,
    Loader2, RefreshCw, Clock, Archive, Globe,
    Calendar, Hash, Layout, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiptapEditor, TiptapViewer } from './TiptapEditor';
import { Timestamp } from 'firebase/firestore';
import { ImageInspectorControl } from './ImageInspectorControl';

interface Props {
    posts: Post[];
    categories: Category[];
    onUpdateStatus: (id: string, status: PostStatus) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => Promise<void> | void;
    onDeletePost: (id: string) => void;
    project?: Project;
    organization?: Organization;
}

const STATUS_FILTERS = [
    { label: 'Live', value: PostStatus.PUBLISHED },
    { label: 'Archived', value: PostStatus.ARCHIVED },
];

export const LivePostsWorkspace: React.FC<Props> = ({
    posts, categories,
    onUpdateStatus, onUpdatePost, onDeletePost,
    project, organization
}) => {
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState(PostStatus.PUBLISHED);
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<'info' | 'history'>('info');
    const [saving, setSaving] = useState(false);

    const handleUpdate = async (id: string, updates: Partial<Post>) => {
        setSaving(true);
        await onUpdatePost(id, updates);
        setTimeout(() => setSaving(false), 1000);
    };

    // Layout resizing
    const [leftPaneWidth, setLeftPaneWidth] = usePaneWidth('leftPane');
    const [inspectorWidth, setInspectorWidth] = usePaneWidth('inspector');
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Filter Posts - Only show PUBLISHED and ARCHIVED
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            if (post.status !== PostStatus.PUBLISHED && post.status !== PostStatus.ARCHIVED) return false;

            const matchesStatus = post.status === statusFilter;
            const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.editor?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        }).sort((a, b) => {
            // Sort by published date, newest first
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

    const handleSave = async (content: string) => {
        if (!selectedPost) return;

        if (selectedPost.status === PostStatus.PUBLISHED) {
            if (confirm("You are editing a LIVE post.\n\nThis will push the post back into the launch queue. Changes will go live on the next launch.\n\nDo you want to proceed?")) {
                // Atomic update: content + status in single call
                try {
                    await onUpdatePost(selectedPost.id, {
                        content,
                        status: PostStatus.APPROVED
                    });
                    setEditMode(false);
                } catch (error) {
                    console.error('Failed to save post:', error);
                    // Content and status remain unchanged on error
                }
            }
        } else {
            await onUpdatePost(selectedPost.id, { content });
            setEditMode(false);
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

    // Count live posts
    const liveCount = posts.filter(p => p.status === PostStatus.PUBLISHED).length;

    return (
        <div
            ref={containerRef}
            className={`flex flex-1 h-full bg-slate-950 overflow-hidden ${isResizingLeft ? 'cursor-col-resize select-none' : ''}`}
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
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-white tracking-tight">Live Posts</h1>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
                                {liveCount}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Published Content</p>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search live posts..."
                            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none transition-all"
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
                                        ? 'bg-emerald-950 text-emerald-400 border-emerald-900'
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
                            No {statusFilter === PostStatus.PUBLISHED ? 'live' : 'archived'} posts found.
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredPosts.map(post => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    onClick={() => setSelectedPostId(post.id)}
                                    className={`
                                        p-4 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-900/50
                                        ${selectedPostId === post.id ? 'bg-slate-900 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            {getCategoryBreadcrumb(post.categoryId)}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase ${
                                            post.status === PostStatus.PUBLISHED ? 'text-emerald-500' : 'text-slate-500'
                                        }`}>
                                            {post.status === PostStatus.PUBLISHED ? 'LIVE' : 'ARCHIVED'}
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
                                                {post.publishedAt?.toDate().toLocaleDateString() || post.updatedAt?.toDate().toLocaleDateString()}
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
                className="w-1 bg-slate-950 hover:bg-emerald-500/50 cursor-col-resize transition-colors z-20"
            />

            {/* 2. CENTER STAGE (MAIN CONTENT) */}
            <div className="flex-1 flex flex-col bg-slate-950 min-w-0 relative">
                {selectedPost ? (
                    <>
                        {/* Content Stage */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 custom-scrollbar overflow-x-hidden">
                            <div className="max-w-3xl mx-auto">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={selectedPost.id}
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
                                                <div className="w-10 h-10 bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold">
                                                    {(selectedPost.editor || 'SJ').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-300">
                                                        By {selectedPost.editor || 'Sarah Jenkins'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {selectedPost.publishedAt?.toDate().toLocaleDateString() || selectedPost.updatedAt?.toDate().toLocaleDateString()}
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
                                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                                    }`}
                                                >
                                                    {editMode ? 'Save' : 'Edit'}
                                                </button>
                                                {selectedPost.status === PostStatus.PUBLISHED && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Archive this post? It will be removed from the website on the next launch.')) {
                                                                onUpdateStatus(selectedPost.id, PostStatus.ARCHIVED);
                                                                setSelectedPostId(null);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-700 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors"
                                                    >
                                                        Archive
                                                    </button>
                                                )}
                                                {selectedPost.status === PostStatus.ARCHIVED && (
                                                    <button
                                                        onClick={() => onUpdateStatus(selectedPost.id, PostStatus.APPROVED)}
                                                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors"
                                                    >
                                                        Republish
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {selectedPost.status === PostStatus.PUBLISHED && (
                                            <div className="mt-3 text-[10px] text-slate-500 space-y-1">
                                                <p><span className="text-slate-400 font-medium">Edit:</span> Changes push post to launch queue and update the site on next launch.</p>
                                                <p><span className="text-slate-400 font-medium">Archive:</span> Removes post from website on next launch.</p>
                                            </div>
                                        )}
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
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider"
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
                                    'bg-slate-800 text-slate-400'}
                            `}>
                                {selectedPost.status === PostStatus.PUBLISHED ? 'LIVE' : 'ARCHIVED'}
                            </span>
                            <div className="flex items-center gap-1">
                                {selectedPost.status === PostStatus.PUBLISHED && (
                                    <button
                                        onClick={() => {
                                            onUpdateStatus(selectedPost.id, PostStatus.ARCHIVED);
                                            setSelectedPostId(null);
                                        }}
                                        className="p-1.5 text-slate-400 hover:bg-slate-700 transition-colors"
                                        title="Archive"
                                    >
                                        <Archive size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {selectedPost.status === PostStatus.ARCHIVED && (
                            <button
                                onClick={() => onUpdateStatus(selectedPost.id, PostStatus.APPROVED)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <RefreshCw size={14} />
                                Republish
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setInspectorTab('info')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${inspectorTab === 'info' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Layout size={14} /> Info
                    </button>
                    <button
                        onClick={() => setInspectorTab('history')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${inspectorTab === 'history' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Clock size={14} /> History
                    </button>
                </div>

                {/* Inspector Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {selectedPost && inspectorTab === 'info' && (
                        <div className="space-y-8">
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
                                        onChange={(e) => handleUpdate(selectedPost.id, { metaDescription: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-emerald-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Meta Keywords</label>
                                    <input
                                        value={Array.isArray(selectedPost.metaKeywords) ? selectedPost.metaKeywords.join(', ') : (selectedPost.metaKeywords || '')}
                                        onChange={(e) => handleUpdate(selectedPost.id, {
                                            metaKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                                        })}
                                        placeholder="keyword1, keyword2, keyword3"
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-600">Comma-separated keywords for SEO</p>
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
                                    history.push({ action: 'Approved', user: selectedPost.editor || 'Editor', time: selectedPost.approvedAt.toDate().toLocaleString(), active: false });
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

const HistoryItem = ({ action, user, time, active }: { action: string, user: string, time: string, active?: boolean }) => (
    <div className="relative">
        <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 border-2 ${active ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-950 border-slate-700'}`} />
        <p className={`text-sm font-medium ${active ? 'text-emerald-400' : 'text-slate-300'}`}>{action}</p>
        <p className="text-xs text-slate-500 mt-0.5">by {user}</p>
        <p className="text-[10px] text-slate-600 mt-1 font-mono">{time}</p>
    </div>
);
