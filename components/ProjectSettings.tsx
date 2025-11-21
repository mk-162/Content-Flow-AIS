import React, { useState, useEffect } from 'react';
import {
    Save,
    AlertTriangle,
    Archive,
    CheckCircle,
    Layout,
    FileText,
    Settings,
    Activity
} from 'lucide-react';
import { Project } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Props {
    project: Project;
    onUpdate: () => void;
}

export const ProjectSettings: React.FC<Props> = ({ project, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    // Form State
    const [velocity, setVelocity] = useState(project.settings?.publishVelocity || 10);
    const [positioning, setPositioning] = useState(project.settings?.positioningStatement || '');
    const [rules, setRules] = useState(project.settings?.rules || '');

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const projectRef = doc(db, `organizations/${project.organizationId}/projects/${project.id}`);
            await updateDoc(projectRef, {
                'settings.publishVelocity': Number(velocity),
                'settings.positioningStatement': positioning,
                'settings.rules': rules,
                updatedAt: new Date() // In real app use serverTimestamp
            });
            setSuccessMsg('Settings saved successfully');
            onUpdate();
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
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
            window.location.href = '/projects'; // Simple redirect for now
        } catch (error) {
            console.error('Error archiving project:', error);
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-950 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 mb-2">Project Settings</h1>
                        <p className="text-slate-400 text-sm">Manage configuration and rules for {project.name}</p>
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
