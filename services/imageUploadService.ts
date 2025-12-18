import {
    collection,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { creditService, CREDIT_COSTS } from './creditService';
import { ImageAsset, ImageVariants } from '../types';

// Cost for user uploads (less than AI generation)
const UPLOAD_CREDIT_COST = 1;

export interface UploadResult {
    url: string;
    assetId: string;
    cost: number;
    variants?: ImageVariants;
    metadata?: {
        originalSize: number;
        originalDimensions: { width: number; height: number };
        processingTimeMs: number;
    };
}

// Supported file types
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Image Upload Service - Handles user-uploaded images
 */
export const imageUploadService = {
    /**
     * Validate a file before upload
     */
    validateFile(file: File): { valid: boolean; error?: string } {
        // Check file type
        if (!SUPPORTED_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: `Unsupported file type. Allowed: ${SUPPORTED_TYPES.map(t => t.split('/')[1]).join(', ')}`
            };
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            return {
                valid: false,
                error: `File too large (${sizeMB}MB). Maximum size is 10MB.`
            };
        }

        return { valid: true };
    },

    /**
     * Convert a File to base64 string
     */
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/png;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Upload an image file
     * Validates, processes (creates variants), and stores the image
     */
    async uploadImage(
        file: File,
        orgId: string,
        projectId: string,
        userId: string,
        options?: {
            altText?: string;
        }
    ): Promise<UploadResult> {
        // 1. Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // 2. Check credit balance
        const cost = UPLOAD_CREDIT_COST;
        const hasBalance = await creditService.checkBalance(orgId, cost);
        if (!hasBalance) {
            throw new Error('Insufficient credits for image upload');
        }

        try {
            // 3. Deduct credits upfront
            await creditService.deductCredits(
                orgId,
                userId,
                cost,
                `Uploaded image: ${file.name.substring(0, 30)}...`,
                { projectId, feature: 'image_upload' }
            );

            // 4. Convert to base64
            console.log('Converting file to base64...');
            const base64 = await this.fileToBase64(file);

            // 5. Process image via Cloud Function (creates variants)
            console.log('Processing uploaded image...');
            const processImage = httpsCallable(functions, 'processImage');

            const result = await processImage({
                imageBase64: base64,
                orgId,
                projectId,
                contentType: file.type,
                source: 'upload'
            });

            const processResult = result.data as any;

            // 6. Save to Firestore
            const assetsRef = collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`);

            const newAsset: Omit<ImageAsset, 'id'> = {
                organizationId: orgId,
                projectId,
                url: processResult.url,
                path: processResult.storagePath,
                prompt: `Uploaded: ${file.name}`,
                altText: options?.altText || file.name.split('.')[0],
                createdAt: Timestamp.now(),
                createdBy: userId,
                type: 'uploaded',
                costInCredits: cost,
                variants: processResult.variants,
                originalDimensions: processResult.metadata?.originalDimensions,
                originalSize: processResult.metadata?.originalSize,
                processingTimeMs: processResult.metadata?.processingTimeMs,
                status: 'active'
            };

            const docRef = await addDoc(assetsRef, newAsset);

            console.log('Image uploaded successfully:', docRef.id);

            return {
                url: processResult.url,
                assetId: docRef.id,
                cost,
                variants: processResult.variants,
                metadata: processResult.metadata
            };

        } catch (error: any) {
            console.error('Error uploading image:', error);

            // Refund credits on failure
            try {
                await creditService.addCredits(
                    orgId,
                    userId,
                    cost,
                    'refund',
                    `Refund for failed upload: ${file.name.substring(0, 30)}...`
                );
                console.log('Credits refunded');
            } catch (refundError) {
                console.error('Error refunding credits:', refundError);
            }

            throw error;
        }
    },

    /**
     * Get the upload credit cost
     */
    getUploadCost(): number {
        return UPLOAD_CREDIT_COST;
    },

    /**
     * Check if user can upload (has sufficient credits)
     */
    async canUpload(orgId: string): Promise<boolean> {
        return creditService.checkBalance(orgId, UPLOAD_CREDIT_COST);
    }
};
