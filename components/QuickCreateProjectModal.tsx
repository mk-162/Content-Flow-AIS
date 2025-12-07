import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Globe, Loader2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { ProjectType } from '../types';

interface QuickCreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdvancedSetup?: () => void;
}

export const QuickCreateProjectModal: React.FC<QuickCreateProjectModalProps> = ({
    isOpen,
    onClose,
    onAdvancedSetup,
}) => {
    const { projects, createProject } = useProject();
    const navigate = useNavigate();

    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [projectType, setProjectType] = useState<ProjectType>(ProjectType.CONTENT);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill URL from most recent project
    useEffect(() => {
        if (isOpen && projects.length > 0) {
            const mostRecentProject = projects.reduce((latest, project) => {
                return project.createdAt > latest.createdAt ? project : latest;
            });
            if (mostRecentProject.websiteUrl) {
                setWebsiteUrl(mostRecentProject.websiteUrl);
            }
        }
    }, [isOpen, projects]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setProjectName('');
            setDescription('');
            setError('');
            setShowAdvancedOptions(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!projectName.trim()) {
            setError('Project name is required');
            return;
        }

        try {
            setCreating(true);

            // Create project
            await createProject(projectName.trim(), description.trim() || 'Quick-created project', {
                websiteUrl: websiteUrl.trim() || undefined,
                projectType,
            });

            // Close modal and navigate to workspace
            onClose();
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to create project');
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                onClick={!creating ? onClose : undefined}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900 border border-slate-700 w-full max-w-lg shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Quick Create</h2>
                                <p className="text-xs text-slate-500">Get started in seconds</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={creating}
                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {/* Project Name */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g., My Content Project"
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                disabled={creating}
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                Description
                                <span className="text-slate-600 font-normal ml-1">(optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What content will this project focus on?"
                                rows={2}
                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                                disabled={creating}
                            />
                        </div>

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                        >
                            <span>Advanced Options</span>
                            {showAdvancedOptions ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {/* Advanced Options */}
                        {showAdvancedOptions && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4 pt-2"
                            >
                                {/* Website URL */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-3 h-3" />
                                            <span>Website URL</span>
                                        </div>
                                    </label>
                                    <input
                                        type="url"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                        disabled={creating}
                                    />
                                </div>

                                {/* Project Type */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                        Project Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: ProjectType.CONTENT, label: 'Content', desc: 'Blog & SEO' },
                                            { value: ProjectType.SOCIAL_MEDIA, label: 'Social', desc: 'Social posts' },
                                            { value: ProjectType.PRODUCT_DESCRIPTIONS, label: 'Products', desc: 'E-commerce' },
                                            { value: ProjectType.IMAGE_GENERATION, label: 'Images', desc: 'AI images' },
                                        ].map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setProjectType(type.value)}
                                                disabled={creating}
                                                className={`
                                                    p-3 border text-left transition-colors
                                                    ${projectType === type.value
                                                        ? 'bg-cyan-500/10 border-cyan-500'
                                                        : 'bg-slate-950 border-slate-700 hover:border-slate-600'
                                                    }
                                                `}
                                            >
                                                <div className="text-sm font-medium text-white">{type.label}</div>
                                                <div className="text-xs text-slate-500">{type.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={creating || !projectName.trim()}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Create Project
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={creating}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-3 px-4 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Advanced Setup Link */}
                        {onAdvancedSetup && (
                            <div className="text-center pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={onAdvancedSetup}
                                    className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                    disabled={creating}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Want AI-powered setup? Try Advanced Setup</span>
                                </button>
                            </div>
                        )}
                    </form>
                </motion.div>
            </div>
        </>
    );
};

export default QuickCreateProjectModal;
