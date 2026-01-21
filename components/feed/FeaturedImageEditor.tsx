import React, { useState, useRef } from 'react';
import {
  ImageIcon,
  Wand2,
  Link as LinkIcon,
  UploadCloud,
} from 'lucide-react';
import { imageGenerationService } from '../../services/imageGenerationService';
import { imageUploadService } from '../../services/imageUploadService';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';

interface FeaturedImageEditorProps {
  postId: string;
  currentImage?: {
    url: string;
    prompt?: string;
    altText?: string;
  } | null;
  categoryImage?: {
    url: string;
    altText?: string;
  } | null;
  postTitle?: string;
  onImageUpdate: (postId: string, image: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: any;
    providerId: string;
    aspectRatio: string;
  } | undefined) => void;
}

export const FeaturedImageEditor: React.FC<FeaturedImageEditorProps> = ({
  postId,
  currentImage,
  categoryImage,
  postTitle = '',
  onImageUpdate
}) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { user } = useAuth();

  // Per-card loading state - critical for avoiding the bug where all cards show generating
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Check if prompt looks like base64 data (corrupted)
  const isCorruptedPrompt = (p?: string) => {
    if (!p) return false;
    return p.length > 100 && /^[A-Za-z0-9+/=]+$/.test(p.substring(0, 100));
  };

  const cleanPrompt = isCorruptedPrompt(currentImage?.prompt)
    ? ''
    : (currentImage?.prompt || '');

  const [prompt, setPrompt] = useState(
    cleanPrompt || `A high-quality hero image for an article titled "${postTitle}"`
  );

  // File input ref for uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine which image to display (post's hero image takes priority over category image)
  const displayImage = currentImage || categoryImage;
  const hasPostImage = !!currentImage?.url;

  const handleGenerate = async () => {
    if (!currentOrg || !currentProject || !user) return;

    setIsGenerating(true);
    try {
      const finalPrompt = prompt || `A high-quality hero image for an article titled "${postTitle}"`;

      const result = await imageGenerationService.generateImage(
        currentOrg.id,
        currentProject.id,
        user.id,
        {
          prompt: finalPrompt,
          aspectRatio: '16:9',
          brandStyle: currentOrg.brandImageStyle,
          orgSlug: currentOrg.slug,
          projectSlug: currentProject.slug
        }
      );

      onImageUpdate(postId, {
        url: result.url,
        prompt: finalPrompt,
        altText: finalPrompt,
        generatedAt: new Date(),
        providerId: result.assetId,
        aspectRatio: '16:9'
      });

      setShowPromptEditor(false);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate image. Please check your credits and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLinkUrl = () => {
    if (!linkUrl) return;

    onImageUpdate(postId, {
      url: linkUrl,
      prompt: 'Linked from URL',
      altText: 'Linked Image',
      generatedAt: new Date(),
      providerId: 'external-url',
      aspectRatio: 'custom'
    });
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleUploadClick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg || !currentProject || !user) return;

    e.target.value = '';

    const validation = imageUploadService.validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsGenerating(true);
    setUploadError(null);

    try {
      const result = await imageUploadService.uploadImage(
        file,
        currentOrg.id,
        currentProject.id,
        user.id,
        { altText: file.name.split('.')[0] }
      );

      onImageUpdate(postId, {
        url: result.url,
        prompt: `Uploaded: ${file.name}`,
        altText: file.name.split('.')[0],
        generatedAt: new Date(),
        providerId: result.assetId,
        aspectRatio: 'custom'
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
        Featured Image
      </span>

      {/* Image Display / Generation Area */}
      <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-800/30 group">
        {isGenerating ? (
          // Loading state - only shows on THIS card
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90">
            <Wand2 size={28} className="text-cyan-400 animate-spin mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Generating...
            </span>
          </div>
        ) : displayImage?.url ? (
          // Has image - show with hover overlay for actions
          <>
            <img
              src={displayImage.url}
              alt={displayImage.altText || 'Featured image'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Hover overlay - small icon buttons in corner (matches CategoryCard) */}
            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowPromptEditor(true)}
                className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded transition-colors"
                title="Regenerate with prompt"
              >
                <Wand2 size={14} />
              </button>
              <button
                onClick={() => setShowLinkInput(true)}
                className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded transition-colors"
                title="Link from URL"
              >
                <LinkIcon size={14} />
              </button>
              <button
                onClick={handleUploadClick}
                className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded transition-colors"
                title="Upload image"
              >
                <UploadCloud size={14} />
              </button>
            </div>

            {/* Category image indicator */}
            {!hasPostImage && categoryImage && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] text-zinc-300">
                Category default
              </div>
            )}
          </>
        ) : showLinkInput ? (
          // Link URL input
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste image URL..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleLinkUrl}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded"
              >
                Add
              </button>
              <button
                onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-bold rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // No image - show Generate/Upload buttons (matches CategoryCard)
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ImageIcon size={24} className="text-zinc-600 mb-2" />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPromptEditor(true)}
                className="px-2 py-1 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
              >
                Generate
              </button>
              <button
                onClick={() => setShowLinkInput(true)}
                className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
              >
                Link
              </button>
              <button
                onClick={handleUploadClick}
                className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <p className="text-rose-400 text-[10px] mt-1">{uploadError}</p>
      )}

      {/* Prompt Editor dropdown - only shows when explicitly opened (matches CategoryCard) */}
      {showPromptEditor && (
        <div className="mt-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          {isCorruptedPrompt(currentImage?.prompt) && (
            <p className="text-[10px] text-amber-400 italic mb-2">
              Original prompt was corrupted. Enter a new prompt.
            </p>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500 resize-none mb-2"
            placeholder="Describe the image you want..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 px-2 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/50 text-white text-xs font-medium transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
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
  );
};
