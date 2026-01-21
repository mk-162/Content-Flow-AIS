import React, { useState, useEffect } from 'react';
import {
    X,
    RefreshCw,
    FileText,
    AlertCircle,
    CheckCircle,
    Loader2,
    Info,
    Globe,
    Building2,
    Sparkles
} from 'lucide-react';
import { Project, BusinessProfile } from '../types';
import { analyzeWebsite } from '../services/websiteAnalysisService';
import { generateAdditionalContext } from '../services/geminiService';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onRefreshComplete: (newProfile: BusinessProfile) => void;
}

export const ResearchRefreshModal: React.FC<Props> = ({
    isOpen,
    onClose,
    project,
    onRefreshComplete
}) => {
    const [additionalText, setAdditionalText] = useState(project.businessProfile?.additionalResearchText || '');
    const [websiteUrl, setWebsiteUrl] = useState(project.businessProfile?.websiteUrl || project.websiteUrl || '');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGeneratingContext, setIsGeneratingContext] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percent: 0 });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Fix #9: Extract stable primitive values to prevent infinite loops from object reference changes
    const profileAdditionalText = project.businessProfile?.additionalResearchText || '';
    const profileWebsiteUrl = project.businessProfile?.websiteUrl || project.websiteUrl || '';

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setAdditionalText(profileAdditionalText);
            setWebsiteUrl(profileWebsiteUrl);
            setError(null);
            setSuccess(false);
            setProgress({ stage: '', percent: 0 });
        }
        // Only depend on isOpen to reset when modal opens, not on the values themselves
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleGenerateContext = async () => {
        const urlToUse = websiteUrl.trim();
        if (!urlToUse) {
            setError('Please enter a website URL first');
            return;
        }

        // Basic URL validation
        try {
            new URL(urlToUse.startsWith('http') ? urlToUse : `https://${urlToUse}`);
        } catch {
            setError('Please enter a valid website URL');
            return;
        }

        const normalizedUrl = urlToUse.startsWith('http') ? urlToUse : `https://${urlToUse}`;

        setIsGeneratingContext(true);
        setError(null);

        try {
            const generatedContext = await generateAdditionalContext(normalizedUrl);
            setAdditionalText(generatedContext);
        } catch (err: any) {
            console.error('[ResearchRefresh] Error generating context:', err);
            setError(err.message || 'Failed to generate context. Please try again.');
        } finally {
            setIsGeneratingContext(false);
        }
    };

    const handleRefresh = async () => {
        const urlToUse = websiteUrl.trim();
        if (!urlToUse) {
            setError('Please enter a website URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(urlToUse.startsWith('http') ? urlToUse : `https://${urlToUse}`);
        } catch {
            setError('Please enter a valid website URL');
            return;
        }

        const normalizedUrl = urlToUse.startsWith('http') ? urlToUse : `https://${urlToUse}`;

        setIsRefreshing(true);
        setError(null);
        setSuccess(false);

        try {
            // Run the analysis with additional text
            const newProfile = await analyzeWebsite(
                normalizedUrl,
                (stage, percent) => setProgress({ stage, percent }),
                additionalText.trim() || undefined
            );

            // Preserve existing ID and merge with new profile
            const updatedProfile: BusinessProfile = {
                ...newProfile,
                id: project.businessProfile?.id || `profile_${Date.now()}`,
                websiteUrl: normalizedUrl,
                additionalResearchText: additionalText.trim() || undefined,
                lastRefreshedAt: Timestamp.now(),
            };

            // Update Firestore
            const projectRef = doc(db, `organizations/${project.organizationId}/projects/${project.id}`);
            await updateDoc(projectRef, {
                businessProfile: updatedProfile,
                updatedAt: Timestamp.now()
            });

            setSuccess(true);
            onRefreshComplete(updatedProfile);

            // Close modal after short delay
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err: any) {
            console.error('[ResearchRefresh] Error:', err);
            setError(err.message || 'Failed to refresh research. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!isOpen) return null;

    const lastAnalyzed = project.businessProfile?.lastRefreshedAt?.toDate?.() ||
        project.businessProfile?.analyzedAt?.toDate?.();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                            <RefreshCw size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Refresh Research</h2>
                            <p className="text-sm text-slate-400">Re-analyze website with updated research</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isRefreshing}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Website URL Input */}
                    <div className="bg-slate-950 border border-slate-800 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Globe size={18} className="text-cyan-400" />
                            <span className="text-sm font-medium text-slate-300">Website URL</span>
                        </div>
                        <input
                            type="url"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            disabled={isRefreshing}
                            placeholder="https://example.com"
                            className="w-full bg-slate-900 border border-slate-700 py-2.5 px-4 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none transition-colors disabled:opacity-50"
                        />
                        {lastAnalyzed && (
                            <p className="text-xs text-slate-500 mt-2">
                                Last analyzed: {lastAnalyzed.toLocaleDateString()} at {lastAnalyzed.toLocaleTimeString()}
                            </p>
                        )}
                        {!websiteUrl && (
                            <p className="text-xs text-amber-400 mt-2">
                                Enter your website URL to run research
                            </p>
                        )}
                    </div>

                    {/* Current Business Profile Summary */}
                    {project.businessProfile && (
                        <div className="bg-slate-950 border border-slate-800 p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Building2 size={18} className="text-emerald-400" />
                                <span className="text-sm font-medium text-slate-300">Current Profile</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-slate-500">Business:</span> <span className="text-slate-200">{project.businessProfile.businessName || 'Unknown'}</span></p>
                                <p><span className="text-slate-500">Industry:</span> <span className="text-slate-200">{project.businessProfile.industry?.primary || 'Unknown'}</span></p>
                                <p className="text-slate-400 text-xs line-clamp-2">{project.businessProfile.businessSummary}</p>
                            </div>
                        </div>
                    )}

                    {/* Additional Research Text */}
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                                <FileText size={18} className="text-amber-400 mt-0.5" />
                                <div>
                                    <label className="block text-sm font-medium text-slate-200">
                                        Additional Research Context
                                    </label>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Add extra information about your business that may not be on your website.
                                        This helps generate more accurate and relevant content categories.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerateContext}
                                disabled={isGeneratingContext || isRefreshing || !websiteUrl.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                title="Generate context from website"
                            >
                                {isGeneratingContext ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>

                        <textarea
                            value={additionalText}
                            onChange={(e) => setAdditionalText(e.target.value)}
                            disabled={isRefreshing || isGeneratingContext}
                            rows={8}
                            placeholder="Examples of helpful information:

- Detailed description of your services/products
- Target customer demographics and pain points
- Key differentiators from competitors
- Industry-specific terminology
- Geographic areas you serve
- Company mission and values
- Recent company news or updates
- Compliance or regulatory requirements"
                            className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 text-sm focus:border-amber-500 outline-none transition-colors resize-y min-h-[200px] placeholder:text-slate-600 disabled:opacity-50"
                        />

                        <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20">
                            <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-300">
                                <strong>Tip:</strong> The more context you provide, the better the AI can understand your business
                                and generate relevant content categories. Include information about your unique value proposition,
                                target market, and key offerings.
                            </p>
                        </div>
                    </div>

                    {/* Progress */}
                    {isRefreshing && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <Loader2 size={18} className="text-cyan-400 animate-spin" />
                                <span className="text-sm text-cyan-400">{progress.stage || 'Starting analysis...'}</span>
                            </div>
                            <div className="h-2 bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 text-center">{progress.percent}% complete</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm text-rose-400 font-medium">Analysis Failed</p>
                                <p className="text-xs text-rose-300 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle size={18} className="text-emerald-400" />
                            <div>
                                <p className="text-sm text-emerald-400 font-medium">Research Refreshed Successfully!</p>
                                <p className="text-xs text-emerald-300 mt-1">Your business profile has been updated with the latest analysis.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-950/50">
                    <button
                        onClick={onClose}
                        disabled={isRefreshing}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || success}
                        className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm uppercase tracking-wider transition-colors"
                    >
                        {isRefreshing ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Analyzing...
                            </>
                        ) : success ? (
                            <>
                                <CheckCircle size={16} />
                                Done
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                Refresh Research
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
