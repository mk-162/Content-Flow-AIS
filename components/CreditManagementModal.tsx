import React, { useEffect, useState } from 'react';
import {
    X,
    CreditCard,
    History,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Zap
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { creditService, CREDIT_COSTS } from '../services/creditService';
import { CreditTransaction, SubscriptionTier } from '../types';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CreditManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreditManagementModal: React.FC<CreditManagementModalProps> = ({ isOpen, onClose }) => {
    const { currentOrg } = useOrganization();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        if (isOpen && currentOrg) {
            fetchTransactions();
        }
    }, [isOpen, currentOrg]);

    const fetchTransactions = async () => {
        if (!currentOrg) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'credit_transactions'),
                where('organizationId', '==', currentOrg.id),
                orderBy('createdAt', 'desc'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditTransaction));
            setTransactions(txs);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (amount: number, cost: number) => {
        if (!currentOrg || !user) return;
        setPurchasing(true);
        try {
            // Mock payment delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            await creditService.addCredits(
                currentOrg.id,
                user.id,
                amount,
                'purchase',
                `Purchased ${amount} Credits`
            );

            // Refresh
            await fetchTransactions();
        } catch (error) {
            console.error('Purchase failed:', error);
            alert('Purchase failed. Please try again.');
        } finally {
            setPurchasing(false);
        }
    };

    if (!isOpen || !currentOrg) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
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

                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-slate-400">
                                <span>Monthly Allowance: {currentOrg.credits?.monthlyAllowance ?? 0}</span>
                                <span>Resets: {currentOrg.credits?.nextRefillAt?.toDate().toLocaleDateString() ?? 'N/A'}</span>
                            </div>
                        </div>

                        {/* Top Up Options */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <CreditCard size={16} />
                                Top Up Balance
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handlePurchase(100, 10)}
                                    disabled={purchasing}
                                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-all group"
                                >
                                    <div className="text-lg font-bold text-white group-hover:text-indigo-400">100 Credits</div>
                                    <div className="text-xs text-slate-500">$10.00</div>
                                </button>
                                <button
                                    onClick={() => handlePurchase(500, 45)}
                                    disabled={purchasing}
                                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-all group"
                                >
                                    <div className="text-lg font-bold text-white group-hover:text-indigo-400">500 Credits</div>
                                    <div className="text-xs text-slate-500">$45.00 <span className="text-green-400 ml-1">(Save 10%)</span></div>
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                Secure payment processing powered by Stripe (Mock)
                            </p>
                        </div>
                    </div>

                    {/* Right Column: History */}
                    <div className="flex flex-col h-full">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <History size={16} />
                            Transaction History
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
                                <div className="overflow-y-auto max-h-[300px]">
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
                                                <span>{tx.createdAt.toDate().toLocaleDateString()}</span>
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
                            <h5 className="text-xs font-bold text-indigo-300 mb-2">Usage Costs</h5>
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
                                    onClick={() => {/* TODO: Navigate to full statement */}}
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
