/**
 * Deduplication Service
 * Prevents repetitive content by tracking topics and using embeddings for similarity detection
 *
 * Key features:
 * - Text embeddings using Gemini text-embedding-004
 * - Cosine similarity for duplicate detection
 * - Topic tracking across categories
 * - Content format diversity suggestions
 */

import { GoogleGenAI } from "@google/genai";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Post, ContentFormat } from '../types';

// Similarity threshold for duplicate detection
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

// Content format rotation for diversity
const ALL_CONTENT_FORMATS: ContentFormat[] = [
  'how-to',
  'listicle',
  'comparison',
  'guide',
  'case-study',
  'news',
  'opinion',
  'review'
];

const getClient = () => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generate text embedding using Gemini
 * Uses text-embedding-004 model for high-quality embeddings
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    const ai = getClient();

    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text.substring(0, 2000), // Limit text length
    });

    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error('No embedding returned from API');
    }

    return response.embeddings[0].values || [];
  } catch (error: any) {
    console.error('[Deduplication] Embedding generation failed:', error);
    throw new Error(error?.message || 'Failed to generate embedding');
  }
};

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns value between 0 (completely different) and 1 (identical)
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Check if a new title is similar to existing posts in a category
 * Returns list of potentially duplicate posts with similarity scores
 */
export const checkSimilarity = async (
  newTitle: string,
  categoryId: string,
  organizationId: string,
  projectId: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<{ post: Post; similarity: number }[]> => {
  console.log(`[Deduplication] Checking similarity for: "${newTitle}"`);

  // Get embedding for new title
  const newEmbedding = await getEmbedding(newTitle);

  // Fetch existing posts with embeddings in this category
  const postsRef = collection(db, `organizations/${organizationId}/projects/${projectId}/posts`);
  const postsQuery = query(
    postsRef,
    where('categoryId', '==', categoryId),
    limit(100) // Check against last 100 posts
  );

  const postsSnap = await getDocs(postsQuery);
  const similarPosts: { post: Post; similarity: number }[] = [];

  for (const postDoc of postsSnap.docs) {
    const post = { id: postDoc.id, ...postDoc.data() } as Post;

    // If post has embedding, compare
    if (post.embedding && post.embedding.length > 0) {
      const similarity = cosineSimilarity(newEmbedding, post.embedding);

      if (similarity >= threshold) {
        similarPosts.push({ post, similarity });
        console.log(`[Deduplication] Found similar: "${post.title}" (${(similarity * 100).toFixed(1)}%)`);
      }
    } else {
      // Fallback: simple title comparison if no embedding
      const simpleSimilarity = simpleTextSimilarity(newTitle, post.title);
      if (simpleSimilarity >= threshold) {
        similarPosts.push({ post, similarity: simpleSimilarity });
      }
    }
  }

  // Sort by similarity (most similar first)
  similarPosts.sort((a, b) => b.similarity - a.similarity);

  console.log(`[Deduplication] Found ${similarPosts.length} potentially similar posts`);
  return similarPosts;
};

/**
 * Simple text similarity fallback (Jaccard similarity on words)
 */
const simpleTextSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

/**
 * Get existing titles for context injection into prompts
 * Returns formatted list of existing titles to help AI avoid duplicates
 */
export const getExistingTitlesContext = async (
  categoryId: string,
  organizationId: string,
  projectId: string,
  maxTitles: number = 50
): Promise<string> => {
  console.log(`[Deduplication] Fetching existing titles for category: ${categoryId}`);

  const postsRef = collection(db, `organizations/${organizationId}/projects/${projectId}/posts`);
  const postsQuery = query(
    postsRef,
    where('categoryId', '==', categoryId),
    orderBy('createdAt', 'desc'),
    limit(maxTitles)
  );

  const postsSnap = await getDocs(postsQuery);
  const titles: string[] = [];

  postsSnap.forEach(doc => {
    const post = doc.data() as Post;
    if (post.title) {
      titles.push(post.title);
    }
  });

  if (titles.length === 0) {
    return '';
  }

  // Format for prompt injection
  return titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
};

/**
 * Get topics already covered in a category
 * Extracts main topics/themes from existing post titles
 */
export const getCoveredTopics = async (
  categoryId: string,
  organizationId: string,
  projectId: string
): Promise<string[]> => {
  const postsRef = collection(db, `organizations/${organizationId}/projects/${projectId}/posts`);
  const postsQuery = query(
    postsRef,
    where('categoryId', '==', categoryId),
    limit(100)
  );

  const postsSnap = await getDocs(postsQuery);
  const topics = new Set<string>();

  postsSnap.forEach(doc => {
    const post = doc.data() as Post;

    // Extract from primaryAngle if available
    if (post.primaryAngle) {
      topics.add(post.primaryAngle);
    }

    // Extract from targetKeyword if available
    if (post.targetKeyword) {
      topics.add(post.targetKeyword);
    }

    // Extract key phrases from title (simple approach)
    if (post.title) {
      // Remove common words and extract meaningful phrases
      const cleanTitle = post.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && !STOP_WORDS.has(w))
        .slice(0, 3)
        .join(' ');

      if (cleanTitle.length > 5) {
        topics.add(cleanTitle);
      }
    }
  });

  return Array.from(topics).slice(0, 30); // Limit to 30 topics
};

/**
 * Suggest content formats for diversity
 * Analyzes existing posts and suggests underused formats
 */
export const suggestContentFormats = async (
  categoryId: string,
  organizationId: string,
  projectId: string
): Promise<ContentFormat[]> => {
  const postsRef = collection(db, `organizations/${organizationId}/projects/${projectId}/posts`);
  const postsQuery = query(
    postsRef,
    where('categoryId', '==', categoryId),
    limit(50)
  );

  const postsSnap = await getDocs(postsQuery);

  // Count existing formats
  const formatCounts = new Map<ContentFormat, number>();
  ALL_CONTENT_FORMATS.forEach(f => formatCounts.set(f, 0));

  postsSnap.forEach(doc => {
    const post = doc.data() as Post;
    if (post.contentFormat && formatCounts.has(post.contentFormat)) {
      formatCounts.set(post.contentFormat, (formatCounts.get(post.contentFormat) || 0) + 1);
    }
  });

  // Sort by count (ascending) to find underused formats
  const sortedFormats = Array.from(formatCounts.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([format]) => format);

  // Return top 4 least used formats
  return sortedFormats.slice(0, 4);
};

/**
 * Store embedding for a post (call after post creation)
 */
export const storePostEmbedding = async (
  postId: string,
  title: string,
  organizationId: string,
  projectId: string
): Promise<void> => {
  try {
    const embedding = await getEmbedding(title);

    const postRef = doc(db, `organizations/${organizationId}/projects/${projectId}/posts`, postId);
    await updateDoc(postRef, { embedding });

    console.log(`[Deduplication] Stored embedding for post: ${postId}`);
  } catch (error) {
    console.error('[Deduplication] Failed to store embedding:', error);
    // Don't throw - embedding storage is not critical
  }
};

/**
 * Batch check multiple titles for similarity
 * More efficient than checking one at a time
 */
export const batchCheckSimilarity = async (
  titles: string[],
  categoryId: string,
  organizationId: string,
  projectId: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<Map<string, { post: Post; similarity: number }[]>> => {
  console.log(`[Deduplication] Batch checking ${titles.length} titles`);

  const results = new Map<string, { post: Post; similarity: number }[]>();

  // Get embeddings for all new titles in parallel
  const embeddings = await Promise.all(
    titles.map(async title => {
      try {
        return { title, embedding: await getEmbedding(title) };
      } catch {
        return { title, embedding: [] };
      }
    })
  );

  // Fetch existing posts once
  const postsRef = collection(db, `organizations/${organizationId}/projects/${projectId}/posts`);
  const postsQuery = query(
    postsRef,
    where('categoryId', '==', categoryId),
    limit(100)
  );
  const postsSnap = await getDocs(postsQuery);
  const existingPosts: Post[] = [];

  postsSnap.forEach(doc => {
    existingPosts.push({ id: doc.id, ...doc.data() } as Post);
  });

  // Compare each new title against existing posts
  for (const { title, embedding } of embeddings) {
    const similarPosts: { post: Post; similarity: number }[] = [];

    if (embedding.length > 0) {
      for (const post of existingPosts) {
        if (post.embedding && post.embedding.length > 0) {
          const similarity = cosineSimilarity(embedding, post.embedding);
          if (similarity >= threshold) {
            similarPosts.push({ post, similarity });
          }
        }
      }
    }

    similarPosts.sort((a, b) => b.similarity - a.similarity);
    results.set(title, similarPosts);
  }

  return results;
};

// Common stop words to filter out when extracting topics
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will',
  'your', 'from', 'they', 'were', 'that', 'this', 'with', 'what', 'when',
  'where', 'which', 'their', 'there', 'these', 'those', 'about', 'would',
  'could', 'should', 'being', 'because', 'between', 'through', 'during',
  'before', 'after', 'above', 'below', 'while', 'into', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'just', 'only', 'very',
  'some', 'such', 'more', 'most', 'other', 'than', 'best', 'ways', 'guide',
  'complete', 'ultimate', 'essential', 'tips', 'tricks', 'how', 'why'
]);

export const deduplicationService = {
  getEmbedding,
  cosineSimilarity,
  checkSimilarity,
  getExistingTitlesContext,
  getCoveredTopics,
  suggestContentFormats,
  storePostEmbedding,
  batchCheckSimilarity
};
