import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Type, Palette, FileText, Shield } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const OrganizationSettings: React.FC = () => {
    const navigate = useNavigate();
    const { currentOrg } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [formData, setFormData] = useState({
        website: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        font: '',
        brandMessage: '',
        brandCompliance: ''
    });

    useEffect(() => {
        if (currentOrg) {
            setFormData({
                website: currentOrg.website || '',
                primaryColor: currentOrg.customBranding?.primaryColor || '#06b6d4',
                secondaryColor: currentOrg.customBranding?.secondaryColor || '#64748b',
                font: currentOrg.customBranding?.font || '',
                brandMessage: currentOrg.brandMessage || '',
                brandCompliance: currentOrg.brandCompliance || ''
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

    const handleFetchBrand = () => {
        // Placeholder for future scraping logic
        alert('Auto-fetch feature coming soon!');
    };

    if (!currentOrg) return <div className="p-8 text-slate-400">Loading organization...</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-8">
            <div className="max-w-4xl mx-auto">
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
                        className="flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                        <Save size={20} className="mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-lg">
                        {successMsg}
                    </div>
                )}

                <div className="space-y-8">
                    {/* Organization Info */}
                    <section className="bg-[#1e293b] p-6 rounded-xl border border-slate-800">
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
                                        className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                    <button
                                        onClick={handleFetchBrand}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Fetch Brand Info
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Enter your website to auto-populate brand details (Coming Soon)</p>
                            </div>
                        </div>
                    </section>

                    {/* Brand Identity */}
                    <section className="bg-[#1e293b] p-6 rounded-xl border border-slate-800">
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
                                        className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
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
                                        className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
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
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Content Guidelines */}
                    <section className="bg-[#1e293b] p-6 rounded-xl border border-slate-800">
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
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
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
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Legal or regulatory requirements that must be included in generated content.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
