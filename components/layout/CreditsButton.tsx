import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { CreditManagementModal } from '../CreditManagementModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Organization } from '../../types';

export const CreditsButton: React.FC = () => {
  const { currentOrg } = useOrganization();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch fresh balance directly from Firestore
  const refreshBalance = async () => {
    if (!currentOrg) return;
    setRefreshing(true);
    try {
      console.log('[CreditsButton] Fetching balance for org:', currentOrg.id);
      const orgDoc = await getDoc(doc(db, 'organizations', currentOrg.id));
      if (orgDoc.exists()) {
        const data = orgDoc.data() as Organization;
        console.log('[CreditsButton] Org data:', {
          id: currentOrg.id,
          credits: data.credits,
          balance: data.credits?.balance
        });
        setLiveBalance(data.credits?.balance ?? 0);
      } else {
        console.log('[CreditsButton] Org document does not exist!');
      }
    } catch (err) {
      console.error('[CreditsButton] Error refreshing balance:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh on mount and when org changes
  useEffect(() => {
    if (currentOrg) {
      refreshBalance();
    }
  }, [currentOrg?.id]);

  if (!currentOrg) return null;

  // Use live balance if available, otherwise fall back to context
  const balance = liveBalance ?? currentOrg?.credits?.balance ?? 0;

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowCreditModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors"
          title="Manage credits"
        >
          <Zap className="w-4 h-4" />
          <span className="text-sm font-semibold">{balance}</span>
          <span className="text-xs text-indigo-400/70">credits</span>
        </button>
        <button
          onClick={refreshBalance}
          disabled={refreshing}
          className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <CreditManagementModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </>
  );
};
