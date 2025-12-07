import React, { useState } from 'react';
import { X, Gift, Loader2 } from 'lucide-react';
import { Organization } from '../types';
import { creditService } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';

interface AdminGrantCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: Organization | null;
    onSuccess: () => void;
}

export const AdminGrantCreditsModal: React.FC<AdminGrantCreditsModalProps> = ({
    isOpen,
    onClose,
    organization,
    onSuccess
}) => {
    const { user } = useAuth();
    const [amount, setAmount] = useState<number>(10);
    const [description, setDescription] = useState('Gift');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !organization) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await creditService.addCredits(
                organization.id,
                user.id,
                amount,
                'gift',
                description
            );
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error granting credits:', error);
            alert('Failed to grant credits');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Gift className="text-pink-400" />
                        Grant Credits
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Organization
                        </label>
                        <div className="text-white font-medium p-3 bg-slate-950 rounded-lg border border-slate-800">
                            {organization.name}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Amount
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500"
                            placeholder="Reason for grant..."
                            required
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                            Grant Credits
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
