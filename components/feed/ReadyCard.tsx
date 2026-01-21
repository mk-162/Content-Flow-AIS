import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye, Pencil, Trash2, X, ChevronRight, Plus, ImageIcon } from 'lucide-react';
import { Post } from '../../types';
import { feedColors, feedCard, feedButton } from '../../styles/designTokens';
import { KeywordTable, MOCK_KEYWORDS } from './KeywordTable';
import { FeaturedImageEditor } from './FeaturedImageEditor';

interface ReadyCardProps {
  post: Post;
  categoryName?: string;
  categoryBreadcrumb?: string[];
  categoryImage?: {
    url: string;
    altText?: string;
  } | null;
  onApprove?: (id: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: { title?: string; teaser?: string; keyPoints?: string[]; metaDescription?: string; metaKeywords?: string[] }) => void;
  onImageUpdate?: (postId: string, image: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: any;
    providerId: string;
    aspectRatio: string;
  } | undefined) => void;
}

// Mock key points for when pitch data is missing
const MOCK_KEY_POINTS = [
  'Energy-efficient equipment ROI breakdown',
  'Waste reduction strategies with case studies',
  'Water recycling systems comparison',
  'Employee engagement in sustainability programs',
];

export const ReadyCard: React.FC<ReadyCardProps> = ({
  post,
  categoryName,
  categoryBreadcrumb,
  categoryImage,
  onApprove,
  onPreview,
  onDelete,
  onUpdate,
  onImageUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Editable state
  const initialTitle = post.pitch?.headline || post.title;
  const initialTeaser = post.teaser || '';
  const initialKeyPoints = post.pitch?.keyPoints?.length ? post.pitch.keyPoints : MOCK_KEY_POINTS;

  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editTeaser, setEditTeaser] = useState(initialTeaser);
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>(initialKeyPoints);

  // Use metaKeywords (AI-generated) if available, fall back to pitch.targetKeywords, then mock
  const hasMetaKeywords = post.metaKeywords && Array.isArray(post.metaKeywords) && post.metaKeywords.length > 0;
  const hasStructuredKeywords = post.pitch?.targetKeywords && post.pitch.targetKeywords.length > 0;
  const structuredKeywords = hasStructuredKeywords ? post.pitch.targetKeywords : MOCK_KEYWORDS;

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(post.id, {
        title: editTitle,
        teaser: editTeaser,
        keyPoints: editKeyPoints.filter(kp => kp.trim() !== ''),
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(initialTitle);
    setEditTeaser(initialTeaser);
    setEditKeyPoints(initialKeyPoints);
    setIsEditing(false);
  };

  const handleAddKeyPoint = () => {
    setEditKeyPoints([...editKeyPoints, '']);
  };

  const handleRemoveKeyPoint = (idx: number) => {
    setEditKeyPoints(editKeyPoints.filter((_, i) => i !== idx));
  };

  const handleKeyPointChange = (idx: number, value: string) => {
    const updated = [...editKeyPoints];
    updated[idx] = value;
    setEditKeyPoints(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: -300,
        scale: 0.9,
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1],
        }
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      layout="position"
      layoutId={`ready-card-${post.id}`}
      className={feedCard.ready}
    >
      {/* Header with category + actions - matches PitchCard */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-zinc-800/50">
        {/* Left: Status badge + Category */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Ready badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: feedColors.state.ready
            }}
          >
            <Check size={12} />
            Ready
          </div>

          {/* Category pill */}
          {(categoryBreadcrumb?.length || categoryName) && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: feedColors.brand.primary
              }}
            >
              {categoryBreadcrumb && categoryBreadcrumb.length > 0 ? (
                categoryBreadcrumb.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight size={10} className="opacity-50" />}
                    <span>{crumb}</span>
                  </React.Fragment>
                ))
              ) : (
                <span>{categoryName}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 transition-colors text-sm font-medium"
                title="Save changes"
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
              >
                <X size={14} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onPreview(post.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
                title="Preview article"
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
                title="Edit post"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this post? This action cannot be undone.')) {
                    onDelete(post.id);
                  }
                }}
                className="p-2 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete post"
              >
                <Trash2 size={16} />
              </button>
              {/* Approve button - send to Launch Pad */}
              {onApprove && (
                <button
                  onClick={() => onApprove(post.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/20"
                  title="Approve and send to Launch Pad"
                >
                  <Check size={14} />
                  Approve
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two-column layout: Content left, Image+Keywords right - matches PitchCard */}
      <div className="flex">
        {/* Left column: Title, Teaser, Key Points */}
        <div className="flex-1 p-5 border-r border-zinc-800/50">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Editable Title */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                    Post Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white text-lg font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    placeholder="Enter post title..."
                  />
                </div>

                {/* Editable Teaser */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                    Teaser Text
                  </label>
                  <textarea
                    value={editTeaser}
                    onChange={(e) => setEditTeaser(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm leading-relaxed focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors resize-none"
                    placeholder="Brief teaser that hooks the reader..."
                  />
                </div>

                {/* Editable Key Points */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Key Points Covered
                    </label>
                    <button
                      onClick={handleAddKeyPoint}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Plus size={12} />
                      Add Point
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editKeyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => handleKeyPointChange(idx, e.target.value)}
                          className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                          placeholder="Enter key point..."
                        />
                        <button
                          onClick={() => handleRemoveKeyPoint(idx)}
                          className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="viewing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Title */}
                <h2
                  className="text-xl font-semibold leading-snug tracking-tight mb-4"
                  style={{ color: feedColors.text.primary, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  "{editTitle}"
                </h2>

                {/* Creation date + Teaser */}
                <div className="mb-4">
                  <span className="text-[10px] text-zinc-500">
                    Created {post.createdAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Unknown'}
                  </span>
                  {editTeaser && (
                    <p className="text-sm text-zinc-400 leading-relaxed mt-2">
                      {editTeaser}
                    </p>
                  )}
                </div>

                {/* Key Points - all completed */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                    Key Points (covered in article)
                  </span>
                  <ul className="space-y-1.5">
                    {editKeyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check
                          size={14}
                          className="mt-1 shrink-0"
                          style={{ color: feedColors.brand.success }}
                        />
                        <span className="text-sm text-zinc-300 leading-relaxed">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Image + Keywords */}
        <div className="w-80 shrink-0 p-5 bg-zinc-900/30 flex flex-col gap-4">
          {/* Featured Image Editor */}
          {onImageUpdate ? (
            <FeaturedImageEditor
              postId={post.id}
              currentImage={post.heroImage ? {
                url: post.heroImage.url,
                prompt: post.heroImage.prompt,
                altText: post.heroImage.altText
              } : null}
              categoryImage={categoryImage}
              postTitle={editTitle}
              onImageUpdate={onImageUpdate}
            />
          ) : (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                Featured Image
              </span>
              {(post.heroImage?.url || categoryImage?.url) ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700/50">
                  <img
                    src={post.heroImage?.url || categoryImage?.url}
                    alt={post.heroImage?.altText || categoryImage?.altText || categoryName || 'Featured image'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center bg-zinc-800/30">
                  <ImageIcon size={24} className="text-zinc-600 mb-2" />
                  <span className="text-[10px] text-zinc-500">No image set</span>
                </div>
              )}
            </div>
          )}

          {/* Keywords */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3 block">
              Target Keywords
            </span>
            {hasMetaKeywords ? (
              <div className="flex flex-wrap gap-1.5">
                {(post.metaKeywords as string[]).map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <KeywordTable keywords={structuredKeywords} compact />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
