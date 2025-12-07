import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

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
