
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePaneWidth } from '../hooks/usePaneWidth';
import { Category, Post, PostStatus, GenerationTask, TaskStatus, TaskType, CategoryResearch, TIER_FEATURES, SubscriptionTier, Organization, KeywordData, Project } from '../types';
import {
    Plus, ChevronRight, Sparkles, Search, Wand2,
    X, Check, Play, Trash2, FileText, AlertTriangle,
    GripVertical, ArrowRight, Tag, User, Edit2, RefreshCw, Info, Target, TrendingUp,
    FolderOpen, Eye, EyeOff, Save, ChevronDown, Zap, CheckCircle, Maximize2, Loader2,
    Image as ImageIcon
} from 'lucide-react';
import { suggestCategories, AICategorySuggestion } from '../services/geminiService';
import { researchService, getExistingResearch, isResearchStale } from '../services/researchService';
import { fetchCategoryKeywords, getCategoryResearch, areKeywordsStale } from '../services/categoryKeywordService';
import { motion, AnimatePresence } from 'framer-motion';
import { TiptapEditor, TiptapViewer } from './TiptapEditor';
import { ImageInspectorControl } from './ImageInspectorControl';
import { Timestamp, deleteField } from 'firebase/firestore';
import { marked } from 'marked';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Consistent loading bar indicator
const LoadingBar: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`h-1 bg-slate-700 rounded-full overflow-hidden ${className}`}>
        <motion.div
            className="h-full w-1/3 bg-cyan-500 rounded-full"
            animate={{ x: ['0%', '200%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
    </div>
);

// Client-side preamble stripping for display (handles existing research with preambles)
const stripPreamble = (content: string): string => {
    let result = content.trim();

    // Find first structural element (heading, bold section, numbered list)
    const structuralPatterns = [
        /^#{1,3}\s+/m,           // Markdown headings (# ## ###)
        /^\*\*\d+\./m,           // Bold numbered items (**1.)
        /^\*\*[A-Z][^*]+\*\*/m,  // Bold section headers (**Key Insights**)
        /^\d+\.\s+\*\*/m,        // Numbered items with bold (1. **Title**)
    ];

    let firstStructureIndex = -1;
    for (const pattern of structuralPatterns) {
        const match = result.search(pattern);
        if (match !== -1 && (firstStructureIndex === -1 || match < firstStructureIndex)) {
            firstStructureIndex = match;
        }
    }

    // If we found structure and there's preamble before it, strip it
    if (firstStructureIndex > 50) {
        result = result.substring(firstStructureIndex);
    }

    return result.trim();
};

interface Props {
    categories: Category[];
    posts: Post[];
    tasks: GenerationTask[];
    isAddingCategory?: boolean;
    onAddCategory: (name: string, parentId: string | null, description?: string, runResearchFirst?: boolean) => void;
    onUpdateCategory: (id: string, updates: Partial<Category>) => void;
    onDeleteCategory: (id: string) => void;
    onMoveCategory: (id: string, newParentId: string | null, reorderedSiblings: { id: string; order: number }[]) => void;
    onQueueTitles: (id: string, count: number, contextOverride?: string) => void;
    onQueueContent: (post: Post) => void;
    onQueueCategoryPageRegenerate?: (post: Post) => void;
    onQueueGoogleDeepResearch?: (categoryId: string) => void;
    onCreateCategoryPage?: (categoryId: string, categoryName: string, description?: string) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => void;
    onDeletePost: (id: string) => void;
    organizationId?: string;
    projectId?: string;
    organization?: Organization;
    project?: Project;
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================
const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    defaultExpanded?: boolean;
    accentColor?: 'cyan' | 'purple' | 'emerald';
    children: React.ReactNode;
}> = ({ title, icon, badge, defaultExpanded = true, accentColor = 'cyan', children }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const accentColors = {
        cyan: 'text-cyan-400 border-cyan-500/30',
        purple: 'text-purple-400 border-purple-500/30',
        emerald: 'text-emerald-400 border-emerald-500/30'
    };

    return (
        <div className="border-b border-slate-800">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full px-6 py-4 flex items-center justify-between hover:bg-slate-900/50 transition-colors ${accentColors[accentColor]}`}
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</span>
                    {badge}
                </div>
                <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================================================
// DELETE CONFIRMATION MODAL
// ============================================================================
const DeleteConfirmationModal: React.FC<{
    categories: Category[];
    selectedIds: Set<string>;
    allCategories: Category[];
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ categories, selectedIds, allCategories, onConfirm, onCancel }) => {
    // Count total categories that will be deleted (including children)
    const getDescendantCount = (catId: string): number => {
        const children = allCategories.filter(c => c.parentId === catId);
        return children.length + children.reduce((sum, child) => sum + getDescendantCount(child.id), 0);
    };

    const selectedCategories = categories.filter(c => selectedIds.has(c.id));
    const totalDescendants = selectedCategories.reduce((sum, cat) => sum + getDescendantCount(cat.id), 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-slate-700 w-full max-w-md shadow-2xl"
            >
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Confirm Deletion</h2>
                            <p className="text-sm text-slate-500">This action cannot be undone</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-red-950/20 border border-red-900/50 p-4 mb-4">
                        <p className="text-sm text-red-400 mb-2">
                            You are about to delete <span className="font-bold">{selectedIds.size} categor{selectedIds.size === 1 ? 'y' : 'ies'}</span>
                            {totalDescendants > 0 && (
                                <span> and <span className="font-bold">{totalDescendants} subcategor{totalDescendants === 1 ? 'y' : 'ies'}</span></span>
                            )}.
                        </p>
                        <p className="text-xs text-red-400/70">
                            Deleting a parent category will permanently remove all subcategories and associated content.
                        </p>
                    </div>

                    <div className="mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories to delete:</p>
                        <div className="max-h-32 overflow-y-auto custom-scrollbar">
                            {selectedCategories.map(cat => (
                                <div key={cat.id} className="text-sm text-slate-300 py-1">
                                    • {cat.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-3 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider py-3 transition-colors"
                    >
                        Confirm Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================================
// BULK GENERATE CONFIRMATION MODAL
// ============================================================================
const BulkGenerateModal: React.FC<{
    categories: Category[];
    selectedIds: Set<string>;
    onConfirm: (count: number) => void;
    onCancel: () => void;
}> = ({ categories, selectedIds, onConfirm, onCancel }) => {
    const [titleCount, setTitleCount] = useState(5);
    const selectedCategories = categories.filter(c => selectedIds.has(c.id));

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-slate-700 w-full max-w-lg shadow-2xl"
            >
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-cyan-500/10 flex items-center justify-center">
                            <Sparkles className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Generate Article Ideas</h2>
                            <p className="text-sm text-slate-500">{selectedIds.size} content area{selectedIds.size === 1 ? '' : 's'} selected</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-amber-950/20 border border-amber-900/50 p-4 mb-6">
                        <p className="text-sm text-amber-400">
                            Each category will use its own context/prompt for generation.
                            If needed, edit individual category prompts before generating.
                        </p>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Titles per category
                            </label>
                            <span className="text-2xl font-bold text-cyan-400 font-mono">{titleCount}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="25"
                            value={titleCount}
                            onChange={(e) => setTitleCount(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                            style={{
                                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(titleCount / 25) * 100}%, #1e293b ${(titleCount / 25) * 100}%, #1e293b 100%)`
                            }}
                        />
                        <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
                            <span>1</span>
                            <span>25</span>
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories:</p>
                        <div className="max-h-32 overflow-y-auto custom-scrollbar bg-slate-950 border border-slate-800 p-3">
                            {selectedCategories.map(cat => (
                                <div key={cat.id} className="text-sm text-slate-300 py-1 flex items-center gap-2">
                                    <Sparkles size={12} className="text-cyan-500" />
                                    {cat.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">
                        Total titles to generate: <span className="text-cyan-400 font-bold">{titleCount * selectedIds.size}</span>
                    </p>
                </div>

                <div className="p-6 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-3 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(titleCount)}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider py-3 transition-colors flex items-center justify-center gap-2"
                    >
                        <Play size={14} />
                        Proceed to Generate
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================================
// SORTABLE CATEGORY ROW
// ============================================================================
const SortableCategoryRow: React.FC<{
    category: Category;
    depth: number;
    isSelected: boolean;
    isChecked: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    articleCount: number;
    isGenerating: boolean;
    progress: number;
    onSelect: () => void;
    onCheck: (checked: boolean) => void;
    onToggleExpand: () => void;
    onGenerate: () => void;
    onAddSub: () => void;
}> = ({
    category,
    depth,
    isSelected,
    isChecked,
    isExpanded,
    hasChildren,
    articleCount,
    isGenerating,
    progress,
    onSelect,
    onCheck,
    onToggleExpand,
    onGenerate,
    onAddSub,
}) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: category.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const indentPadding = depth * 12;

        return (
            <motion.div
                ref={setNodeRef}
                style={style}
                layout={!isDragging}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`
                border-b border-slate-800/50 last:border-none transition-colors overflow-hidden
                ${isSelected ? 'bg-slate-800' : 'hover:bg-slate-900/50'}
                ${isDragging ? 'z-50' : ''}
            `}
            >
                <div
                    className={`
                    flex items-center py-3 px-4 cursor-pointer relative
                    ${isSelected ? 'border-l-2 border-cyan-500' : 'border-l-2 border-transparent'}
                `}
                    style={{ paddingLeft: `${16 + indentPadding}px` }}
                >
                    {/* Indent Background */}
                    {depth > 0 && (
                        <div
                            className="absolute top-0 bottom-0 left-0"
                            style={{ width: `${indentPadding}px`, backgroundColor: '#0d364c' }}
                        />
                    )}

                    {/* Expand/Collapse Arrow */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className={`shrink-0 mr-1 transition-colors ${hasChildren ? 'text-slate-500 hover:text-white' : 'text-transparent'}`}
                        disabled={!hasChildren}
                    >
                        <ChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                    </button>

                    {/* Drag Handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 mr-2"
                    >
                        <GripVertical size={14} />
                    </div>

                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                            e.stopPropagation();
                            onCheck(e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer mr-3 shrink-0"
                    />

                    {/* Category Name */}
                    <div className="flex-1 min-w-0 flex items-center gap-2" onClick={onSelect}>
                        <h3 className={`truncate font-medium text-sm ${isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                            {category.name}
                        </h3>
                        {/* Research complete indicator */}
                        {category.googleDeepResearch?.status === 'complete' && (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400" title="Deep research complete">
                                <Target size={10} />
                            </span>
                        )}
                    </div>

                    {/* Progress Indicator - Circular loader */}
                    {isGenerating && (
                        <div className="mr-3">
                            <Loader2 size={16} className="animate-spin text-cyan-400" />
                        </div>
                    )}
                    {category.googleDeepResearch?.status === 'running' && !isGenerating && (
                        <div className="mr-3">
                            <Loader2 size={16} className="animate-spin text-emerald-400" />
                        </div>
                    )}

                    {/* Action Buttons - Always Visible */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddSub();
                            }}
                            className="w-7 h-7 flex items-center justify-center border border-slate-700 text-slate-500 hover:text-white hover:bg-slate-800 hover:border-slate-500 transition-colors"
                            title="Add sub-area"
                        >
                            <Plus size={14} />
                        </button>
                        {/* Article Count - Clickable to open category */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect();
                                // Also expand if has children
                                if (hasChildren && !isExpanded) {
                                    onToggleExpand();
                                }
                            }}
                            className={`w-7 h-7 flex items-center justify-center border text-[10px] font-bold transition-colors ${
                                articleCount > 0
                                    ? (isSelected
                                        ? 'bg-cyan-500 border-cyan-500 text-black'
                                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-cyan-500 hover:text-cyan-400')
                                    : 'border-slate-800 bg-slate-900 text-slate-600'
                            }`}
                            title={`${articleCount} articles - Click to view`}
                        >
                            {articleCount}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

// ============================================================================
// CATEGORY TREE WITH DRAG & DROP
// ============================================================================
const CategoryTree: React.FC<{
    categories: Category[];
    tasks: GenerationTask[];
    posts: Post[];
    selectedId: string | null;
    checkedIds: Set<string>;
    onSelect: (id: string) => void;
    onCheck: (id: string, checked: boolean) => void;
    onCheckAll: (checked: boolean) => void;
    onAddSub: (id: string) => void;
    onGenerate: (cat: Category) => void;
    onReorder: (activeId: string, overId: string, newParentId: string | null, reorderedSiblings: { id: string; order: number }[]) => void;
}> = ({ categories, tasks, posts, selectedId, checkedIds, onSelect, onCheck, onCheckAll, onAddSub, onGenerate, onReorder }) => {
    const roots = categories.filter(c => c.parentId === null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(roots.map(r => r.id)));
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Calculate total article count including all descendants
    // Only count posts still in category workflow (not approved/published)
    const getArticleCountWithChildren = useMemo(() => {
        const countMap = new Map<string, number>();
        // Only count stubs (PENDING) - once generation starts, posts disappear from this view
        const categoryStatuses = [PostStatus.PENDING];

        const calculateCount = (catId: string): number => {
            if (countMap.has(catId)) return countMap.get(catId)!;

            // Only count posts that are still in category workflow
            const directCount = posts.filter(p =>
                p.categoryId === catId && categoryStatuses.includes(p.status)
            ).length;
            countMap.set(catId, directCount);
            return directCount;
        };

        categories.forEach(cat => calculateCount(cat.id));
        return countMap;
    }, [categories, posts]);

    const toggleExpanded = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const activeCategory = categories.find(c => c.id === active.id);
            const overCategory = categories.find(c => c.id === over.id);

            if (!activeCategory || !overCategory) return;

            const targetParentId = overCategory.parentId;

            // Get all siblings at the target level including both items, sorted by order
            const allSiblings = categories
                .filter(c => c.parentId === targetParentId)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            // Find current positions
            const activeIndex = allSiblings.findIndex(c => c.id === active.id);
            const overIndex = allSiblings.findIndex(c => c.id === over.id);

            if (activeIndex === -1 || overIndex === -1) return;

            // Reorder the array
            const newSiblings = [...allSiblings];
            const [removed] = newSiblings.splice(activeIndex, 1);
            newSiblings.splice(overIndex, 0, removed);

            // Create reordered siblings with new order values
            const reorderedSiblings = newSiblings.map((cat, index) => ({
                id: cat.id,
                order: index
            }));

            onReorder(active.id as string, over.id as string, targetParentId, reorderedSiblings);
        }
    };

    // Flatten the tree for sortable context
    const flattenedCategories: { category: Category; depth: number }[] = [];

    const flattenTree = (cats: Category[], depth: number) => {
        cats.forEach(cat => {
            flattenedCategories.push({ category: cat, depth });
            if (expandedIds.has(cat.id)) {
                const children = categories
                    .filter(c => c.parentId === cat.id)
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                flattenTree(children, depth + 1);
            }
        });
    };

    flattenTree(roots, 0);

    const allChecked = categories.length > 0 && checkedIds.size === categories.length;
    const someChecked = checkedIds.size > 0 && checkedIds.size < categories.length;

    const activeCategory = activeId ? categories.find(c => c.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="border-t border-slate-800">
                {/* Select All Header */}
                <div className="flex items-center py-2 px-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
                    <div className="w-[14px] mr-1" /> {/* Spacer for chevron */}
                    <div className="w-[14px] mr-2" /> {/* Spacer for drag handle */}
                    <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                        }}
                        onChange={(e) => onCheckAll(e.target.checked)}
                        className="appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer mr-3"
                    />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Select All
                    </span>
                </div>

                <SortableContext
                    items={flattenedCategories.map(f => f.category.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <AnimatePresence initial={false}>
                    {flattenedCategories.map(({ category: cat, depth }) => {
                        const children = categories.filter(c => c.parentId === cat.id);
                        const isExpanded = expandedIds.has(cat.id);
                        const hasChildren = children.length > 0;

                        const activeTask = tasks.find(
                            t => t.categoryId === cat.id &&
                                t.type === TaskType.GENERATE_TITLES &&
                                (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
                        );

                        return (
                            <SortableCategoryRow
                                key={cat.id}
                                category={cat}
                                depth={depth}
                                isSelected={selectedId === cat.id}
                                isChecked={checkedIds.has(cat.id)}
                                isExpanded={isExpanded}
                                hasChildren={hasChildren}
                                articleCount={getArticleCountWithChildren.get(cat.id) || 0}
                                isGenerating={!!activeTask}
                                progress={activeTask?.progress || 0}
                                onSelect={() => onSelect(cat.id)}
                                onCheck={(checked) => onCheck(cat.id, checked)}
                                onToggleExpand={() => toggleExpanded(cat.id)}
                                onGenerate={() => onGenerate(cat)}
                                onAddSub={() => onAddSub(cat.id)}
                            />
                        );
                    })}
                    </AnimatePresence>
                </SortableContext>
            </div>

            <DragOverlay>
                {activeCategory && (
                    <div className="bg-slate-800 border border-cyan-500 px-4 py-3 shadow-xl">
                        <span className="text-sm font-medium text-white">{activeCategory.name}</span>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};

// ============================================================================
// CATEGORY CREATOR MODAL
// ============================================================================
const CategoryCreator: React.FC<{
    parentId: string | null,
    parentName?: string,
    parentDescription?: string,
    onClose: () => void,
    onAddBatch: (cats: { name: string, description: string }[], runResearchFirst?: boolean) => void,
    organizationId?: string,
    projectId?: string,
    isAddingCategory?: boolean,
    canUseDeepResearch?: boolean
}> = ({ parentId, parentName, parentDescription, onClose, onAddBatch, organizationId, projectId, isAddingCategory, canUseDeepResearch = false }) => {
    const [mode, setMode] = useState<'AI_AUTO' | 'MANUAL'>('AI_AUTO');
    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [suggestions, setSuggestions] = useState<AICategorySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [runResearchFirst, setRunResearchFirst] = useState(false);

    // Auto-trigger AI on mount if in AI_AUTO mode
    useEffect(() => {
        if (mode === 'AI_AUTO') {
            handleAutoAnalyze();
        }
    }, []);

    const handleAutoAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Pass empty query string to trigger context-based suggestions
            // Include parent description for better hierarchy awareness
            const results = await suggestCategories("", parentName, organizationId, projectId, parentDescription);
            setSuggestions(results);
            // Auto-select all by default
            setSelectedIndices(new Set(results.map((_, i) => i)));
        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            setError(err.message || "Failed to analyze context. Switching to manual mode.");
            // Don't auto-switch to manual, let user see error and decide
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualAdd = () => {
        if (categoryName.trim()) {
            onAddBatch([{ name: categoryName.trim(), description: categoryDescription.trim() }], runResearchFirst);
            setCategoryName('');
            setCategoryDescription('');
        }
    };

    const handleAddSelected = () => {
        const selected = suggestions.filter((_, i) => selectedIndices.has(i)).map(s => ({
            name: s.name,
            description: s.description
        }));
        console.log('[CategoryCreator] Adding categories with runResearchFirst:', runResearchFirst);
        onAddBatch(selected, runResearchFirst);
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const startEditing = (index: number, suggestion: AICategorySuggestion) => {
        setEditingIndex(index);
        setEditName(suggestion.name);
        setEditDesc(suggestion.description);
    };

    const saveEdit = () => {
        if (editingIndex !== null) {
            const newSuggestions = [...suggestions];
            newSuggestions[editingIndex] = {
                ...newSuggestions[editingIndex],
                name: editName,
                description: editDesc
            };
            setSuggestions(newSuggestions);
            setEditingIndex(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-4xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {mode === 'AI_AUTO' ? (
                                <>
                                    <Sparkles className="text-cyan-400" size={20} />
                                    AI Category Suggestions
                                </>
                            ) : (
                                <>
                                    <Plus className="text-white" size={20} />
                                    Add Category Manually
                                </>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {mode === 'AI_AUTO'
                                ? `Analyzing project context to suggest relevant ${parentId ? 'subcategories' : 'categories'}`
                                : 'Enter category details below'
                            }
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 p-6">

                    {mode === 'AI_AUTO' && (
                        <>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Sparkles className="text-cyan-400 mb-4" size={32} />
                                    <LoadingBar className="w-32 mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">Analyzing Brand & Industry...</h3>
                                    <p className="text-sm text-slate-500 max-w-md text-center">
                                        Our AI is reviewing your project settings to suggest the most relevant content categories for your audience.
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <h3 className="text-white font-medium mb-2">Analysis Failed</h3>
                                    <p className="text-slate-500 text-sm mb-6 max-w-md">{error}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleAutoAnalyze}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Try Again
                                        </button>
                                        <button
                                            onClick={() => setMode('MANUAL')}
                                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Switch to Manual Input
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {suggestions.map((s, i) => (
                                        <div
                                            key={i}
                                            onClick={() => editingIndex === null && toggleSelection(i)}
                                            className={`
                                                relative group p-4 border transition-all duration-200 cursor-pointer flex flex-col h-full
                                                ${selectedIndices.has(i)
                                                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                                                }
                                            `}
                                        >
                                            {/* Header: Name + Checkbox + Edit */}
                                            <div className="flex justify-between items-start gap-3 mb-2">
                                                {editingIndex === i ? (
                                                    <input
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="flex-1 bg-slate-950 border border-slate-600 px-2 py-1 text-sm text-white focus:border-cyan-500 outline-none"
                                                        placeholder="Category Name"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3 className="font-bold text-white text-sm flex-1 pt-0.5">{s.name}</h3>
                                                )}

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Edit Button - Always Visible */}
                                                    {editingIndex !== i && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEditing(i, s);
                                                            }}
                                                            className="text-slate-500 hover:text-cyan-400 p-1"
                                                            title="Edit Suggestion"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}

                                                    {/* Checkbox */}
                                                    <div className={`
                                                        w-5 h-5 border flex items-center justify-center transition-colors
                                                        ${selectedIndices.has(i)
                                                            ? 'bg-cyan-500 border-cyan-500 text-black'
                                                            : 'border-slate-600 bg-slate-900/50 text-transparent group-hover:border-slate-500'
                                                        }
                                                    `}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {editingIndex === i ? (
                                                <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                                    <textarea
                                                        value={editDesc}
                                                        onChange={e => setEditDesc(e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-600 px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 outline-none resize-none"
                                                        rows={3}
                                                        placeholder="Description"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingIndex(null)}
                                                            className="text-xs text-slate-400 hover:text-white px-2 py-1"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={saveEdit}
                                                            className="text-xs bg-cyan-600 text-white px-3 py-1 hover:bg-cyan-500"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-300 leading-relaxed">{s.description || 'No description available.'}</p>
                                            )}
                                        </div>
                                    ))}

                                    {/* Load More Card */}
                                    <button
                                        onClick={handleAutoAnalyze}
                                        className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 bg-slate-900/30 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all gap-2 min-h-[140px]"
                                    >
                                        <RefreshCw size={24} />
                                        <span className="text-sm font-medium">Generate More</span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {mode === 'MANUAL' && (
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Category Name
                                </label>
                                <input
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="e.g. Social Media Marketing"
                                    className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={categoryDescription}
                                    onChange={(e) => setCategoryDescription(e.target.value)}
                                    placeholder="Provide context about this category to help generate better content..."
                                    className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-lg outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                                    rows={4}
                                />
                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                    <Info size={12} />
                                    This helps AI generate more relevant titles and content for this category
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex flex-col gap-4">
                    {/* Deep Research Option */}
                    {canUseDeepResearch && (
                        <label className="flex items-center gap-3 cursor-pointer group self-center">
                            <div
                                className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                                    runResearchFirst
                                        ? 'bg-purple-500 border-purple-500 text-white'
                                        : 'border-slate-600 bg-slate-900/50'
                                }`}
                                onClick={() => setRunResearchFirst(!runResearchFirst)}
                            >
                                {runResearchFirst && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                Run Deep Research first <span className="text-purple-400">(20 credits/category)</span>
                            </span>
                        </label>
                    )}

                    <div className="flex justify-between items-center">
                    {mode === 'AI_AUTO' ? (
                        <>
                            <button
                                onClick={() => setMode('MANUAL')}
                                className="text-sm text-slate-500 hover:text-white underline decoration-slate-700 hover:decoration-white underline-offset-4 transition-all"
                            >
                                Switch to Manual Input
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddSelected}
                                    disabled={selectedIndices.size === 0 || isAddingCategory}
                                    className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                                >
                                    {isAddingCategory ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                    {isAddingCategory ? 'Adding...' : `Add Selected (${selectedIndices.size})`}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setMode('AI_AUTO')}
                                className="text-sm text-cyan-500 hover:text-cyan-400 flex items-center gap-2 transition-colors"
                            >
                                <Sparkles size={14} />
                                Use AI Suggestions
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleManualAdd}
                                    disabled={!categoryName.trim() || isAddingCategory}
                                    className="px-8 py-2.5 bg-white hover:bg-slate-200 text-black font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                                >
                                    {isAddingCategory ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                    {isAddingCategory ? 'Adding...' : 'Add Category'}
                                </button>
                            </div>
                        </>
                    )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================================
// SINGLE CATEGORY GENERATE MODAL
// ============================================================================
const GenModal: React.FC<{
    category: Category,
    onClose: () => void,
    onConfirm: (n: number, c: string) => void,
    organizationId?: string,
    projectId?: string
}> = ({ category, onClose, onConfirm, organizationId, projectId }) => {
    const [count, setCount] = useState(5);
    const [context, setContext] = useState(category.description || '');
    const [research, setResearch] = useState<CategoryResearch | null>(null);
    const [loadingResearch, setLoadingResearch] = useState(false);
    const [generatingResearch, setGeneratingResearch] = useState(false);
    const [showResearchPanel, setShowResearchPanel] = useState(false);

    // Load existing research on mount
    useEffect(() => {
        const loadResearch = async () => {
            if (!category.id) return;
            setLoadingResearch(true);
            try {
                const existingResearch = await getExistingResearch(category.id);
                setResearch(existingResearch);
            } catch (err) {
                console.warn('Could not load research:', err);
            } finally {
                setLoadingResearch(false);
            }
        };
        loadResearch();
    }, [category.id]);

    const handleGenerateResearch = async () => {
        if (!organizationId || !projectId) return;
        setGeneratingResearch(true);
        try {
            const newResearch = await researchService.getOrCreateResearch(
                category.id,
                organizationId,
                projectId,
                true // Force refresh
            );
            setResearch(newResearch);
        } catch (err) {
            console.error('Research generation failed:', err);
            alert('Failed to generate research. Please try again.');
        } finally {
            setGeneratingResearch(false);
        }
    };

    const researchStatus = research
        ? isResearchStale(research)
            ? 'stale'
            : research.researchType === 'deep' ? 'deep' : 'shallow'
        : 'none';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-700 p-8 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-2">Generate Article Ideas</h2>
                <p className="text-sm text-slate-500 mb-6">Content Area: {category.name}</p>

                {/* Research Status Card */}
                <div className="mb-6 p-4 bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Target size={16} className={
                                researchStatus === 'deep' ? 'text-green-400' :
                                researchStatus === 'shallow' ? 'text-yellow-400' :
                                researchStatus === 'stale' ? 'text-orange-400' :
                                'text-slate-600'
                            } />
                            <span className="text-xs font-bold text-slate-400 uppercase">Keyword Research</span>
                        </div>
                        {loadingResearch ? (
                            <LoadingBar className="w-8" />
                        ) : (
                            <span className={`text-xs font-bold uppercase ${
                                researchStatus === 'deep' ? 'text-green-400' :
                                researchStatus === 'shallow' ? 'text-yellow-400' :
                                researchStatus === 'stale' ? 'text-orange-400' :
                                'text-slate-600'
                            }`}>
                                {researchStatus === 'deep' ? 'SEO Data' :
                                 researchStatus === 'shallow' ? 'AI Estimated' :
                                 researchStatus === 'stale' ? 'Outdated' :
                                 'Not Generated'}
                            </span>
                        )}
                    </div>

                    {research && !isResearchStale(research) ? (
                        <>
                            <div className="text-xs text-slate-500 mb-3">
                                {research.primaryKeywords.length} keywords • {research.questionsToAnswer.length} questions • {research.contentGaps.length} opportunities
                            </div>
                            <button
                                onClick={() => setShowResearchPanel(!showResearchPanel)}
                                className="text-xs text-cyan-400 hover:text-cyan-300"
                            >
                                {showResearchPanel ? 'Hide Details' : 'Show Details'}
                            </button>

                            {showResearchPanel && (
                                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                                    <div>
                                        <span className="text-xs text-slate-500">Top Keywords:</span>
                                        <p className="text-xs text-slate-300">
                                            {research.primaryKeywords.slice(0, 5).map(k => k.keyword).join(', ')}
                                        </p>
                                    </div>
                                    {research.questionsToAnswer.length > 0 && (
                                        <div>
                                            <span className="text-xs text-slate-500">Questions to Answer:</span>
                                            <ul className="text-xs text-slate-300 list-disc list-inside">
                                                {research.questionsToAnswer.slice(0, 3).map((q, i) => (
                                                    <li key={i} className="truncate">{q}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500 flex-1">
                                Generate research for better, keyword-focused titles
                            </p>
                            <button
                                onClick={handleGenerateResearch}
                                disabled={generatingResearch || !organizationId}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-xs font-bold uppercase transition-colors"
                            >
                                {generatingResearch ? (
                                    <><LoadingBar className="w-6" /> Generating...</>
                                ) : (
                                    <><TrendingUp size={12} /> Research</>
                                )}
                            </button>
                        </div>
                    )}
                </div>

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
                        className="w-full bg-slate-950 border border-slate-700 text-slate-300 p-3 h-32 focus:border-cyan-500 outline-none resize-none text-sm leading-relaxed"
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

// ============================================================================
// CATEGORY SUMMARY CARD
// ============================================================================
const CategorySummaryCard: React.FC<{
    category: Category;
    categoryPagePost: Post | null;
    keywords: KeywordData[];
    keywordsLoading: boolean;
    researchStatus: 'none' | 'running' | 'complete';
    articleIdeasCount: number;
    onRunResearch: () => void;
    onViewKeywords: () => void;
    onRefreshKeywords: () => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => void;
    onUpdateCategory: (id: string, updates: Partial<Category>) => void;
    onCreateCategoryPage?: () => void;
    onApplyResearch: () => void;
    onViewResearchReport: () => void;
    researchReport?: string | null;
}> = ({
    category,
    categoryPagePost,
    keywords,
    keywordsLoading,
    researchStatus,
    articleIdeasCount,
    onRunResearch,
    onViewKeywords,
    onRefreshKeywords,
    onUpdatePost,
    onUpdateCategory,
    onCreateCategoryPage,
    onApplyResearch,
    onViewResearchReport,
    researchReport
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(category.description || '');
    const [showResearchConfirm, setShowResearchConfirm] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Timer for research duration
    React.useEffect(() => {
        if (researchStatus !== 'running') {
            setElapsedSeconds(0);
            return;
        }

        const startedAt = category.googleDeepResearch?.startedAt;
        if (!startedAt) {
            setElapsedSeconds(0);
            return;
        }

        // Calculate initial elapsed time
        const startTime = startedAt.toDate().getTime();
        const updateElapsed = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            setElapsedSeconds(elapsed);
        };

        updateElapsed(); // Set initial value
        const interval = setInterval(updateElapsed, 1000);

        return () => clearInterval(interval);
    }, [researchStatus, category.googleDeepResearch?.startedAt]);

    // Format elapsed time as "Xm Ys"
    const formatElapsed = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    // Update local state when category changes
    React.useEffect(() => {
        setEditedDescription(category.description || '');
    }, [category.description]);

    // Get top keywords for display
    const topKeywords = keywords.slice(0, 4);

    // Format volume helper
    const formatVolume = (volume: number | null): string => {
        if (volume === null) return '—';
        if (volume < 1000) return volume.toString();
        if (volume < 1000000) return `${(volume / 1000).toFixed(1)}K`;
        return `${(volume / 1000000).toFixed(1)}M`;
    };

    // Trend styling lookup - consolidates icon and color
    const TREND_STYLES = {
        rising: { icon: '▲', color: 'text-emerald-400' },
        declining: { icon: '▼', color: 'text-red-400' },
        stable: { icon: '—', color: 'text-slate-500' },
    } as const;

    const getTrendStyle = (trend: 'rising' | 'stable' | 'declining' | null) => {
        return trend && trend in TREND_STYLES
            ? TREND_STYLES[trend]
            : { icon: '', color: 'text-slate-500' };
    };

    if (!isExpanded) {
        // Collapsed state - compact single row
        return (
            <div className="mx-6 mt-4 mb-2">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full flex items-center gap-4 p-3 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                    {/* Thumbnail */}
                    {categoryPagePost?.heroImage?.url ? (
                        <img
                            src={categoryPagePost.heroImage.url}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-slate-800 flex items-center justify-center rounded">
                            <FolderOpen size={20} className="text-slate-600" />
                        </div>
                    )}

                    {/* Title */}
                    <span className="font-bold text-white flex-1 text-left truncate">{category.name}</span>

                    {/* Status badges */}
                    <div className="flex items-center gap-3">
                        {researchStatus === 'running' && (
                            <span className="text-xs text-amber-400 flex items-center gap-1 animate-pulse">
                                <RefreshCw size={12} className="animate-spin" /> Researching...
                            </span>
                        )}
                        {researchStatus === 'complete' && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={12} /> Research
                            </span>
                        )}
                        {keywords.length > 0 && (
                            <span className="text-xs text-cyan-400">
                                {keywords.length} keywords
                            </span>
                        )}
                        <span className="text-xs text-slate-500">
                            {articleIdeasCount} ideas
                        </span>
                        <ChevronDown size={16} className="text-slate-500" />
                    </div>
                </button>
            </div>
        );
    }

    // Expanded state - full card
    return (
        <div className="mx-6 mt-4 mb-2 border border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg">
            {/* Header with collapse button */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category Overview</span>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-slate-500 hover:text-white p-1"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            </div>

            {/* Main content */}
            <div className="p-4">
                {/* Category Name */}
                <h2 className="text-xl font-bold text-white mb-2">{category.name}</h2>

                {/* Category Description - Editable */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</span>
                            {!isEditingDescription && (
                                <button
                                    onClick={() => setIsEditingDescription(true)}
                                    className="text-slate-500 hover:text-white"
                                    title="Edit description"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                        {isEditingDescription ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Enter category description..."
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            onUpdateCategory(category.id, { description: editedDescription });
                                            setIsEditingDescription(false);
                                        }}
                                        className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center gap-1"
                                    >
                                        <Check size={12} /> Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditedDescription(category.description || '');
                                            setIsEditingDescription(false);
                                        }}
                                        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center gap-1"
                                    >
                                        <X size={12} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">
                                {category.description || <span className="italic text-slate-600">No description yet - click Edit to add one</span>}
                            </p>
                        )}
                    </div>

                {/* Keywords + Research + Hero Image */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Keywords Section */}
                        <div className="p-3 bg-slate-800/30 rounded border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Keywords</span>
                                {keywords.length > 0 && (
                                    <button
                                        onClick={onViewKeywords}
                                        className="text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                        View All {keywords.length} →
                                    </button>
                                )}
                            </div>

                            {keywordsLoading ? (
                                <div className="flex items-center gap-2 py-2">
                                    <LoadingBar className="w-24" />
                                    <span className="text-xs text-slate-500">Fetching keywords...</span>
                                </div>
                            ) : keywords.length > 0 ? (
                                <div className="space-y-1">
                                    {topKeywords.map((kw, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-300 truncate flex-1 text-xs">"{kw.keyword}"</span>
                                            <span className="text-cyan-400 font-mono text-[10px] shrink-0">
                                                {formatVolume(kw.searchVolume)}/mo
                                            </span>
                                            {kw.trend && (
                                                <span className={`text-[10px] shrink-0 ${getTrendStyle(kw.trend).color}`}>
                                                    {getTrendStyle(kw.trend).icon}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 py-2">
                                    <button
                                        onClick={onRefreshKeywords}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                    >
                                        <RefreshCw size={12} />
                                        Fetch Keywords
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Research Panel */}
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Target size={14} className="text-purple-400" />
                                Deep Research
                            </span>
                            {/* Status indicator */}
                            {researchStatus === 'running' ? (
                                <span className="text-xs text-amber-400 flex items-center gap-1 font-mono">
                                    <RefreshCw size={12} className="animate-spin" /> {formatElapsed(elapsedSeconds)}
                                </span>
                            ) : researchStatus === 'complete' ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                        <CheckCircle size={12} /> Complete
                                    </span>
                                    <button
                                        onClick={onViewResearchReport}
                                        className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded flex items-center gap-1"
                                    >
                                        <Eye size={12} /> View
                                    </button>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-500">Not started</span>
                            )}
                        </div>

                        {researchStatus === 'complete' && researchReport ? (
                            /* Research complete - show apply action */
                            <div className="space-y-2">
                                <button
                                    onClick={onApplyResearch}
                                    className="w-full px-3 py-2 text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 rounded flex items-center justify-center gap-2 border border-purple-500/30"
                                >
                                    <Zap size={14} /> Apply Research (Regenerate All)
                                </button>
                                <p className="text-xs text-slate-500 text-center">
                                    Regenerates description & all article ideas
                                </p>
                            </div>
                        ) : researchStatus === 'running' ? (
                            /* Research running - show progress */
                            <div className="py-2 space-y-2">
                                <LoadingBar className="mb-2" />
                                <p className="text-xs text-slate-400 text-center">
                                    Researching "{category.name}"...
                                </p>
                                <p className="text-xs text-slate-600 text-center">
                                    This can take up to 10 minutes. You can navigate away — research runs on our servers.
                                </p>
                                <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                                    <p className="text-[11px] text-emerald-400 text-center flex items-center justify-center gap-1">
                                        <Zap size={10} />
                                        Article ideas will be auto-generated when research completes
                                    </p>
                                </div>
                                {/* Show reset button after 5 minutes OR if no startedAt (old stuck research) */}
                                {(elapsedSeconds > 300 || !category.googleDeepResearch?.startedAt) && (
                                    <button
                                        onClick={() => onUpdateCategory(category.id, {
                                            googleDeepResearch: {
                                                content: '',
                                                generatedAt: category.googleDeepResearch?.generatedAt || category.createdAt,
                                                status: 'failed',
                                                error: 'Research was manually reset'
                                            }
                                        })}
                                        className="w-full mt-2 px-3 py-1.5 text-xs bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded border border-red-700/50"
                                    >
                                        Reset Stuck Research
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* No research - show start button */
                            <div className="space-y-2">
                                {showResearchConfirm ? (
                                    /* Confirmation dialog */
                                    <div className="relative p-4 bg-slate-900 border border-purple-500/30 rounded space-y-3">
                                        <button
                                            onClick={() => setShowResearchConfirm(false)}
                                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded"
                                        >
                                            <X size={14} />
                                        </button>
                                        <p className="text-sm text-slate-300 pr-6">
                                            Deep Research conducts comprehensive market analysis for this category, including competitor content, search trends, and keyword opportunities.
                                        </p>
                                        <div className="flex items-center gap-2 text-amber-400 text-sm">
                                            <Zap size={14} />
                                            <span className="font-medium">20 credits</span>
                                            <span className="text-slate-500">• Up to 10 minutes</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Research runs on our servers in the background. You may navigate away or close this page — results will appear when complete.
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            To enable automatic research for all new categories, visit Project Settings.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setShowResearchConfirm(false);
                                                onRunResearch();
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center justify-center gap-2"
                                        >
                                            <Target size={14} /> Start Research
                                        </button>
                                    </div>
                                ) : (
                                    /* Initial button */
                                    <>
                                        <button
                                            onClick={() => setShowResearchConfirm(true)}
                                            className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center gap-2"
                                        >
                                            <Search size={14} /> Run Deep Research
                                            <span className="text-slate-400 text-xs ml-1">(20 credits)</span>
                                        </button>
                                        <p className="text-xs text-slate-500 text-center">
                                            Comprehensive SEO research: competitor analysis, search trends & content opportunities
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                        </div>

                        {/* Hero Image Block */}
                        <div className="p-3 bg-slate-800/30 rounded border border-slate-700/50">
                            {categoryPagePost ? (
                                <ImageInspectorControl
                                    currentImage={categoryPagePost.heroImage ? {
                                        url: categoryPagePost.heroImage.url,
                                        prompt: categoryPagePost.heroImage.prompt || '',
                                        altText: categoryPagePost.heroImage.altText || category.name
                                    } : undefined}
                                    postTitle={category.name}
                                    postTeaser={category.description}
                                    onImageUpdate={(image) => {
                                        if (categoryPagePost) {
                                            if (image) {
                                                onUpdatePost(categoryPagePost.id, {
                                                    heroImage: {
                                                        url: image.url,
                                                        prompt: image.prompt,
                                                        altText: image.altText,
                                                        generatedAt: image.generatedAt,
                                                        providerId: image.providerId,
                                                        aspectRatio: image.aspectRatio
                                                    }
                                                });
                                            } else {
                                                onUpdatePost(categoryPagePost.id, { heroImage: deleteField() } as unknown as Partial<Post>);
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="flex items-center gap-2 py-2">
                                    {onCreateCategoryPage ? (
                                        <button
                                            onClick={onCreateCategoryPage}
                                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                        >
                                            <Plus size={12} />
                                            Add Hero Image
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-500">No category page</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
            </div>
        </div>
    );
};

// ============================================================================
// KEYWORD RESEARCH MODAL
// ============================================================================
const KeywordResearchModal: React.FC<{
    category: Category;
    keywords: KeywordData[];
    onClose: () => void;
    onRefresh: () => void;
    onGenerateIdeasForKeywords: (keywords: string[]) => void;
    isRefreshing: boolean;
}> = ({ category, keywords, onClose, onRefresh, onGenerateIdeasForKeywords, isRefreshing }) => {
    const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'cpc'>('volume');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
    const [filterTrend, setFilterTrend] = useState<'all' | 'rising' | 'stable' | 'declining'>('all');

    // Format helpers
    const formatVolume = (volume: number | null): string => {
        if (volume === null) return '—';
        if (volume < 1000) return volume.toString();
        if (volume < 1000000) return `${(volume / 1000).toFixed(1)}K`;
        return `${(volume / 1000000).toFixed(1)}M`;
    };

    const formatCpc = (cpc: number | null): string => {
        if (cpc === null) return '—';
        return `$${cpc.toFixed(2)}`;
    };

    const getDifficultyColor = (difficulty: number | null): string => {
        if (difficulty === null) return 'text-slate-500';
        if (difficulty < 30) return 'text-emerald-400';
        if (difficulty < 60) return 'text-amber-400';
        return 'text-red-400';
    };

    // Trend styling lookup - consolidates icon and color
    const TREND_STYLES = {
        rising: { icon: '▲', color: 'text-emerald-400' },
        declining: { icon: '▼', color: 'text-red-400' },
        stable: { icon: '—', color: 'text-slate-500' },
    } as const;

    const getTrendStyle = (trend: 'rising' | 'stable' | 'declining' | null | undefined) => {
        return trend && trend in TREND_STYLES
            ? TREND_STYLES[trend as keyof typeof TREND_STYLES]
            : { icon: '', color: 'text-slate-500' };
    };

    // Filter and sort keywords
    const sortedKeywords = useMemo(() => {
        let filtered = [...keywords];

        // Filter by trend
        if (filterTrend !== 'all') {
            filtered = filtered.filter(kw => kw.trend === filterTrend);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal: number | null = null;
            let bVal: number | null = null;

            switch (sortBy) {
                case 'volume':
                    aVal = a.searchVolume;
                    bVal = b.searchVolume;
                    break;
                case 'difficulty':
                    aVal = a.difficulty;
                    bVal = b.difficulty;
                    break;
                case 'cpc':
                    aVal = a.cpc;
                    bVal = b.cpc;
                    break;
            }

            // Handle nulls
            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;

            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return filtered;
    }, [keywords, sortBy, sortDir, filterTrend]);

    const toggleKeyword = (keyword: string) => {
        const newSet = new Set(selectedKeywords);
        if (newSet.has(keyword)) {
            newSet.delete(keyword);
        } else {
            newSet.add(keyword);
        }
        setSelectedKeywords(newSet);
    };

    const handleSort = (column: 'volume' | 'difficulty' | 'cpc') => {
        if (sortBy === column) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(column);
            setSortDir('desc');
        }
    };

    const handleGenerateForSelected = () => {
        onGenerateIdeasForKeywords(Array.from(selectedKeywords));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-5xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="text-cyan-400" size={20} />
                            Keyword Research: {category.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {keywords.length} keywords • Data from DataForSEO
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-4">
                        {/* Trend Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Filter:</span>
                            <select
                                value={filterTrend}
                                onChange={(e) => setFilterTrend(e.target.value as any)}
                                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded"
                            >
                                <option value="all">All Trends</option>
                                <option value="rising">Rising ▲</option>
                                <option value="stable">Stable —</option>
                                <option value="declining">Declining ▼</option>
                            </select>
                        </div>

                        {/* Selected count */}
                        {selectedKeywords.size > 0 && (
                            <span className="text-xs text-cyan-400 font-mono">
                                {selectedKeywords.size} selected
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedKeywords.size > 0 && (
                            <button
                                onClick={handleGenerateForSelected}
                                className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-2"
                            >
                                <Sparkles size={12} />
                                Generate Ideas for Selected
                            </button>
                        )}
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950 sticky top-0">
                            <tr className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
                                        checked={selectedKeywords.size === sortedKeywords.length && sortedKeywords.length > 0}
                                        onChange={() => {
                                            if (selectedKeywords.size === sortedKeywords.length) {
                                                setSelectedKeywords(new Set());
                                            } else {
                                                setSelectedKeywords(new Set(sortedKeywords.map(k => k.keyword)));
                                            }
                                        }}
                                    />
                                </th>
                                <th className="p-4">Keyword</th>
                                <th
                                    className="p-4 cursor-pointer hover:text-slate-300"
                                    onClick={() => handleSort('volume')}
                                >
                                    Volume {sortBy === 'volume' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:text-slate-300"
                                    onClick={() => handleSort('difficulty')}
                                >
                                    Difficulty {sortBy === 'difficulty' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:text-slate-300"
                                    onClick={() => handleSort('cpc')}
                                >
                                    CPC {sortBy === 'cpc' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="p-4">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedKeywords.map((kw, i) => (
                                <tr
                                    key={i}
                                    className={`hover:bg-slate-800/50 transition-colors ${
                                        selectedKeywords.has(kw.keyword) ? 'bg-cyan-950/20' : ''
                                    }`}
                                >
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            className="appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
                                            checked={selectedKeywords.has(kw.keyword)}
                                            onChange={() => toggleKeyword(kw.keyword)}
                                        />
                                    </td>
                                    <td className="p-4 text-slate-200 font-medium">{kw.keyword}</td>
                                    <td className="p-4 text-cyan-400 font-mono">{formatVolume(kw.searchVolume)}</td>
                                    <td className={`p-4 font-mono ${getDifficultyColor(kw.difficulty)}`}>
                                        {kw.difficulty !== null ? kw.difficulty : '—'}
                                    </td>
                                    <td className="p-4 text-slate-400 font-mono">{formatCpc(kw.cpc)}</td>
                                    <td className={`p-4 ${getTrendStyle(kw.trend).color}`}>
                                        {getTrendStyle(kw.trend).icon} {kw.trend || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {sortedKeywords.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            {keywords.length === 0 ? 'No keywords fetched yet.' : 'No keywords match the current filter.'}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const CategoryWorkspace: React.FC<Props> = ({
    categories, posts, tasks, isAddingCategory, onAddCategory, onUpdateCategory, onDeleteCategory, onMoveCategory,
    onQueueTitles, onQueueContent, onQueueCategoryPageRegenerate, onQueueGoogleDeepResearch, onCreateCategoryPage,
    onUpdatePost, onDeletePost,
    organizationId,
    projectId,
    organization,
    project
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
    const [checkedCategoryIds, setCheckedCategoryIds] = useState<Set<string>>(new Set());

    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [creatorParentId, setCreatorParentId] = useState<string | null>(null);
    const [isGenModalOpen, setIsGenModalOpen] = useState(false);
    const [genCategory, setGenCategory] = useState<Category | null>(null);

    // Category page editing state
    const [categoryPageEditMode, setCategoryPageEditMode] = useState(false);
    const [showAiInstructions, setShowAiInstructions] = useState(false);

    // Bulk action modals
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);

    // Research report modal
    const [showResearchModal, setShowResearchModal] = useState(false);

    // Keyword research state
    const [categoryKeywords, setCategoryKeywords] = useState<KeywordData[]>([]);
    const [keywordsLoading, setKeywordsLoading] = useState(false);
    const [showKeywordModal, setShowKeywordModal] = useState(false);
    const [keywordsRefreshing, setKeywordsRefreshing] = useState(false);


    // Layout Resizing - shared across workspaces
    const [leftPaneWidth, setLeftPaneWidth] = usePaneWidth('leftPane');

    // Get the category page post for the selected category
    const categoryPagePost = useMemo(() => {
        if (!selectedCategoryId) return null;
        return posts.find(p => p.isCategoryPage && p.categoryId === selectedCategoryId) || null;
    }, [posts, selectedCategoryId]);

    // Check if user has access to Google Deep Research
    const tier = organization?.subscriptionTier || SubscriptionTier.FREE;
    const tierFeatures = TIER_FEATURES[tier];
    const canUseGoogleDeepResearch = tierFeatures.googleDeepResearchEnabled;

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isResizing && containerRef.current) {
            const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
            if (newWidth > 280 && newWidth < 600) {
                setLeftPaneWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsResizing(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Auto-fetch keywords when category is selected
    useEffect(() => {
        if (!selectedCategoryId || !project || !organization) {
            setCategoryKeywords([]);
            return;
        }

        const fetchKeywords = async () => {
            setKeywordsLoading(true);
            try {
                // First try to get cached keywords
                const result = await getCategoryResearch(selectedCategoryId);

                // Handle the discriminated result type
                let research: CategoryResearch | null = null;
                if (result.success === false) {
                    // Database error - log and try to fetch fresh
                    console.warn('Failed to get cached keywords:', result.error.message);
                } else if (result.data) {
                    research = result.data;
                }

                if (research && research.primaryKeywords && research.primaryKeywords.length > 0 && !areKeywordsStale(research)) {
                    // Use cached keywords
                    setCategoryKeywords(research.primaryKeywords);
                } else {
                    // Fetch fresh keywords
                    const category = categories.find(c => c.id === selectedCategoryId);
                    if (category) {
                        const parentCategory = category.parentId ? categories.find(c => c.id === category.parentId) : null;
                        const keywords = await fetchCategoryKeywords(
                            selectedCategoryId,
                            category,
                            project,
                            organization,
                            parentCategory?.name
                        );
                        setCategoryKeywords(keywords);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch keywords:', error);
                setCategoryKeywords([]);
            } finally {
                setKeywordsLoading(false);
            }
        };

        fetchKeywords();
    }, [selectedCategoryId, project, organization, categories]);

    // Handler to refresh keywords
    const handleRefreshKeywords = async () => {
        console.log('[Keywords] handleRefreshKeywords called', { selectedCategoryId, project: !!project, organization: !!organization });

        if (!selectedCategoryId) {
            console.warn('[Keywords] No category selected');
            return;
        }
        if (!project) {
            console.warn('[Keywords] No project available');
            return;
        }
        if (!organization) {
            console.warn('[Keywords] No organization available');
            return;
        }

        setKeywordsLoading(true);
        setKeywordsRefreshing(true);
        try {
            const category = categories.find(c => c.id === selectedCategoryId);
            if (category) {
                const parentCategory = category.parentId ? categories.find(c => c.id === category.parentId) : null;
                console.log('[Keywords] Fetching keywords for:', category.name);
                const keywords = await fetchCategoryKeywords(
                    selectedCategoryId,
                    category,
                    project,
                    organization,
                    parentCategory?.name
                );
                console.log('[Keywords] Received keywords:', keywords.length);
                setCategoryKeywords(keywords);
            }
        } catch (error) {
            console.error('Failed to refresh keywords:', error);
        } finally {
            setKeywordsLoading(false);
            setKeywordsRefreshing(false);
        }
    };


    // Category checkbox handlers
    const handleCategoryCheck = (id: string, checked: boolean) => {
        const newSet = new Set(checkedCategoryIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setCheckedCategoryIds(newSet);
    };

    const handleCategoryCheckAll = (checked: boolean) => {
        if (checked) {
            setCheckedCategoryIds(new Set(categories.map(c => c.id)));
        } else {
            setCheckedCategoryIds(new Set());
        }
    };

    // Handle bulk delete
    const handleBulkDelete = () => {
        // Get all categories to delete (including descendants)
        const getAllDescendants = (catId: string): string[] => {
            const children = categories.filter(c => c.parentId === catId);
            return [catId, ...children.flatMap(child => getAllDescendants(child.id))];
        };

        const allIdsToDelete = new Set<string>();
        checkedCategoryIds.forEach(id => {
            getAllDescendants(id).forEach(descId => allIdsToDelete.add(descId));
        });

        // Delete from leaves to roots
        const idsArray = Array.from(allIdsToDelete);
        const sortedIds = idsArray.sort((a, b) => {
            const depthA = getDepth(a);
            const depthB = getDepth(b);
            return depthB - depthA; // Delete deepest first
        });

        sortedIds.forEach(id => onDeleteCategory(id));
        setCheckedCategoryIds(new Set());
        setShowDeleteModal(false);
    };

    const getDepth = (catId: string): number => {
        const cat = categories.find(c => c.id === catId);
        if (!cat || !cat.parentId) return 0;
        return 1 + getDepth(cat.parentId);
    };

    // Handle bulk generate
    const handleBulkGenerate = (count: number) => {
        checkedCategoryIds.forEach(catId => {
            const cat = categories.find(c => c.id === catId);
            if (cat) {
                onQueueTitles(catId, count, cat.description || '');
            }
        });
        setCheckedCategoryIds(new Set());
        setShowBulkGenerateModal(false);
    };

    // Handle category reorder
    const handleCategoryReorder = (
        activeId: string,
        overId: string,
        newParentId: string | null,
        reorderedSiblings: { id: string; order: number }[]
    ) => {
        onMoveCategory(activeId, newParentId, reorderedSiblings);
    };

    // Show only stubs (PENDING) - clicking Generate removes them with animation
    const categoryWorkflowStatuses = [PostStatus.PENDING];

    const filteredPosts = posts.filter(p => {
        const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
        const matchesSearch = !searchQuery ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.teaser || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch && categoryWorkflowStatuses.includes(p.status);
    }).sort((a, b) => {
        // Sort oldest first so new titles appear at bottom (less disruptive)
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateA - dateB;
    });

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    const isGeneratingTitles = selectedCategoryId && tasks.some(t =>
        t.categoryId === selectedCategoryId &&
        t.type === TaskType.GENERATE_TITLES &&
        (t.status === TaskStatus.QUEUED || t.status === TaskStatus.PROCESSING)
    );

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
                className={`flex flex-row h-full w-full bg-[#0f172a] overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setIsResizing(false)}
            >
                {/* COLUMN 1: CATEGORY TREE */}
                <div
                    style={{ width: leftPaneWidth, minWidth: leftPaneWidth, maxWidth: leftPaneWidth }}
                    className="border-r border-slate-800 bg-[#020617] flex flex-col h-full flex-shrink-0 flex-grow-0"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 sticky top-0 z-20 bg-[#020617]">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-2xl font-bold text-white tracking-tight">Content Areas</h1>
                            <button
                                onClick={() => { setCreatorParentId(null); setIsCreatorOpen(true); }}
                                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors group relative"
                                title="Add content area"
                            >
                                <Plus size={16} />
                                New Area
                                <span className="absolute right-0 top-full mt-2 px-2 py-1 bg-slate-800 text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    Uses credits to generate ideas
                                </span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Each content area will generate article ideas automatically.
                        </p>
                    </div>

                    {/* Bulk Action Bar */}
                    {checkedCategoryIds.size > 0 && (
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-[104px] z-20">
                            <span className="text-sm font-mono text-cyan-400">{checkedCategoryIds.size} selected</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowBulkGenerateModal(true)}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-white transition-colors flex items-center gap-2"
                                >
                                    <Sparkles size={12} />
                                    Generate More
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={12} />
                                    Delete Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Category Tree */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <CategoryTree
                            categories={categories}
                            tasks={tasks}
                            posts={posts}
                            selectedId={selectedCategoryId}
                            checkedIds={checkedCategoryIds}
                            onSelect={setSelectedCategoryId}
                            onCheck={handleCategoryCheck}
                            onCheckAll={handleCategoryCheckAll}
                            onAddSub={(parentId) => { setCreatorParentId(parentId); setIsCreatorOpen(true); }}
                            onGenerate={(cat) => { setGenCategory(cat); setIsGenModalOpen(true); }}
                            onReorder={handleCategoryReorder}
                        />
                    </div>
                </div>

                {/* RESIZER HANDLE */}
                <div
                    onMouseDown={() => setIsResizing(true)}
                    className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors z-20 flex items-center justify-center group"
                >
                    <div className="h-8 w-0.5 bg-slate-600 group-hover:bg-white" />
                </div>

                {/* COLUMN 2: CONTENT SECTIONS */}
                <div className="flex-1 flex flex-col h-full bg-[#0f172a] relative min-w-0">
                    {/* Header - Only show when category selected */}
                    {selectedCategoryId && (
                        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 z-20 sticky top-0">
                            {/* Breadcrumb as H1 */}
                            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                {breadcrumb.map((name, index) => (
                                    <React.Fragment key={index}>
                                        <span className={`${index === breadcrumb.length - 1 ? 'text-purple-400' : 'text-slate-500'}`}>
                                            {name}
                                        </span>
                                        {index < breadcrumb.length - 1 && (
                                            <ChevronRight size={18} className="text-slate-700" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </h1>
                        </div>
                    )}

                    {/* Scrollable Content Sections */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a]">
                        {selectedCategoryId && selectedCategory ? (
                            <>
                                {/* ========== SUMMARY CARD ========== */}
                                <CategorySummaryCard
                                    category={selectedCategory}
                                    categoryPagePost={categoryPagePost}
                                    keywords={categoryKeywords}
                                    keywordsLoading={keywordsLoading}
                                    researchStatus={
                                        selectedCategory.googleDeepResearch?.status === 'running' ? 'running' :
                                        selectedCategory.googleDeepResearch?.status === 'complete' ? 'complete' :
                                        'none'
                                    }
                                    articleIdeasCount={filteredPosts.length}
                                    onRunResearch={() => {
                                        if (onQueueGoogleDeepResearch && selectedCategoryId) {
                                            onQueueGoogleDeepResearch(selectedCategoryId);
                                        }
                                    }}
                                    onViewKeywords={() => setShowKeywordModal(true)}
                                    onRefreshKeywords={handleRefreshKeywords}
                                    onUpdatePost={onUpdatePost}
                                    onUpdateCategory={onUpdateCategory}
                                    onCreateCategoryPage={onCreateCategoryPage ? () => {
                                        onCreateCategoryPage(selectedCategory.id, selectedCategory.name, selectedCategory.description);
                                    } : undefined}
                                    onApplyResearch={async () => {
                                        // Confirm before deleting everything
                                        const confirmed = window.confirm(
                                            `This will delete all ${filteredPosts.length} existing article ideas and regenerate everything using the research.\n\nAre you sure?`
                                        );
                                        if (!confirmed) return;

                                        // Delete all existing posts for this category (except category page)
                                        // IMPORTANT: Wait for all deletions to complete before generating new titles
                                        const postsToDelete = filteredPosts.filter(post => !post.isCategoryPage);
                                        await Promise.all(postsToDelete.map(post => onDeletePost(post.id)));

                                        // Generate new category description from research using AI
                                        const researchContent = selectedCategory.googleDeepResearch?.content;
                                        if (researchContent && onUpdateCategory) {
                                            try {
                                                const { GoogleGenAI } = await import('@google/genai');
                                                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                                                if (apiKey) {
                                                    const ai = new GoogleGenAI({ apiKey });

                                                    const prompt = `Based on the following research report, write a concise 1-2 sentence description for the category "${selectedCategory.name}".

The description should:
- Capture the essence of what content this category covers
- Be engaging and specific (not generic)
- NOT start with "This category..." or "Content about..."
- Be written in active voice

Research Report:
${researchContent.substring(0, 4000)}

Respond with ONLY the description, nothing else.`;

                                                    const result = await ai.models.generateContent({
                                                        model: 'gemini-2.0-flash',
                                                        contents: prompt
                                                    });
                                                    const newDescription = result.text?.trim() || '';
                                                    if (newDescription && newDescription.length > 10) {
                                                        await onUpdateCategory(selectedCategory.id, { description: newDescription });
                                                    }
                                                }
                                            } catch (err) {
                                                console.error('Failed to regenerate category description:', err);
                                            }
                                        }

                                        // Regenerate category page (intro/description) using research
                                        if (categoryPagePost && onQueueCategoryPageRegenerate) {
                                            // Category page exists - regenerate it
                                            onQueueCategoryPageRegenerate(categoryPagePost);
                                        } else if (onCreateCategoryPage) {
                                            // No category page yet - create one (will use research context)
                                            onCreateCategoryPage(selectedCategory.id, selectedCategory.name, selectedCategory.description);
                                        }

                                        // Generate new article ideas (10 by default)
                                        onQueueTitles(selectedCategory.id, 10, selectedCategory.description || '');
                                    }}
                                    onViewResearchReport={() => setShowResearchModal(true)}
                                    researchReport={selectedCategory.googleDeepResearch?.content}
                                />

                                {/* ========== ARTICLE IDEAS SECTION ========== */}
                                <div className="border-b border-slate-800">
                                    {/* Section Header */}
                                    <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-800/50">
                                        <FileText size={16} className="text-cyan-400" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Article Ideas</span>
                                        {filteredPosts.length > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                                                {filteredPosts.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-6 pb-6">
                                    {/* Bulk Actions Toolbar */}
                                    {selectedPostIds.size > 0 && (
                                        <div className="flex items-center justify-between bg-slate-900 p-2 border border-slate-800 mb-4">
                                            <div className="flex items-center gap-4 px-2">
                                                <span className="text-sm font-mono text-cyan-400">{selectedPostIds.size} selected</span>
                                                <div className="h-4 w-px bg-slate-700" />
                                                <button onClick={() => {
                                                    const selectedPosts = Array.from(selectedPostIds)
                                                        .map(id => posts.find(p => p.id === id))
                                                        .filter(p => p?.status === PostStatus.PENDING) as Post[];

                                                    selectedPosts.forEach((post) => {
                                                        onQueueContent(post);
                                                    });
                                                    setSelectedPostIds(new Set());
                                                }} className="text-xs font-bold text-white hover:text-cyan-400 flex items-center uppercase">
                                                    <Plus size={14} className="mr-2" /> Generate Posts
                                                </button>
                                                <button onClick={() => {
                                                    Array.from(selectedPostIds).forEach((id) => {
                                                        onDeletePost(id);
                                                    });
                                                    setSelectedPostIds(new Set());
                                                }} className="text-xs font-bold text-white hover:text-red-400 flex items-center uppercase">
                                                    <Trash2 size={14} className="mr-2" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {filteredPosts.length === 0 && !isGeneratingTitles ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                                <Sparkles className="text-slate-600" size={28} />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2">No Article Ideas Yet</h3>
                                            <p className="text-slate-500 max-w-sm mb-6 text-sm">
                                                Generate some article ideas to get started.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    if (selectedCategory) {
                                                        setGenCategory(selectedCategory);
                                                        setIsGenModalOpen(true);
                                                    }
                                                }}
                                                disabled={!selectedCategory}
                                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Sparkles size={16} />
                                                Generate Ideas
                                            </button>
                                        </div>
                                    ) : (
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
                                        <th className="p-4" colSpan={2}>
                                            <div className="flex items-center justify-between">
                                                <span>Article Ideas</span>
                                                {isSearchExpanded ? (
                                                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1">
                                                        <input
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            placeholder="Search titles..."
                                                            className="bg-transparent text-sm text-slate-300 placeholder-slate-600 focus:outline-none w-40"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                                            className="text-slate-500 hover:text-white"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsSearchExpanded(true)}
                                                        className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                                                        title="Search titles"
                                                    >
                                                        <Search size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-sm text-slate-300 font-mono">
                                    <AnimatePresence mode="popLayout">
                                        {filteredPosts.map(post => (
                                        <motion.tr
                                            key={post.id}
                                            layout
                                            initial={{ opacity: 1 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                            className="hover:bg-slate-800/50 transition-colors group relative"
                                        >
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
                                                <td className="p-4 align-top" colSpan={2}>
                                                    <div className="flex flex-col gap-3">
                                                        {/* Title row - title left, trash far right */}
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                value={post.title}
                                                                onChange={(e) => onUpdatePost(post.id, { title: e.target.value })}
                                                                className="flex-1 bg-transparent font-bold text-white text-lg focus:text-cyan-400 px-0 outline-none border-none placeholder-slate-600"
                                                                placeholder="Enter Title..."
                                                            />
                                                            <button
                                                                onClick={() => onDeletePost(post.id)}
                                                                className="p-2 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                                                                title="Delete this idea"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        {/* Description - secondary */}
                                                        <div className="relative">
                                                            <textarea
                                                                value={post.teaser || ''}
                                                                onChange={(e) => onUpdatePost(post.id, { teaser: e.target.value })}
                                                                placeholder="Describe the post content, angle, or generation prompt..."
                                                                className="w-full bg-[#020617] text-slate-400 text-sm leading-relaxed p-4 border border-slate-800 focus:border-cyan-500/50 outline-none resize-none h-24 custom-scrollbar"
                                                            />
                                                        </div>
                                                        {/* Tags row - tags left, Generate Post far right */}
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 relative">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                                    <Tag size={14} className="text-slate-600" />
                                                                </div>
                                                                <input
                                                                    value={Array.isArray(post.tags) ? post.tags.join(', ') : ''}
                                                                    onChange={(e) => onUpdatePost(post.id, { tags: e.target.value.split(',').map(s => s.trim()) })}
                                                                    className="w-full bg-[#020617] text-slate-400 text-sm p-3 pl-9 border border-slate-800 focus:border-cyan-500/50 outline-none placeholder-slate-700"
                                                                    placeholder="comma, separated, tags"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => onQueueContent(post)}
                                                                className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shrink-0"
                                                                title="Write full article and move to Editorial Queue"
                                                            >
                                                                <Plus size={14} />
                                                                Generate Post
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                    {isGeneratingTitles && (
                                        <tr>
                                            <td colSpan={2} className="p-4">
                                                <div className="flex items-center gap-3 text-slate-500">
                                                    <LoadingBar className="w-16" />
                                                    <span className="text-sm">
                                                        Generating next title...
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                                    )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Empty State when no category selected */
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                    <FolderOpen className="text-slate-600" size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Select a Content Area</h3>
                                <p className="text-slate-500 max-w-md">
                                    Choose a content area from the left to view and manage its category page, research, and article ideas.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {isCreatorOpen && (
                    <CategoryCreator
                        parentId={creatorParentId}
                        parentName={categories.find(c => c.id === creatorParentId)?.name}
                        parentDescription={categories.find(c => c.id === creatorParentId)?.description}
                        onClose={() => setIsCreatorOpen(false)}
                        onAddBatch={(cats, runResearchFirst) => {
                            cats.forEach(c => onAddCategory(c.name, creatorParentId, c.description, runResearchFirst));
                            setIsCreatorOpen(false);
                        }}
                        organizationId={organizationId}
                        projectId={projectId}
                        isAddingCategory={isAddingCategory}
                        canUseDeepResearch={(organization?.credits?.balance ?? 0) >= 20}
                    />
                )}

                {isGenModalOpen && genCategory && (
                    <GenModal
                        key={`gen-modal-${genCategory.id}`}
                        category={genCategory}
                        onClose={() => setIsGenModalOpen(false)}
                        onConfirm={(count, context) => {
                            onQueueTitles(genCategory.id, count, context);
                            setIsGenModalOpen(false);
                        }}
                        organizationId={organizationId}
                        projectId={projectId}
                    />
                )}

                {showDeleteModal && (
                    <DeleteConfirmationModal
                        categories={categories}
                        selectedIds={checkedCategoryIds}
                        allCategories={categories}
                        onConfirm={handleBulkDelete}
                        onCancel={() => setShowDeleteModal(false)}
                    />
                )}

                {showBulkGenerateModal && (
                    <BulkGenerateModal
                        categories={categories}
                        selectedIds={checkedCategoryIds}
                        onConfirm={handleBulkGenerate}
                        onCancel={() => setShowBulkGenerateModal(false)}
                    />
                )}

                {/* Full-Width Research Report Modal */}
                {showResearchModal && selectedCategory?.googleDeepResearch?.content && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col mx-4">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                                <div className="flex items-center gap-3">
                                    <Target size={20} className="text-emerald-400" />
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Research Report</h2>
                                        <p className="text-xs text-slate-400">{selectedCategory.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowResearchModal(false)}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>
                            {/* Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                <div
                                    className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-white prose-ul:my-3 prose-li:my-1"
                                    dangerouslySetInnerHTML={{
                                        __html: marked.parse(stripPreamble(selectedCategory.googleDeepResearch.content)) as string
                                    }}
                                />
                            </div>
                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {stripPreamble(selectedCategory.googleDeepResearch.content).length.toLocaleString()} characters
                                </span>
                                <button
                                    onClick={() => setShowResearchModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Keyword Research Modal */}
                {showKeywordModal && selectedCategory && (
                    <KeywordResearchModal
                        category={selectedCategory}
                        keywords={categoryKeywords}
                        onClose={() => setShowKeywordModal(false)}
                        onRefresh={handleRefreshKeywords}
                        onGenerateIdeasForKeywords={(keywords) => {
                            // Close modal and open GenModal with keyword context
                            setShowKeywordModal(false);
                            setGenCategory(selectedCategory);
                            setIsGenModalOpen(true);
                            // Note: The keywords could be passed to the generation prompt via contextOverride
                        }}
                        isRefreshing={keywordsRefreshing}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
