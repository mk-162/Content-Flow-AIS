import {
    doc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageAsset, ImageAssetStatus } from '../types';

/**
 * Image Service - CRUD operations with lifecycle management
 * Handles soft delete, restore, and image queries
 */
export const imageService = {
    /**
     * Get a single image by ID
     */
    async getImage(
        orgId: string,
        projectId: string,
        imageId: string
    ): Promise<ImageAsset | null> {
        const docRef = doc(db, `organizations/${orgId}/projects/${projectId}/imageAssets/${imageId}`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            ...docSnap.data()
        } as ImageAsset;
    },

    /**
     * Get all active (non-deleted) images for a project
     */
    async getActiveImages(
        orgId: string,
        projectId: string
    ): Promise<ImageAsset[]> {
        const q = query(
            collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`),
            where('status', 'in', ['active', undefined]),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ImageAsset));
    },

    /**
     * Get deleted images for a project (within recovery period)
     */
    async getDeletedImages(
        orgId: string,
        projectId: string
    ): Promise<ImageAsset[]> {
        const q = query(
            collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`),
            where('status', '==', 'deleted'),
            orderBy('deletedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ImageAsset));
    },

    /**
     * Soft delete an image (30-day recovery period)
     * Files remain in storage, image marked as deleted in Firestore
     */
    async softDelete(
        orgId: string,
        projectId: string,
        imageId: string,
        userId: string
    ): Promise<void> {
        const docRef = doc(db, `organizations/${orgId}/projects/${projectId}/imageAssets/${imageId}`);

        // Calculate scheduled deletion date (30 days from now)
        const scheduledDeletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await updateDoc(docRef, {
            status: 'deleted' as ImageAssetStatus,
            deletedAt: Timestamp.now(),
            deletedBy: userId,
            scheduledDeletionAt: Timestamp.fromDate(scheduledDeletionDate)
        });

        console.log(`Image ${imageId} soft deleted, scheduled for permanent deletion at ${scheduledDeletionDate.toISOString()}`);
    },

    /**
     * Restore a soft-deleted image
     */
    async restore(
        orgId: string,
        projectId: string,
        imageId: string
    ): Promise<void> {
        const docRef = doc(db, `organizations/${orgId}/projects/${projectId}/imageAssets/${imageId}`);

        // First check if image is deleted and restorable
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error('Image not found');
        }

        const data = docSnap.data();
        if (data.status !== 'deleted') {
            throw new Error('Image is not deleted');
        }

        // Check if still within recovery period
        if (data.scheduledDeletionAt && data.scheduledDeletionAt.toDate() < new Date()) {
            throw new Error('Recovery period has expired');
        }

        await updateDoc(docRef, {
            status: 'active' as ImageAssetStatus,
            deletedAt: null,
            deletedBy: null,
            scheduledDeletionAt: null
        });

        console.log(`Image ${imageId} restored`);
    },

    /**
     * Replace an image with a new one (soft deletes the old image)
     */
    async replaceImage(
        orgId: string,
        projectId: string,
        oldImageId: string,
        newImageId: string,
        userId: string
    ): Promise<void> {
        const oldDocRef = doc(db, `organizations/${orgId}/projects/${projectId}/imageAssets/${oldImageId}`);
        const scheduledDeletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await updateDoc(oldDocRef, {
            status: 'deleted' as ImageAssetStatus,
            deletedAt: Timestamp.now(),
            deletedBy: userId,
            scheduledDeletionAt: Timestamp.fromDate(scheduledDeletionDate),
            replacedBy: newImageId
        });

        console.log(`Image ${oldImageId} replaced by ${newImageId}`);
    },

    /**
     * Get recovery info for a deleted image
     */
    async getRecoveryInfo(
        orgId: string,
        projectId: string,
        imageId: string
    ): Promise<{
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
        scheduledDeletionAt: Date | null;
        daysRemaining: number | null;
        canRestore: boolean;
    }> {
        const docRef = doc(db, `organizations/${orgId}/projects/${projectId}/imageAssets/${imageId}`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return {
                isDeleted: true,
                deletedAt: null,
                deletedBy: null,
                scheduledDeletionAt: null,
                daysRemaining: null,
                canRestore: false
            };
        }

        const data = docSnap.data();

        if (data.status !== 'deleted') {
            return {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                scheduledDeletionAt: null,
                daysRemaining: null,
                canRestore: false
            };
        }

        const scheduledDate = data.scheduledDeletionAt?.toDate();
        const now = new Date();
        const daysRemaining = scheduledDate
            ? Math.max(0, Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : null;

        return {
            isDeleted: true,
            deletedAt: data.deletedAt?.toDate() || null,
            deletedBy: data.deletedBy || null,
            scheduledDeletionAt: scheduledDate || null,
            daysRemaining,
            canRestore: daysRemaining !== null && daysRemaining > 0
        };
    },

    /**
     * Get images by type (generated or uploaded)
     */
    async getImagesByType(
        orgId: string,
        projectId: string,
        type: 'generated' | 'uploaded'
    ): Promise<ImageAsset[]> {
        const q = query(
            collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`),
            where('type', '==', type),
            where('status', 'in', ['active', undefined]),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ImageAsset));
    },

    /**
     * Get image count for a project
     */
    async getImageCount(
        orgId: string,
        projectId: string
    ): Promise<{ active: number; deleted: number; total: number }> {
        const allImagesQuery = query(
            collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`)
        );

        const allDocs = await getDocs(allImagesQuery);

        let active = 0;
        let deleted = 0;

        allDocs.forEach(doc => {
            const status = doc.data().status;
            if (status === 'deleted') {
                deleted++;
            } else {
                active++;
            }
        });

        return { active, deleted, total: active + deleted };
    },

    /**
     * Update image metadata (alt text, prompt)
     */
    async updateMetadata(
        orgId: string,
        projectId: string,
        imageId: string,
        updates: {
            altText?: string;
            prompt?: string;
        }
    ): Promise<void> {
        const docRef = doc(db, `organizations/${orgId}/projects/${projectId}/imageAssets/${imageId}`);
        await updateDoc(docRef, updates);
    }
};
