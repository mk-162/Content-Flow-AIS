import React, { useEffect, useState, useMemo } from 'react';
import {
    X,
    CreditCard,
    History,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Zap,
    FileText,
    Image,
    Type,
    ChevronLeft,
    ChevronRight,
    BarChart3
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { CREDIT_COSTS } from '../services/creditService';
import { CreditTransaction } from '../types';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CreditManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UsageStats {
    titlesGenerated: number;
    articlesGenerated: number;
    imagesGenerated: number;
    totalCreditsUsed: number;
}

export const CreditManagementModal: React.FC<CreditManagementModalProps> = ({ isOpen, onClose }) => {
    const { currentOrg } = useOrganization();
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFullStatement, setShowFullStatement] = useState(false);
    const [statementPage, setStatementPage] = useState(0);
    const STATEMENT_PAGE_SIZE = 20;

    useEffect(() => {
        if (isOpen && currentOrg) {
            fetchTransactions();
        }
    }, [isOpen, currentOrg]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowFullStatement(false);
            setStatementPage(0);
        }
    }, [isOpen]);

    const fetchTransactions = async () => {
        if (!currentOrg) return;
        setLoading(true);
        try {
            // Fetch more transactions for stats calculation (current billing period)
            const periodStart = currentOrg.credits?.lastRefillAt || Timestamp.fromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

            const q = query(
                collection(db, 'credit_transactions'),
                where('organizationId', '==', currentOrg.id),
                orderBy('createdAt', 'desc'),
                limit(200) // Get more for aggregation
            );
            const snapshot = await getDocs(q);
            const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditTransaction));

            // Store all for statement view
            setAllTransactions(txs);
            // Store recent 10 for quick view
            setTransactions(txs.slice(0, 10));
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate usage stats from transactions
    const usageStats = useMemo<UsageStats>(() => {
        const periodStart = currentOrg?.credits?.lastRefillAt?.toDate() || new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const periodTransactions = allTransactions.filter(tx => {
            const txDate = tx.createdAt?.toDate?.() || new Date(0);
            return tx.type === 'usage' && txDate >= periodStart;
        });

        return {
            titlesGenerated: periodTransactions.filter(t => t.metadata?.feature === 'title_generation').reduce((sum, t) => sum + Math.abs(t.amount), 0),
            articlesGenerated: periodTransactions.filter(t => t.metadata?.feature === 'article_generation').length,
            imagesGenerated: periodTransactions.filter(t => t.metadata?.feature === 'image_generation').length,
            totalCreditsUsed: periodTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        };
    }, [allTransactions, currentOrg?.credits?.lastRefillAt]);

    // Paginated transactions for statement view
    const paginatedTransactions = useMemo(() => {
        const start = statementPage * STATEMENT_PAGE_SIZE;
        return allTransactions.slice(start, start + STATEMENT_PAGE_SIZE);
    }, [allTransactions, statementPage]);

    const totalPages = Math.ceil(allTransactions.length / STATEMENT_PAGE_SIZE);

    if (!isOpen || !currentOrg) return null;

    // Full Statement View
    if (showFullStatement) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFullStatement(false)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} className="text-slate-400" />
                            </button>
                            <div>
                                <h2 className="text-lg font-bold text-white">Credit Statement</h2>
                                <p className="text-xs text-slate-400">Full transaction history</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Summary Bar */}
                    <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm">
                            <div>
                                <span className="text-slate-500">Balance:</span>
                                <span className="ml-2 font-bold text-white">{currentOrg.credits?.balance ?? 0}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Used this period:</span>
                                <span className="ml-2 font-bold text-orange-400">{usageStats.totalCreditsUsed}</span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            Showing {paginatedTransactions.length} of {allTransactions.length} transactions
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 sticky top-0">
                                <tr className="text-xs text-slate-400 uppercase tracking-wider">
                                    <th className="text-left px-4 py-3">Date</th>
                                    <th className="text-left px-4 py-3">Description</th>
                                    <th className="text-left px-4 py-3">Type</th>
                                    <th className="text-right px-4 py-3">Amount</th>
                                    <th className="text-right px-4 py-3">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {tx.createdAt?.toDate?.().toLocaleDateString() ?? 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {tx.description}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                tx.type === 'usage' ? 'bg-orange-500/20 text-orange-400' :
                                                tx.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                                                tx.type === 'gift' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${
                                            tx.amount > 0 ? 'text-green-400' : 'text-slate-400'
                                        }`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-slate-500">
                                            {tx.balanceAfter}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between">
                            <button
                                onClick={() => setStatementPage(p => Math.max(0, p - 1))}
                                disabled={statementPage === 0}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                            <span className="text-sm text-slate-500">
                                Page {statementPage + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => setStatementPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={statementPage >= totalPages - 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Main Modal View
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Zap className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Credit Management</h2>
                            <p className="text-xs text-slate-400">Manage your AI generation credits</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Usage Summary Section */}
                <div className="px-6 py-4 bg-slate-950/30 border-b border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={16} className="text-cyan-400" />
                        <h4 className="text-sm font-semibold text-slate-300">This Billing Period</h4>
                        <span className="text-xs text-slate-500 ml-auto">
                            Since {currentOrg.credits?.lastRefillAt?.toDate?.().toLocaleDateString() ?? 'start of month'}
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <Type size={18} className="mx-auto mb-1 text-cyan-400" />
                            <div className="text-2xl font-bold text-white">{usageStats.titlesGenerated}</div>
                            <div className="text-xs text-slate-500">Titles</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <FileText size={18} className="mx-auto mb-1 text-emerald-400" />
                            <div className="text-2xl font-bold text-white">{usageStats.articlesGenerated}</div>
                            <div className="text-xs text-slate-500">Articles</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <Image size={18} className="mx-auto mb-1 text-violet-400" />
                            <div className="text-2xl font-bold text-white">{usageStats.imagesGenerated}</div>
                            <div className="text-xs text-slate-500">Images</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <Zap size={18} className="mx-auto mb-1 text-orange-400" />
                            <div className="text-2xl font-bold text-white">{usageStats.totalCreditsUsed}</div>
                            <div className="text-xs text-slate-500">Credits Used</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Balance & Purchase */}
                    <div className="space-y-6">
                        {/* Current Balance */}
                        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Zap size={100} />
                            </div>
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Current Balance</p>
                            <h3 className="text-4xl font-bold text-white mb-1">{currentOrg.credits?.balance ?? 0}</h3>
                            <p className="text-indigo-300 text-xs">Credits Available</p>

                            {/* Usage Progress Bar */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Used: {usageStats.totalCreditsUsed}</span>
                                    <span>Allowance: {currentOrg.credits?.monthlyAllowance ?? 0}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                                        style={{
                                            width: `${Math.min(100, (usageStats.totalCreditsUsed / (currentOrg.credits?.monthlyAllowance || 1)) * 100)}%`
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-slate-500 mt-2">
                                    Resets: {currentOrg.credits?.nextRefillAt?.toDate?.().toLocaleDateString() ?? 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Need More Credits */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                <CreditCard size={16} />
                                Need More Credits?
                            </h4>
                            <p className="text-xs text-slate-400 mb-3">
                                Credits refresh monthly based on your subscription tier. Upgrade your plan for more credits and features.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    // TODO: Open upgrade modal or navigate to billing
                                }}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                View Upgrade Options
                            </button>
                        </div>
                    </div>

                    {/* Right Column: History */}
                    <div className="flex flex-col h-full">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <History size={16} />
                            Recent Transactions
                        </h4>

                        <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center text-slate-500">
                                    <RefreshCw className="animate-spin mr-2" size={16} />
                                    Loading...
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                    No transactions yet
                                </div>
                            ) : (
                                <div className="overflow-y-auto max-h-[240px]">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm text-slate-300 font-medium truncate max-w-[180px]">
                                                    {tx.description}
                                                </span>
                                                <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-500">
                                                <span>{tx.createdAt?.toDate?.().toLocaleDateString() ?? 'N/A'}</span>
                                                <div className="flex items-center gap-1">
                                                    {tx.amount > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                    <span>{tx.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <h5 className="text-xs font-bold text-indigo-300 mb-2">Credit Costs</h5>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Title Generation</span>
                                <span className="text-slate-200">{CREDIT_COSTS.TITLE_GENERATION} Credit</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>Article Generation</span>
                                <span className="text-slate-200">{CREDIT_COSTS.ARTICLE_GENERATION} Credit</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>Image Generation</span>
                                <span className="text-slate-200">{CREDIT_COSTS.IMAGE_GENERATION} Credits</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-indigo-500/20">
                                <button
                                    onClick={() => setShowFullStatement(true)}
                                    className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    View Full Statement →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
