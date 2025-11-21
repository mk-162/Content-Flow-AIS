import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ============================================
// HELPER: Get Gemini Client
// ============================================

function getGeminiClient(): GoogleGenAI {
  const apiKey = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  return new GoogleGenAI({ apiKey });
}

// ============================================
// HELPER: Estimate Tokens
// ============================================

function estimateTokens(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 0.75);
}

// ============================================
// HELPER: Track Usage
// ============================================

async function trackUsage(
  organizationId: string,
  projectId: string,
  userId: string,
  apiCalls: number,
  tokensUsed: number,
  model: string
): Promise<void> {
  try {
    const cost = (tokensUsed / 1000) * 0.00004675; // Gemini pricing

    await db.collection('usage').add({
      organizationId,
      projectId,
      userId,
      timestamp: admin.firestore.Timestamp.now(),
      apiCalls,
      tokensUsed,
      cost,
      model,
    });

    console.log(`[Usage] Tracked: ${apiCalls} calls, ${tokensUsed} tokens, $${cost.toFixed(6)}`);
  } catch (error) {
    console.error('[Usage] Error tracking:', error);
  }
}

// ============================================
// HELPER: Fetch Admin Config
// ============================================

async function getAdminConfig(): Promise<any> {
  try {
    const docSnap = await db.collection('adminConfig').doc('prompts').get();
    return docSnap.exists ? docSnap.data() : null;
  } catch (error) {
    console.error('[AdminConfig] Error fetching:', error);
    return null;
  }
}

// ============================================
// HELPER: Strip Preambles
// ============================================

function stripPreamble(content: string): string {
  const preamblePatterns = [
    /^Here is.*?:\s*/i,
    /^Here's.*?:\s*/i,
    /^This is.*?:\s*/i,
    /^Below is.*?:\s*/i,
    /^I'll create.*?:\s*/i,
    /^I've created.*?:\s*/i,
    /^I have created.*?:\s*/i,
    /^Let me.*?:\s*/i,
    /^Certainly[!,]?\s*/i,
    /^Sure[!,]?\s*/i,
    /^Of course[!,]?\s*/i,
  ];

  let cleaned = content.trim();
  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim();
}

// ============================================
// CLOUD FUNCTION: Process Generation Queue
// ============================================

export const processGenerationQueue = functions.firestore
  .document('generationQueue/{taskId}')
  .onCreate(async (snapshot, context) => {
    const taskId = context.params.taskId;
    const task = snapshot.data();

    console.log(`[Queue] Processing task ${taskId} of type ${task.type}`);

    // Only process QUEUED tasks
    if (task.status !== 'queued') {
      console.log(`[Queue] Task ${taskId} is not queued (status: ${task.status}), skipping`);
      return null;
    }

    const taskRef = db.collection('generationQueue').doc(taskId);

    try {
      // Update status to PROCESSING
      await taskRef.update({
        status: 'processing',
        progress: 10,
      });

      // ============================================
      // TITLE GENERATION
      // ============================================

      if (task.type === 'Generate Titles') {
        console.log(`[Queue] Starting title generation for category ${task.categoryId}`);

        // Fetch category
        const categorySnap = await db
          .collection('organizations')
          .doc(task.organizationId)
          .collection('projects')
          .doc(task.projectId)
          .collection('categories')
          .doc(task.categoryId)
          .get();

        if (!categorySnap.exists) {
          throw new Error(`Category ${task.categoryId} not found`);
        }

        const category = categorySnap.data();
        const ai = getGeminiClient();
        const adminConfig = await getAdminConfig();

        await taskRef.update({ progress: 30 });

        // Build prompt
        const descriptionContext = task.contextOverride || category?.description || '';
        const count = task.requestedCount || 5;
        let prompt = '';

        if (adminConfig?.prompts?.['TITLE_GENERATION']) {
          prompt = adminConfig.prompts['TITLE_GENERATION']
            .replace(/\{\{count\}\}/g, count.toString())
            .replace(/\{\{categoryName\}\}/g, category?.name || '')
            .replace(/\{\{categoryDescription\}\}/g, descriptionContext);
        } else {
          prompt = `Generate ${count} high-quality blog post ideas for a category named "${category?.name}".
Context/Description: ${descriptionContext}.

For each idea, provide:
1. A catchy, SEO-friendly Title.
2. A "Teaser" or "Prompt": A 1-2 sentence description of what the post should cover.
3. Keywords: 3-5 target keywords or topics.`;
        }

        await taskRef.update({ progress: 50 });

        // Call Gemini API
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                ideas: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      teaser: { type: Type.STRING },
                      keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                  },
                },
              },
            },
          },
        });

        await taskRef.update({ progress: 70 });

        const json = JSON.parse(response.text || '{"ideas": []}');
        const ideas = json.ideas || [];

        console.log(`[Queue] Generated ${ideas.length} titles`);

        // Track usage
        const inputTokens = estimateTokens(prompt);
        const outputTokens = estimateTokens(response.text || '');
        await trackUsage(
          task.organizationId,
          task.projectId,
          task.createdBy,
          1,
          inputTokens + outputTokens,
          'gemini-2.5-flash'
        );

        await taskRef.update({ progress: 80 });

        // Save posts to Firestore
        const postsRef = db
          .collection('organizations')
          .doc(task.organizationId)
          .collection('projects')
          .doc(task.projectId)
          .collection('posts');

        const batch = db.batch();
        ideas.forEach((idea: any) => {
          const newPostRef = postsRef.doc();
          batch.set(newPostRef, {
            projectId: task.projectId,
            organizationId: task.organizationId,
            categoryId: task.categoryId,
            title: idea.title,
            teaser: idea.teaser,
            tags: idea.keywords,
            status: 'pending',
            createdBy: task.createdBy,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          });
        });

        await batch.commit();

        await taskRef.update({
          status: 'completed',
          progress: 100,
          completedAt: admin.firestore.Timestamp.now(),
          result: { count: ideas.length },
        });

        console.log(`[Queue] ✅ Task ${taskId} completed successfully`);
      }

      // ============================================
      // CONTENT GENERATION
      // ============================================

      else if (task.type === 'Generate Content') {
        console.log(`[Queue] Starting content generation for post ${task.targetPostId}`);

        // Fetch post
        const postSnap = await db
          .collection('organizations')
          .doc(task.organizationId)
          .collection('projects')
          .doc(task.projectId)
          .collection('posts')
          .doc(task.targetPostId)
          .get();

        if (!postSnap.exists) {
          throw new Error(`Post ${task.targetPostId} not found`);
        }

        const post = postSnap.data();
        const ai = getGeminiClient();
        const [adminConfig, orgSnap] = await Promise.all([
          getAdminConfig(),
          db.collection('organizations').doc(task.organizationId).get(),
        ]);

        await taskRef.update({ progress: 30 });

        const orgData = orgSnap.exists ? orgSnap.data() : null;
        let modelVersion = 'gemini-2.5-flash';

        if (adminConfig?.modelVersion) {
          modelVersion = adminConfig.modelVersion;
        }

        // Build prompt
        const contentType = post?.contentType || 'ARTICLE';
        const tone = post?.tone || 'PROFESSIONAL';
        const template = adminConfig?.prompts?.[contentType];
        let prompt = '';

        if (template) {
          prompt = template
            .replace(/\{\{topic\}\}/g, post?.title || '')
            .replace(/\{\{category\}\}/g, task.categoryName || '')
            .replace(/\{\{targetAudience\}\}/g, 'General Audience')
            .replace(/\{\{tone\}\}/g, tone)
            .replace(/\{\{brandMessage\}\}/g, orgData?.brandMessage || 'Not specified')
            .replace(/\{\{brandCompliance\}\}/g, orgData?.brandCompliance || 'None')
            .replace(/\{\{keywords\}\}/g, post?.tags?.join(', ') || 'None')
            .replace(/\{\{teaser\}\}/g, post?.teaser || 'None');
        } else {
          prompt = `Write a detailed ${contentType.toLowerCase()} about: "${post?.title}" in the category "${task.categoryName}".

Tone: ${tone}
${post?.teaser ? `**Specific Instructions/Focus:** ${post.teaser}` : ''}
${post?.tags && post.tags.length > 0 ? `**Target Keywords to Include:** ${post.tags.join(', ')}` : ''}

${orgData?.brandMessage ? `**Brand Message:** ${orgData.brandMessage}` : ''}
${orgData?.brandCompliance ? `**Compliance Guidelines:** ${orgData.brandCompliance}` : ''}

IMPORTANT: Start directly with the markdown content. Do not include any preambles.
Format in clean Markdown.`;
        }

        await taskRef.update({ progress: 50 });

        // Call Gemini API
        const response = await ai.models.generateContent({
          model: modelVersion,
          contents: prompt,
        });

        const rawContent = response.text || 'Could not generate content.';
        const cleanedContent = stripPreamble(rawContent);

        await taskRef.update({ progress: 70 });

        // Track usage
        const inputTokens = estimateTokens(prompt);
        const outputTokens = estimateTokens(rawContent);
        await trackUsage(
          task.organizationId,
          task.projectId,
          task.createdBy,
          1,
          inputTokens + outputTokens,
          modelVersion
        );

        await taskRef.update({ progress: 80 });

        // Update post with generated content
        const postRef = db
          .collection('organizations')
          .doc(task.organizationId)
          .collection('projects')
          .doc(task.projectId)
          .collection('posts')
          .doc(task.targetPostId);

        await postRef.update({
          content: cleanedContent,
          status: 'needs_review',
          generatedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        await taskRef.update({
          status: 'completed',
          progress: 100,
          completedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`[Queue] ✅ Task ${taskId} completed successfully`);
      }
    } catch (error: any) {
      console.error(`[Queue] ❌ Task ${taskId} failed:`, error);

      await taskRef.update({
        status: 'failed',
        error: error.message,
        completedAt: admin.firestore.Timestamp.now(),
      });

      // Reset post to pending if content generation failed
      if (task.type === 'Generate Content' && task.targetPostId) {
        try {
          const postRef = db
            .collection('organizations')
            .doc(task.organizationId)
            .collection('projects')
            .doc(task.projectId)
            .collection('posts')
            .doc(task.targetPostId);

          await postRef.update({
            status: 'pending',
            updatedAt: admin.firestore.Timestamp.now(),
          });
        } catch (resetError) {
          console.error('[Queue] Error resetting post:', resetError);
        }
      }
    }

    return null;
  });

// ============================================
// CLOUD FUNCTION: On User Create
// ============================================

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  console.log(`[Auth] New user created: ${user.uid}`);

  try {
    // Create user document in Firestore
    await db.collection('users').doc(user.uid).set({
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      globalRole: 'USER',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log(`[Auth] ✅ User document created for ${user.uid}`);

    // TODO: Send welcome email using SendGrid or Firebase Email Extension
    // Example:
    // await sendWelcomeEmail(user.email, user.displayName);
  } catch (error) {
    console.error('[Auth] Error creating user document:', error);
  }
});

// ============================================
// CLOUD FUNCTION: Send Invitation (HTTP Callable)
// ============================================

export const sendInvitation = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, email, role, projectId } = data;

  if (!organizationId || !email || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Check if user has permission to invite (org admin or project admin)
    const membershipSnap = await db
      .collection('organizationMembers')
      .doc(`${organizationId}_${context.auth.uid}`)
      .get();

    if (!membershipSnap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'User is not a member of this organization');
    }

    const membership = membershipSnap.data();
    if (membership?.role !== 'OWNER' && membership?.role !== 'ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can send invitations');
    }

    // Generate secure token
    const token = admin.firestore().collection('_').doc().id; // Generate unique ID
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    // Create invitation document
    await db.collection('invitations').add({
      organizationId,
      projectId: projectId || null,
      email,
      role,
      invitedBy: context.auth.uid,
      status: 'PENDING',
      token,
      expiresAt,
      createdAt: admin.firestore.Timestamp.now(),
    });

    // TODO: Send invitation email using SendGrid or Firebase Email Extension
    // Example:
    // const inviteLink = `https://yourapp.com/accept-invite?token=${token}`;
    // await sendInvitationEmail(email, inviteLink, organizationName);

    console.log(`[Invite] ✅ Invitation sent to ${email}`);

    return { success: true, message: 'Invitation sent successfully' };
  } catch (error: any) {
    console.error('[Invite] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
