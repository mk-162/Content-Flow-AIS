import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';

// Image processing configuration
const IMAGE_CONFIG = {
  small: { width: 600, webpQuality: 85, jpegQuality: 90 },
  large: { width: 1400, webpQuality: 85, jpegQuality: 90 }
};

// Custom image domain
const IMAGE_DOMAIN = 'images.missioncontent.com';

// Generate a short alphanumeric slug (6 chars)
const generateShortSlug = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
};

admin.initializeApp();

const storage = admin.storage();

// 1st gen function - simpler build process, deployed to europe-west2
export const testFunction = functions
  .region('europe-west2')
  .https.onCall(async (data, context) => {
    return { success: true, message: 'Test function works!' };
  });

/**
 * Saves a base64-encoded image to Firebase Storage
 * This bypasses CORS issues by handling the upload server-side
 */
export const saveGeneratedImage = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to save images'
      );
    }

    const { imageBase64, orgId, projectId, contentType = 'image/png' } = data;

    // Validate inputs
    if (!imageBase64 || !orgId || !projectId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: imageBase64, orgId, projectId'
      );
    }

    try {
      // Create unique filename with download token
      const timestamp = Date.now();
      const downloadToken = uuidv4();
      const fileName = `generated_${timestamp}.png`;
      const storagePath = `organizations/${orgId}/projects/${projectId}/images/${fileName}`;

      // Decode base64 and upload to Storage
      const buffer = Buffer.from(imageBase64, 'base64');
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            uploadedBy: context.auth.uid,
            generatedAt: new Date().toISOString(),
            orgId,
            projectId,
            firebaseStorageDownloadTokens: downloadToken
          }
        }
      });

      // Create Firebase download URL using token (no signBlob needed)
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

      console.log(`Image saved successfully: ${storagePath}`);

      return {
        success: true,
        url: downloadUrl,
        storagePath
      };
    } catch (error: any) {
      console.error('Error saving image:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to save image: ${error.message}`
      );
    }
  });

/**
 * Process an image with multiple variants (WebP + JPEG at multiple sizes)
 * This is the new comprehensive image processing pipeline
 */
export const processImage = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 120,
    memory: '1GB'
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to process images'
      );
    }

    const {
      imageBase64,
      orgId,
      projectId,
      orgSlug,
      projectSlug,
      contentType = 'image/png',
      source = 'generated'
    } = data;

    // Validate inputs
    if (!imageBase64 || !orgId || !projectId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: imageBase64, orgId, projectId'
      );
    }

    const startTime = Date.now();

    try {
      // Generate short image slug for clean URLs
      const imageSlug = generateShortSlug();
      const imageId = uuidv4(); // Keep UUID for internal tracking
      const bucket = storage.bucket();

      // Use slug-based path if slugs provided, otherwise fall back to IDs
      const useSlugPath = orgSlug && projectSlug;
      const basePath = useSlugPath
        ? `o/${orgSlug}/p/${projectSlug}`
        : `organizations/${orgId}/projects/${projectId}`;

      // Decode base64 to buffer
      const originalBuffer = Buffer.from(imageBase64, 'base64');

      // Get image metadata using Sharp
      const metadata = await sharp(originalBuffer).metadata();
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;
      const originalSize = originalBuffer.length;

      // Determine file extension from content type
      const extMap: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif'
      };
      const originalExt = extMap[contentType] || 'png';

      // Create download token for URLs
      const downloadToken = uuidv4();

      // Upload original - use slug for clean paths
      const originalPath = useSlugPath
        ? `${basePath}/i/${imageSlug}.${originalExt}`
        : `${basePath}/originals/${imageId}.${originalExt}`;
      const originalFile = bucket.file(originalPath);
      await originalFile.save(originalBuffer, {
        metadata: {
          contentType,
          metadata: {
            uploadedBy: context.auth.uid,
            processedAt: new Date().toISOString(),
            orgId,
            projectId,
            imageId,
            firebaseStorageDownloadTokens: downloadToken
          }
        }
      });

      // Helper function to upload a variant
      const uploadVariant = async (
        buffer: Buffer,
        size: 'small' | 'large',
        format: 'webp' | 'jpg',
        variantContentType: string
      ): Promise<string> => {
        // Use slug for clean paths, fall back to old structure
        const variantPath = useSlugPath
          ? `${basePath}/i/${imageSlug}-${size}.${format}`
          : `${basePath}/web/${size}/${imageId}.${format}`;
        const variantToken = uuidv4();
        const file = bucket.file(variantPath);

        await file.save(buffer, {
          metadata: {
            contentType: variantContentType,
            metadata: {
              uploadedBy: context.auth!.uid,
              processedAt: new Date().toISOString(),
              orgId,
              projectId,
              imageId,
              variant: `${size}-${format}`,
              firebaseStorageDownloadTokens: variantToken
            }
          }
        });

        // Return Firebase download URL
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(variantPath)}?alt=media&token=${variantToken}`;
      };

      // Process variants in parallel
      const variants: {
        original: { url: string; path: string; width: number; height: number; size: number };
        small: { webp: string; jpeg: string };
        large: { webp: string; jpeg: string };
      } = {
        original: {
          url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(originalPath)}?alt=media&token=${downloadToken}`,
          path: originalPath,
          width: originalWidth,
          height: originalHeight,
          size: originalSize
        },
        small: { webp: '', jpeg: '' },
        large: { webp: '', jpeg: '' }
      };

      // Generate small variants (600px width)
      const smallImage = sharp(originalBuffer)
        .resize(IMAGE_CONFIG.small.width, null, { withoutEnlargement: true });

      const [smallWebpBuffer, smallJpegBuffer] = await Promise.all([
        smallImage.clone().webp({ quality: IMAGE_CONFIG.small.webpQuality }).toBuffer(),
        smallImage.clone().jpeg({ quality: IMAGE_CONFIG.small.jpegQuality }).toBuffer()
      ]);

      // Generate large variants (1400px width)
      const largeImage = sharp(originalBuffer)
        .resize(IMAGE_CONFIG.large.width, null, { withoutEnlargement: true });

      const [largeWebpBuffer, largeJpegBuffer] = await Promise.all([
        largeImage.clone().webp({ quality: IMAGE_CONFIG.large.webpQuality }).toBuffer(),
        largeImage.clone().jpeg({ quality: IMAGE_CONFIG.large.jpegQuality }).toBuffer()
      ]);

      // Upload all variants in parallel
      const [smallWebpUrl, smallJpegUrl, largeWebpUrl, largeJpegUrl] = await Promise.all([
        uploadVariant(smallWebpBuffer, 'small', 'webp', 'image/webp'),
        uploadVariant(smallJpegBuffer, 'small', 'jpg', 'image/jpeg'),
        uploadVariant(largeWebpBuffer, 'large', 'webp', 'image/webp'),
        uploadVariant(largeJpegBuffer, 'large', 'jpg', 'image/jpeg')
      ]);

      variants.small = { webp: smallWebpUrl, jpeg: smallJpegUrl };
      variants.large = { webp: largeWebpUrl, jpeg: largeJpegUrl };

      const processingTimeMs = Date.now() - startTime;

      console.log(`Image processed successfully: ${imageSlug} (${imageId}) in ${processingTimeMs}ms`);

      // Build public URL using custom domain if slugs provided
      const publicUrl = useSlugPath
        ? `https://${IMAGE_DOMAIN}/${basePath}/i/${imageSlug}-small.webp`
        : undefined;

      return {
        success: true,
        imageId,
        imageSlug: useSlugPath ? imageSlug : undefined,
        // Primary URL for backward compatibility (small WebP)
        url: variants.small.webp,
        // Clean public URL via custom domain
        publicUrl,
        storagePath: originalPath,
        variants,
        metadata: {
          originalSize,
          originalDimensions: { width: originalWidth, height: originalHeight },
          processingTimeMs,
          source
        }
      };

    } catch (error: any) {
      console.error('Error processing image:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to process image: ${error.message}`
      );
    }
  });

/**
 * Save a preview image to temporary storage (24hr auto-delete)
 * Preview images don't cost credits and are not saved to Firestore
 */
export const savePreviewImage = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to save preview images'
      );
    }

    const { imageBase64, sessionId } = data;

    if (!imageBase64 || !sessionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: imageBase64, sessionId'
      );
    }

    try {
      const imageId = uuidv4();
      const bucket = storage.bucket();
      const downloadToken = uuidv4();

      // Process to small WebP for preview
      const originalBuffer = Buffer.from(imageBase64, 'base64');
      const previewBuffer = await sharp(originalBuffer)
        .resize(IMAGE_CONFIG.small.width, null, { withoutEnlargement: true })
        .webp({ quality: IMAGE_CONFIG.small.webpQuality })
        .toBuffer();

      // Save to temp folder (will be auto-deleted by GCS lifecycle policy)
      const previewPath = `temp/${sessionId}/${imageId}.webp`;
      const file = bucket.file(previewPath);

      await file.save(previewBuffer, {
        metadata: {
          contentType: 'image/webp',
          metadata: {
            uploadedBy: context.auth.uid,
            sessionId,
            imageId,
            isPreview: 'true',
            createdAt: new Date().toISOString(),
            firebaseStorageDownloadTokens: downloadToken
          }
        }
      });

      const previewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(previewPath)}?alt=media&token=${downloadToken}`;

      console.log(`Preview image saved: ${previewPath}`);

      return {
        success: true,
        imageId,
        url: previewUrl,
        path: previewPath,
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

    } catch (error: any) {
      console.error('Error saving preview image:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to save preview image: ${error.message}`
      );
    }
  });

/**
 * Promote a preview image to permanent storage
 * This copies from temp to the project folder and processes all variants
 */
export const promotePreviewImage = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 120,
    memory: '1GB'
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { previewPath, orgId, projectId } = data;

    if (!previewPath || !orgId || !projectId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: previewPath, orgId, projectId'
      );
    }

    try {
      const bucket = storage.bucket();
      const previewFile = bucket.file(previewPath);

      // Check if preview exists
      const [exists] = await previewFile.exists();
      if (!exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Preview image not found or expired'
        );
      }

      // Download preview and process as new image
      const [previewBuffer] = await previewFile.download();

      // Call processImage logic with the preview buffer
      const imageId = uuidv4();
      const basePath = `organizations/${orgId}/projects/${projectId}`;
      const downloadToken = uuidv4();

      // Get image metadata
      const imgMetadata = await sharp(previewBuffer).metadata();

      // Upload original (from preview - note: this is already processed, so it's not true original)
      const originalPath = `${basePath}/originals/${imageId}.webp`;
      const originalFile = bucket.file(originalPath);
      await originalFile.save(previewBuffer, {
        metadata: {
          contentType: 'image/webp',
          metadata: {
            uploadedBy: context.auth.uid,
            processedAt: new Date().toISOString(),
            orgId,
            projectId,
            imageId,
            promotedFrom: previewPath,
            firebaseStorageDownloadTokens: downloadToken
          }
        }
      });

      // Generate and upload variants (similar to processImage)
      const uploadVariant = async (
        buffer: Buffer,
        size: 'small' | 'large',
        format: 'webp' | 'jpg',
        variantContentType: string
      ): Promise<string> => {
        const variantPath = `${basePath}/web/${size}/${imageId}.${format}`;
        const variantToken = uuidv4();
        const file = bucket.file(variantPath);

        await file.save(buffer, {
          metadata: {
            contentType: variantContentType,
            metadata: {
              uploadedBy: context.auth!.uid,
              orgId,
              projectId,
              imageId,
              variant: `${size}-${format}`,
              firebaseStorageDownloadTokens: variantToken
            }
          }
        });

        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(variantPath)}?alt=media&token=${variantToken}`;
      };

      // Generate variants
      const smallImage = sharp(previewBuffer).resize(IMAGE_CONFIG.small.width, null, { withoutEnlargement: true });
      const largeImage = sharp(previewBuffer).resize(IMAGE_CONFIG.large.width, null, { withoutEnlargement: true });

      const [smallWebpBuffer, smallJpegBuffer, largeWebpBuffer, largeJpegBuffer] = await Promise.all([
        smallImage.clone().webp({ quality: IMAGE_CONFIG.small.webpQuality }).toBuffer(),
        smallImage.clone().jpeg({ quality: IMAGE_CONFIG.small.jpegQuality }).toBuffer(),
        largeImage.clone().webp({ quality: IMAGE_CONFIG.large.webpQuality }).toBuffer(),
        largeImage.clone().jpeg({ quality: IMAGE_CONFIG.large.jpegQuality }).toBuffer()
      ]);

      const [smallWebpUrl, smallJpegUrl, largeWebpUrl, largeJpegUrl] = await Promise.all([
        uploadVariant(smallWebpBuffer, 'small', 'webp', 'image/webp'),
        uploadVariant(smallJpegBuffer, 'small', 'jpg', 'image/jpeg'),
        uploadVariant(largeWebpBuffer, 'large', 'webp', 'image/webp'),
        uploadVariant(largeJpegBuffer, 'large', 'jpg', 'image/jpeg')
      ]);

      // Delete the preview file
      await previewFile.delete().catch(() => {});

      console.log(`Preview promoted to permanent: ${imageId}`);

      return {
        success: true,
        imageId,
        url: smallWebpUrl,
        storagePath: originalPath,
        variants: {
          original: {
            url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(originalPath)}?alt=media&token=${downloadToken}`,
            path: originalPath,
            width: imgMetadata.width || 0,
            height: imgMetadata.height || 0,
            size: previewBuffer.length
          },
          small: { webp: smallWebpUrl, jpeg: smallJpegUrl },
          large: { webp: largeWebpUrl, jpeg: largeJpegUrl }
        }
      };

    } catch (error: any) {
      console.error('Error promoting preview:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to promote preview: ${error.message}`
      );
    }
  });

/**
 * Serve images from Storage through Firebase Hosting CDN
 * Handles content negotiation (WebP vs JPEG based on browser support)
 */
export const serveImage = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https.onRequest(async (req, res) => {
    try {
      // Get the image path from the request
      const imagePath = req.path.substring(1); // Remove leading slash

      if (!imagePath) {
        res.status(400).send('Image path required');
        return;
      }

      const bucket = storage.bucket();
      const file = bucket.file(imagePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).send('Image not found');
        return;
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();

      // Content negotiation: prefer WebP if browser supports it
      const acceptsWebP = req.headers['accept']?.includes('image/webp');

      let serveFile = file;
      let contentType = metadata.contentType || 'image/jpeg';

      // If requesting JPEG but browser supports WebP, try to serve WebP version
      if (acceptsWebP && imagePath.endsWith('.jpg')) {
        const webpPath = imagePath.replace(/\.jpg$/, '.webp');
        const webpFile = bucket.file(webpPath);
        const [webpExists] = await webpFile.exists();

        if (webpExists) {
          serveFile = webpFile;
          contentType = 'image/webp';
        }
      }

      // Set response headers
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('Vary', 'Accept');
      res.set('Access-Control-Allow-Origin', '*');

      // Stream file to response
      serveFile.createReadStream()
        .on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).send('Error serving image');
          }
        })
        .pipe(res);

    } catch (error: any) {
      console.error('Image serve error:', error);
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  });

/**
 * Generate an image using Gemini 2.0 Flash (Nano Banana)
 * This handles image generation server-side to avoid CORS issues
 */
export const generateImageWithGemini = functions
  .region('us-central1')  // US region required for Gemini image generation
  .runWith({
    timeoutSeconds: 120,
    memory: '1GB'
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate images'
      );
    }

    const { prompt, aspectRatio = '16:9', style, brandStyle } = data;

    if (!prompt) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required field: prompt'
      );
    }

    try {
      // Get Gemini API key from environment config
      const geminiApiKey = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;

      if (!geminiApiKey) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Gemini API key not configured. Run: firebase functions:config:set gemini.api_key="YOUR_KEY"'
        );
      }

      // Initialize Gemini client
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Build the prompt with aspect ratio and style hints
      let fullPrompt = prompt;

      // Add brand style if provided
      if (brandStyle?.description) {
        fullPrompt = `[Brand Style: ${brandStyle.description}] ${fullPrompt}`;
      }

      // Add style modifier
      if (style) {
        fullPrompt += ` Style: ${style}`;
      }

      // Add aspect ratio hint to the prompt
      const aspectHints: Record<string, string> = {
        '16:9': 'Create this as a wide landscape image (16:9 aspect ratio).',
        '1:1': 'Create this as a square image (1:1 aspect ratio).',
        '4:3': 'Create this as a standard photo aspect ratio (4:3).'
      };
      fullPrompt += ` ${aspectHints[aspectRatio] || aspectHints['16:9']}`;

      console.log('Generating image with Gemini 2.0 Flash...');
      console.log('Prompt:', fullPrompt.substring(0, 100) + '...');

      // Generate image with Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: fullPrompt,
        config: {
          responseModalities: ['Text', 'Image']
        }
      });

      // Extract image from response
      let imageBase64: string | null = null;
      let responseText: string | null = null;

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText = part.text;
          } else if (part.inlineData && part.inlineData.data) {
            imageBase64 = part.inlineData.data;
          }
        }
      }

      if (!imageBase64) {
        console.error('No image in Gemini response:', JSON.stringify(response, null, 2));
        throw new functions.https.HttpsError(
          'internal',
          'Gemini did not return an image. This may be due to content filters or an issue with the prompt.'
        );
      }

      console.log('Image generated successfully by Gemini');

      return {
        success: true,
        imageBase64,
        revisedPrompt: responseText || prompt,
        contentType: 'image/png'
      };

    } catch (error: any) {
      console.error('Gemini image generation error:', error);

      // Handle specific error types
      if (error.code === 'functions/unauthenticated' ||
          error.code === 'functions/failed-precondition' ||
          error.code === 'functions/invalid-argument' ||
          error.code === 'functions/internal') {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Image generation failed: ${error.message || error}`
      );
    }
  });

/**
 * Trigger CloudFlare deployment webhook (proxied to avoid CORS)
 * Accepts webhookUrl from frontend to avoid Firestore permission issues
 */
export const triggerCloudFlareBuild = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .https.onCall(async (data, context) => {
    console.log('[triggerCloudFlareBuild] Function started');

    // Verify authentication
    if (!context.auth) {
      console.log('[triggerCloudFlareBuild] No auth');
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to trigger builds'
      );
    }

    const { webhookUrl } = data;
    console.log(`[triggerCloudFlareBuild] webhookUrl provided: ${!!webhookUrl}`);

    if (!webhookUrl) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing webhookUrl'
      );
    }

    // Validate webhook URL format for security
    if (!webhookUrl.includes('api.cloudflare.com') || !webhookUrl.includes('deploy_hooks')) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid CloudFlare webhook URL format'
      );
    }

    // Call CloudFlare webhook
    console.log('[triggerCloudFlareBuild] Calling webhook...');
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`[triggerCloudFlareBuild] Response: ${response.status}`);

      if (!response.ok) {
        throw new functions.https.HttpsError(
          'internal',
          `CloudFlare returned ${response.status}`
        );
      }

      console.log('[triggerCloudFlareBuild] Success!');
      return { success: true, message: 'Build triggered' };

    } catch (error: any) {
      console.error('[triggerCloudFlareBuild] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed: ${error.message || error}`
      );
    }
  });

// =============================================================================
// QUEUE PROCESSOR - Server-side content generation
// =============================================================================

// Task status enum (matches client-side)
enum TaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Task type enum
enum TaskType {
  GENERATE_TITLES = 'Generate Titles',
  GENERATE_CONTENT = 'Generate Content',
  GENERATE_IMAGE = 'Generate Image',
  GENERATE_CATEGORY_PAGE = 'Generate Category Page',
  GOOGLE_DEEP_RESEARCH = 'Google Deep Research'
}

// Post status enum
enum PostStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  REJECTED = 'rejected'
}

// Helper: Get Gemini client
const getGeminiClient = () => {
  const apiKey = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  return new GoogleGenAI({ apiKey });
};

// Helper: Retry with exponential backoff (handles rate limits gracefully)
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 4,
  baseDelay: number = 2000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    const errorMsg = error?.message?.toLowerCase() || '';

    // Check for rate limit / quota errors (use longer delays)
    const isRateLimited =
      errorMsg.includes('429') ||
      errorMsg.includes('rate limit') ||
      errorMsg.includes('resource_exhausted') ||
      errorMsg.includes('quota');

    // Check for temporary service errors
    const isTemporaryError =
      errorMsg.includes('503') ||
      errorMsg.includes('unavailable') ||
      errorMsg.includes('overloaded') ||
      errorMsg.includes('connection error');

    if (!isRateLimited && !isTemporaryError) throw error;

    // Use longer delays for rate limits (30s base, up to 4 min)
    const delay = isRateLimited ? Math.max(baseDelay, 30000) : baseDelay;
    console.warn(`Request failed (${isRateLimited ? 'rate limited' : 'temporary error'}). Retrying in ${delay/1000}s... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

// Helper: Strip common AI preambles from generated content
const stripPreamble = (content: string): string => {
  let result = content.trim();

  // Remove markdown code fences
  result = result.replace(/^```markdown\s*/i, '').replace(/\s*```$/i, '');

  // Find the first structural element (heading, bold section header, or numbered list)
  // This catches content that starts with preambles like "Okay, I'm ready to..."
  const structuralPatterns = [
    /^#{1,3}\s+/m,           // Markdown headings (# ## ###)
    /^\*\*\d+\./m,           // Bold numbered items (**1.)
    /^\*\*[A-Z][^*]+\*\*/m,  // Bold section headers (**Key Insights**)
    /^\d+\.\s+\*\*/m,        // Numbered items with bold (1. **Title**)
    /^##\s+/m,               // Double hash heading
  ];

  let firstStructureIndex = -1;
  for (const pattern of structuralPatterns) {
    const match = result.search(pattern);
    if (match !== -1 && (firstStructureIndex === -1 || match < firstStructureIndex)) {
      firstStructureIndex = match;
    }
  }

  // If we found a structural element, strip everything before it
  if (firstStructureIndex > 0) {
    result = result.substring(firstStructureIndex);
  } else {
    // Fallback to pattern-based removal for simpler preambles
    const patterns = [
      /^(Okay|Sure|Of course|Certainly|Here's|Here is|I'd be happy to|Absolutely|I'm ready|I will)[^.]*\.\s*/gi,
      /^(Here's the|Below is|The following)[^:]*:\s*/gi,
      /^[^#\n*1-9]*(?=\n\n)/,  // Any text before first double newline
    ];
    for (const pattern of patterns) {
      result = result.replace(pattern, '');
    }
  }

  return result.trim();
};

/**
 * Strip title headings from generated content.
 * Since the title is stored separately in the database, having it in the 
 * markdown body causes duplication in the UI.
 */
const stripTitleHeading = (content: string, title: string): string => {
  let cleaned = content.trim();

  // Escape special regex characters in title
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. Strip markdown H1: # Title (exact or close match at start)
  cleaned = cleaned.replace(new RegExp(`^#\\s*${escapedTitle}\\s*\\n*`, 'im'), '');

  // 2. Strip markdown H2: ## Title (exact match at start)
  cleaned = cleaned.replace(new RegExp(`^##\\s*${escapedTitle}\\s*\\n*`, 'im'), '');

  // 3. Strip variations like "# Title: Quick Answer" or "## Title - Summary"
  cleaned = cleaned.replace(new RegExp(`^##?\\s*${escapedTitle}[:\\-\\s][^\\n]*\\n*`, 'im'), '');

  // 4. Fallback: strip any H1 at the very beginning (title should always be H1)
  cleaned = cleaned.replace(/^#\s+[^\n]+\n*/, '');

  // 5. If it starts with a short H2 that repeats the title or is a generic label, strip it
  const h2Match = cleaned.match(/^##\s+([^\n]+)\n/);
  if (h2Match) {
    const h2Text = h2Match[1];
    const isShort = h2Text.length < 100;
    const isTitleRepeat = h2Text.toLowerCase().includes(title.toLowerCase().substring(0, 20));
    const isGeneric = /quick answer|summary|overview|introduction|article overview/i.test(h2Text);
    
    if (isShort && (isTitleRepeat || isGeneric)) {
      cleaned = cleaned.replace(/^##\s+[^\n]+\n+/, '');
    }
  }

  return cleaned.trim();
};

/**
 * Extract citations (markdown links) from research content
 * Returns both the citations list and the research content with preserved links
 */
interface Citation {
  text: string;
  url: string;
}

const extractCitationsFromResearch = (researchContent: string): { citations: Citation[], summary: string } => {
  const citations: Citation[] = [];
  const seenUrls = new Set<string>();

  // Match markdown links: [text](url)
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(researchContent)) !== null) {
    const [, text, url] = match;
    // Deduplicate by URL
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      citations.push({ text: text.trim(), url });
    }
  }

  // Create a summary that preserves the research structure but limits length
  // Include full content up to 4000 chars (increased to preserve more context with links)
  const summary = researchContent.length > 4000
    ? researchContent.substring(0, 4000) + '...'
    : researchContent;

  return { citations, summary };
};

/**
 * Format citations for prompt injection
 */
const formatCitationsForPrompt = (citations: Citation[], maxCitations: number = 20): string => {
  if (citations.length === 0) return '';

  const limitedCitations = citations.slice(0, maxCitations);
  const citationList = limitedCitations.map((c, i) => `${i + 1}. [${c.text}](${c.url})`).join('\n');

  return `\n**AUTHORITATIVE SOURCES (cite relevant ones in your content)**
The following sources were found during research. Include relevant citations as markdown links where they add credibility:
${citationList}
${citations.length > maxCitations ? `\n(${citations.length - maxCitations} more sources available)` : ''}`;
};

/**
 * Build research context from category's Google Deep Research data
 * Consolidates the repeated pattern of extracting citations and formatting context
 */
interface ResearchContext {
  deepResearchContext: string;
  citationsContext: string;
}

const buildResearchContext = (
  category: { googleDeepResearch?: { status?: string; content?: string } } | null | undefined,
  promptPrefix: string,
  maxCitations: number = 15
): ResearchContext => {
  if (!category?.googleDeepResearch?.status || category.googleDeepResearch.status !== 'complete' || !category.googleDeepResearch.content) {
    return { deepResearchContext: '', citationsContext: '' };
  }

  const researchContent = category.googleDeepResearch.content;
  const { citations, summary } = extractCitationsFromResearch(researchContent);

  const deepResearchContext = `\n${promptPrefix}\n${summary}`;
  const citationsContext = citations.length > 0 ? formatCitationsForPrompt(citations, maxCitations) : '';

  return { deepResearchContext, citationsContext };
};

/**
 * Generate seed keywords for a category using AI
 * Called by processGenerateTitles when keywords don't exist yet
 */
const generateCategoryKeywords = async (
  categoryId: string,
  categoryName: string,
  categoryDescription: string,
  projectData: any,
  organizationId: string,
  projectId: string
): Promise<{ primaryKeywords: any[], relatedKeywords: any[], questionsToAnswer: string[], isFallback?: boolean, error?: string }> => {
  console.log(`[Keywords] Generating keywords for category: ${categoryName}`);

  const ai = getGeminiClient();

  // Build brand context from project
  const brandContext = [
    projectData?.name && `Brand/Site: ${projectData.name}`,
    projectData?.description && `Description: ${projectData.description}`,
    projectData?.websiteUrl && `Website: ${projectData.websiteUrl}`,
    projectData?.settings?.positioningStatement && `Positioning: ${projectData.settings.positioningStatement}`,
    projectData?.businessProfile?.businessName && `Business: ${projectData.businessProfile.businessName}`,
    projectData?.businessProfile?.businessSummary && `About: ${projectData.businessProfile.businessSummary}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are an SEO keyword research expert. Generate search keywords for this content category.

CATEGORY: ${categoryName}
${categoryDescription ? `DESCRIPTION: ${categoryDescription}` : ''}

BRAND CONTEXT:
${brandContext || 'General content site'}

Generate a comprehensive keyword research report with:
1. primaryKeywords: 15-20 main keywords (mix of head terms and long-tail)
2. relatedKeywords: 10-15 related/semantic keywords
3. questionsToAnswer: 8-10 questions people search for

Focus on keywords that are:
- Relevant to both the category AND the brand's target audience
- A mix of informational, commercial, and transactional intent
- Include "how to", "what is", "best", "vs" variations

Return ONLY valid JSON in this exact format:
{
  "primaryKeywords": [{"keyword": "example keyword", "searchVolume": null, "difficulty": null}],
  "relatedKeywords": [{"keyword": "related example", "searchVolume": null}],
  "questionsToAnswer": ["How do I...?", "What is the best...?"]
}`;

  try {
    const response = await withRetry(async () => {
      return ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    const result = {
      primaryKeywords: parsed.primaryKeywords || [],
      relatedKeywords: parsed.relatedKeywords || [],
      questionsToAnswer: parsed.questionsToAnswer || []
    };

    console.log(`[Keywords] Generated ${result.primaryKeywords.length} primary keywords, ${result.questionsToAnswer.length} questions`);

    // Save to categoryResearch document
    const researchRef = admin.firestore().doc(`categoryResearch/${categoryId}`);
    await researchRef.set({
      id: categoryId,
      categoryId: categoryId,
      projectId: projectId,
      organizationId: organizationId,
      researchType: 'shallow',
      primaryKeywords: result.primaryKeywords,
      relatedKeywords: result.relatedKeywords,
      questionsToAnswer: result.questionsToAnswer,
      contentGaps: [],
      coveredTopics: [],
      suggestedTopics: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      keywordsFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'auto_generated'
    });

    console.log(`[Keywords] Saved keywords for category: ${categoryName}`);
    return result;

  } catch (error: any) {
    console.error('[Keywords] Failed to generate keywords:', error);

    // Fallback: generate basic keywords from category name
    const fallbackKeywords = [
      { keyword: categoryName, searchVolume: null, difficulty: null },
      { keyword: `${categoryName} guide`, searchVolume: null, difficulty: null },
      { keyword: `${categoryName} tips`, searchVolume: null, difficulty: null },
      { keyword: `how to ${categoryName}`, searchVolume: null, difficulty: null },
      { keyword: `best ${categoryName}`, searchVolume: null, difficulty: null },
      { keyword: `${categoryName} for beginners`, searchVolume: null, difficulty: null },
      { keyword: `${categoryName} strategies`, searchVolume: null, difficulty: null },
      { keyword: `${categoryName} examples`, searchVolume: null, difficulty: null },
    ];

    const fallbackQuestions = [
      `What is ${categoryName}?`,
      `How to ${categoryName}?`,
      `Why is ${categoryName} important?`,
      `What are the best ${categoryName} practices?`,
    ];

    // Save fallback to categoryResearch - clearly marked as error fallback
    const researchRef = admin.firestore().doc(`categoryResearch/${categoryId}`);
    await researchRef.set({
      id: categoryId,
      categoryId: categoryId,
      projectId: projectId,
      organizationId: organizationId,
      researchType: 'shallow',
      primaryKeywords: fallbackKeywords,
      relatedKeywords: [],
      questionsToAnswer: fallbackQuestions,
      contentGaps: [],
      coveredTopics: [],
      suggestedTopics: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      keywordsFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'fallback_error',
      error: `Keyword generation failed: ${error.message || 'Unknown error'}. Using placeholder keywords.`
    });

    return {
      primaryKeywords: fallbackKeywords,
      relatedKeywords: [],
      questionsToAnswer: fallbackQuestions,
      isFallback: true,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Process generation queue - triggered when task status changes to QUEUED
 * Handles title generation, content generation, and image generation
 */
export const processGenerationQueue = functions
  .region('europe-west2')
  .runWith({
    timeoutSeconds: 540, // 9 minutes max - needed for Deep Research
    memory: '1GB'
  })
  .firestore.document('generationQueue/{taskId}')
  .onWrite(async (change, context) => {
    const taskId = context.params.taskId;
    const taskData = change.after.exists ? change.after.data() : null;

    // Skip if document deleted or not in QUEUED status
    if (!taskData || taskData.status !== TaskStatus.QUEUED) {
      return null;
    }

    // Skip if task is scheduled for later (rate limit retry)
    if (taskData.nextRetryAt) {
      const nextRetryTime = taskData.nextRetryAt.toDate ? taskData.nextRetryAt.toDate() : new Date(taskData.nextRetryAt);
      if (nextRetryTime > new Date()) {
        console.log(`[QueueProcessor] Task ${taskId} scheduled for retry at ${nextRetryTime.toISOString()}, skipping for now`);
        return null;
      }
    }

    console.log(`[QueueProcessor] Processing task: ${taskId}, type: ${taskData.type}${taskData.retryCount ? ` (retry #${taskData.retryCount})` : ''}`);

    const taskRef = admin.firestore().doc(`generationQueue/${taskId}`);

    try {
      // Mark as processing
      await taskRef.update({
        status: TaskStatus.PROCESSING,
        progress: 10,
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const { type } = taskData;

      if (type === TaskType.GENERATE_TITLES) {
        await processGenerateTitles(taskRef, taskData);
      } else if (type === TaskType.GENERATE_CONTENT) {
        await processGenerateContent(taskRef, taskData);
      } else if (type === TaskType.GENERATE_IMAGE) {
        await processGenerateImage(taskRef, taskData);
      } else if (type === TaskType.GENERATE_CATEGORY_PAGE) {
        await processGenerateCategoryPage(taskRef, taskData);
      } else if (type === TaskType.GOOGLE_DEEP_RESEARCH) {
        await processGoogleDeepResearch(taskRef, taskData);
      } else {
        throw new Error(`Unknown task type: ${type}`);
      }

      // Mark as completed
      await taskRef.update({
        status: TaskStatus.COMPLETED,
        progress: 100,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[QueueProcessor] Task ${taskId} completed successfully`);

    } catch (error: any) {
      console.error(`[QueueProcessor] Task ${taskId} failed:`, error);

      const errorMsg = (error.message || 'Unknown error').toLowerCase();
      const MAX_TASK_RETRIES = 3;
      const currentRetryCount = taskData.retryCount || 0;

      // Check if this is a retryable error (rate limit or temporary)
      const isRetryableError =
        errorMsg.includes('429') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('resource_exhausted') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('503') ||
        errorMsg.includes('unavailable') ||
        errorMsg.includes('overloaded') ||
        errorMsg.includes('connection error') ||
        errorMsg.includes('timed out');

      // Auto-retry retryable errors (up to MAX_TASK_RETRIES times)
      if (isRetryableError && currentRetryCount < MAX_TASK_RETRIES) {
        const retryDelay = Math.min(60000 * Math.pow(2, currentRetryCount), 300000); // 1min, 2min, 4min (max 5min)
        const nextRetryAt = new Date(Date.now() + retryDelay);
        console.log(`[QueueProcessor] Task ${taskId} will auto-retry in ${retryDelay/1000}s (attempt ${currentRetryCount + 1}/${MAX_TASK_RETRIES})`);

        await taskRef.update({
          status: TaskStatus.QUEUED,
          progress: 0,
          retryCount: currentRetryCount + 1,
          lastError: error.message || 'Unknown error',
          nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetryAt),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return; // Don't mark as failed, will be picked up again
      }

      // Mark as failed (permanent error or max retries exceeded)
      const failReason = currentRetryCount >= MAX_TASK_RETRIES
        ? `${error.message} (failed after ${MAX_TASK_RETRIES} retries)`
        : error.message || 'Unknown error';

      await taskRef.update({
        status: TaskStatus.FAILED,
        progress: 0,
        error: failReason,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Reset post status if content generation failed
      if ((taskData.type === TaskType.GENERATE_CONTENT || taskData.type === TaskType.GENERATE_CATEGORY_PAGE) && taskData.targetPostId) {
        const postRef = admin.firestore().doc(
          `organizations/${taskData.organizationId}/projects/${taskData.projectId}/posts/${taskData.targetPostId}`
        );
        await postRef.update({
          status: PostStatus.PENDING,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return null;
  });

/**
 * Scheduled function to pick up delayed retry tasks
 * Runs every 2 minutes to check for tasks that are ready for retry
 */
export const processDelayedRetries = functions
  .region('europe-west2')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .pubsub.schedule('every 2 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    // Find QUEUED tasks with nextRetryAt in the past
    const tasksSnapshot = await admin.firestore()
      .collection('generationQueue')
      .where('status', '==', TaskStatus.QUEUED)
      .where('nextRetryAt', '<=', now)
      .limit(5) // Process up to 5 at a time to avoid overwhelming the API
      .get();

    if (tasksSnapshot.empty) {
      return null;
    }

    console.log(`[DelayedRetries] Found ${tasksSnapshot.size} tasks ready for retry`);

    // Trigger processing by clearing nextRetryAt (which will make them eligible for immediate processing)
    const batch = admin.firestore().batch();
    for (const doc of tasksSnapshot.docs) {
      batch.update(doc.ref, {
        nextRetryAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();

    console.log(`[DelayedRetries] Triggered retry for ${tasksSnapshot.size} tasks`);
    return null;
  });

/**
 * Generate titles for a category
 */
async function processGenerateTitles(
  taskRef: admin.firestore.DocumentReference,
  taskData: any
) {
  const { organizationId, projectId, categoryId, categoryName, requestedCount = 5, contextOverride, createdBy } = taskData;

  console.log(`[GenerateTitles] Category: ${categoryName}, Count: ${requestedCount}`);

  // Credit check - 1 credit per stub
  const orgDoc = await admin.firestore().doc(`organizations/${organizationId}`).get();
  const creditBalance = orgDoc.data()?.credits?.balance ?? 0;
  if (creditBalance < requestedCount) {
    console.error(`[GenerateTitles] Insufficient credits. Required: ${requestedCount}, Available: ${creditBalance}`);
    await taskRef.update({
      status: TaskStatus.FAILED,
      error: `Insufficient credits. Required: ${requestedCount}, Available: ${creditBalance}`,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // Fetch all context in parallel: category, project, research, existing posts
  const [categoryDoc, projectDoc, researchDoc, existingPostsSnap] = await Promise.all([
    admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}/categories/${categoryId}`).get(),
    admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}`).get(),
    admin.firestore().doc(`categoryResearch/${categoryId}`).get(),
    admin.firestore().collection(`organizations/${organizationId}/projects/${projectId}/posts`)
      .where('categoryId', '==', categoryId).limit(50).get()
  ]);

  const categoryData = categoryDoc.data();
  const categoryDescription = contextOverride || categoryData?.description || '';
  const project = projectDoc.data();

  await taskRef.update({ progress: 20 });

  // Build business context
  let businessContext = '';
  const contextParts: string[] = [];

  // Always include project info
  if (project) {
    contextParts.push('**PROJECT**');
    contextParts.push(`Name: ${project.name}`);
    if (project.description) contextParts.push(`Focus: ${project.description}`);

    // Add business profile if available
    const bp = project.businessProfile;
    if (bp) {
      if (bp.businessName) contextParts.push(`Business: ${bp.businessName}`);
      if (bp.businessSummary) contextParts.push(`About: ${bp.businessSummary}`);

      let industryStr = bp.industry?.primary || '';
      if (bp.industry?.secondary) industryStr += ` / ${bp.industry.secondary}`;
      if (industryStr) contextParts.push(`Industry: ${industryStr}`);

      if (bp.offerings?.categories?.length) {
        contextParts.push(`Products/Services: ${bp.offerings.categories.join(', ')}`);
      }

      if (bp.targetAudience?.primary) {
        contextParts.push(`\n**TARGET AUDIENCE**`);
        contextParts.push(`Primary: ${bp.targetAudience.primary}`);
        if (bp.targetAudience.painPoints?.length) {
          contextParts.push(`Pain Points: ${bp.targetAudience.painPoints.join('; ')}`);
        }
      }
    }
  }
  businessContext = contextParts.join('\n');

  await taskRef.update({ progress: 30 });

  // CRITICAL: Generate keywords FIRST if they don't exist
  // This ensures stubs are created with proper SEO keyword targeting
  let research: any = researchDoc.exists ? researchDoc.data() : null;

  if (!research || !research.primaryKeywords || research.primaryKeywords.length === 0) {
    console.log(`[GenerateTitles] No keywords found for ${categoryName} - generating keywords FIRST`);
    await taskRef.update({ progress: 35, status: TaskStatus.PROCESSING });

    try {
      const generatedKeywords = await generateCategoryKeywords(
        categoryId,
        categoryName,
        categoryDescription,
        project,
        organizationId,
        projectId
      );

      // Use the freshly generated keywords
      research = {
        primaryKeywords: generatedKeywords.primaryKeywords,
        relatedKeywords: generatedKeywords.relatedKeywords,
        questionsToAnswer: generatedKeywords.questionsToAnswer
      };

      console.log(`[GenerateTitles] Keywords generated successfully - proceeding with title generation`);
    } catch (keywordError: any) {
      console.warn(`[GenerateTitles] Keyword generation failed, proceeding without: ${keywordError.message}`);
      research = {
        primaryKeywords: [],
        relatedKeywords: [],
        questionsToAnswer: [],
        keywordsFailed: true,
        keywordError: keywordError.message || 'Unknown error'
      };
    }
  }

  await taskRef.update({ progress: 45 });

  // Build keyword research context (now using either existing or freshly generated keywords)
  let keywordContext = '';
  if (research && research.primaryKeywords && research.primaryKeywords.length > 0) {
    const keywordParts: string[] = [];
    keywordParts.push('**KEYWORD RESEARCH**');

    // Primary keywords sorted by search volume
    const primaryKeywords = research.primaryKeywords || [];
    if (primaryKeywords.length > 0) {
      const sorted = [...primaryKeywords].sort((a: any, b: any) => (b.searchVolume || 0) - (a.searchVolume || 0));
      keywordParts.push('Top Keywords (prioritize these in titles):');
      sorted.slice(0, 8).forEach((k: any, i: number) => {
        const vol = k.searchVolume ? `${k.searchVolume.toLocaleString()}/mo` : '';
        keywordParts.push(`${i + 1}. "${k.keyword}"${vol ? ` - ${vol}` : ''}`);
      });
    }

    // Long-tail keywords
    const relatedKeywords = research.relatedKeywords || [];
    if (relatedKeywords.length > 0) {
      keywordParts.push('\nLong-tail Keywords:');
      relatedKeywords.slice(0, 8).forEach((k: any) => {
        keywordParts.push(`- ${k.keyword}`);
      });
    }

    // Questions people ask
    const questionsToAnswer = research.questionsToAnswer || [];
    if (questionsToAnswer.length > 0) {
      keywordParts.push('\nQuestions People Search:');
      questionsToAnswer.slice(0, 5).forEach((q: string) => {
        keywordParts.push(`- ${q}`);
      });
    }

    keywordContext = keywordParts.join('\n');
    console.log(`[GenerateTitles] Using keyword research with ${primaryKeywords.length} keywords`);
  }

  // Build Google Deep Research context if available (with citations)
  let deepResearchContext = '';
  let citationsContext = '';
  if (categoryData?.googleDeepResearch?.status === 'complete' && categoryData.googleDeepResearch.content) {
    const researchContent = categoryData.googleDeepResearch.content;
    const { citations, summary } = extractCitationsFromResearch(researchContent);

    // Include research summary for context
    deepResearchContext = `\n**EXPERT RESEARCH INSIGHTS**\nUse these insights to create more authoritative, well-researched titles:\n${summary}`;

    // Include citations - titles can reference topics from cited sources
    if (citations.length > 0) {
      citationsContext = `\n**CITED SOURCES FROM RESEARCH**\nThese authoritative sources inform our content strategy. Create titles that could reference insights from these sources:\n${citations.slice(0, 10).map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
      console.log(`[GenerateTitles] Found ${citations.length} citations in research`);
    }
    console.log(`[GenerateTitles] Including Google Deep Research context`);
  }

  await taskRef.update({ progress: 50 });

  // Build existing titles context for deduplication
  const existingTitles = existingPostsSnap.docs.map(d => d.data().title).filter(Boolean);
  const existingTitlesContext = existingTitles.length > 0
    ? `\n**EXISTING TITLES (do not duplicate or create similar):**\n${existingTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    : '';

  await taskRef.update({ progress: 50 });

  // Generate titles with Gemini
  const ai = getGeminiClient();

  const prompt = `You are an expert SEO Content Strategist creating blog post titles that drive traffic and conversions.

${businessContext}

**CATEGORY**
Name: ${categoryName}
${categoryDescription ? `Description: ${categoryDescription}` : ''}

${keywordContext}
${deepResearchContext}
${citationsContext}
${existingTitlesContext}

---

**TASK:** Generate ${requestedCount} highly specific, click-worthy blog post titles for the "${categoryName}" category.

**STRICT TITLE REQUIREMENTS:**
1. Every title MUST directly relate to the business's products/services
2. Include specific outcomes, numbers, or timeframes where relevant (e.g., "5 Ways...", "...in 30 Days", "...40% Faster")
3. Use power words strategically: Best, Proven, Complete, Step-by-Step, Essential, How to
4. Target search intent explicitly - what would someone type into Google?
5. Keep titles 50-60 characters maximum for optimal SERP display
6. DO NOT use colons with catchy prefixes (BAD: "Power Up: Best Meals")
7. DO NOT use vague clickbait (BAD: "Everything You Need to Know")

**TITLE FORMULAS THAT WORK:**
- "How to [Achieve Result] + [Specific Benefit]"
- "Best [Product/Method] for [Specific Use Case]"
- "[Number] [Adjective] [Things] for [Specific Audience]"
- "[Topic] vs [Topic]: Which is Better for [Use Case]"
- "Why [Common Belief] is Wrong (And What to Do Instead)"

**GOOD TITLE EXAMPLES:**
- "Best Carbohydrate Sources for Endurance Cycling"
- "How to Calculate Protein Needs Based on Training Volume"
- "5 Pre-Race Breakfast Ideas That Won't Cause GI Issues"
- "Hydration Calculator: How Much Water Cyclists Really Need"

**BAD TITLE EXAMPLES:**
- "Fuel Your Ride: The Complete Guide to Cycling Nutrition" (colon pattern)
- "10 Amazing Tips for Better Performance" (generic, no specificity)
- "Everything You Need to Know About Eating" (too vague, no value)

For each title, provide:
1. title: A specific, SEO-optimized title following the rules above
2. teaser: 2 sentences explaining the article angle and specific value to the reader
3. keywords: 3-5 long-tail SEO keywords this article should rank for
4. searchIntent: "informational" | "commercial" | "transactional"

Return as JSON array.`;

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
  });

  await taskRef.update({ progress: 70 });

  // Parse response
  let generatedTitles: Array<{ title: string; teaser: string; keywords: string[]; searchIntent?: string }> = [];
  try {
    const responseText = response.text || '[]';
    generatedTitles = JSON.parse(responseText);

    // Post-process: remove any titles that still have colons (AI sometimes ignores instructions)
    generatedTitles = generatedTitles.map(item => {
      let title = item.title;
      // If title has a colon in the first half, remove the prefix
      const colonIndex = title.indexOf(':');
      if (colonIndex > 0 && colonIndex < title.length / 2) {
        title = title.substring(colonIndex + 1).trim();
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      return { ...item, title };
    });

  } catch (parseError) {
    console.error('[GenerateTitles] Failed to parse response:', response.text);
    throw new Error('Failed to parse AI response');
  }

  await taskRef.update({ progress: 80 });

  // Create posts in Firestore
  const postsRef = admin.firestore().collection(
    `organizations/${organizationId}/projects/${projectId}/posts`
  );

  const batch = admin.firestore().batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const item of generatedTitles) {
    const newPostRef = postsRef.doc();
    batch.set(newPostRef, {
      projectId,
      organizationId,
      categoryId,
      title: item.title,
      teaser: item.teaser,
      metaDescription: item.teaser,
      tags: item.keywords || [],
      metaKeywords: item.keywords || [],
      searchIntent: item.searchIntent || 'informational',
      status: PostStatus.PENDING,
      createdBy,
      createdAt: now,
      updatedAt: now
    });
  }

  await batch.commit();
  console.log(`[GenerateTitles] Created ${generatedTitles.length} posts for category: ${categoryName}`);

  // Deduct credits - 1 per stub generated
  const creditsToDeduct = generatedTitles.length;
  if (creditsToDeduct > 0) {
    await admin.firestore().runTransaction(async (transaction) => {
      const orgRef = admin.firestore().doc(`organizations/${organizationId}`);
      const orgSnap = await transaction.get(orgRef);
      const currentBalance = orgSnap.data()?.credits?.balance ?? 0;
      const newBalance = Math.max(0, currentBalance - creditsToDeduct);

      transaction.update(orgRef, {
        'credits.balance': newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log credit transaction
      const txRef = admin.firestore().collection('credit_transactions').doc();
      transaction.set(txRef, {
        id: txRef.id,
        organizationId,
        userId: createdBy,
        amount: -creditsToDeduct,
        balanceAfter: newBalance,
        type: 'usage',
        description: `Generated ${creditsToDeduct} stubs for ${categoryName}`,
        metadata: { projectId, categoryId, feature: 'title_generation' },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    console.log(`[GenerateTitles] Deducted ${creditsToDeduct} credits for stub generation`);
  }

  // Record degraded mode if keywords failed - this surfaces to the user
  if (research?.keywordsFailed) {
    await taskRef.update({
      result: {
        degradedMode: true,
        warning: 'Titles generated without keyword optimization due to keyword generation failure.',
        keywordError: research.keywordError
      }
    });
    console.warn(`[GenerateTitles] Completed in degraded mode - keywords failed: ${research.keywordError}`);
  }
}

/**
 * Generate content for a post
 */
async function processGenerateContent(
  taskRef: admin.firestore.DocumentReference,
  taskData: any
) {
  const { organizationId, projectId, targetPostId, categoryName, categoryId, createdBy } = taskData;

  const ARTICLE_CREDIT_COST = 1;

  // Credit check - 1 credit per article
  const orgDoc = await admin.firestore().doc(`organizations/${organizationId}`).get();
  const creditBalance = orgDoc.data()?.credits?.balance ?? 0;
  if (creditBalance < ARTICLE_CREDIT_COST) {
    console.error(`[GenerateContent] Insufficient credits. Required: ${ARTICLE_CREDIT_COST}, Available: ${creditBalance}`);
    await taskRef.update({
      status: TaskStatus.FAILED,
      error: `Insufficient credits. Required: ${ARTICLE_CREDIT_COST}, Available: ${creditBalance}`,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // Get post data
  const postRef = admin.firestore().doc(
    `organizations/${organizationId}/projects/${projectId}/posts/${targetPostId}`
  );
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const post = postDoc.data()!;
  console.log(`[GenerateContent] Post: ${post.title}`);

  await taskRef.update({ progress: 10 });

  // Fetch all context in parallel
  const catId = categoryId || post.categoryId;
  const [projectDoc, categoryDoc, researchDoc] = await Promise.all([
    admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}`).get(),
    catId ? admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}/categories/${catId}`).get() : Promise.resolve(null),
    catId ? admin.firestore().doc(`categoryResearch/${catId}`).get() : Promise.resolve(null)
  ]);

  const project = projectDoc.data();
  const category = categoryDoc?.data?.() || null;

  await taskRef.update({ progress: 20 });

  // Build comprehensive business context
  const contextParts: string[] = [];

  // Project info
  if (project) {
    contextParts.push('**BUSINESS CONTEXT**');
    contextParts.push(`Project: ${project.name}`);
    if (project.description) contextParts.push(`Focus: ${project.description}`);

    const bp = project.businessProfile;
    if (bp) {
      if (bp.businessName) contextParts.push(`Business: ${bp.businessName}`);
      if (bp.businessSummary) contextParts.push(`About: ${bp.businessSummary}`);

      let industryStr = bp.industry?.primary || '';
      if (bp.industry?.secondary) industryStr += ` / ${bp.industry.secondary}`;
      if (industryStr) contextParts.push(`Industry: ${industryStr}`);

      if (bp.offerings?.categories?.length) {
        const label = bp.offerings.type === 'products' ? 'Products' : bp.offerings.type === 'services' ? 'Services' : 'Offerings';
        contextParts.push(`${label}: ${bp.offerings.categories.join(', ')}`);
      }

      if (bp.targetAudience?.primary) {
        contextParts.push(`\n**TARGET AUDIENCE**`);
        contextParts.push(`Primary: ${bp.targetAudience.primary}`);
        if (bp.targetAudience.painPoints?.length) {
          contextParts.push(`Pain Points: ${bp.targetAudience.painPoints.join('; ')}`);
        }
      }

      if (bp.brandVoice?.tone?.length) {
        contextParts.push(`\n**BRAND VOICE**`);
        contextParts.push(`Tone: ${bp.brandVoice.tone.join(', ')}`);
        if (bp.brandVoice.avoidPhrases?.length) {
          contextParts.push(`Avoid: ${bp.brandVoice.avoidPhrases.join(', ')}`);
        }
      }
    }
  }

  const businessContext = contextParts.join('\n');

  await taskRef.update({ progress: 30 });

  // Build keyword research context
  let keywordContext = '';
  if (researchDoc?.exists) {
    const research = researchDoc.data() || {};
    const keywordParts: string[] = [];
    keywordParts.push('**KEYWORD RESEARCH (incorporate naturally)**');

    const primaryKeywords = research.primaryKeywords || [];
    if (primaryKeywords.length > 0) {
      const sorted = [...primaryKeywords].sort((a: any, b: any) => (b.searchVolume || 0) - (a.searchVolume || 0));
      keywordParts.push('Primary Keywords to include:');
      sorted.slice(0, 5).forEach((k: any) => {
        keywordParts.push(`- "${k.keyword}"`);
      });
    }

    const relatedKeywords = research.relatedKeywords || [];
    if (relatedKeywords.length > 0) {
      keywordParts.push('\nSecondary Keywords:');
      relatedKeywords.slice(0, 8).forEach((k: any) => {
        keywordParts.push(`- ${k.keyword}`);
      });
    }

    const questionsToAnswer = research.questionsToAnswer || [];
    if (questionsToAnswer.length > 0) {
      keywordParts.push('\nQuestions to Address:');
      questionsToAnswer.slice(0, 4).forEach((q: string) => {
        keywordParts.push(`- ${q}`);
      });
    }

    keywordContext = keywordParts.join('\n');
    console.log(`[GenerateContent] Using keyword research with ${primaryKeywords.length} keywords`);
  }

  // Build Google Deep Research context if available (with citations)
  const { deepResearchContext, citationsContext } = buildResearchContext(
    category,
    '**EXPERT RESEARCH (use for accuracy and authority)**',
    15
  );
  if (deepResearchContext) {
    console.log(`[GenerateContent] Including Google Deep Research context`);
  }

  await taskRef.update({ progress: 40 });

  // Determine content parameters
  const contentType = post.contentType || 'article';
  const tone = post.tone || project?.businessProfile?.brandVoice?.tone?.[0] || 'professional';
  const categoryDesc = category?.description || '';

  // Generate content
  const ai = getGeminiClient();

  const prompt = `You are an expert content writer for a specific business. Write content that ranks AND converts.

${businessContext}

**CATEGORY**
Name: ${categoryName}
${categoryDesc ? `Description: ${categoryDesc}` : ''}

**ARTICLE BRIEF**
Title: "${post.title}"
${post.teaser ? `Angle/Focus: ${post.teaser}` : ''}
${Array.isArray(post.tags) && post.tags.length ? `Target Keywords: ${post.tags.join(', ')}` : ''}
Search Intent: ${post.searchIntent || 'informational'}
Target Word Count: 1,200-1,800 words

${keywordContext}
${deepResearchContext}
${citationsContext}

---

**CONTENT STRUCTURE (follow this exactly):**

1. **Hook** (50-100 words)
   - Start with a compelling statistic, question, or pain point
   - Include the primary keyword in the first sentence
   - Establish why this matters NOW to the reader

2. **Context** (100-150 words)
   - What the reader will learn from this article
   - Why this business/brand is qualified to teach this
   - Brief overview of what's covered

3. **Main Content** (800-1,200 words)
   - 3-5 H2 sections with descriptive, keyword-rich headings
   - Each section follows: Problem → Solution → Example
   - Include specific examples from the ${categoryName} industry
   - Use bullet points for lists of 3+ items
   - Add H3 subsections where needed for depth
   - **CITATIONS**: If authoritative sources are provided above, naturally weave 2-4 relevant citations into the content as markdown links. Link to sources when citing statistics, research findings, or expert opinions. Example: "According to [Source Name](url), cyclists who..."

4. **Expert Insight** (100-150 words)
   - Share a unique perspective or insider knowledge
   - Address what most people get wrong about this topic
   - Build credibility and trust

5. **Action Steps** (100-150 words)
   - 3-5 specific, actionable next steps
   - Make them immediately implementable
   - Include one soft CTA related to the business's services

**FORMATTING RULES:**
- Use ## for H2 headings, ### for H3
- Bold key phrases and important terms
- Use bullet lists for scanability
- No fluff - every sentence must add value

**TONE:** ${tone}
**FORMAT:** ${contentType}

**CRITICAL - DO NOT:**
- Start with "Here is..." or any preamble - dive straight into the hook
- Use excessive exclamation points or hype language
- Write generic advice that ignores the business context
- Use placeholder text like [insert X here]
- Use colon-style subheadings like "Tip 1: Do This"
- Include the title in the content (it's added separately)

Write the article now in clean Markdown format. Start directly with the hook.`;

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
  });

  await taskRef.update({ progress: 80 });

  let content = response.text || 'Could not generate content.';
  content = stripPreamble(content);
  content = stripTitleHeading(content, post.title);

  // Update post with generated content
  await postRef.update({
    content,
    status: PostStatus.NEEDS_REVIEW,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`[GenerateContent] Content generated: ${content.length} chars for "${post.title}"`);

  // Deduct credits - 1 per article generated
  const userId = createdBy || post.createdBy || 'system';
  await admin.firestore().runTransaction(async (transaction) => {
    const orgRef = admin.firestore().doc(`organizations/${organizationId}`);
    const orgSnap = await transaction.get(orgRef);
    const currentBalance = orgSnap.data()?.credits?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance - ARTICLE_CREDIT_COST);

    transaction.update(orgRef, {
      'credits.balance': newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log credit transaction
    const txRef = admin.firestore().collection('credit_transactions').doc();
    transaction.set(txRef, {
      id: txRef.id,
      organizationId,
      userId,
      amount: -ARTICLE_CREDIT_COST,
      balanceAfter: newBalance,
      type: 'usage',
      description: `Generated article: ${post.title?.substring(0, 50) || 'Untitled'}`,
      metadata: { projectId, postId: targetPostId, categoryId: catId, feature: 'article_generation' },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  console.log(`[GenerateContent] Deducted ${ARTICLE_CREDIT_COST} credit for article generation`);
}

/**
 * Generate category page content (introduction text for category landing pages)
 */
async function processGenerateCategoryPage(
  taskRef: admin.firestore.DocumentReference,
  taskData: any
) {
  const { organizationId, projectId, categoryId, categoryName, targetPostId, createdBy } = taskData;

  const CATEGORY_PAGE_CREDIT_COST = 1;

  console.log(`[GenerateCategoryPage] Starting for category: ${categoryName}`);

  // Credit check
  const orgDoc = await admin.firestore().doc(`organizations/${organizationId}`).get();
  const creditBalance = orgDoc.data()?.credits?.balance ?? 0;

  if (creditBalance < CATEGORY_PAGE_CREDIT_COST) {
    throw new Error(`Insufficient credits. Required: ${CATEGORY_PAGE_CREDIT_COST}, Available: ${creditBalance}`);
  }

  await taskRef.update({ progress: 10 });

  // Get post document
  const postRef = admin.firestore().doc(
    `organizations/${organizationId}/projects/${projectId}/posts/${targetPostId}`
  );
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Category page post not found');
  }

  const post = postDoc.data()!;

  // Update post to GENERATING status
  await postRef.update({
    status: PostStatus.GENERATING,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await taskRef.update({ progress: 20 });

  // Get category and project context
  const [categoryDoc, projectDoc] = await Promise.all([
    admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}/categories/${categoryId}`).get(),
    admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}`).get()
  ]);

  const category = categoryDoc.data();
  const project = projectDoc.data();

  await taskRef.update({ progress: 30 });

  // Build business context
  let businessContext = '';
  if (project?.businessProfile) {
    const bp = project.businessProfile;
    businessContext = [
      bp.businessName ? `Business: ${bp.businessName}` : '',
      bp.industry?.primary ? `Industry: ${bp.industry.primary}` : '',
      bp.targetAudience?.primary ? `Target Audience: ${bp.targetAudience.primary}` : '',
      bp.brandVoice?.tone ? `Tone: ${bp.brandVoice.tone}` : ''
    ].filter(Boolean).join('\n');
  }

  const aiInstructions = post.categoryPageContent?.aiInstructions || category?.description || '';

  // Build Google Deep Research context if available (with citations)
  const { deepResearchContext, citationsContext } = buildResearchContext(
    category,
    '**RESEARCH INSIGHTS (base content on this)**',
    10
  );
  if (deepResearchContext) {
    console.log(`[GenerateCategoryPage] Including Google Deep Research context`);
  }

  await taskRef.update({ progress: 40 });

  // Generate content with Gemini
  const ai = getGeminiClient();

  const prompt = `You are an expert content writer creating a category landing page introduction for a website.

${businessContext ? `**BUSINESS CONTEXT**\n${businessContext}\n\n` : ''}${deepResearchContext ? `${deepResearchContext}\n\n` : ''}${citationsContext ? `${citationsContext}\n\n` : ''}**CATEGORY**
Name: ${categoryName}
${aiInstructions ? `Context/Instructions: ${aiInstructions}` : ''}

---

**TASK:** Write a compelling category page introduction that:
1. Immediately explains what this content category is about
2. Highlights the value readers will get from content in this category
3. Builds trust and establishes authority
4. Encourages exploration of articles within this category

**REQUIREMENTS:**
- 150-300 words
- Start with a hook that connects to the reader's needs
- Briefly describe what types of content they'll find here
- End with a subtle call-to-action to explore the articles
- Use H2 headings sparingly (1 max if needed)
- Professional but approachable tone
- Do NOT include the category name as a heading (it will be displayed separately)
- If authoritative sources are provided above, you may include 1-2 relevant citations as markdown links to establish credibility

Return clean Markdown content only. No preamble, no explanation, just the content.`;

  await taskRef.update({ progress: 50 });

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
  });

  await taskRef.update({ progress: 70 });

  let content = response.text || '';
  content = stripPreamble(content);
  content = stripTitleHeading(content, categoryName);

  await taskRef.update({ progress: 80 });

  // Update post with generated content
  await postRef.update({
    content,
    'categoryPageContent.introduction': content,
    status: PostStatus.NEEDS_REVIEW,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await taskRef.update({ progress: 90 });

  // Deduct credit
  await admin.firestore().runTransaction(async (transaction) => {
    const orgRef = admin.firestore().doc(`organizations/${organizationId}`);
    const orgSnap = await transaction.get(orgRef);
    const currentBalance = orgSnap.data()?.credits?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance - CATEGORY_PAGE_CREDIT_COST);

    transaction.update(orgRef, { 'credits.balance': newBalance });

    // Log transaction
    const txRef = admin.firestore().collection('credit_transactions').doc();
    transaction.set(txRef, {
      organizationId,
      userId: createdBy,
      amount: -CATEGORY_PAGE_CREDIT_COST,
      balanceAfter: newBalance,
      type: 'usage',
      description: `Generated category page: ${categoryName}`,
      metadata: {
        projectId,
        categoryId,
        postId: targetPostId,
        feature: 'category_page_generation'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  console.log(`[GenerateCategoryPage] Completed for: ${categoryName}`);
}

/**
 * Google Deep Research - Uses Gemini with Google Search grounding
 * for expert-level research on a category
 */
async function processGoogleDeepResearch(
  taskRef: admin.firestore.DocumentReference,
  taskData: any
) {
  const { organizationId, projectId, categoryId, categoryName, createdBy } = taskData;

  const DEEP_RESEARCH_CREDIT_COST = 20;
  const POLL_INTERVAL_MS = 15000; // 15 seconds between polls
  const MAX_POLL_ATTEMPTS = 32; // 32 * 15s = 8 minutes max (with buffer for setup)

  console.log(`[GoogleDeepResearch] Starting for category: ${categoryName}`);

  // Credit check
  const orgDoc = await admin.firestore().doc(`organizations/${organizationId}`).get();
  const creditBalance = orgDoc.data()?.credits?.balance ?? 0;

  if (creditBalance < DEEP_RESEARCH_CREDIT_COST) {
    const catRef = admin.firestore().doc(
      `organizations/${organizationId}/projects/${projectId}/categories/${categoryId}`
    );
    await catRef.update({
      'googleDeepResearch.status': 'failed',
      'googleDeepResearch.error': `Insufficient credits. Required: ${DEEP_RESEARCH_CREDIT_COST}, Available: ${creditBalance}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    throw new Error(`Insufficient credits. Required: ${DEEP_RESEARCH_CREDIT_COST}, Available: ${creditBalance}`);
  }

  await taskRef.update({ progress: 5 });

  // Get category and project context
  const catRef = admin.firestore().doc(
    `organizations/${organizationId}/projects/${projectId}/categories/${categoryId}`
  );
  const [categoryDoc, projectDoc] = await Promise.all([
    catRef.get(),
    admin.firestore().doc(`organizations/${organizationId}/projects/${projectId}`).get()
  ]);

  const category = categoryDoc.data();
  const project = projectDoc.data();

  await taskRef.update({ progress: 10 });

  // Build rich business context for better research targeting
  const bp = project?.businessProfile;
  const businessContextParts: string[] = [];

  if (bp?.businessName) businessContextParts.push(`Business: ${bp.businessName}`);
  if (bp?.businessSummary) businessContextParts.push(`About: ${bp.businessSummary}`);
  if (bp?.websiteUrl || project?.websiteUrl) businessContextParts.push(`Website: ${bp?.websiteUrl || project?.websiteUrl}`);

  // Industry context
  let industryStr = bp?.industry?.primary || '';
  if (bp?.industry?.secondary) industryStr += ` > ${bp.industry.secondary}`;
  if (bp?.industry?.tertiary) industryStr += ` > ${bp.industry.tertiary}`;
  if (industryStr) businessContextParts.push(`Industry: ${industryStr}`);

  // Offerings
  if (bp?.offerings?.categories?.length) {
    const label = bp.offerings.type === 'products' ? 'Products' : bp.offerings.type === 'services' ? 'Services' : 'Offerings';
    businessContextParts.push(`${label}: ${bp.offerings.categories.join(', ')}`);
  }

  // Target audience
  if (bp?.targetAudience?.primary) businessContextParts.push(`Target Audience: ${bp.targetAudience.primary}`);
  if (bp?.targetAudience?.painPoints?.length) {
    businessContextParts.push(`Audience Pain Points: ${bp.targetAudience.painPoints.join('; ')}`);
  }

  // Competitors
  if (bp?.competitors?.length) {
    businessContextParts.push(`Key Competitors: ${bp.competitors.map((c: any) => c.name || c).join(', ')}`);
  }

  const businessContext = businessContextParts.join('\n');

  await taskRef.update({ progress: 15 });

  // Fetch existing keywords if available (from CategoryResearch)
  let keywordContext = '';
  try {
    const researchDoc = await admin.firestore()
      .doc(`organizations/${organizationId}/projects/${projectId}/categoryResearch/${categoryId}`)
      .get();

    if (researchDoc.exists) {
      const researchData = researchDoc.data();
      const keywords = researchData?.primaryKeywords || [];
      if (keywords.length > 0) {
        const topKeywords = keywords
          .slice(0, 20)
          .map((kw: any) => {
            const vol = kw.searchVolume ? ` (${kw.searchVolume.toLocaleString()}/mo)` : '';
            return `- ${kw.keyword}${vol}`;
          })
          .join('\n');
        keywordContext = `\nTARGET KEYWORDS (prioritize these in research):\n${topKeywords}\n`;
      }
    }
  } catch (err) {
    console.warn('[GoogleDeepResearch] Could not fetch keywords:', err);
  }

  // Build the research prompt - HIGHLY SPECIFIC for SEO content research
  const researchPrompt = `Research topic for SEO content strategy: "${categoryName}"

BUSINESS CONTEXT:
${businessContext || 'General audience in this topic area'}

CATEGORY DESCRIPTION:
${category?.description || `Content about ${categoryName}`}
${keywordContext}
---

RESEARCH MISSION:
Conduct comprehensive market research to inform an SEO content strategy for the topic "${categoryName}". This research will guide the creation of blog articles, guides, and educational content.

RESEARCH DELIVERABLES REQUIRED:

## 1. SEARCH LANDSCAPE ANALYSIS
- What are people actively searching for related to "${categoryName}"?
- What questions do they ask? (use "People Also Ask" type queries)
- What are the most searched subtopics and related terms?
- What is the search intent? (informational, commercial, transactional)

## 2. AUDIENCE INSIGHTS
- Who is searching for this topic? Demographics, experience levels
- What problems are they trying to solve?
- What objections or concerns do they have?
- What's their buyer journey stage?

## 3. COMPETITIVE CONTENT ANALYSIS
- What content currently ranks well for this topic?
- What format do top-ranking articles use? (listicles, guides, comparisons)
- What angles are competitors missing?
- What unique perspectives could differentiate new content?

## 4. DATA & STATISTICS
- Current market data, trends, statistics with dates and sources
- Industry benchmarks and metrics
- Survey results or research findings
- Growth trends and projections

## 5. EXPERT SOURCES & AUTHORITIES
- Who are the recognized experts in this space?
- What authoritative sources publish on this topic?
- What certifications, standards, or governing bodies exist?
- Academic research or studies to reference

## 6. CONTENT OPPORTUNITIES
- Specific article topics that would perform well
- Questions that lack good answers online
- Trending subtopics with growing interest
- Seasonal or timely angles to consider

## 7. KEYWORDS & TOPICS
- Primary keyword themes to target
- Long-tail variations with specific intent
- Related topics to build topical authority
- Question-based keywords for featured snippets

FORMATTING REQUIREMENTS:
- Start directly with "## 1. SEARCH LANDSCAPE ANALYSIS"
- Use clear markdown formatting with ## for main sections
- Include specific examples, not generic statements
- Cite sources with [Source Name] inline where possible
- Focus on ACTIONABLE insights for content creation
- Be specific to "${categoryName}" - avoid generic advice`;

  await taskRef.update({ progress: 20 });

  // Initialize Gemini client for Interactions API
  const ai = getGeminiClient();

  console.log(`[GoogleDeepResearch] Starting Deep Research agent for: ${categoryName}`);

  // Start the Deep Research agent in background mode
  let interactionId: string;
  try {
    const interaction = await (ai as any).interactions.create({
      agent: 'deep-research-pro-preview-12-2025',
      input: researchPrompt,
      background: true
    });
    interactionId = interaction.id;
    console.log(`[GoogleDeepResearch] Started interaction: ${interactionId}`);
  } catch (err: any) {
    console.error(`[GoogleDeepResearch] Failed to start Deep Research:`, err);
    throw new Error(`Failed to start Deep Research: ${err.message}`);
  }

  await taskRef.update({ progress: 25 });

  // Poll for completion
  let pollAttempt = 0;
  let researchContent = '';
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3; // Fail fast after 3 consecutive errors

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to check if error is permanent (should not retry)
  const isPermanentError = (err: any): boolean => {
    const message = err.message?.toLowerCase() || '';
    const status = err.status || err.statusCode || err.code;

    // Auth/permission errors
    if (status === 401 || status === 403 || message.includes('unauthorized') ||
        message.includes('authentication') || message.includes('permission')) {
      return true;
    }
    // Invalid request errors
    if (status === 400 || status === 404 || message.includes('invalid') ||
        message.includes('not found')) {
      return true;
    }
    // API quota/billing errors
    if (status === 402 || message.includes('quota') || message.includes('billing')) {
      return true;
    }
    return false;
  };

  while (pollAttempt < MAX_POLL_ATTEMPTS) {
    pollAttempt++;

    try {
      const result = await (ai as any).interactions.get(interactionId);
      consecutiveErrors = 0; // Reset on successful poll

      console.log(`[GoogleDeepResearch] Poll ${pollAttempt}: status=${result.status || result.state}`);

      // Calculate progress (25% to 90% during polling)
      const progressPct = 25 + Math.min(65, (pollAttempt / MAX_POLL_ATTEMPTS) * 65);
      await taskRef.update({ progress: Math.round(progressPct) });

      const status = result.status || result.state;

      if (status === 'completed' || status === 'COMPLETED') {
        // Extract the final output
        if (result.outputs && result.outputs.length > 0) {
          researchContent = result.outputs[result.outputs.length - 1].text || '';
        } else if (result.text) {
          researchContent = result.text;
        }
        console.log(`[GoogleDeepResearch] Research completed. Length: ${researchContent.length}`);
        break;
      } else if (status === 'failed' || status === 'FAILED') {
        throw new Error(`Deep Research failed: ${result.error || 'Unknown error'}`);
      }

      // Still running, wait before next poll
      await sleep(POLL_INTERVAL_MS);

    } catch (pollErr: any) {
      consecutiveErrors++;
      console.error(`[GoogleDeepResearch] Poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, pollErr.message);

      // Fail immediately on permanent errors (auth, invalid request, etc.)
      if (isPermanentError(pollErr)) {
        console.error(`[GoogleDeepResearch] Permanent error detected, failing immediately`);
        throw pollErr;
      }

      // Fail after too many consecutive errors
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`[GoogleDeepResearch] Too many consecutive errors, failing`);
        throw new Error(`Deep Research polling failed after ${consecutiveErrors} consecutive errors: ${pollErr.message}`);
      }

      // Fail on last attempt
      if (pollAttempt >= MAX_POLL_ATTEMPTS - 1) {
        throw pollErr;
      }

      // Wait before retry with slight backoff for errors
      await sleep(POLL_INTERVAL_MS * Math.min(consecutiveErrors, 2));
    }
  }

  if (!researchContent) {
    throw new Error('Deep Research timed out after 8 minutes - the research may still be processing. Try again later.');
  }

  await taskRef.update({ progress: 90 });

  // Strip any preamble the model might have added
  researchContent = stripPreamble(researchContent);

  // Update category with research results
  await catRef.update({
    googleDeepResearch: {
      content: researchContent,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'complete'
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await taskRef.update({ progress: 90 });

  // Deduct credits
  await admin.firestore().runTransaction(async (transaction) => {
    const orgRef = admin.firestore().doc(`organizations/${organizationId}`);
    const orgSnap = await transaction.get(orgRef);
    const currentBalance = orgSnap.data()?.credits?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance - DEEP_RESEARCH_CREDIT_COST);

    transaction.update(orgRef, { 'credits.balance': newBalance });

    // Log transaction
    const txRef = admin.firestore().collection('credit_transactions').doc();
    transaction.set(txRef, {
      organizationId,
      userId: createdBy,
      amount: -DEEP_RESEARCH_CREDIT_COST,
      balanceAfter: newBalance,
      type: 'usage',
      description: `Google Deep Research: ${categoryName}`,
      metadata: {
        projectId,
        categoryId,
        feature: 'google_deep_research'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  console.log(`[GoogleDeepResearch] Completed for: ${categoryName}`);
}

/**
 * Generate image for a post (uses existing generateImageWithGemini logic)
 */
async function processGenerateImage(
  taskRef: admin.firestore.DocumentReference,
  taskData: any
) {
  const { organizationId, projectId, targetPostId, createdBy } = taskData;

  const IMAGE_CREDIT_COST = 5;

  // Credit check - 5 credits per image
  const orgDoc = await admin.firestore().doc(`organizations/${organizationId}`).get();
  const creditBalance = orgDoc.data()?.credits?.balance ?? 0;
  if (creditBalance < IMAGE_CREDIT_COST) {
    console.error(`[GenerateImage] Insufficient credits. Required: ${IMAGE_CREDIT_COST}, Available: ${creditBalance}`);
    await taskRef.update({
      status: TaskStatus.FAILED,
      error: `Insufficient credits. Required: ${IMAGE_CREDIT_COST}, Available: ${creditBalance}`,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // Get post data
  const postRef = admin.firestore().doc(
    `organizations/${organizationId}/projects/${projectId}/posts/${targetPostId}`
  );
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const post = postDoc.data()!;
  console.log(`[GenerateImage] Post: ${post.title}`);

  await taskRef.update({ progress: 20 });

  // Generate image prompt
  const ai = getGeminiClient();

  const promptGenResponse = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Create a detailed image generation prompt for a blog hero image.

Title: ${post.title}
Teaser: ${post.teaser || ''}

Create a vivid, detailed prompt that would generate a professional, engaging hero image.
Focus on visual elements, style, and mood. Keep it under 100 words.
Return ONLY the prompt text, no explanation.`
  });

  const imagePrompt = promptGenResponse.text || `Professional blog hero image for: ${post.title}`;

  await taskRef.update({ progress: 40 });

  // Generate image
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: `${imagePrompt} Create this as a wide landscape image (16:9 aspect ratio).`,
    config: {
      responseModalities: ['Text', 'Image']
    }
  });

  let imageBase64: string | null = null;
  if (imageResponse.candidates?.[0]?.content?.parts) {
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageBase64) {
    throw new Error('Image generation failed - no image returned');
  }

  await taskRef.update({ progress: 70 });

  // Save image to storage (simplified - just save original for now)
  const bucket = storage.bucket();
  const imageId = uuidv4();
  const downloadToken = uuidv4();
  const storagePath = `organizations/${organizationId}/projects/${projectId}/images/${imageId}.png`;

  const buffer = Buffer.from(imageBase64, 'base64');
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: 'image/png',
      metadata: {
        uploadedBy: createdBy,
        postId: targetPostId,
        firebaseStorageDownloadTokens: downloadToken
      }
    }
  });

  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

  await taskRef.update({ progress: 90 });

  // Update post with image
  await postRef.update({
    heroImage: {
      url: imageUrl,
      path: storagePath,
      generatedAt: new Date().toISOString()
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`[GenerateImage] Image saved: ${storagePath}`);

  // Deduct credits - 5 per image generated
  await admin.firestore().runTransaction(async (transaction) => {
    const orgRef = admin.firestore().doc(`organizations/${organizationId}`);
    const orgSnap = await transaction.get(orgRef);
    const currentBalance = orgSnap.data()?.credits?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance - IMAGE_CREDIT_COST);

    transaction.update(orgRef, {
      'credits.balance': newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log credit transaction
    const txRef = admin.firestore().collection('credit_transactions').doc();
    transaction.set(txRef, {
      id: txRef.id,
      organizationId,
      userId: createdBy,
      amount: -IMAGE_CREDIT_COST,
      balanceAfter: newBalance,
      type: 'usage',
      description: `Generated hero image`,
      metadata: { projectId, postId: targetPostId, feature: 'image_generation' },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  console.log(`[GenerateImage] Deducted ${IMAGE_CREDIT_COST} credits for image generation`);
}

/**
 * Scheduled cleanup job for deleted images (runs daily at 2 AM UTC)
 * Permanently deletes images that have been soft-deleted for 30+ days
 */
export const cleanupDeletedImages = functions
  .region('europe-west2')
  .pubsub.schedule('every day 02:00')
  .timeZone('UTC')
  .onRun(async () => {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cutoff = admin.firestore.Timestamp.fromDate(cutoffDate);

    console.log(`Starting cleanup for images deleted before: ${cutoffDate.toISOString()}`);

    try {
      // Find expired images across all organizations/projects
      const expiredQuery = await admin.firestore()
        .collectionGroup('imageAssets')
        .where('status', '==', 'deleted')
        .where('scheduledDeletionAt', '<=', cutoff)
        .get();

      if (expiredQuery.empty) {
        console.log('No expired images to clean up');
        return null;
      }

      const bucket = storage.bucket();
      let deletedCount = 0;
      let errorCount = 0;

      for (const doc of expiredQuery.docs) {
        try {
          const data = doc.data();

          // Collect all storage paths to delete
          const pathsToDelete: string[] = [];

          if (data.path) pathsToDelete.push(data.path);
          if (data.variants?.original?.path) pathsToDelete.push(data.variants.original.path);

          // Add variant paths
          const sizes = ['small', 'large'];
          const formats = ['webp', 'jpg'];

          for (const size of sizes) {
            for (const format of formats) {
              const variantPath = data.variants?.[size]?.[format === 'jpg' ? 'jpeg' : format];
              if (variantPath && typeof variantPath === 'string') {
                // Extract path from URL if it's a full URL
                const pathMatch = variantPath.match(/\/o\/(.+?)\?/);
                if (pathMatch) {
                  pathsToDelete.push(decodeURIComponent(pathMatch[1]));
                }
              }
            }
          }

          // Delete all storage files
          for (const path of pathsToDelete) {
            try {
              await bucket.file(path).delete();
            } catch (e: any) {
              // Ignore 404 errors (file already deleted)
              if (e.code !== 404) {
                console.warn(`Failed to delete file ${path}:`, e.message);
              }
            }
          }

          // Delete Firestore document
          await doc.ref.delete();
          deletedCount++;

        } catch (docError: any) {
          console.error(`Error cleaning up document ${doc.id}:`, docError);
          errorCount++;
        }
      }

      console.log(`Cleanup complete. Deleted: ${deletedCount}, Errors: ${errorCount}`);
      return { deletedCount, errorCount };

    } catch (error: any) {
      console.error('Cleanup job failed:', error);
      throw error;
    }
  });
