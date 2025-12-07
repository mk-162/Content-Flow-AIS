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
import { db, functions } from '../lib/firebase';
import { creditService, CREDIT_COSTS } from './creditService';
import { ImageAsset, Organization, Project } from '../types';
import OpenAI from 'openai';

export interface ImageGenerationOptions {
    prompt: string;
    aspectRatio: '16:9' | '1:1' | '4:3';
    style?: string;
    negativePrompt?: string;
    brandStyle?: {
        description: string;
        referenceImageUrl?: string;
    };
}

export interface ImageGenerationResult {
    url: string;
    assetId: string;
    cost: number;
}

const getOpenAIClient = () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API Key not found. Please add VITE_OPENAI_API_KEY to your .env.local file.');
    }
    return new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
    });
};

export const imageGenerationService = {
    /**
     * Generate an image using OpenAI DALL-E 3
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

            // 3. Call OpenAI API
            console.log('Generating image with options:', options);
            const openai = getOpenAIClient();

            // Map aspect ratio to DALL-E 3 supported sizes
            let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
            if (options.aspectRatio === '16:9') size = "1792x1024"; // Landscape
            // DALL-E 3 doesn't support 4:3 natively, mapping to square or landscape
            if (options.aspectRatio === '4:3') size = "1024x1024";

            // Construct Prompt with Brand Style
            let finalPrompt = options.prompt;
            if (options.brandStyle?.description) {
                finalPrompt = `[Brand Style: ${options.brandStyle.description}] ${finalPrompt}`;
            }
            if (options.style) {
                finalPrompt += ` Style: ${options.style}`;
            }

            console.log('Calling OpenAI DALL-E 3...');
            let response;
            try {
                response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: finalPrompt,
                    n: 1,
                    size: size,
                    quality: "standard",
                    style: "vivid",
                    response_format: "b64_json" // Request base64 to bypass CORS
                });
            } catch (openaiError: any) {
                console.error('OpenAI API Failed:', openaiError);
                throw new Error(`OpenAI API Error: ${openaiError.message || openaiError}`);
            }

            const b64Json = response.data[0]?.b64_json;
            if (!b64Json) throw new Error('No image data returned from OpenAI');
            console.log('OpenAI generated image data (base64)');

            // 4. Upload to Firebase Storage (Persistence) via Cloud Function (Bypasses CORS)
            console.log('Saving image via Cloud Function...');

            const saveImage = httpsCallable(functions, 'saveGeneratedImage');

            let saveResult: any;
            try {
                const result = await saveImage({
                    imageBase64: b64Json,
                    orgId,
                    projectId,
                    contentType: 'image/png'
                });
                saveResult = result.data;
            } catch (saveError: any) {
                console.error('Cloud Function Save Failed:', saveError);
                throw new Error(`Image Save Error: ${saveError.message || saveError}`);
            }

            const permanentUrl = saveResult.url;
            const storagePath = saveResult.storagePath;
            console.log('Image saved to:', permanentUrl);

            // 5. Save Image Asset to Firestore
            const assetsRef = collection(db, `organizations/${orgId}/projects/${projectId}/imageAssets`);

            const newAsset: Omit<ImageAsset, 'id'> = {
                organizationId: orgId,
                projectId,
                url: permanentUrl,
                path: storagePath,
                prompt: response.data[0].revised_prompt || options.prompt, // Use revised prompt if available
                altText: options.prompt,
                createdAt: Timestamp.now(),
                createdBy: userId,
                type: 'generated',
                costInCredits: cost,
                // providerId: 'dall-e-3' // Optional: Add if needed for tracking
            };

            const docRef = await addDoc(assetsRef, newAsset);

            return {
                url: permanentUrl,
                assetId: docRef.id,
                cost
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
