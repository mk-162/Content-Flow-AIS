import React, { useState } from 'react';
import {
    Image as ImageIcon,
    Wand2,
    Link as LinkIcon,
    Trash2,
    RefreshCw,
    UploadCloud,
    Check,
    X
} from 'lucide-react';
import { ImageAsset } from '../types';
import { imageGenerationService } from '../services/imageGenerationService';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';

interface Props {
    currentImage?: {
        url: string;
        prompt: string;
        altText: string;
    };
    postTitle?: string;
    postTeaser?: string;
    onImageUpdate: (image: { url: string; prompt: string; altText: string; generatedAt: any; providerId: string; aspectRatio: string } | undefined) => void;
}

export const ImageInspectorControl: React.FC<Props> = ({
    currentImage,
    postTitle = '',
    postTeaser = '',
    onImageUpdate
}) => {
    const { currentOrg } = useOrganization();
    const { currentProject } = useProject();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [prompt, setPrompt] = useState(currentImage?.prompt || '');
    const [showPrompt, setShowPrompt] = useState(false);

    // Initialize prompt if empty and we have post data
    React.useEffect(() => {
        if (!prompt && postTitle && !currentImage) {
            setPrompt(`A high-quality hero image for an article titled "${postTitle}"`);
        }
    }, [postTitle, currentImage, prompt]);

    const handleGenerate = async () => {
        if (!currentOrg || !currentProject || !user) return;

        setLoading(true);
        try {
            // 1. Generate Prompt if needed (simple logic for now)
            const finalPrompt = prompt || `A high-quality hero image for an article titled "${postTitle}"`;

            // 2. Call Service
            const result = await imageGenerationService.generateImage(
                currentOrg.id,
                currentProject.id,
                user.id,
                {
                    prompt: finalPrompt,
                    aspectRatio: '16:9', // Default for hero
                    brandStyle: currentOrg.brandImageStyle
                }
            );

            // 3. Update Parent
            onImageUpdate({
                url: result.url,
                prompt: finalPrompt,
                altText: finalPrompt,
                generatedAt: new Date(), // Should use server timestamp in real app
                providerId: result.assetId,
                aspectRatio: '16:9'
            });

            setShowPrompt(false);

        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate image. Please check your credits and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkUrl = () => {
        if (!linkUrl) return;

        onImageUpdate({
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

    const handleDelete = () => {
        if (confirm('Remove this image?')) {
            onImageUpdate(undefined);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between text-slate-200">
                <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-pink-400" />
                    <span className="font-bold text-sm">Hero Image</span>
                </div>
                {currentImage && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowPrompt(!showPrompt)}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                            title="View Prompt"
                        >
                            <FileTextIcon size={14} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-1.5 hover:bg-rose-900/30 rounded-md text-slate-400 hover:text-rose-400 transition-colors"
                            title="Remove Image"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Main Display */}
            <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex flex-col items-center justify-center">

                {loading ? (
                    <div className="flex flex-col items-center gap-3 text-pink-400 animate-pulse">
                        <Wand2 size={32} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Generating...</span>
                    </div>
                ) : currentImage ? (
                    <>
                        <img
                            src={currentImage.url}
                            alt={currentImage.altText}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                                onClick={handleGenerate}
                                className="flex flex-col items-center gap-1 text-white hover:text-pink-400 transition-colors"
                            >
                                <RefreshCw size={24} />
                                <span className="text-[10px] font-bold uppercase">Regenerate</span>
                            </button>
                        </div>
                    </>
                ) : showLinkInput ? (
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3">
                        <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="Paste Image URL..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:border-pink-500 outline-none"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleLinkUrl}
                                className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setShowLinkInput(false)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg shadow-pink-900/20 transition-all hover:scale-105"
                        >
                            <Wand2 size={16} />
                            Generate with AI
                        </button>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="text-[10px] uppercase tracking-wider font-bold">Or</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowLinkInput(true)}
                                className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                title="Link URL"
                            >
                                <LinkIcon size={16} />
                            </button>
                            <button
                                className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                title="Upload (Coming Soon)"
                                disabled
                            >
                                <UploadCloud size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Prompt Editor (Collapsible) */}
            {(showPrompt || (!currentImage && !loading && !showLinkInput)) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Image Prompt
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-pink-500 outline-none resize-none"
                        placeholder="Describe the image you want..."
                    />
                </div>
            )}
        </div>
    );
};

// Helper Icon
const FileTextIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
);
