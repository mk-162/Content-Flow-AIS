import React from 'react';
import { X, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { Category } from '../types';

interface MigrationConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    onDisable: () => Promise<void>;
    categoriesNeedingStubs: Array<{ category: Category; currentCount: number; needed: number }>;
    totalStubsNeeded: number;
    creditBalance: number;
    isLoading?: boolean;
}

export const MigrationConfirmationModal: React.FC<MigrationConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onDisable,
    categoriesNeedingStubs,
    totalStubsNeeded,
    creditBalance,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const hasEnoughCredits = creditBalance >= totalStubsNeeded;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-emerald-400" />
                        Auto-Generation Setup
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-amber-200">
                            <p className="font-medium mb-1">Initial Setup Required</p>
                            <p className="text-amber-300/80">
                                You have {categoriesNeedingStubs.length} categories that need stubs to reach the threshold.
                                This is a one-time setup to fill your content pipeline.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Categories to fill:</span>
                            <span className="text-white font-medium">{categoriesNeedingStubs.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total stubs to generate:</span>
                            <span className="text-white font-medium">{totalStubsNeeded}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Credit cost:</span>
                            <span className={`font-medium ${hasEnoughCredits ? 'text-emerald-400' : 'text-red-400'}`}>
                                {totalStubsNeeded} credits
                            </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-800 pt-3">
                            <span className="text-slate-400">Your balance:</span>
                            <span className={`font-medium ${hasEnoughCredits ? 'text-white' : 'text-red-400'}`}>
                                {creditBalance} credits
                            </span>
                        </div>
                    </div>

                    {!hasEnoughCredits && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                            Insufficient credits. You need {totalStubsNeeded - creditBalance} more credits to proceed.
                        </div>
                    )}

                    <div className="max-h-32 overflow-y-auto bg-slate-950 rounded-lg p-3 space-y-1">
                        {categoriesNeedingStubs.slice(0, 10).map(({ category, currentCount, needed }) => (
                            <div key={category.id} className="flex justify-between text-xs">
                                <span className="text-slate-400 truncate flex-1">{category.name}</span>
                                <span className="text-slate-500 ml-2">
                                    {currentCount} → {currentCount + needed}
                                </span>
                            </div>
                        ))}
                        {categoriesNeedingStubs.length > 10 && (
                            <div className="text-xs text-slate-500 pt-1">
                                +{categoriesNeedingStubs.length - 10} more categories...
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            onClick={onDisable}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            Disable Auto-Gen
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading || !hasEnoughCredits}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4" />
                            )}
                            Generate Now
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                        After this, stubs will auto-generate when categories fall below threshold.
                    </p>
                </div>
            </div>
        </div>
    );
};
