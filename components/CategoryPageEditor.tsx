import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Eye,
  EyeOff,
  FolderOpen,
  Save,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import { Post, PostStatus } from '../types';
import { TiptapEditor, TiptapViewer } from './TiptapEditor';
import { ImageInspectorControl } from './ImageInspectorControl';
import { Timestamp } from 'firebase/firestore';

// Loading bar component (matching PostsWorkspace)
const LoadingBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-1 bg-slate-700 rounded-full overflow-hidden ${className}`}>
    <motion.div
      className="h-full w-1/3 bg-purple-500 rounded-full"
      animate={{ x: ['0%', '200%'] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

interface CategoryPageEditorProps {
  post: Post;
  onUpdate: (id: string, updates: Partial<Post>) => Promise<void>;
  onQueueRegenerate: () => void;
  categories: { id: string; name: string; parentId: string | null }[];
}

export const CategoryPageEditor: React.FC<CategoryPageEditorProps> = ({
  post,
  onUpdate,
  onQueueRegenerate,
  categories,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [showAiInstructions, setShowAiInstructions] = useState(false);

  // Get category name for display
  const getCategoryBreadcrumb = (catId: string) => {
    const trail: string[] = [];
    let current = categories.find(c => c.id === catId);

    while (current) {
      trail.unshift(current.name);
      current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
    }

    return trail.length > 0 ? trail.join(' / ') : 'Uncategorized';
  };

  const handleSave = () => {
    setEditMode(false);
  };

  const handleImageUpdate = async (imageData: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: Timestamp;
    providerId: string;
    aspectRatio: string;
  } | undefined) => {
    await onUpdate(post.id, { heroImage: imageData });
  };

  const isGenerating = post.status === PostStatus.GENERATING;

  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden min-h-[800px]"
    >
      {/* Header */}
      <div className="px-6 pt-4 pb-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen size={12} />
              Category Page
            </span>
            <span className="text-xs text-slate-500">
              {getCategoryBreadcrumb(post.categoryId)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editMode ? handleSave() : setEditMode(true)}
              disabled={isGenerating}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                editMode
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {editMode ? <><Save size={12} /> Save</> : <><Edit3 size={12} /> Edit</>}
            </button>
            <button
              onClick={() => {
                if (confirm('This will regenerate the category page content using AI. Your current content will be overwritten. Continue?')) {
                  onQueueRegenerate();
                }
              }}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-200 leading-snug">
          {post.title}
        </h1>
      </div>

      {/* Generating State */}
      {isGenerating && (
        <div className="px-6 py-8 text-center border-b border-slate-800">
          <LoadingBar className="w-48 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Generating category page content...</p>
        </div>
      )}

      {/* Hero Image Section */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Hero Image
        </h3>
        <ImageInspectorControl
          currentImage={post.heroImage}
          postTitle={post.title}
          postTeaser={post.categoryPageContent?.aiInstructions || ''}
          onImageUpdate={handleImageUpdate}
        />
      </div>

      {/* Page Introduction Content */}
      <div className="px-6 py-4 border-b border-slate-800">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Page Introduction
        </h3>
        {isGenerating ? (
          <div className="py-12 text-center text-slate-600">
            <p>Content is being generated...</p>
          </div>
        ) : editMode ? (
          <TiptapEditor
            content={post.categoryPageContent?.introduction || post.content || ''}
            onChange={(val) => onUpdate(post.id, {
              content: val,
              categoryPageContent: {
                ...post.categoryPageContent,
                introduction: val
              }
            })}
            placeholder="Write the category page introduction..."
          />
        ) : (post.categoryPageContent?.introduction || post.content) ? (
          <TiptapViewer content={post.categoryPageContent?.introduction || post.content || ''} />
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-800">
            <p className="text-slate-500 mb-4">No content generated yet.</p>
            <button
              onClick={onQueueRegenerate}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold uppercase tracking-wider"
            >
              <Sparkles size={14} className="inline mr-2" />
              Generate with AI
            </button>
          </div>
        )}
      </div>

      {/* AI Instructions (Private) - Collapsible */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
        <button
          onClick={() => setShowAiInstructions(!showAiInstructions)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-400 transition-colors"
        >
          {showAiInstructions ? <EyeOff size={12} /> : <Eye size={12} />}
          AI Generation Instructions (Private)
        </button>
        <AnimatePresence>
          {showAiInstructions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <textarea
                value={post.categoryPageContent?.aiInstructions || ''}
                onChange={(e) => onUpdate(post.id, {
                  categoryPageContent: {
                    ...post.categoryPageContent,
                    introduction: post.categoryPageContent?.introduction || '',
                    aiInstructions: e.target.value
                  }
                })}
                className="w-full mt-3 bg-slate-900 border border-slate-700 p-3 text-sm text-slate-300 min-h-[100px] focus:border-purple-500 outline-none resize-y"
                placeholder="Instructions for AI when generating/regenerating this page..."
              />
              <p className="text-xs text-slate-600 mt-2">
                These instructions are used when generating content but are not displayed on the published page.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meta Data Section */}
      <div className="px-6 py-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          SEO & Meta Data
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Meta Description</label>
            <textarea
              value={post.metaDescription || ''}
              onChange={(e) => onUpdate(post.id, { metaDescription: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-sm text-slate-200 focus:border-purple-500 outline-none resize-y min-h-[80px]"
              placeholder="Enter meta description for SEO..."
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] ${(post.metaDescription?.length || 0) > 160 ? 'text-red-500' : 'text-slate-600'}`}>
                {post.metaDescription?.length || 0}/160
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Meta Keywords (comma separated)</label>
            <input
              value={Array.isArray(post.metaKeywords) ? post.metaKeywords.join(', ') : ''}
              onChange={(e) => onUpdate(post.id, {
                metaKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
              })}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-sm text-slate-200 focus:border-purple-500 outline-none"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryPageEditor;
