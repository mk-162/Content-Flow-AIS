import {
    doc,
    runTransaction,
    Timestamp,
    collection,
    addDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CreditTransaction, Organization, SubscriptionTier, TIER_LIMITS } from '../types';

export const CREDIT_COSTS = {
    ARTICLE_GENERATION: 1,
    IMAGE_GENERATION: 5
};

export const MONTHLY_ALLOWANCE: Record<SubscriptionTier, number> = {
    [SubscriptionTier.FREE]: 10,
    [SubscriptionTier.STARTER]: 100,
    [SubscriptionTier.PROFESSIONAL]: 500,
    [SubscriptionTier.ENTERPRISE]: 999999 // Effectively unlimited
};

export const creditService = {
    /**
     * Check if an organization has enough credits for an operation
     */
    async checkBalance(orgId: string, cost: number): Promise<boolean> {
        try {
            const orgRef = doc(db, 'organizations', orgId);
            const orgSnap = await getDoc(orgRef);

            if (!orgSnap.exists()) return false;

            const orgData = orgSnap.data() as Organization;
            const currentBalance = orgData.credits?.balance ?? 0;

            return currentBalance >= cost;
        } catch (error) {
            console.error('Error checking credit balance:', error);
            return false;
        }
    },

    /**
     * Deduct credits from an organization using a transaction to prevent race conditions
     */
    async deductCredits(
        orgId: string,
        userId: string,
        cost: number,
        description: string,
        metadata?: CreditTransaction['metadata']
    ): Promise<void> {
        const orgRef = doc(db, 'organizations', orgId);
        const transactionsRef = collection(db, 'credit_transactions');

        try {
            await runTransaction(db, async (transaction) => {
                const orgDoc = await transaction.get(orgRef);
                if (!orgDoc.exists()) {
                    throw new Error('Organization does not exist');
                }

                const orgData = orgDoc.data() as Organization;
                const currentBalance = orgData.credits?.balance ?? 0;

                if (currentBalance < cost) {
                    throw new Error('Insufficient credits');
                }

                const newBalance = currentBalance - cost;

                // Update organization balance
                transaction.update(orgRef, {
                    'credits.balance': newBalance,
                    updatedAt: Timestamp.now()
                });

                // Create transaction record
                const creditTransaction: Omit<CreditTransaction, 'id'> = {
                    organizationId: orgId,
                    userId,
                    amount: -cost,
                    balanceAfter: newBalance,
                    type: 'usage',
                    description,
                    metadata,
                    createdAt: Timestamp.now()
                };

                // Note: We can't use transaction.set for a new auto-ID doc easily in client SDK 
                // without generating the ID first. For simplicity in this service wrapper, 
                // we'll write the log after the balance update succeeds, or use a fixed ID if needed.
                // Ideally, we'd batch this, but `runTransaction` is for reads-then-writes.
                // To keep it atomic, we should generate a ref.
                const newTxRef = doc(transactionsRef);
                transaction.set(newTxRef, { ...creditTransaction, id: newTxRef.id });
            });
        } catch (error) {
            console.error('Error deducting credits:', error);
            throw error;
        }
    },

    /**
     * Add credits to an organization (e.g. purchase or manual grant)
     */
    async addCredits(
        orgId: string,
        userId: string, // Admin or System user ID
        amount: number,
        type: CreditTransaction['type'],
        description: string
    ): Promise<void> {
        const orgRef = doc(db, 'organizations', orgId);
        const transactionsRef = collection(db, 'credit_transactions');

        try {
            await runTransaction(db, async (transaction) => {
                const orgDoc = await transaction.get(orgRef);
                if (!orgDoc.exists()) {
                    throw new Error('Organization does not exist');
                }

                const orgData = orgDoc.data() as Organization;
                const currentBalance = orgData.credits?.balance ?? 0;
                const newBalance = currentBalance + amount;

                transaction.update(orgRef, {
                    'credits.balance': newBalance,
                    updatedAt: Timestamp.now()
                });

                const newTxRef = doc(transactionsRef);
                const creditTransaction: Omit<CreditTransaction, 'id'> = {
                    organizationId: orgId,
                    userId,
                    amount,
                    balanceAfter: newBalance,
                    type,
                    description,
                    createdAt: Timestamp.now()
                };
                transaction.set(newTxRef, { ...creditTransaction, id: newTxRef.id });
            });
        } catch (error) {
            console.error('Error adding credits:', error);
            throw error;
        }
    },

    /**
     * Initialize credits for a new organization
     */
    async initializeCredits(orgId: string, tier: SubscriptionTier): Promise<void> {
        const allowance = MONTHLY_ALLOWANCE[tier];
        const now = Timestamp.now();
        const nextRefill = new Date();
        nextRefill.setMonth(nextRefill.getMonth() + 1);

        await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', orgId);
            transaction.update(orgRef, {
                credits: {
                    balance: allowance,
                    monthlyAllowance: allowance,
                    lastRefillAt: now,
                    nextRefillAt: Timestamp.fromDate(nextRefill)
                }
            });
        });
    }
};
