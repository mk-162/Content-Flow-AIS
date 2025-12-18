import {
    doc,
    collection,
    addDoc,
    updateDoc,
    Timestamp,
    getDoc
} from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, functions, functionsUS } from '../lib/firebase';
import { creditService, CREDIT_COSTS } from './creditService';
import { ImageAsset, ImageVariants, Organization, Project } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface ImageGenerationOptions {
    prompt: string;
    aspectRatio: '16:9' | '1:1' | '4:3';
    style?: string;
    negativePrompt?: string;
    brandStyle?: {
        description: string;
        referenceImageUrl?: string;
    };
    // Slugs for clean public URLs
    orgSlug?: string;
    projectSlug?: string;
}

export interface ImageGenerationResult {
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

export interface PreviewResult {
    url: string;
    imageId: string;
    path: string;
    sessionId: string;
    expiresAt: string;
}


export const imageGenerationService = {
    /**
     * Generate an image using Gemini 2.0 Flash (via Firebase Function)
     */
    async generateImage(
        orgId: string,
        projectId: string,
        userId: string,
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResult> {
        const cost = CREDIT_COSTS.IMAGE_GENERATION;

        // 1. Check Balance
        const hasBalance = await creditService.checkBalance(orgId, cost);
        if (!hasBalance) {
            throw new Error('Insufficient credits for image generation');
        }

        try {
            // 2. Deduct Credits
            await creditService.deductCredits(
                orgId,
                userId,
                cost,
                `Generated Image: ${options.prompt.substring(0, 30)}...`,
                { projectId, feature: 'image_generation' }
            );

            // 3. Call Firebase Function to generate image with Gemini
            console.log('Generating image with options:', options);
            console.log('Calling Gemini 2.0 Flash via Firebase Function...');

            const generateImageWithGemini = httpsCallable(functionsUS, 'generateImageWithGemini');

            let geminiResult: any;
            try {
                const result = await generateImageWithGemini({
                    prompt: options.prompt,
                    aspectRatio: options.aspectRatio,
                    style: options.style,
                    brandStyle: options.brandStyle
                });
                geminiResult = result.data;
            } catch (geminiError: any) {
                console.error('Gemini API Failed:', geminiError);
                throw new Error(`Gemini API Error: ${geminiError.message || geminiError}`);
            }

            const b64Json = geminiResult.imageBase64;
            if (!b64Json) throw new Error('No image data returned from Gemini');
            console.log('Gemini generated image data (base64)');
            const revisedPrompt = geminiResult.revisedPrompt || options.prompt;

            // 4. Process and upload via Cloud Function (creates multiple variants)
            console.log('Processing image via Cloud Function...');

            const processImage = httpsCallable(functions, 'processImage');

            let processResult: any;
            try {
                const result = await processImage({
                    imageBase64: b64Json,
                    orgId,
                    projectId,
                    orgSlug: options.orgSlug,
                    projectSlug: options.projectSlug,
                    contentType: 'image/png',
                    source: 'generated'
                });
                processResult = result.data;
            } catch (processError: any) {
                console.error('Cloud Function Process Failed:', processError);
                throw new Error(`Image Process Error: ${processError.message || processError}`);
            }

            // Use publicUrl if available (clean custom domain URL), otherwise fall back to Firebase URL
            const permanentUrl = processResult.publicUrl || processResult.url;
            const storagePath = processResult.storagePath;
            const variants = processResult.variants;
            const imageMetadata = processResult.metadata;
            const imageSlug = processResult.imageSlug;
            console.log('Image processed:', processResult.imageSlug || processResult.imageId);

            // 5. Save Image Asset to Firestore
            const assetsRef = collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`);

            const newAsset: Omit<ImageAsset, 'id'> = {
                organizationId: orgId,
                projectId,
                url: permanentUrl,
                publicUrl: processResult.publicUrl,
                slug: imageSlug,
                path: storagePath,
                prompt: revisedPrompt,
                altText: options.prompt,
                createdAt: Timestamp.now(),
                createdBy: userId,
                type: 'generated',
                costInCredits: cost,
                // New fields for enhanced image management
                variants: variants,
                originalDimensions: imageMetadata?.originalDimensions,
                originalSize: imageMetadata?.originalSize,
                processingTimeMs: imageMetadata?.processingTimeMs,
                status: 'active'
            };

            const docRef = await addDoc(assetsRef, newAsset);

            return {
                url: permanentUrl,
                assetId: docRef.id,
                cost,
                variants,
                metadata: imageMetadata
            };

        } catch (error) {
            console.error('Error in generateImage workflow:', error);

            // Refund credits if generation failed after deduction
            try {
                await creditService.addCredits(
                    orgId,
                    userId,
                    cost,
                    'refund',
                    `Refund for failed image generation: ${options.prompt.substring(0, 30)}...`
                );
                console.log('Credits refunded successfully');
            } catch (refundError) {
                console.error('Error refunding credits:', refundError);
            }

            throw error;
        }
    },

    /**
     * Generate a prompt for an image based on post content
     */
    async generateImagePrompt(
        postTitle: string,
        postTeaser: string,
        style?: string
    ): Promise<string> {
        // Mock prompt generation - could be upgraded to use Gemini later
        return `A professional, high-quality image representing "${postTitle}". ${style ? `Style: ${style}` : ''}`;
    },

    /**
     * Generate a preview image (no credits charged, stored in temp folder)
     * Use this for letting users preview before committing
     */
    async generatePreview(
        options: ImageGenerationOptions
    ): Promise<PreviewResult> {
        try {
            // Generate session ID for this preview
            const sessionId = uuidv4();

            // Call Gemini via Firebase Function
            console.log('Generating preview image with Gemini...');
            const generateImageWithGemini = httpsCallable(functionsUS, 'generateImageWithGemini');

            const geminiResult = await generateImageWithGemini({
                prompt: options.prompt,
                aspectRatio: options.aspectRatio,
                style: options.style,
                brandStyle: options.brandStyle
            });

            const geminiData = geminiResult.data as any;
            const b64Json = geminiData.imageBase64;
            if (!b64Json) throw new Error('No image data returned from Gemini');

            // Save to temp folder (no credits charged, auto-deletes in 24hrs)
            const savePreview = httpsCallable(functions, 'savePreviewImage');
            const result = await savePreview({
                imageBase64: b64Json,
                sessionId
            });

            const previewData = result.data as any;

            console.log('Preview generated:', previewData.imageId);

            return {
                url: previewData.url,
                imageId: previewData.imageId,
                path: previewData.path,
                sessionId: previewData.sessionId,
                expiresAt: previewData.expiresAt
            };

        } catch (error: any) {
            console.error('Error generating preview:', error);
            throw error;
        }
    },

    /**
     * Save a preview as a permanent image asset (charges credits)
     */
    async savePreviewAsAsset(
        previewPath: string,
        orgId: string,
        projectId: string,
        userId: string,
        prompt: string
    ): Promise<ImageGenerationResult> {
        const cost = CREDIT_COSTS.IMAGE_GENERATION;

        // 1. Check Balance
        const hasBalance = await creditService.checkBalance(orgId, cost);
        if (!hasBalance) {
            throw new Error('Insufficient credits to save image');
        }

        try {
            // 2. Deduct Credits
            await creditService.deductCredits(
                orgId,
                userId,
                cost,
                `Saved preview image: ${prompt.substring(0, 30)}...`,
                { projectId, feature: 'image_generation' }
            );

            // 3. Promote preview to permanent storage
            const promotePreview = httpsCallable(functions, 'promotePreviewImage');
            const result = await promotePreview({
                previewPath,
                orgId,
                projectId
            });

            const promoteData = result.data as any;

            // 4. Save to Firestore
            const assetsRef = collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`);

            const newAsset: Omit<ImageAsset, 'id'> = {
                organizationId: orgId,
                projectId,
                url: promoteData.url,
                path: promoteData.storagePath,
                prompt: prompt,
                altText: prompt,
                createdAt: Timestamp.now(),
                createdBy: userId,
                type: 'generated',
                costInCredits: cost,
                variants: promoteData.variants,
                originalDimensions: promoteData.variants?.original ? {
                    width: promoteData.variants.original.width,
                    height: promoteData.variants.original.height
                } : undefined,
                originalSize: promoteData.variants?.original?.size,
                status: 'active'
            };

            const docRef = await addDoc(assetsRef, newAsset);

            return {
                url: promoteData.url,
                assetId: docRef.id,
                cost,
                variants: promoteData.variants
            };

        } catch (error) {
            console.error('Error saving preview:', error);

            // Refund credits if save failed
            try {
                await creditService.addCredits(
                    orgId,
                    userId,
                    cost,
                    'refund',
                    `Refund for failed preview save: ${prompt.substring(0, 30)}...`
                );
            } catch (refundError) {
                console.error('Error refunding credits:', refundError);
            }

            throw error;
        }
    }
};

function getDimensions(aspectRatio: string): string {
    switch (aspectRatio) {
        case '16:9': return '1024x576';
        case '4:3': return '1024x768';
        case '1:1': return '1024x1024';
        default: return '1024x1024';
    }
}
