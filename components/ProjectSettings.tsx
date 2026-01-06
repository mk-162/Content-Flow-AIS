import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save,
    AlertTriangle,
    Archive,
    CheckCircle,
    Layout,
    FileText,
    Settings,
    Activity,
    Edit2,
    Terminal,
    HelpCircle,
    Palette,
    Globe,
    Loader2,
    Building2,
    ChevronDown,
    ArrowLeft,
    Zap
} from 'lucide-react';
import { Project, ContentType, PromptType, PromptOverrides, BusinessProfile, Category, TaskType, TIER_FEATURES, SubscriptionTier } from '../types';
import { doc, updateDoc, collection, getDocs, writeBatch, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TaskStatus } from '../types';
import { useOrganization } from '../contexts/OrganizationContext';
import { CREDIT_COSTS } from '../services/creditService';
import { Target } from 'lucide-react';
import { testWordPressConnection } from '../services/wordpressService';

interface Props {
    project: Project;
    onUpdate: () => void;
}

// Simple deep set helper if lodash not available/wanted
const updateNested = (obj: any, path: string, value: any): any => {
    const newObj = JSON.parse(JSON.stringify(obj || {}));
    const keys = path.split('.');
    let current = newObj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return newObj;
};

export const ProjectSettings: React.FC<Props> = ({ project, onUpdate }) => {
    const navigate = useNavigate();
    const { currentOrg } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [activePromptTab, setActivePromptTab] = useState<string | null>(null);

    // Form State - Project Details
    const [projectName, setProjectName] = useState(project.name || '');
    const [projectDescription, setProjectDescription] = useState(project.description || '');

    // Form State - Business Profile
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | undefined>(project.businessProfile);

    // Form State - Settings
    const [velocity, setVelocity] = useState(project.settings?.publishVelocity || 10);
    const [positioning, setPositioning] = useState(project.settings?.positioningStatement || '');
    const [rules, setRules] = useState(project.settings?.rules || '');

    // Form State - Prompt Overrides
    const [promptOverrides, setPromptOverrides] = useState<PromptOverrides>(project.promptOverrides || {});

    // Form State - WordPress
    const [wpSiteUrl, setWpSiteUrl] = useState(project.settings?.wordpress?.siteUrl || '');
    const [wpUsername, setWpUsername] = useState(project.settings?.wordpress?.username || '');
    const [wpAppPassword, setWpAppPassword] = useState(project.settings?.wordpress?.appPassword || '');
    const [wpDefaultStatus, setWpDefaultStatus] = useState<'publish' | 'draft' | 'pending'>(
        project.settings?.wordpress?.defaultStatus || 'draft'
    );
    const [wpTesting, setWpTesting] = useState(false);
    const [wpTestResult, setWpTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Form State - Auto-Generation
    const [autoGenEnabled, setAutoGenEnabled] = useState(project.settings?.autoGeneration?.enabled ?? true);
    const [stubThreshold, setStubThreshold] = useState(project.settings?.autoGeneration?.stubThreshold ?? 5);

    // Deep Research State
    const [enableDeepResearch, setEnableDeepResearch] = useState(project.settings?.enableDeepResearch ?? false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [researchRunning, setResearchRunning] = useState(false);
    const [researchProgress, setResearchProgress] = useState<string | null>(null);

    // UI State - Collapsible Sections
    const [showBusinessContext, setShowBusinessContext] = useState(false);

    // Check tier for deep research access
    const tier = currentOrg?.subscriptionTier || SubscriptionTier.FREE;
    const canUseDeepResearch = TIER_FEATURES[tier].googleDeepResearchEnabled;

    // Fetch categories for deep research
    useEffect(() => {
        const fetchCategories = async () => {
            if (!project.organizationId || !project.id) return;
            try {
                const catsRef = collection(db, `organizations/${project.organizationId}/projects/${project.id}/categories`);
                const snapshot = await getDocs(catsRef);
                const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                setCategories(cats);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, [project.organizationId, project.id]);

    const handleProfileUpdate = (path: string, value: any) => {
        setBusinessProfile(prev => updateNested(prev, path, value));
    };

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const handleSave = async () => {
        // Validate project name
        if (!projectName.trim()) {
            setSuccessMsg('Project name is required');
            return;
        }
        if (projectName.length > 50) {
            setSuccessMsg('Project name must be 50 characters or less');
            return;
        }

        setLoading(true);
        try {
            const projectRef = doc(db, `organizations/${project.organizationId}/projects/${project.id}`);
            await updateDoc(projectRef, {
                name: projectName.trim(),
                description: projectDescription.trim(),
                businessProfile: businessProfile || null, // Save updated profile
                'settings.publishVelocity': Number(velocity),
                'settings.positioningStatement': positioning,
                'settings.rules': rules,
                'settings.autoGeneration': {
                    enabled: autoGenEnabled,
                    stubThreshold: stubThreshold,
                    migrationPromptShown: project.settings?.autoGeneration?.migrationPromptShown
                },
                'settings.enableDeepResearch': enableDeepResearch,
                'settings.wordpress': wpSiteUrl ? {
                    siteUrl: wpSiteUrl,
                    username: wpUsername,
                    appPassword: wpAppPassword,
                    defaultStatus: wpDefaultStatus
                } : null,
                promptOverrides: promptOverrides,
                updatedAt: new Date()
            });
            setSuccessMsg('Settings saved successfully');
            onUpdate();
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestWordPress = async () => {
        if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
            setWpTestResult({ success: false, message: 'Please fill in all WordPress fields' });
            return;
        }
        setWpTesting(true);
        setWpTestResult(null);
        try {
            const result = await testWordPressConnection({
                siteUrl: wpSiteUrl,
                username: wpUsername,
                appPassword: wpAppPassword,
                defaultStatus: wpDefaultStatus
            });
            setWpTestResult(result);
        } catch (error) {
            setWpTestResult({ success: false, message: 'Connection test failed' });
        } finally {
            setWpTesting(false);
        }
    };

    const handleArchive = async () => {
        setLoading(true);
        try {
            const projectRef = doc(db, `organizations/${project.organizationId}/projects/${project.id}`);
            await updateDoc(projectRef, {
                isArchived: true,
                updatedAt: new Date()
            });
            // Redirect or notify parent
            navigate('/projects');
        } catch (error) {
            console.error('Error archiving project:', error);
            setLoading(false);
        }
    };

    const handleClearQueue = async () => {
        if (!confirm('Are you sure? This will remove all pending and processing tasks from the queue. Use this if generation appears stuck.')) return;

        setLoading(true);
        try {
            const queueRef = collection(db, 'generationQueue');
            // Query for tasks related to this project that are not completed
            const q = query(
                queueRef,
                where('projectId', '==', project.id),
                where('status', 'in', [TaskStatus.QUEUED, TaskStatus.PROCESSING])
            );

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            setSuccessMsg(`Cleared ${snapshot.size} tasks from the queue`);
        } catch (error) {
            console.error('Error clearing queue:', error);
            setSuccessMsg('Failed to clear queue'); // Re-using success msg for simplicity or add error state
        } finally {
            setLoading(false);
        }
    };

    const handleRunAllDeepResearch = async () => {
        if (!currentOrg || !project || categories.length === 0) return;

        // Filter categories that don't have complete research
        const catsToResearch = categories.filter(cat =>
            cat.googleDeepResearch?.status !== 'complete' &&
            cat.googleDeepResearch?.status !== 'running'
        );

        if (catsToResearch.length === 0) {
            setSuccessMsg('All categories already have research');
            return;
        }

        const totalCredits = catsToResearch.length * CREDIT_COSTS.GOOGLE_DEEP_RESEARCH;
        const confirmed = confirm(
            `This will run deep research on ${catsToResearch.length} categories.\n\nCost: ${totalCredits} credits (${CREDIT_COSTS.GOOGLE_DEEP_RESEARCH} per category)\n\nContinue?`
        );

        if (!confirmed) return;

        setResearchRunning(true);
        setResearchProgress(`Starting research on ${catsToResearch.length} categories...`);

        try {
            for (let i = 0; i < catsToResearch.length; i++) {
                const cat = catsToResearch[i];
                setResearchProgress(`Queuing ${i + 1}/${catsToResearch.length}: ${cat.name}`);

                // Update category status
                const catRef = doc(db, `organizations/${project.organizationId}/projects/${project.id}/categories`, cat.id);
                await updateDoc(catRef, {
                    'googleDeepResearch.status': 'running',
                    'googleDeepResearch.startedAt': Timestamp.now(),
                    enableGoogleDeepResearch: true,
                    updatedAt: Timestamp.now()
                });

                // Queue research task
                await addDoc(collection(db, 'generationQueue'), {
                    type: TaskType.GOOGLE_DEEP_RESEARCH,
                    organizationId: project.organizationId,
                    projectId: project.id,
                    categoryId: cat.id,
                    categoryName: cat.name,
                    status: TaskStatus.QUEUED,
                    progress: 0,
                    createdBy: 'bulk-research',
                    startedAt: Timestamp.now(),
                });
            }

            setResearchProgress(null);
            setSuccessMsg(`Queued deep research for ${catsToResearch.length} categories`);
        } catch (error) {
            console.error('Error running bulk research:', error);
            setResearchProgress(null);
            setSuccessMsg('Failed to queue research');
        } finally {
            setResearchRunning(false);
        }
    };

    return (
        <div className="w-full h-full bg-slate-900 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/projects')}
                            className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Back to Projects"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-100 mb-1">Project Settings</h1>
                            <p className="text-slate-400 text-sm">Manage configuration and rules for {project.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/20"
                    >
                        {loading ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>

                {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">{successMsg}</span>
                    </div>
                )}

                {/* Project Details */}
                <section className="bg-slate-900 border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3 text-cyan-400 mb-2">
                        <Edit2 size={20} />
                        <h2 className="text-lg font-bold text-slate-200">Project Details</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Project Name
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value.slice(0, 50))}
                                placeholder="My Content Project"
                                maxLength={50}
                                className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-cyan-500 outline-none transition-colors"
                            />
                            <div className="flex justify-between">
                                <p className="text-xs text-slate-500">
                                    This name appears in the project selector and navigation.
                                </p>
                                <span className={`text-xs ${projectName.length > 40 ? 'text-amber-400' : 'text-slate-600'}`}>
                                    {projectName.length}/50
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Project Description
                            </label>
                            <textarea
                                value={projectDescription}
                                onChange={(e) => setProjectDescription(e.target.value)}
                                rows={3}
                                placeholder="Brief description of this content project..."
                                className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-cyan-500 outline-none transition-colors resize-y min-h-[80px]"
                            />
                        </div>
                    </div>
                </section>

                {/* Business Context (Editable) */}
                <section className="bg-slate-900 border border-slate-800 overflow-hidden">
                    <button
                        onClick={() => setShowBusinessContext(!showBusinessContext)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-3 text-emerald-400">
                            <Building2 size={20} />
                            <h2 className="text-lg font-bold text-slate-200">Business Context</h2>
                        </div>
                        <ChevronDown
                            size={20}
                            className={`text-slate-400 transition-transform ${showBusinessContext ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {showBusinessContext && (
                        <div className="px-6 pb-6 space-y-6 border-t border-slate-800 pt-6">
                            {/* Business Identify */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Business Name
                                </label>
                                <input
                                    type="text"
                                    value={businessProfile?.businessName || ''}
                                    onChange={(e) => handleProfileUpdate('businessName', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="Enter business name..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Business Summary
                                </label>
                                <textarea
                                    value={businessProfile?.businessSummary || ''}
                                    onChange={(e) => handleProfileUpdate('businessSummary', e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors resize-y"
                                    placeholder="Brief summary of what the business does..."
                                />
                            </div>

                            {/* Industry */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Industry (Primary / Secondary)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={businessProfile?.industry?.primary || ''}
                                        onChange={(e) => handleProfileUpdate('industry.primary', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors"
                                        placeholder="Primary Industry"
                                    />
                                    <input
                                        type="text"
                                        value={businessProfile?.industry?.secondary || ''}
                                        onChange={(e) => handleProfileUpdate('industry.secondary', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors"
                                        placeholder="Secondary Industry (Optional)"
                                    />
                                </div>
                            </div>

                            {/* Target Audience */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Target Audience
                                </label>
                                <input
                                    type="text"
                                    value={businessProfile?.targetAudience?.primary || ''}
                                    onChange={(e) => handleProfileUpdate('targetAudience.primary', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="Who is your primary customer?"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <input
                                        type="text"
                                        value={businessProfile?.targetAudience?.demographics?.ageRange || ''}
                                        onChange={(e) => handleProfileUpdate('targetAudience.demographics.ageRange', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-300 focus:border-emerald-500 outline-none transition-colors"
                                        placeholder="Age Range (e.g. 25-45)"
                                    />
                                    <input
                                        type="text"
                                        value={businessProfile?.targetAudience?.demographics?.income || ''}
                                        onChange={(e) => handleProfileUpdate('targetAudience.demographics.income', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-300 focus:border-emerald-500 outline-none transition-colors"
                                        placeholder="Income Level"
                                    />
                                </div>
                            </div>

                            {/* Offerings */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Products/Services (Comma Separated)
                                </label>
                                <textarea
                                    value={businessProfile?.offerings?.categories?.join(', ') || ''}
                                    onChange={(e) => handleProfileUpdate('offerings.categories', e.target.value.split(',').map(s => s.trim()))}
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="e.g. Crypto Wallet, DeFi Staking, NFT Marketplace"
                                />
                            </div>

                            {/* Brand Voice */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Brand Voice (Tone)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {['Professional', 'Friendly', 'Authoritative', 'Witty', 'Urgent', 'Empathetic'].map(tone => (
                                        <button
                                            key={tone}
                                            onClick={() => {
                                                const current = businessProfile?.brandVoice?.tone || [];
                                                const updated = current.includes(tone)
                                                    ? current.filter(t => t !== tone)
                                                    : [...current, tone];
                                                handleProfileUpdate('brandVoice.tone', updated);
                                            }}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${(businessProfile?.brandVoice?.tone || []).includes(tone)
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {tone}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={businessProfile?.brandVoice?.tone?.join(', ') || ''}
                                    onChange={(e) => handleProfileUpdate('brandVoice.tone', e.target.value.split(',').map(s => s.trim()))}
                                    className="w-full bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-slate-300 focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="Custom tones (comma separated)..."
                                />
                            </div>

                            {/* Compliance */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">
                                    Compliance / Unique Selling Points
                                </label>
                                <textarea
                                    value={businessProfile?.brandVoice?.uniqueSellingPoints?.join('\n') || ''}
                                    onChange={(e) => handleProfileUpdate('brandVoice.uniqueSellingPoints', e.target.value.split('\n'))}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="Enter one unique selling point per line..."
                                />
                            </div>

                            <p className="text-xs text-slate-500 text-center pt-2">
                                AI uses this context to tailor generated content to your brand.
                            </p>
                        </div>
                    )}
                </section>

                {/* Publishing Settings */}
                <section className="bg-slate-900 border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3 text-indigo-400 mb-2">
                        <Activity size={20} />
                        <h2 className="text-lg font-bold text-slate-200">Publishing Velocity</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-400">
                                Daily Post Quota
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    value={velocity}
                                    onChange={(e) => setVelocity(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-indigo-500 outline-none transition-colors"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    Posts / Day
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                This determines the "Recommended Publish Date" for new posts.
                                If set to 10, the first 10 approved posts will be scheduled for today,
                                the next 10 for tomorrow, and so on.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Auto-Generation Settings */}
                <section className="bg-slate-900 border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <Zap size={20} />
                        <h2 className="text-lg font-bold text-slate-200">Auto-Generation</h2>
                    </div>

                    <p className="text-slate-400 text-sm">
                        Control what gets generated automatically when new categories are created or when content runs low.
                    </p>

                    {/* Toggle Cards */}
                    <div className="space-y-3">
                        {/* Auto Stubs */}
                        <div className="bg-slate-950 border border-slate-700 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-200 font-medium">Auto-Generate Article Ideas</span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded">
                                            {CREDIT_COSTS.TITLE_GENERATION} credit/stub
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Generate stubs when categories fall below threshold
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAutoGenEnabled(!autoGenEnabled)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${autoGenEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoGenEnabled ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            {autoGenEnabled && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <label className="block text-xs font-medium text-slate-400 mb-2">
                                        Minimum stubs per category: <span className="text-emerald-400 font-bold">{stubThreshold}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="25"
                                        value={stubThreshold}
                                        onChange={(e) => setStubThreshold(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                                        <span>1</span>
                                        <span>25</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Deep Research Before Stubs */}
                        <div className={`bg-slate-950 border p-4 ${canUseDeepResearch ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-200 font-medium">Run Deep Research First</span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded">
                                            {CREDIT_COSTS.GOOGLE_DEEP_RESEARCH} credits/category
                                        </span>
                                        {!canUseDeepResearch && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-400 rounded">
                                                Professional+
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Research category before generating stubs for better keyword targeting
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => canUseDeepResearch && setEnableDeepResearch(!enableDeepResearch)}
                                    disabled={!canUseDeepResearch}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${enableDeepResearch && canUseDeepResearch ? 'bg-amber-500' : 'bg-slate-700'} ${!canUseDeepResearch ? 'cursor-not-allowed' : ''}`}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enableDeepResearch && canUseDeepResearch ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            {enableDeepResearch && canUseDeepResearch && (
                                <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs">
                                    <strong>Workflow:</strong> New categories → Deep Research → Then generate stubs with research data
                                </div>
                            )}
                        </div>

                        {/* Auto Images */}
                        <div className="bg-slate-950 border border-slate-700 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-200 font-medium">Auto-Generate Hero Images</span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-500/20 text-pink-400 rounded">
                                            {CREDIT_COSTS.IMAGE_GENERATION} credits/image
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Generate hero image when article content is created
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const newValue = !(project.settings?.imageGeneration?.autoGenerate ?? true);
                                        setLoading(true);
                                        try {
                                            const projectRef = doc(db, `organizations/${project.organizationId}/projects/${project.id}`);
                                            await updateDoc(projectRef, {
                                                'settings.imageGeneration.autoGenerate': newValue,
                                                updatedAt: new Date()
                                            });
                                            onUpdate();
                                        } catch (error) {
                                            console.error('Error saving image settings:', error);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${(project.settings?.imageGeneration?.autoGenerate ?? true) ? 'bg-pink-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${(project.settings?.imageGeneration?.autoGenerate ?? true) ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="bg-slate-950/50 border border-slate-800 p-4 mt-4">
                        <p className="text-xs text-slate-500">
                            <strong className="text-slate-400">Estimated cost per new category:</strong>{' '}
                            {autoGenEnabled ? `${stubThreshold} credits (stubs)` : '0 credits'}
                            {enableDeepResearch && canUseDeepResearch ? ` + ${CREDIT_COSTS.GOOGLE_DEEP_RESEARCH} credits (research)` : ''}
                            {(project.settings?.imageGeneration?.autoGenerate ?? true) && autoGenEnabled ? ` + ${stubThreshold * CREDIT_COSTS.IMAGE_GENERATION} credits (images)` : ''}
                        </p>
                    </div>
                </section>

                {/* Deep Research Section */}
                <section className="bg-slate-900 border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3 text-amber-400 mb-2">
                        <Target size={20} />
                        <h2 className="text-lg font-bold text-slate-200">Google Deep Research</h2>
                        {!canUseDeepResearch && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-700 text-slate-400">
                                Professional+
                            </span>
                        )}
                    </div>

                    {canUseDeepResearch ? (
                        <div className="space-y-4">
                            {/* Enable Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-700">
                                <div>
                                    <p className="text-slate-200 font-medium">Enable Deep Research</p>
                                    <p className="text-xs text-slate-500">
                                        Shows research panel on category pages • 20 credits per research
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEnableDeepResearch(!enableDeepResearch)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${enableDeepResearch ? 'bg-amber-500' : 'bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enableDeepResearch ? 'translate-x-6' : ''
                                            }`}
                                    />
                                </button>
                            </div>

                            {enableDeepResearch && (
                                <>
                                    <p className="text-slate-400 text-sm">
                                        Run expert-level research on all categories using AI with Google Search.
                                        This research improves the quality of generated titles, articles, and category pages.
                                    </p>

                                    {/* Category Status Summary */}
                                    <div className="bg-slate-950 border border-slate-700 p-4">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-slate-200">{categories.length}</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">Categories</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-emerald-400">
                                                    {categories.filter(c => c.googleDeepResearch?.status === 'complete').length}
                                                </div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">Researched</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-amber-400">
                                                    {categories.filter(c => c.googleDeepResearch?.status !== 'complete').length}
                                                </div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">Pending</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    {researchProgress && (
                                        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-sm">{researchProgress}</span>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-slate-300 font-medium">Run Research on All Categories</p>
                                            <p className="text-xs text-slate-500">
                                                {CREDIT_COSTS.GOOGLE_DEEP_RESEARCH} credits per category • Skips already-researched
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleRunAllDeepResearch}
                                            disabled={researchRunning || categories.length === 0}
                                            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2"
                                        >
                                            {researchRunning ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Target size={16} />
                                            )}
                                            Run All Research
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Target size={32} className="text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 mb-2">
                                Google Deep Research is available on Professional and Enterprise plans.
                            </p>
                            <p className="text-xs text-slate-500">
                                Upgrade to access AI-powered research with real-time Google Search data.
                            </p>
                        </div>
                    )}
                </section>

                {/* AI Context Settings */}
                <section className="bg-slate-900 border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3 text-purple-400 mb-2">
                        <Layout size={20} />
                        <h2 className="text-lg font-bold text-slate-200">AI Context & Rules</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Positioning Statement
                            </label>
                            <textarea
                                value={positioning}
                                onChange={(e) => setPositioning(e.target.value)}
                                rows={4}
                                placeholder="e.g., We are the leading provider of..."
                                className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-purple-500 outline-none transition-colors resize-y min-h-[100px]"
                            />
                            <p className="text-xs text-slate-500">
                                This statement will be injected into every prompt to ensure the AI understands the brand's core identity.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Global Generation Rules
                            </label>
                            <textarea
                                value={rules}
                                onChange={(e) => setRules(e.target.value)}
                                rows={6}
                                placeholder="- Always use active voice&#10;- Avoid jargon&#10;- Include a call to action"
                                className="w-full bg-slate-950 border border-slate-700 py-3 px-4 text-slate-200 focus:border-purple-500 outline-none transition-colors resize-y min-h-[150px]"
                            />
                            <p className="text-xs text-slate-500">
                                Specific rules or constraints that should apply to all content generated for this project.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Troubleshooting Section */}
                <section className="bg-slate-900 border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3 text-amber-400 mb-2">
                        <Activity size={20} />
                        <h2 className="text-lg font-bold text-slate-200">Troubleshooting</h2>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-200 font-bold mb-1">Clear Generation Queue</h3>
                            <p className="text-slate-500 text-sm">
                                If generation appears stuck, use this to clear all pending tasks.
                            </p>
                        </div>
                        <button
                            onClick={handleClearQueue}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider border border-slate-700 transition-colors"
                        >
                            Clear Queue
                        </button>
                    </div>
                </section>



                {/* WordPress Export (only if enabled by admin) */}
                {currentOrg?.wordpressEnabled && (
                    <section className="bg-slate-900/50 border border-slate-800 p-6">
                        <div className="flex items-center mb-4 text-emerald-400">
                            <Globe size={20} className="mr-2" />
                            <h2 className="text-lg font-bold">WordPress Export</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            Configure WordPress API credentials to export posts directly to your WordPress site.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Site URL</label>
                                <input
                                    type="url"
                                    value={wpSiteUrl}
                                    onChange={(e) => setWpSiteUrl(e.target.value)}
                                    placeholder="https://yoursite.com"
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={wpUsername}
                                        onChange={(e) => setWpUsername(e.target.value)}
                                        placeholder="admin"
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Application Password
                                        <a
                                            href="https://wordpress.org/documentation/article/application-passwords/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-400 text-xs ml-2 hover:underline"
                                        >
                                            (How to create)
                                        </a>
                                    </label>
                                    <input
                                        type="password"
                                        value={wpAppPassword}
                                        onChange={(e) => setWpAppPassword(e.target.value)}
                                        placeholder="xxxx xxxx xxxx xxxx"
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Default Post Status</label>
                                <select
                                    value={wpDefaultStatus}
                                    onChange={(e) => setWpDefaultStatus(e.target.value as 'publish' | 'draft' | 'pending')}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending Review</option>
                                    <option value="publish">Publish Immediately</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleTestWordPress}
                                    disabled={wpTesting || !wpSiteUrl}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-sm uppercase tracking-wider flex items-center"
                                >
                                    {wpTesting && <Loader2 size={16} className="mr-2 animate-spin" />}
                                    Test Connection
                                </button>
                                {wpTestResult && (
                                    <span className={`text-sm ${wpTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {wpTestResult.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* AI Prompt Overrides */}
                <section className="bg-slate-900/50 border border-slate-800 p-6">
                    <div className="flex items-center mb-4 text-purple-400">
                        <Terminal size={20} className="mr-2" />
                        <h2 className="text-lg font-bold">AI Prompt Overrides</h2>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                        Override prompts for this project. Leave empty to use Organization or Admin defaults.
                    </p>

                    <div className="space-y-3">
                        {/* Content Prompts */}
                        {Object.values(ContentType).map((type) => (
                            <div key={type} className="border border-slate-700 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setActivePromptTab(activePromptTab === type ? null : type)}
                                    className="w-full flex items-center justify-between p-4 bg-[#0f172a] hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <FileText size={16} className="mr-2 text-cyan-400" />
                                        <span className="font-medium text-white">{type}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${promptOverrides[type] ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {promptOverrides[type] ? 'Custom' : 'Org/Admin Default'}
                                    </span>
                                </button>
                                {activePromptTab === type && (
                                    <div className="p-4 bg-[#0a0f1a] border-t border-slate-700">
                                        <textarea
                                            value={promptOverrides[type] || ''}
                                            onChange={(e) => setPromptOverrides(prev => ({
                                                ...prev,
                                                [type]: e.target.value || undefined
                                            }))}
                                            rows={10}
                                            placeholder={`Leave empty to use Org/Admin default for ${type}...`}
                                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                                        />
                                        {promptOverrides[type] && (
                                            <button
                                                onClick={() => setPromptOverrides(prev => ({
                                                    ...prev,
                                                    [type]: undefined
                                                }))}
                                                className="mt-2 text-xs text-red-400 hover:text-red-300"
                                            >
                                                Reset to Default
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* System Prompts */}
                        {Object.values(PromptType).map((type) => (
                            <div key={type} className="border border-slate-700 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setActivePromptTab(activePromptTab === type ? null : type)}
                                    className="w-full flex items-center justify-between p-4 bg-[#0f172a] hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <Terminal size={16} className="mr-2 text-purple-400" />
                                        <span className="font-medium text-white">{type}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${promptOverrides[type] ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {promptOverrides[type] ? 'Custom' : 'Org/Admin Default'}
                                    </span>
                                </button>
                                {activePromptTab === type && (
                                    <div className="p-4 bg-[#0a0f1a] border-t border-slate-700">
                                        <textarea
                                            value={promptOverrides[type] || ''}
                                            onChange={(e) => setPromptOverrides(prev => ({
                                                ...prev,
                                                [type]: e.target.value || undefined
                                            }))}
                                            rows={10}
                                            placeholder={`Leave empty to use Org/Admin default for ${type}...`}
                                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                                        />
                                        {promptOverrides[type] && (
                                            <button
                                                onClick={() => setPromptOverrides(prev => ({
                                                    ...prev,
                                                    [type]: undefined
                                                }))}
                                                className="mt-2 text-xs text-red-400 hover:text-red-300"
                                            >
                                                Reset to Default
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Image Generation Prompt */}
                        <div className="border border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setActivePromptTab(activePromptTab === 'imageGeneration' ? null : 'imageGeneration')}
                                className="w-full flex items-center justify-between p-4 bg-[#0f172a] hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center">
                                    <Palette size={16} className="mr-2 text-emerald-400" />
                                    <span className="font-medium text-white">Image Generation</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${promptOverrides.imageGeneration ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {promptOverrides.imageGeneration ? 'Custom' : 'Org/Admin Default'}
                                </span>
                            </button>
                            {activePromptTab === 'imageGeneration' && (
                                <div className="p-4 bg-[#0a0f1a] border-t border-slate-700">
                                    <textarea
                                        value={promptOverrides.imageGeneration || ''}
                                        onChange={(e) => setPromptOverrides(prev => ({
                                            ...prev,
                                            imageGeneration: e.target.value || undefined
                                        }))}
                                        rows={10}
                                        placeholder="Leave empty to use Org/Admin default for Image Generation..."
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                    {promptOverrides.imageGeneration && (
                                        <button
                                            onClick={() => setPromptOverrides(prev => ({
                                                ...prev,
                                                imageGeneration: undefined
                                            }))}
                                            className="mt-2 text-xs text-red-400 hover:text-red-300"
                                        >
                                            Reset to Default
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-slate-950/50 rounded-lg flex items-start gap-2">
                        <HelpCircle size={16} className="text-slate-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-500">
                            Priority: <span className="text-emerald-400">Project</span> → <span className="text-purple-400">Organization</span> → <span className="text-cyan-400">Admin</span>
                        </p>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="border border-rose-900/30 bg-rose-950/5 p-6 mt-12">
                    <div className="flex items-center gap-3 text-rose-500 mb-6">
                        <AlertTriangle size={20} />
                        <h2 className="text-lg font-bold">Danger Zone</h2>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-200 font-bold mb-1">Archive Project</h3>
                            <p className="text-slate-500 text-sm">
                                Archiving will hide this project from the main dashboard but preserve all data.
                            </p>
                        </div>

                        {!showArchiveConfirm ? (
                            <button
                                onClick={() => setShowArchiveConfirm(true)}
                                className="px-6 py-2 border border-rose-800 text-rose-500 hover:bg-rose-950 font-bold text-sm uppercase tracking-wider transition-colors"
                            >
                                Archive Project
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                                <span className="text-rose-400 text-sm font-bold">Are you sure?</span>
                                <button
                                    onClick={handleArchive}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm uppercase tracking-wider"
                                >
                                    Yes, Archive
                                </button>
                                <button
                                    onClick={() => setShowArchiveConfirm(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
};
