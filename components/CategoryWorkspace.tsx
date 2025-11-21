
import React, { useState, useEffect, useRef } from 'react';
import { Category, Post, PostStatus, GenerationTask, TaskStatus, TaskType } from '../types';
import {
    Plus, ChevronDown, Sparkles, Settings, Search, Wand2,
    X, Check, Layers, Play, User, Trash2, ArrowUpDown, ArrowRight, Tag, Loader2, GripVertical, FileText
} from 'lucide-react';
import { suggestCategories, CategorySuggestion } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    categories: Category[];
    posts: Post[];
    tasks: GenerationTask[];
    onAddCategory: (name: string, parentId: string | null, description?: string) => void;
    onUpdateCategory: (id: string, updates: Partial<Category>) => void;
    onQueueTitles: (id: string, count: number, contextOverride?: string) => void;
    onQueueContent: (post: Post) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => void;
    onDeletePost: (id: string) => void;
}

// Single Base Color System - Darker shades
const BASE_COLOR = '#020617'; // Darker base color for all categories

const CategoryTree: React.FC<{
    categories: Category[],
    tasks: GenerationTask[],
    posts: Post[],
    selectedId: string | null,
    onSelect: (id: string) => void,
    onAddSub: (id: string) => void,
    onGenerate: (cat: Category) => void,
}> = ({ categories, tasks, posts, selectedId, onSelect, onAddSub, onGenerate }) => {
    const roots = categories.filter(c => c.parentId === null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(roots.map(r => r.id)));

    const toggleExpanded = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    const renderNode = (cat: Category, depth: number) => {
        const children = categories.filter(c => c.parentId === cat.id);
        const isSelected = selectedId === cat.id;
        const isExpanded = expandedIds.has(cat.id);
        const hasChildren = children.length > 0;

        // Count posts for this category
        const postCount = posts.filter(p => p.categoryId === cat.id).length;

        const isRoot = depth === 0;
        const indentClass = depth === 0 ? '' : depth === 1 ? 'pl-8' : 'pl-16';

        return (
            <div key={cat.id} className="border-b border-slate-800/50 last:border-none">
                <div
                    className={`
                        group flex items-center cursor-pointer transition-all relative
                        ${isRoot ? 'py-4 px-4' : `py-3 pr-4 ${indentClass}`}
                        ${isSelected ? 'bg-slate-800 border-l-2 border-cyan-500' : 'hover:bg-slate-900 border-l-2 border-transparent'}
                    `}
                    onClick={() => onSelect(cat.id)}
                >
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        {/* Accordion arrow */}
                        {hasChildren ? (
                            <button
                                onClick={(e) => toggleExpanded(cat.id, e)}
                                className="shrink-0 text-slate-500 hover:text-white transition-colors"
                            >
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                            </button>
                        ) : (
                            <div className="w-[14px]"></div>
                        )}

                        <h3 className={`truncate font-medium ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} ${isRoot ? 'text-sm uppercase tracking-wider' : 'text-sm'}`}>
                            {cat.name}
                        </h3>

                        {/* Progress Indicator */}
                        {(() => {
                            const activeTask = tasks.find(
                                t => t.categoryId === cat.id &&
                                    t.type === TaskType.GENERATE_TITLES &&
                                    (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
                            );
                            if (!activeTask) return null;

                            return (
                                <div className="flex items-center gap-2 ml-2">
                                    <Loader2 size={14} className="animate-spin text-cyan-500" />
                                    {activeTask.status === TaskStatus.PROCESSING && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-16 h-1 bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full bg-cyan-500 transition-all duration-300"
                                                    style={{ width: `${activeTask.progress || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Action Icons and Badge */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onGenerate(cat); }}
                                className="text-slate-500 hover:text-cyan-400"
                                title="Generate Titles"
                            >
                                <Sparkles size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddSub(cat.id); }}
                                className="text-slate-500 hover:text-white"
                                title="Add Subcategory"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Post Count Badge */}
                        {postCount > 0 && (
                            <div className={`px-1.5 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                                {postCount}
                            </div>
                        )}
                    </div>
                </div>
                {hasChildren && isExpanded && (
                    <div className="bg-slate-950/30">
                        {children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return <div className="border-t border-slate-800">{roots.map(root => renderNode(root, 0))}</div>;
};

const StatusBadge: React.FC<{ status: PostStatus }> = ({ status }) => {
    const styles = {
        [PostStatus.PENDING]: 'text-slate-500 bg-slate-900 border-slate-700',
        [PostStatus.GENERATING]: 'text-cyan-400 bg-cyan-950/30 border-cyan-900 animate-pulse',
        [PostStatus.NEEDS_REVIEW]: 'text-amber-400 bg-amber-950/30 border-amber-900',
        [PostStatus.PUBLISHED]: 'text-emerald-400 bg-emerald-950/30 border-emerald-900',
        [PostStatus.REJECTED]: 'text-red-400 bg-red-950/30 border-red-900',
    };
    return (
        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${styles[status]}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

const CategoryCreator: React.FC<{
    parentId: string | null,
    initialMode?: 'manual' | 'ai',
    onClose: () => void,
    onAddBatch: (cats: { name: string, description: string }[]) => void
}> = ({ parentId, onClose, onAddBatch }) => {
    const [categoryName, setCategoryName] = useState("");
    const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [showAIResults, setShowAIResults] = useState(false);

    const handleAdd = () => {
        if (categoryName.trim()) {
            onAddBatch([{ name: categoryName.trim(), description: '' }]);
        }
    };

    const handleSearchWithAI = async () => {
        if (!categoryName.trim()) return;

        setIsLoading(true);
        setShowAIResults(true);
        const results = await suggestCategories(categoryName, parentId ? "PARENT_CONTEXT_PROVIDED" : undefined);
        setSuggestions(results);
        setIsLoading(false);
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-2xl bg-[#020617] border border-slate-700 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <Wand2 className="mr-2 text-cyan-500" size={20} />
                        {parentId ? 'Add Subcategory' : 'Add Category'}
                    </h2>

                    {/* Category Name Field */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Category Name
                            </label>
                            <input
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="e.g. Social Media Marketing"
                                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 outline-none focus:border-cyan-500 text-sm"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleAdd}
                                disabled={!categoryName.trim()}
                                className="flex-1 bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-white transition-colors flex items-center justify-center"
                            >
                                <Plus size={16} className="mr-2" />
                                Add
                            </button>
                            <button
                                onClick={handleSearchWithAI}
                                disabled={!categoryName.trim() || isLoading}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:hover:bg-cyan-600 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                ) : (
                                    <Wand2 size={16} className="mr-2" />
                                )}
                                Search with AI
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Results Section */}
                {showAIResults && (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0f172a]">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {suggestions.map((s, i) => (
                                        <div
                                            key={i}
                                            onClick={() => toggleSelection(i)}
                                            className={`
                                                p-4 border cursor-pointer transition-all relative group
                                                ${selectedIndices.has(i) ? 'bg-cyan-950/20 border-cyan-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold ${selectedIndices.has(i) ? 'text-cyan-400' : 'text-slate-200'}`}>{s.name}</h3>
                                                {selectedIndices.has(i) && <Check size={16} className="text-cyan-500" />}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{s.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {suggestions.length === 0 && !isLoading && (
                                <div className="text-center text-slate-600 py-12 font-mono text-sm">
                                    NO_RESULTS_FOUND
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-[#020617] flex justify-between items-center">
                            <button onClick={onClose} className="text-slate-500 hover:text-white text-sm font-bold uppercase">Cancel</button>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSelectedIndices(new Set(suggestions.map((_, i) => i)))}
                                    className="text-xs text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-wider"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => onAddBatch(suggestions.filter((_, i) => selectedIndices.has(i)).map(s => ({ name: s.name, description: s.description })))}
                                    disabled={selectedIndices.size === 0}
                                    className="bg-white text-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                                >
                                    Add Selected ({selectedIndices.size})
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Footer when not showing AI results */}
                {!showAIResults && (
                    <div className="p-6 border-t border-slate-800 bg-[#020617] flex justify-end">
                        <button onClick={onClose} className="text-slate-500 hover:text-white text-sm font-bold uppercase">
                            Cancel
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const GenModal: React.FC<{ category: Category, onClose: () => void, onConfirm: (n: number, c: string) => void }> = ({ category, onClose, onConfirm }) => {
    const [count, setCount] = useState(5);
    const [context, setContext] = useState(category.description);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#020617] border border-slate-700 p-8 w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">Generate Titles</h2>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity</label>
                        <span className="text-2xl font-bold text-cyan-400 font-mono">{count}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="25"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                        style={{
                            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(count / 25) * 100}%, #1e293b ${(count / 25) * 100}%, #1e293b 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
                        <span>1</span>
                        <span>25</span>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Context</label>
                    <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Provide additional context to guide the AI..."
                        className="w-full bg-slate-900 border border-slate-700 text-slate-300 p-3 h-32 focus:border-cyan-500 outline-none resize-none text-sm leading-relaxed"
                    />
                </div>

                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="text-slate-500 hover:text-white font-bold uppercase text-sm">Cancel</button>
                    <button
                        onClick={() => onConfirm(count, context)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 font-bold uppercase tracking-widest transition-colors"
                    >
                        Start Generation
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const CategoryWorkspace: React.FC<Props> = ({
    categories, posts, tasks, onAddCategory, onUpdateCategory,
    onQueueTitles, onQueueContent, onUpdatePost, onDeletePost
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());

    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [creatorParentId, setCreatorParentId] = useState<string | null>(null);
    const [creatorMode, setCreatorMode] = useState<'manual' | 'ai'>('manual');
    const [isGenModalOpen, setIsGenModalOpen] = useState(false);
    const [genCategory, setGenCategory] = useState<Category | null>(null);

    // Animation state for "Moving to Posts"
    const [movingPostId, setMovingPostId] = useState<string | null>(null);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

    // Handler for generating content with animation
    const handleGenerateWithAnimation = (post: Post) => {
        setMovingPostId(post.id);
        // After animation completes (2000ms), actually queue the content
        setTimeout(() => {
            onQueueContent(post);
            setMovingPostId(null);
        }, 2000);
    };

    // Handler for deleting post with animation
    const handleDeleteWithAnimation = (postId: string) => {
        setDeletingPostId(postId);
        // After animation completes (2000ms), actually delete the post
        setTimeout(() => {
            onDeletePost(postId);
            setDeletingPostId(null);
        }, 2000);
    };

    // Layout Resizing State
    const [leftPaneWidth, setLeftPaneWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Handle Resizing Logic
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isResizing && containerRef.current) {
            const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
            if (newWidth > 200 && newWidth < 600) {
                setLeftPaneWidth(newWidth);
            }
        }
    };

    const handleMouseUp = () => {
        if (isResizing) setIsResizing(false);
    };

    // Add global mouse up listener to catch drags outside component
    useEffect(() => {
        const handleGlobalMouseUp = () => setIsResizing(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const filteredPosts = posts.filter(p =>
        (selectedCategoryId ? p.categoryId === selectedCategoryId : true)
    );

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    // Get breadcrumb trail for selected category
    const getCategoryBreadcrumb = (catId: string | null): string[] => {
        if (!catId) return [];
        const trail: string[] = [];
        let current = categories.find(c => c.id === catId);
        while (current) {
            trail.unshift(current.name);
            current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
        }
        return trail;
    };

    const breadcrumb = selectedCategoryId ? getCategoryBreadcrumb(selectedCategoryId) : [];

    return (
        <>
            <div
                ref={containerRef}
                className={`flex h-full bg-[#0f172a] overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >

                {/* COLUMN 1: CATEGORY TREE (Resizable) */}
                <div
                    style={{ width: leftPaneWidth }}
                    className="border-r border-slate-800 bg-[#020617] flex flex-col h-full shrink-0 transition-none"
                >
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Categories</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Structure</p>
                        </div>
                        <button
                            onClick={() => { setCreatorParentId(null); setCreatorMode('manual'); setIsCreatorOpen(true); }}
                            className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors"
                            title="Add Category"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <CategoryTree
                            categories={categories}
                            tasks={tasks}
                            posts={posts}
                            selectedId={selectedCategoryId}
                            onSelect={setSelectedCategoryId}
                            onAddSub={(parentId) => { setCreatorParentId(parentId); setCreatorMode('manual'); setIsCreatorOpen(true); }}
                            onGenerate={(cat) => { setGenCategory(cat); setIsGenModalOpen(true); }}
                        />
                    </div>
                </div>

                {/* RESIZER HANDLE */}
                <div
                    onMouseDown={() => setIsResizing(true)}
                    className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors z-20 flex items-center justify-center group"
                >
                    <div className="h-8 w-0.5 bg-slate-600 group-hover:bg-white"></div>
                </div>

                {/* COLUMN 2: DATA TABLE */}
                <div className="flex-1 flex flex-col h-full bg-[#0f172a] relative min-w-0">
                    <div className="p-8 border-b border-slate-800 bg-[#0f172a] z-20 shadow-2xl shadow-black/20">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 mr-8">
                                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Titles</h1>
                                {breadcrumb.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        {breadcrumb.map((name, index) => (
                                            <React.Fragment key={index}>
                                                <span className={`${index === breadcrumb.length - 1 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                                                    {name}
                                                </span>
                                                {index < breadcrumb.length - 1 && (
                                                    <span className="text-slate-700">→</span>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                {/* CATEGORY PROMPT EDITOR */}
                                {selectedCategoryId && (
                                    <div className="mt-4 relative group">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Category Context / Prompt</label>
                                        <textarea
                                            value={selectedCategory?.description || ''}
                                            onChange={(e) => onUpdateCategory(selectedCategoryId, { description: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500 text-slate-300 text-sm leading-relaxed p-4 outline-none resize-none h-24 transition-all"
                                            placeholder="Describe what this category is about to guide the AI..."
                                        />
                                        <div className="absolute top-8 right-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <Sparkles size={14} className="text-cyan-500" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between bg-slate-900 p-2 border border-slate-800">
                            {selectedPostIds.size > 0 ? (
                                <div className="flex items-center gap-4 px-2">
                                    <span className="text-sm font-mono text-cyan-400">{selectedPostIds.size} selected</span>
                                    <div className="h-4 w-px bg-slate-700"></div>
                                    <button onClick={() => {
                                        const selectedPosts = Array.from(selectedPostIds)
                                            .map(id => posts.find(p => p.id === id))
                                            .filter(p => p?.status === PostStatus.PENDING) as Post[];

                                        selectedPosts.forEach((post, index) => {
                                            // Stagger animations slightly
                                            setTimeout(() => {
                                                handleGenerateWithAnimation(post);
                                            }, index * 150);
                                        });
                                        setSelectedPostIds(new Set());
                                    }} className="text-xs font-bold text-white hover:text-cyan-400 flex items-center uppercase"><Play size={14} className="mr-2" /> Run Generation</button>
                                    <button onClick={() => {
                                        const selectedIds = Array.from(selectedPostIds);
                                        selectedIds.forEach((id, index) => {
                                            // Stagger delete animations
                                            setTimeout(() => {
                                                handleDeleteWithAnimation(id);
                                            }, index * 150);
                                        });
                                        setSelectedPostIds(new Set());
                                    }} className="text-xs font-bold text-white hover:text-red-400 flex items-center uppercase"><Trash2 size={14} className="mr-2" /> Delete</button>
                                </div>
                            ) : (
                                <div className="flex items-center w-full">
                                    <Search size={16} className="text-slate-500 ml-2" />
                                    <input
                                        placeholder="SEARCH_TITLES..."
                                        className="w-full pl-3 bg-transparent border-none text-sm font-mono text-slate-300 placeholder-slate-600 focus:ring-0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Table Container with Scrollbar */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a] pb-20">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="bg-[#020617] sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 font-mono shadow-sm">
                                <tr>
                                    <th className="p-4 w-12 text-center">
                                        <input type="checkbox"
                                            className="appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
                                            checked={filteredPosts.length > 0 && selectedPostIds.size === filteredPosts.length}
                                            onChange={() => {
                                                if (selectedPostIds.size === filteredPosts.length) setSelectedPostIds(new Set());
                                                else setSelectedPostIds(new Set(filteredPosts.map(p => p.id)));
                                            }}
                                        />
                                    </th>
                                    <th className="p-4">IDEA PROMPT</th>
                                    <th className="p-4 w-32 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-sm text-slate-300 font-mono">
                                {filteredPosts.map(post => {
                                    const isMoving = movingPostId === post.id;
                                    const isDeleting = deletingPostId === post.id;
                                    const isAnimating = isMoving || isDeleting;

                                    return (
                                        <tr
                                            key={post.id}
                                            className={`hover:bg-slate-800/50 transition-colors group relative overflow-hidden ${isMoving ? 'opacity-30 -translate-x-full' : ''} ${isDeleting ? 'opacity-30 translate-x-full' : ''}`}
                                            style={{ transition: 'all 0.5s ease-in-out' }}
                                        >
                                            {isMoving && (
                                                <td colSpan={3} className="absolute inset-0 flex items-center justify-center bg-cyan-950/30 backdrop-blur-sm z-50">
                                                    <div className="flex items-center gap-3 text-cyan-400 font-bold text-lg">
                                                        <ArrowRight className="animate-pulse" size={24} />
                                                        <span>Now in Posts</span>
                                                        <FileText size={20} />
                                                    </div>
                                                </td>
                                            )}
                                            {isDeleting && (
                                                <td colSpan={3} className="absolute inset-0 flex items-center justify-center bg-red-950/50 backdrop-blur-sm z-50">
                                                    <div className="flex items-center gap-3 text-red-400 font-bold text-lg">
                                                        <Trash2 className="animate-pulse" size={24} />
                                                        <span>Deleted</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="p-4 text-center align-top pt-6">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPostIds.has(post.id)}
                                                    onChange={() => {
                                                        const newSet = new Set(selectedPostIds);
                                                        if (newSet.has(post.id)) newSet.delete(post.id);
                                                        else newSet.add(post.id);
                                                        setSelectedPostIds(newSet);
                                                    }}
                                                    className="appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-3">
                                                    {/* Title */}
                                                    <input
                                                        value={post.title}
                                                        onChange={(e) => onUpdatePost(post.id, { title: e.target.value })}
                                                        className="w-full bg-transparent font-bold text-white text-lg focus:text-cyan-400 px-0 outline-none border-none placeholder-slate-600"
                                                        placeholder="Enter Title..."
                                                    />
                                                    {/* Teaser */}
                                                    <div className="relative">
                                                        <textarea
                                                            value={post.teaser || ''}
                                                            onChange={(e) => onUpdatePost(post.id, { teaser: e.target.value })}
                                                            placeholder="Describe the post content, angle, or generation prompt..."
                                                            className="w-full bg-[#020617] text-slate-400 text-sm leading-relaxed p-4 border border-slate-800 focus:border-cyan-500/50 outline-none resize-none h-32 custom-scrollbar"
                                                        />
                                                    </div>
                                                    {/* Keywords and Editor */}
                                                    <div className="flex items-center gap-4 text-xs">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Tag size={14} className="text-slate-600 shrink-0" />
                                                            <input
                                                                value={post.tags?.join(', ') || ''}
                                                                onChange={(e) => onUpdatePost(post.id, { tags: e.target.value.split(',').map(s => s.trim()) })}
                                                                className="w-full bg-transparent text-slate-400 focus:text-cyan-400 outline-none border-b border-slate-800 focus:border-cyan-500 pb-1 placeholder-slate-700"
                                                                placeholder="comma, separated, tags"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <User size={14} />
                                                            <span className="uppercase">{post.editor || 'Unassigned'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top pt-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {post.status === PostStatus.PENDING ? (
                                                        <button
                                                            onClick={() => handleGenerateWithAnimation(post)}
                                                            disabled={isAnimating}
                                                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-cyan-800 text-cyan-400 hover:bg-cyan-950 hover:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Generate
                                                        </button>
                                                    ) : (
                                                        <StatusBadge status={post.status} />
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteWithAnimation(post.id)}
                                                        className="text-slate-600 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Delete"
                                                        disabled={isAnimating}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPosts.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-slate-600 font-mono">
                                            NO_TITLES_FOUND
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {isCreatorOpen && (
                    <CategoryCreator
                        parentId={creatorParentId}
                        initialMode={creatorMode}
                        onClose={() => setIsCreatorOpen(false)}
                        onAddBatch={(cats) => {
                            cats.forEach(c => onAddCategory(c.name, creatorParentId, c.description));
                            setIsCreatorOpen(false);
                        }}
                    />
                )}

                {isGenModalOpen && genCategory && (
                    <GenModal
                        category={genCategory}
                        onClose={() => setIsGenModalOpen(false)}
                        onConfirm={(count, context) => {
                            onQueueTitles(genCategory.id, count, context);
                            setIsGenModalOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
