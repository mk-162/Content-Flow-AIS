import React, { useEffect, useState } from 'react';
import {
    X,
    History,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Download
} from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CreditTransaction, Organization } from '../types';

interface AdminOrgStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: Organization | null;
}

export const AdminOrgStatementModal: React.FC<AdminOrgStatementModalProps> = ({
    isOpen,
    onClose,
    organization
}) => {
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && organization) {
            fetchTransactions();
        }
    }, [isOpen, organization]);

    const fetchTransactions = async () => {
        if (!organization) return;

        setLoading(true);
        try {
            const q = query(
                collection(db, 'credit_transactions'),
                where('organizationId', '==', organization.id),
                orderBy('createdAt', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const txData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CreditTransaction[];

            setTransactions(txData);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: Timestamp) => {
        return timestamp.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen || !organization) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <History className="text-cyan-400" />
                            Credit Statement
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Viewing history for <span className="text-white font-medium">{organization.name}</span>
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
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Current Balance</div>
                            <div className="text-2xl font-bold text-white">{organization.credits?.balance ?? 0}</div>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Monthly Allowance</div>
                            <div className="text-2xl font-bold text-slate-300">{organization.credits?.monthlyAllowance ?? 0}</div>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Next Refill</div>
                            <div className="text-lg font-medium text-slate-300">
                                {organization.credits?.nextRefillAt ? formatDate(organization.credits.nextRefillAt) : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Transaction History</h3>
                            <button
                                onClick={fetchTransactions}
                                disabled={loading}
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/50">
                                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No transactions found for this organization.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl hover:border-slate-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center shrink-0
                        ${tx.amount > 0
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'bg-rose-500/10 text-rose-400'
                                                }
                      `}>
                                                {tx.amount > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{tx.description}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span>{formatDate(tx.createdAt)}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                    <span className="capitalize">{tx.type.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Balance: {tx.balanceAfter}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
