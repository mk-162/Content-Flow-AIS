import React, { useState, useEffect } from 'react';
import {
    X,
    Image as ImageIcon,
    Wand2,
    RefreshCw,
    Check,
    AlertCircle,
    Download
} from 'lucide-react';
import { imageGenerationService, ImageGenerationResult } from '../services/imageGenerationService';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { CREDIT_COSTS } from '../services/creditService';

interface ImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelected: (result: ImageGenerationResult) => void;
    initialPrompt?: string;
    postTitle?: string;
}

export const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({
    isOpen,
    onClose,
    onImageSelected,
    initialPrompt = '',
    postTitle
}) => {
    const { currentOrg } = useOrganization();
    const { currentProject } = useProject();
    const { user } = useAuth();

    const [prompt, setPrompt] = useState(initialPrompt);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '4:3'>('16:9');
    const [loading, setLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<ImageGenerationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-generate prompt if empty and post title exists
    useEffect(() => {
        if (isOpen && !prompt && postTitle) {
            const generatePrompt = async () => {
                try {
                    const autoPrompt = await imageGenerationService.generateImagePrompt(postTitle, '');
                    setPrompt(autoPrompt);
                } catch (e) {
                    console.error('Error generating prompt:', e);
                }
            };
            generatePrompt();
        }
    }, [isOpen, postTitle, prompt]);

    const handleGenerate = async () => {
        if (!currentOrg || !currentProject || !user) return;
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        setLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await imageGenerationService.generateImage(
                currentOrg.id,
                currentProject.id,
                user.id,
                {
                    prompt,
                    aspectRatio,
                    orgSlug: currentOrg.slug,
                    projectSlug: currentProject.slug
                }
            );
            setGeneratedImage(result);
        } catch (err: any) {
            console.error('Generation failed:', err);
            setError(err.message || 'Failed to generate image');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Wand2 className="text-purple-400" />
                            AI Image Generator
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Create unique images for your content using AI.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Input Section */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Image Prompt
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the image you want to generate..."
                                className="w-full h-24 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Aspect Ratio
                            </label>
                            <div className="flex gap-3">
                                {['16:9', '1:1', '4:3'].map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio as any)}
                                        className={`
                                            px-4 py-2 rounded-lg text-sm font-medium border transition-all
                                            ${aspectRatio === ratio
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }
                                        `}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                            <AlertCircle size={20} />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Preview / Result Area */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl min-h-[300px] flex items-center justify-center relative overflow-hidden group">
                        {loading ? (
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-slate-400 animate-pulse">Dreaming up your image...</p>
                                <p className="text-xs text-slate-500 mt-2">Cost: {CREDIT_COSTS.IMAGE_GENERATION} credits</p>
                            </div>
                        ) : generatedImage ? (
                            <>
                                <img
                                    src={generatedImage.url}
                                    alt={prompt}
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => window.open(generatedImage.url, '_blank')}
                                        className="p-3 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition-colors"
                                        title="View Full Size"
                                    >
                                        <Download size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-slate-500">
                                <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Enter a prompt and click Generate</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
                    <div className="text-sm text-slate-500">
                        Cost: <span className="text-white font-medium">{CREDIT_COSTS.IMAGE_GENERATION} credits</span>
                    </div>
                    <div className="flex gap-3">
                        {generatedImage ? (
                            <>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Regenerate
                                </button>
                                <button
                                    onClick={() => onImageSelected(generatedImage)}
                                    className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Check size={18} />
                                    Use Image
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Wand2 size={18} />
                                Generate
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
