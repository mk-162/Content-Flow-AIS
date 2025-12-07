
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Category, Post, PostStatus, GenerationTask, TaskStatus, TaskType } from '../types';
import {
    Plus, ChevronRight, Sparkles, Search, Wand2,
    X, Check, Play, Trash2, Loader2, FileText, AlertTriangle,
    GripVertical, ArrowRight, Tag, User, Edit2, RefreshCw, Info
} from 'lucide-react';
import { suggestCategories, CategorySuggestion } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
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

interface Props {
    categories: Category[];
    posts: Post[];
    tasks: GenerationTask[];
    onAddCategory: (name: string, parentId: string | null, description?: string) => void;
    onUpdateCategory: (id: string, updates: Partial<Category>) => void;
    onDeleteCategory: (id: string) => void;
    onMoveCategory: (id: string, newParentId: string | null, reorderedSiblings: { id: string; order: number }[]) => void;
    onQueueTitles: (id: string, count: number, contextOverride?: string) => void;
    onQueueContent: (post: Post) => void;
    onUpdatePost: (id: string, updates: Partial<Post>) => void;
    onDeletePost: (id: string) => void;
    organizationId?: string;
    projectId?: string;
}

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
                            <h2 className="text-lg font-bold text-white">Generate Titles for Selected</h2>
                            <p className="text-sm text-slate-500">{selectedIds.size} categor{selectedIds.size === 1 ? 'y' : 'ies'} selected</p>
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

        const indentPadding = depth * 24;

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`
                border-b border-slate-800/50 last:border-none transition-colors
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
                    {/* Hierarchy Line */}
                    {depth > 0 && (
                        <div
                            className="absolute top-0 bottom-0 border-l border-slate-700/50"
                            style={{ left: `${indentPadding - 8}px` }}
                        />
                    )}

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

                    {/* Expand/Collapse Arrow */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className={`shrink-0 mr-2 transition-colors ${hasChildren ? 'text-slate-500 hover:text-white' : 'text-transparent'}`}
                        disabled={!hasChildren}
                    >
                        <ChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                    </button>

                    {/* Category Name */}
                    <div className="flex-1 min-w-0" onClick={onSelect}>
                        <h3 className={`truncate font-medium text-sm ${isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                            {category.name}
                        </h3>
                    </div>

                    {/* Progress Indicator */}
                    {isGenerating && (
                        <div className="flex items-center gap-2 mr-3">
                            <Loader2 size={14} className="animate-spin text-cyan-500" />
                            {progress > 0 && (
                                <div className="w-12 h-1 bg-slate-700 overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons - Always Visible */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onGenerate();
                            }}
                            className="w-7 h-7 flex items-center justify-center border border-cyan-800 text-cyan-400 hover:bg-cyan-950 hover:border-cyan-500 transition-colors"
                            title="Generate Titles"
                        >
                            <Sparkles size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddSub();
                            }}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Add Subcategory"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Article Count Badge */}
                    <div className={`ml-3 px-2 py-0.5 text-[10px] font-bold ${articleCount > 0 ? (isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400') : 'bg-slate-900 text-slate-600'}`}>
                        {articleCount}
                    </div>
                </div>
            </div>
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
    const roots = categories.filter(c => c.parentId === null);
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
    const getArticleCountWithChildren = useMemo(() => {
        const countMap = new Map<string, number>();

        const calculateCount = (catId: string): number => {
            if (countMap.has(catId)) return countMap.get(catId)!;

            // Only count direct posts for this category, NOT subcategory posts
            const directCount = posts.filter(p => p.categoryId === catId).length;
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

            // Get all siblings at the target level (excluding the dragged item if it's from same level)
            const siblings = categories
                .filter(c => c.parentId === targetParentId && c.id !== active.id)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            // Find where to insert the dragged item
            const overIndex = siblings.findIndex(c => c.id === over.id);

            // Insert the dragged item at the correct position
            const newSiblings = [...siblings];
            newSiblings.splice(overIndex, 0, activeCategory);

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
                const children = categories.filter(c => c.parentId === cat.id);
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
    onClose: () => void,
    onAddBatch: (cats: { name: string, description: string }[]) => void,
    organizationId?: string,
    projectId?: string
}> = ({ parentId, parentName, onClose, onAddBatch, organizationId, projectId }) => {
    const [mode, setMode] = useState<'AI_AUTO' | 'MANUAL'>('AI_AUTO');
    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

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
            const results = await suggestCategories("", parentName, organizationId, projectId);
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
            onAddBatch([{ name: categoryName.trim(), description: categoryDescription.trim() }]);
            setCategoryName('');
            setCategoryDescription('');
        }
    };

    const handleAddSelected = () => {
        const selected = suggestions.filter((_, i) => selectedIndices.has(i)).map(s => ({
            name: s.name,
            description: s.description
        }));
        onAddBatch(selected);
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const startEditing = (index: number, suggestion: CategorySuggestion) => {
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
                                    <div className="relative w-16 h-16 mb-4">
                                        <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                                        <Sparkles className="absolute inset-0 m-auto text-cyan-400 animate-pulse" size={24} />
                                    </div>
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
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
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
                                    disabled={selectedIndices.size === 0}
                                    className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add Selected ({selectedIndices.size})
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
                                    disabled={!categoryName.trim()}
                                    className="px-8 py-2.5 bg-white hover:bg-slate-200 text-black font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add Category
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================================
// SINGLE CATEGORY GENERATE MODAL
// ============================================================================
const GenModal: React.FC<{ category: Category, onClose: () => void, onConfirm: (n: number, c: string) => void }> = ({ category, onClose, onConfirm }) => {
    const [count, setCount] = useState(5);
    const [context, setContext] = useState(category.description || '');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-700 p-8 w-full max-w-md shadow-2xl">
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
// MAIN COMPONENT
// ============================================================================
export const CategoryWorkspace: React.FC<Props> = ({
    categories, posts, tasks, onAddCategory, onUpdateCategory, onDeleteCategory, onMoveCategory,
    onQueueTitles, onQueueContent, onUpdatePost, onDeletePost,
    organizationId,
    projectId
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
    const [checkedCategoryIds, setCheckedCategoryIds] = useState<Set<string>>(new Set());

    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [creatorParentId, setCreatorParentId] = useState<string | null>(null);
    const [isGenModalOpen, setIsGenModalOpen] = useState(false);
    const [genCategory, setGenCategory] = useState<Category | null>(null);

    // Bulk action modals
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);

    // Animation state
    const [movingPostId, setMovingPostId] = useState<string | null>(null);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

    // Layout Resizing - default to 33% of window width
    const [leftPaneWidth, setLeftPaneWidth] = useState(() => Math.floor(window.innerWidth * 0.33));

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleGenerateWithAnimation = (post: Post) => {
        setMovingPostId(post.id);
        // Slower animation (3 seconds) so user can see what's happening
        setTimeout(() => {
            onQueueContent(post);
            setMovingPostId(null);
        }, 3000);
    };

    const handleDeleteWithAnimation = (postId: string) => {
        setDeletingPostId(postId);
        setTimeout(() => {
            onDeletePost(postId);
            setDeletingPostId(null);
        }, 2000);
    };

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

    const filteredPosts = posts.filter(p => {
        const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
        const matchesSearch = !searchQuery ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.teaser || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch && p.status === PostStatus.PENDING;
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
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20 bg-[#020617]">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Categories</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Structure</p>
                        </div>
                        <button
                            onClick={() => { setCreatorParentId(null); setIsCreatorOpen(true); }}
                            className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors"
                            title="Add Category"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Bulk Action Bar */}
                    {checkedCategoryIds.size > 0 && (
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-[104px] z-20">
                            <span className="text-sm font-mono text-cyan-400">{checkedCategoryIds.size} selected</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowBulkGenerateModal(true)}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-2"
                                >
                                    <Sparkles size={12} />
                                    Generate Selected
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

                {/* COLUMN 2: DATA TABLE */}
                <div className="flex-1 flex flex-col h-full bg-[#0f172a] relative min-w-0">
                    {/* Header - Only show when category selected */}
                    {selectedCategoryId && (
                        <div className="p-6 border-b border-slate-800 bg-[#0f172a] z-20 sticky top-0">
                            {/* Breadcrumb as H1 */}
                            <h1 className="text-xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
                                {breadcrumb.map((name, index) => (
                                    <React.Fragment key={index}>
                                        <span className={`${index === breadcrumb.length - 1 ? 'text-cyan-400' : 'text-slate-500'}`}>
                                            {name}
                                        </span>
                                        {index < breadcrumb.length - 1 && (
                                            <ChevronRight size={18} className="text-slate-700" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </h1>

                            {/* CATEGORY PROMPT EDITOR - Compact */}
                            <div className="relative group">
                                <textarea
                                    value={selectedCategory?.description || ''}
                                    onChange={(e) => onUpdateCategory(selectedCategoryId, { description: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500 text-slate-300 text-sm leading-relaxed p-3 outline-none resize-none h-16 transition-all"
                                    placeholder="Category context for AI generation..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Bulk Actions Toolbar - Only visible when items selected */}
                    {selectedPostIds.size > 0 && (
                        <div className="flex items-center justify-between bg-slate-900 p-2 border border-slate-800">
                            <div className="flex items-center gap-4 px-2">
                                <span className="text-sm font-mono text-cyan-400">{selectedPostIds.size} selected</span>
                                <div className="h-4 w-px bg-slate-700" />
                                <button onClick={() => {
                                    const selectedPosts = Array.from(selectedPostIds)
                                        .map(id => posts.find(p => p.id === id))
                                        .filter(p => p?.status === PostStatus.PENDING) as Post[];

                                    selectedPosts.forEach((post, index) => {
                                        setTimeout(() => handleGenerateWithAnimation(post), index * 150);
                                    });
                                    setSelectedPostIds(new Set());
                                }} className="text-xs font-bold text-white hover:text-cyan-400 flex items-center uppercase">
                                    <Sparkles size={14} className="mr-2" /> Generate All
                                </button>
                                <button onClick={() => {
                                    Array.from(selectedPostIds).forEach((id, index) => {
                                        setTimeout(() => handleDeleteWithAnimation(id), index * 150);
                                    });
                                    setSelectedPostIds(new Set());
                                }} className="text-xs font-bold text-white hover:text-red-400 flex items-center uppercase">
                                    <Trash2 size={14} className="mr-2" /> Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Table - now properly INSIDE Column 2 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a] pb-20">
                        {filteredPosts.length === 0 && !isGeneratingTitles ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                    <Sparkles className="text-slate-600" size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Titles Generated Yet</h3>
                                <p className="text-slate-500 max-w-md mb-8">
                                    This category is empty. Generate some title ideas to get started with your content strategy.
                                </p>
                                <button
                                    onClick={() => {
                                        if (selectedCategory) {
                                            setGenCategory(selectedCategory);
                                            setIsGenModalOpen(true);
                                        }
                                    }}
                                    disabled={!selectedCategory}
                                    className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles size={20} />
                                    Generate Titles for {selectedCategory?.name || 'Category'}
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
                                        <th className="p-4">
                                            <div className="flex items-center gap-3">
                                                {isSearchExpanded ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Search size={14} className="text-cyan-400 shrink-0" />
                                                        <input
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            placeholder="Search titles..."
                                                            className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 focus:outline-none"
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
                                                    <>
                                                        <button
                                                            onClick={() => setIsSearchExpanded(true)}
                                                            className="text-slate-500 hover:text-cyan-400 transition-colors"
                                                            title="Search titles"
                                                        >
                                                            <Search size={14} />
                                                        </button>
                                                        <span>IDEA PROMPT</span>
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-4 w-24 text-right">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-sm text-slate-300 font-mono">
                                    {filteredPosts.map(post => {
                                        const isMoving = movingPostId === post.id;
                                        const isDeleting = deletingPostId === post.id;
                                        const isAnimating = isMoving || isDeleting;

                                        if (isAnimating) {
                                            return (
                                                <tr
                                                    key={post.id}
                                                    className={`transition-all duration-[2500ms] ease-out ${isMoving ? 'translate-x-full opacity-0 scale-95' : '-translate-x-full opacity-0 scale-95'}`}
                                                >
                                                    <td colSpan={3} className="p-0 border-b border-slate-800">
                                                        <div className={`h-40 flex flex-col items-center justify-center gap-3 ${isMoving ? 'bg-cyan-950/40 border-l-4 border-cyan-500' : 'bg-red-950/40 border-l-4 border-red-500'}`}>
                                                            {isMoving ? (
                                                                <>
                                                                    <div className="flex items-center gap-3 text-xl font-bold text-cyan-400">
                                                                        <Sparkles className="animate-pulse" size={28} />
                                                                        <span>Generating Post...</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-400">Moving to Editorial Queue</p>
                                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                        <ArrowRight className="animate-bounce" size={16} />
                                                                        <span>Check the Posts tab to review</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="flex items-center gap-3 text-xl font-bold text-red-400">
                                                                        <Trash2 className="animate-pulse" size={28} />
                                                                        <span>Deleted</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr
                                                key={post.id}
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
                                                <td className="p-4 align-top">
                                                    <div className="flex flex-col gap-3">
                                                        <input
                                                            value={post.title}
                                                            onChange={(e) => onUpdatePost(post.id, { title: e.target.value })}
                                                            className="w-full bg-transparent font-bold text-white text-lg focus:text-cyan-400 px-0 outline-none border-none placeholder-slate-600"
                                                            placeholder="Enter Title..."
                                                        />
                                                        <div className="relative">
                                                            <textarea
                                                                value={post.teaser || ''}
                                                                onChange={(e) => onUpdatePost(post.id, { teaser: e.target.value })}
                                                                placeholder="Describe the post content, angle, or generation prompt..."
                                                                className="w-full bg-[#020617] text-slate-400 text-sm leading-relaxed p-4 border border-slate-800 focus:border-cyan-500/50 outline-none resize-none h-32 custom-scrollbar"
                                                            />
                                                        </div>
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
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top pt-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleGenerateWithAnimation(post)}
                                                            className="w-8 h-8 flex items-center justify-center border border-cyan-800 text-cyan-400 hover:bg-cyan-950 hover:border-cyan-500 transition-colors"
                                                            title="Generate Post"
                                                        >
                                                            <Sparkles size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteWithAnimation(post.id)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-950/30 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredPosts.length === 0 && isGeneratingTitles && (
                                        <tr>
                                            <td colSpan={3} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                                                    <span className="text-slate-400 font-mono text-sm uppercase tracking-wider">
                                                        Generating Titles...
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
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {isCreatorOpen && (
                    <CategoryCreator
                        parentId={creatorParentId}
                        parentName={categories.find(c => c.id === creatorParentId)?.name}
                        onClose={() => setIsCreatorOpen(false)}
                        onAddBatch={(cats) => {
                            cats.forEach(c => onAddCategory(c.name, creatorParentId, c.description));
                            setIsCreatorOpen(false);
                        }}
                        organizationId={organizationId}
                        projectId={projectId}
                    />
                )}

                {isGenModalOpen && genCategory && (
                    <GenModal
                        key={`gen-modal-${genCategory.id}-${Date.now()}`}
                        category={genCategory}
                        onClose={() => setIsGenModalOpen(false)}
                        onConfirm={(count, context) => {
                            onQueueTitles(genCategory.id, count, context);
                            setIsGenModalOpen(false);
                        }}
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
                        key={`bulk-gen-${Date.now()}`}
                        categories={categories}
                        selectedIds={checkedCategoryIds}
                        onConfirm={handleBulkGenerate}
                        onCancel={() => setShowBulkGenerateModal(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
