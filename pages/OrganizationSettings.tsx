import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Type, Palette, FileText, Shield, Zap, Calendar, UploadCloud, Terminal, HelpCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useOrganization } from '../contexts/OrganizationContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GeographicTargetingSelector } from '../components/GeographicTargetingSelector';
import { fetchBrandInfo } from '../services/geminiService';
import { ContentType, PromptType, PromptOverrides } from '../types';

export const OrganizationSettings: React.FC = () => {
    const navigate = useNavigate();
    const { currentOrg } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [activePromptTab, setActivePromptTab] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        website: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        font: '',
        brandMessage: '',
        brandCompliance: '',
        brandImageDescription: '',
        targetAudiencePrimary: '',
        targetAudienceSecondary: '',
        ageRange: '',
        income: '',
        geographic: [] as string[],
        promptOverrides: {} as PromptOverrides
    });

    useEffect(() => {
        if (currentOrg) {
            setFormData({
                website: currentOrg.website || '',
                primaryColor: currentOrg.customBranding?.primaryColor || '#06b6d4',
                secondaryColor: currentOrg.customBranding?.secondaryColor || '#64748b',
                font: currentOrg.customBranding?.font || '',
                brandMessage: currentOrg.brandMessage || '',
                brandCompliance: currentOrg.brandCompliance || '',
                brandImageDescription: currentOrg.brandImageStyle?.description || '',
                targetAudiencePrimary: currentOrg.targetAudience?.primary || '',
                targetAudienceSecondary: currentOrg.targetAudience?.secondary || '',
                ageRange: currentOrg.targetAudience?.demographics?.ageRange || '',
                income: currentOrg.targetAudience?.demographics?.income || '',
                geographic: currentOrg.targetAudience?.demographics?.geographic || [],
                promptOverrides: currentOrg.promptOverrides || {}
            });
        }
    }, [currentOrg]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!currentOrg) return;
        setLoading(true);
        setSuccessMsg('');

        try {
            const orgRef = doc(db, 'organizations', currentOrg.id);
            await updateDoc(orgRef, {
                website: formData.website,
                customBranding: {
                    ...currentOrg.customBranding,
                    primaryColor: formData.primaryColor,
                    secondaryColor: formData.secondaryColor,
                    font: formData.font
                },
                brandMessage: formData.brandMessage,
                brandCompliance: formData.brandCompliance,
                brandImageStyle: {
                    description: formData.brandImageDescription
                    // referenceImageUrl: ... (Future)
                },
                targetAudience: {
                    ...currentOrg.targetAudience,
                    primary: formData.targetAudiencePrimary,
                    secondary: formData.targetAudienceSecondary,
                    demographics: {
                        ...currentOrg.targetAudience?.demographics,
                        ageRange: formData.ageRange,
                        income: formData.income,
                        geographic: formData.geographic
                    }
                },
                promptOverrides: formData.promptOverrides,
                updatedAt: new Date() // Using Date object which Firestore converts to Timestamp
            });
            setSuccessMsg('Settings saved successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchBrand = async () => {
        if (!formData.website) {
            alert('Please enter a website URL first');
            return;
        }

        setLoading(true);
        try {
            const info = await fetchBrandInfo(formData.website, currentOrg!.id);

            setFormData(prev => ({
                ...prev,
                brandMessage: info.brandMessage || prev.brandMessage,
                brandCompliance: info.compliance || prev.brandCompliance,
                primaryColor: info.brandColors?.primary || prev.primaryColor,
                secondaryColor: info.brandColors?.secondary || prev.secondaryColor,
                // We could also populate target audience if returned
            }));

            setSuccessMsg('Brand info fetched successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Error fetching brand info:', error);
            alert('Failed to fetch brand info. Please try again or enter manually.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: Timestamp | undefined) => {
        if (!timestamp) return 'N/A';
        return timestamp.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (!currentOrg) return <div className="p-8 text-slate-400">Loading organization...</div>;

    return (
        <div className="h-screen w-full bg-[#0f172a] text-slate-200 font-sans overflow-y-auto custom-scrollbar"
            style={{ scrollbarWidth: 'auto', scrollbarColor: '#475569 #0f172a' }}>
            <div className="max-w-4xl mx-auto p-8 pb-24">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-400 hover:text-cyan-400 mb-8 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Organization Settings</h1>
                        <p className="text-slate-400">Manage brand identity and content guidelines for {currentOrg.name}</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white  font-bold transition-colors disabled:opacity-50"
                    >
                        <Save size={20} className="mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 ">
                        {successMsg}
                    </div>
                )}

                <div className="space-y-8">
                    {/* Subscription & Credits */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Zap size={20} className="mr-2 text-yellow-400" />
                            Subscription & Credits
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#0f172a] p-4  border border-slate-700">
                                <div className="text-slate-400 text-sm mb-1">Current Plan</div>
                                <div className="text-2xl font-bold text-white capitalize">{currentOrg.subscriptionTier}</div>
                            </div>
                            <div className="bg-[#0f172a] p-4  border border-slate-700">
                                <div className="text-slate-400 text-sm mb-1">Credit Balance</div>
                                <div className="text-2xl font-bold text-white flex items-center gap-2">
                                    {currentOrg.credits?.balance ?? 0}
                                    <span className="text-sm font-normal text-slate-500">
                                        / {currentOrg.credits?.monthlyAllowance ?? 0} monthly
                                    </span>
                                </div>
                            </div>
                            <div className="md:col-span-2 flex items-center gap-2 text-sm text-slate-400 bg-[#0f172a] p-3  border border-slate-700">
                                <Calendar size={16} />
                                Next refill date: <span className="text-white font-medium">{formatDate(currentOrg.credits?.nextRefillAt)}</span>
                            </div>
                        </div>
                    </section>

                    {/* Organization Info */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Globe size={20} className="mr-2 text-cyan-400" />
                            Organization Info
                        </h2>
                        <div className="grid gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Website URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        placeholder="https://example.com"
                                        className="flex-1 bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                    <button
                                        onClick={handleFetchBrand}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white  font-medium transition-colors"
                                    >
                                        Fetch Brand Info
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Enter your website to auto-populate brand details (Coming Soon)</p>
                            </div>
                        </div>
                    </section>

                    {/* Brand Identity */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Palette size={20} className="mr-2 text-purple-400" />
                            Brand Identity
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        name="primaryColor"
                                        value={formData.primaryColor}
                                        onChange={handleChange}
                                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                                    />
                                    <input
                                        type="text"
                                        name="primaryColor"
                                        value={formData.primaryColor}
                                        onChange={handleChange}
                                        className="flex-1 bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Secondary Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        name="secondaryColor"
                                        value={formData.secondaryColor}
                                        onChange={handleChange}
                                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                                    />
                                    <input
                                        type="text"
                                        name="secondaryColor"
                                        value={formData.secondaryColor}
                                        onChange={handleChange}
                                        className="flex-1 bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                                    <Type size={16} className="mr-2" />
                                    Brand Font
                                </label>
                                <input
                                    type="text"
                                    name="font"
                                    value={formData.font}
                                    onChange={handleChange}
                                    placeholder="e.g. Inter, Roboto, Helvetica"
                                    className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Target Audience */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Globe size={20} className="mr-2 text-blue-400" />
                            Target Audience
                        </h2>
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Primary Audience</label>
                                    <input
                                        type="text"
                                        name="targetAudiencePrimary"
                                        value={formData.targetAudiencePrimary}
                                        onChange={handleChange}
                                        placeholder="e.g. Small Business Owners"
                                        className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Secondary Audience</label>
                                    <input
                                        type="text"
                                        name="targetAudienceSecondary"
                                        value={formData.targetAudienceSecondary}
                                        onChange={handleChange}
                                        placeholder="e.g. Marketing Managers"
                                        className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Age Range</label>
                                    <input
                                        type="text"
                                        name="ageRange"
                                        value={formData.ageRange}
                                        onChange={handleChange}
                                        placeholder="e.g. 25-45"
                                        className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Income Level</label>
                                    <input
                                        type="text"
                                        name="income"
                                        value={formData.income}
                                        onChange={handleChange}
                                        placeholder="e.g. Middle to High"
                                        className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <GeographicTargetingSelector
                                    selectedCountries={formData.geographic}
                                    onChange={(countries) => setFormData(prev => ({ ...prev, geographic: countries }))}
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Select the countries where your audience is located. This helps the AI use appropriate spelling (e.g. Color vs Colour) and cultural references.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Content Guidelines */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <FileText size={20} className="mr-2 text-emerald-400" />
                            Content Guidelines
                        </h2>
                        <div className="grid gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Key Marketing Message</label>
                                <textarea
                                    name="brandMessage"
                                    value={formData.brandMessage}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="e.g. 'Innovating the future of fintech with customer-centric solutions.'"
                                    className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">The AI will use this to align content with your brand's core value proposition.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                                    <Shield size={16} className="mr-2" />
                                    Compliance Guidelines
                                </label>
                                <textarea
                                    name="brandCompliance"
                                    value={formData.brandCompliance}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="e.g. 'Include a disclaimer that individual results may vary. Do not make medical claims.'"
                                    className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Legal or regulatory requirements that must be included in generated content.</p>
                            </div>
                        </div>
                    </section>

                    {/* Brand Image Style (New) */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Palette size={20} className="mr-2 text-pink-400" />
                            Brand Image Style
                        </h2>
                        <div className="grid gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Image Brief Prompt</label>
                                <textarea
                                    name="brandImageDescription"
                                    value={formData.brandImageDescription}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="e.g. 'Minimalist, flat vector art, corporate blue color palette, professional and clean.'"
                                    className="w-full bg-[#0f172a] border border-slate-700  px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">This description will be applied to ALL AI-generated images to ensure brand consistency.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Style Guide Image (Reference)</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-[#0f172a] border border-dashed border-slate-700  p-6 flex flex-col items-center justify-center text-slate-500 hover:border-cyan-500 hover:text-cyan-500 transition-colors cursor-pointer">
                                        <UploadCloud size={24} className="mb-2" />
                                        <span className="text-xs">Click to upload reference image</span>
                                        <input type="file" className="hidden" />
                                    </div>
                                    {/* Placeholder for uploaded image preview */}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Upload an image that represents your brand's visual style (Coming Soon: AI Analysis).</p>
                            </div>
                        </div>
                    </section>

                    {/* AI Prompt Overrides */}
                    <section className="bg-[#1e293b] p-6  border border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Terminal size={20} className="mr-2 text-purple-400" />
                            AI Prompt Overrides
                        </h2>
                        <p className="text-slate-400 text-sm mb-4">
                            Override default AI prompts for this organization. Leave empty to use admin defaults.
                        </p>

                        <div className="space-y-3">
                            {/* Content Prompts */}
                            {Object.values(ContentType).map((type) => (
                                <div key={type} className="border border-slate-700  overflow-hidden">
                                    <button
                                        onClick={() => setActivePromptTab(activePromptTab === type ? null : type)}
                                        className="w-full flex items-center justify-between p-4 bg-[#0f172a] hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            <FileText size={16} className="mr-2 text-cyan-400" />
                                            <span className="font-medium text-white">{type}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${formData.promptOverrides[type] ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {formData.promptOverrides[type] ? 'Custom' : 'Admin Default'}
                                        </span>
                                    </button>
                                    {activePromptTab === type && (
                                        <div className="p-4 bg-[#0a0f1a] border-t border-slate-700">
                                            <textarea
                                                value={formData.promptOverrides[type] || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    promptOverrides: { ...prev.promptOverrides, [type]: e.target.value || undefined }
                                                }))}
                                                rows={10}
                                                placeholder={`Leave empty to use Admin default for ${type}...`}
                                                className="w-full bg-[#0f172a] border border-slate-700  px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                                            />
                                            {formData.promptOverrides[type] && (
                                                <button
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        promptOverrides: { ...prev.promptOverrides, [type]: undefined }
                                                    }))}
                                                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                                                >
                                                    Reset to Admin Default
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* System Prompts */}
                            {Object.values(PromptType).map((type) => (
                                <div key={type} className="border border-slate-700  overflow-hidden">
                                    <button
                                        onClick={() => setActivePromptTab(activePromptTab === type ? null : type)}
                                        className="w-full flex items-center justify-between p-4 bg-[#0f172a] hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            <Terminal size={16} className="mr-2 text-purple-400" />
                                            <span className="font-medium text-white">{type}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${formData.promptOverrides[type] ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {formData.promptOverrides[type] ? 'Custom' : 'Admin Default'}
                                        </span>
                                    </button>
                                    {activePromptTab === type && (
                                        <div className="p-4 bg-[#0a0f1a] border-t border-slate-700">
                                            <textarea
                                                value={formData.promptOverrides[type] || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    promptOverrides: { ...prev.promptOverrides, [type]: e.target.value || undefined }
                                                }))}
                                                rows={10}
                                                placeholder={`Leave empty to use Admin default for ${type}...`}
                                                className="w-full bg-[#0f172a] border border-slate-700  px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                                            />
                                            {formData.promptOverrides[type] && (
                                                <button
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        promptOverrides: { ...prev.promptOverrides, [type]: undefined }
                                                    }))}
                                                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                                                >
                                                    Reset to Admin Default
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Image Generation Prompt */}
                            <div className="border border-slate-700  overflow-hidden">
                                <button
                                    onClick={() => setActivePromptTab(activePromptTab === 'imageGeneration' ? null : 'imageGeneration')}
                                    className="w-full flex items-center justify-between p-4 bg-[#0f172a] hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <Palette size={16} className="mr-2 text-emerald-400" />
                                        <span className="font-medium text-white">Image Generation</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${formData.promptOverrides.imageGeneration ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {formData.promptOverrides.imageGeneration ? 'Custom' : 'Admin Default'}
                                    </span>
                                </button>
                                {activePromptTab === 'imageGeneration' && (
                                    <div className="p-4 bg-[#0a0f1a] border-t border-slate-700">
                                        <textarea
                                            value={formData.promptOverrides.imageGeneration || ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                promptOverrides: { ...prev.promptOverrides, imageGeneration: e.target.value || undefined }
                                            }))}
                                            rows={10}
                                            placeholder="Leave empty to use Admin default for Image Generation..."
                                            className="w-full bg-[#0f172a] border border-slate-700  px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                                        />
                                        {formData.promptOverrides.imageGeneration && (
                                            <button
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    promptOverrides: { ...prev.promptOverrides, imageGeneration: undefined }
                                                }))}
                                                className="mt-2 text-xs text-red-400 hover:text-red-300"
                                            >
                                                Reset to Admin Default
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-slate-950/50  flex items-start gap-2">
                            <HelpCircle size={16} className="text-slate-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-500">
                                Prompts set here override Admin defaults for this organization. Projects can further override these prompts.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

