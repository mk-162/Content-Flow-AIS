import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  Plus,
  FileText,
  Trash2,
  ChevronRight,
  Loader2,
  Check,
  ImageIcon,
  Wand2,
  UploadCloud,
  ChevronDown,
  Pencil,
  X,
  Clock,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Category } from '../../types';
import { feedColors } from '../../styles/designTokens';
import { imageGenerationService } from '../../services/imageGenerationService';
import { imageUploadService } from '../../services/imageUploadService';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { formatRelativeTime } from '../../hooks/useResearchStatus';

interface CategoryCardProps {
  category: Category;
  isParent: boolean;
  parentName?: string;
  categoryBreadcrumb?: string[];
  articleCount: number;
  isResearchRunning?: boolean;
  hasResearch?: boolean;
  researchProgress?: number;
  researchElapsedSeconds?: number;
  researchCompletedAt?: Date | null;
  isGeneratingBriefs?: boolean;
  generatingBriefsCount?: number;
  onResearch: () => void;
  onViewResearch?: () => void;
  onGenerateSubcategories?: () => void;
  onGenerateStubs?: (count: number) => void;
  onViewArticles: () => void;
  onUpdateCategory: (updates: Partial<Category>) => void;
  onDelete: () => void;
}

const STUB_COUNT_OPTIONS = [3, 5, 7, 10, 15, 20];

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isParent,
  parentName,
  categoryBreadcrumb,
  articleCount,
  isResearchRunning = false,
  hasResearch = false,
  researchProgress = 0,
  researchElapsedSeconds = 0,
  researchCompletedAt = null,
  isGeneratingBriefs = false,
  generatingBriefsCount = 5,
  onResearch,
  onViewResearch,
  onGenerateSubcategories,
  onGenerateStubs,
  onViewArticles,
  onUpdateCategory,
  onDelete,
}) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editDescription, setEditDescription] = useState(category.description || '');
  const [stubCount, setStubCount] = useState(5);
  const [showStubDropdown, setShowStubDropdown] = useState(false);

  // Image editing state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [imagePrompt, setImagePrompt] = useState(
    category.heroImage?.prompt || `A professional hero image for ${category.name}`
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keywords from category
  const keywords = category.keywordCluster?.slice(0, 8) || [];

  const handleSave = () => {
    onUpdateCategory({
      name: editName,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(category.name);
    setEditDescription(category.description || '');
    setIsEditing(false);
  };

  const handleGenerateImage = async () => {
    if (!currentOrg || !currentProject || !user) return;

    setIsGeneratingImage(true);
    try {
      const result = await imageGenerationService.generateImage({
        prompt: imagePrompt,
        aspectRatio: '16:9',
        organizationId: currentOrg.id,
        projectId: currentProject.id,
        userId: user.uid,
      });

      if (result.success && result.url) {
        onUpdateCategory({
          heroImage: {
            url: result.url,
            prompt: imagePrompt,
            altText: `Hero image for ${category.name}`,
            generatedAt: Timestamp.now(),
            providerId: result.providerId || 'replicate',
            aspectRatio: '16:9',
          }
        });
      }
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGeneratingImage(false);
      setShowPromptEditor(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg || !currentProject) return;

    setIsGeneratingImage(true);
    try {
      const result = await imageUploadService.uploadImage(
        file,
        currentOrg.id,
        currentProject.id,
        `category-${category.id}`
      );

      if (result.success && result.url) {
        onUpdateCategory({
          heroImage: {
            url: result.url,
            prompt: 'Uploaded image',
            altText: `Hero image for ${category.name}`,
            generatedAt: Timestamp.now(),
            providerId: 'upload',
            aspectRatio: '16:9',
          }
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="border border-zinc-800/50 bg-zinc-900/50"
    >
      {/* Header with status + actions */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-zinc-800/50">
        {/* Left: Type badge + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: isParent ? 'rgba(168, 85, 247, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              color: isParent ? '#a855f7' : '#8b5cf6'
            }}
          >
            {isParent ? 'Parent' : 'Subcategory'}
          </div>

          {/* Breadcrumb trail for subcategories */}
          {!isParent && categoryBreadcrumb && categoryBreadcrumb.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              {categoryBreadcrumb.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={12} className="text-purple-400/50" />}
                  <span className={idx === categoryBreadcrumb.length - 1 ? 'text-purple-400' : 'text-purple-400/70'}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Fallback to simple parent name if no breadcrumb */}
          {!isParent && !categoryBreadcrumb && parentName && (
            <span className="flex items-center gap-1 text-xs text-purple-400/70">
              <ChevronRight size={12} />
              {parentName}
            </span>
          )}

          {hasResearch && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
              <Check size={10} />
              Research
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
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete category"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout: Content left, Image+Keywords right */}
      <div className="flex">
        {/* Left column: Name, Description, Actions */}
        <div className="flex-1 p-5 border-r border-zinc-800/50">
          {isEditing ? (
            <div className="space-y-4">
              {/* Editable Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white text-lg font-semibold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-colors"
                  placeholder="Category name..."
                />
              </div>

              {/* Editable Description */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm leading-relaxed focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-colors resize-none"
                  placeholder="Describe this category..."
                />
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <h2
                className="text-xl font-semibold leading-snug tracking-tight mb-2"
                style={{ color: feedColors.text.primary, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {category.name}
              </h2>

              {/* Article count */}
              <p className="text-sm text-purple-400 mb-3">
                {articleCount} article{articleCount !== 1 ? 's' : ''} generated
              </p>

              {/* Description */}
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                {category.description || 'No description set'}
              </p>

              {/* Meta info */}
              {(category.searchIntent || category.categoryTier) && (
                <div className="text-xs text-zinc-500 mb-4">
                  {category.searchIntent && <span>{category.searchIntent} intent</span>}
                  {category.searchIntent && category.categoryTier && <span> • </span>}
                  {category.categoryTier && <span>{category.categoryTier}</span>}
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
            {/* Research status/button */}
            {isResearchRunning ? (
              /* Running state - show progress */
              <button
                onClick={onResearch}
                className="flex items-center gap-3 px-3 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-300 cursor-pointer hover:bg-violet-600/30 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-violet-400" />
                  <span className="text-sm font-medium">Researching...</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-violet-400">
                  {researchProgress > 0 && (
                    <span className="font-mono">{Math.round(researchProgress)}%</span>
                  )}
                  {researchElapsedSeconds > 0 && (
                    <span className="text-violet-400/70">
                      {Math.floor(researchElapsedSeconds / 60)}m {(researchElapsedSeconds % 60).toString().padStart(2, '0')}s
                    </span>
                  )}
                </div>
                {/* Mini progress bar */}
                <div className="w-16 h-1 bg-violet-900/50 overflow-hidden">
                  <motion.div
                    className="h-full bg-violet-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${researchProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </button>
            ) : hasResearch ? (
              /* Complete state - show view and refresh options */
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30">
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Research Complete</span>
                  {researchCompletedAt && (
                    <span className="text-xs text-emerald-400/60">
                      {formatRelativeTime(researchCompletedAt)}
                    </span>
                  )}
                </div>
                {onViewResearch && (
                  <button
                    onClick={onViewResearch}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  >
                    <Eye size={14} />
                    View Report
                  </button>
                )}
                <button
                  onClick={onResearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Refresh research (20 credits)"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            ) : (
              /* No research - show start button */
              <button
                onClick={onResearch}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                <FlaskConical size={14} />
                Run Deep Research
                <span className="text-violet-200 text-xs">(20 cr)</span>
              </button>
            )}

            {/* Generate Subcategories (parent only) */}
            {isParent && onGenerateSubcategories && (
              <button
                onClick={onGenerateSubcategories}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium border border-zinc-700 transition-colors"
              >
                <Plus size={14} />
                Subcategories
              </button>
            )}

            {/* Generate Briefs with count dropdown (subcategory only) */}
            {!isParent && onGenerateStubs && (
              <div className="flex items-center gap-3">
                {isGeneratingBriefs ? (
                  /* Generating state */
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-cyan-400" />
                    <span className="text-sm italic text-cyan-400">
                      Generating {generatingBriefsCount} briefs...
                    </span>
                  </div>
                ) : (
                  /* Normal button state */
                  <div className="relative">
                    <div className="flex">
                      <button
                        onClick={() => onGenerateStubs(stubCount)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-medium transition-all rounded-l"
                      >
                        <FileText size={14} />
                        Generate {stubCount} Briefs
                      </button>
                      <button
                        onClick={() => setShowStubDropdown(!showStubDropdown)}
                        className="px-2 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white border-l border-cyan-500/50 rounded-r transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {showStubDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 shadow-xl z-10 min-w-[120px]">
                        {STUB_COUNT_OPTIONS.map(count => (
                          <button
                            key={count}
                            onClick={() => {
                              setStubCount(count);
                              setShowStubDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 transition-colors ${
                              count === stubCount ? 'text-cyan-400 bg-zinc-700/50' : 'text-zinc-300'
                            }`}
                          >
                            {count} briefs
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Show "View briefs" link when articles exist */}
                {articleCount > 0 && !isGeneratingBriefs && (
                  <button
                    onClick={onViewArticles}
                    className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    View {articleCount} brief{articleCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}

            {/* View Articles */}
            <button
              onClick={onViewArticles}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-auto"
            >
              View Articles
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right column: Image + Keywords */}
        <div className="w-80 shrink-0 p-5 bg-zinc-900/30 flex flex-col gap-4">
          {/* Featured Image Editor */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
              Category Image
            </span>

            {category.heroImage?.url ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700/50 group">
                <img
                  src={category.heroImage.url}
                  alt={category.heroImage.altText || category.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowPromptEditor(true)}
                    className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded transition-colors"
                    title="Regenerate with prompt"
                  >
                    <Wand2 size={14} />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded transition-colors"
                    title="Upload image"
                  >
                    <UploadCloud size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center bg-zinc-800/30">
                {isGeneratingImage ? (
                  <>
                    <Loader2 size={24} className="text-purple-400 animate-spin mb-2" />
                    <span className="text-[10px] text-zinc-500">Generating...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={24} className="text-zinc-600 mb-2" />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPromptEditor(true)}
                        className="px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
                      >
                        Upload
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Prompt editor */}
            {showPromptEditor && (
              <div className="mt-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded">
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 text-sm text-zinc-300 focus:outline-none focus:border-purple-500 resize-none mb-2"
                  placeholder="Describe the image..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="flex-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-xs font-medium transition-colors"
                  >
                    {isGeneratingImage ? 'Generating...' : 'Generate'}
                  </button>
                  <button
                    onClick={() => setShowPromptEditor(false)}
                    className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Keywords */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
              Keywords
            </span>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-purple-500/10 text-purple-400 rounded border border-purple-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Run research to generate keywords</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryCard;
