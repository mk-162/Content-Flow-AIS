/**
 * Category Keyword Service
 * Handles fetching and managing SEO keywords for categories
 * - Generates seed keywords using AI (category + brand context)
 * - Fetches volume/difficulty data from DataForSEO
 * - Caches results for 7 days
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  collection,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  CategoryResearch,
  KeywordData,
  Category,
  Project,
  Organization,
} from '../types';
import { getKeywordData } from './dataForSeoService';

// Keyword cache TTL (7 days)
const KEYWORD_CACHE_DAYS = 7;
const TARGET_KEYWORD_COUNT = 50;
const AI_TIMEOUT_MS = 30000; // 30 second timeout for AI calls

const getClient = () => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Check if keywords are stale and need refresh
 */
export const areKeywordsStale = (research: CategoryResearch | null): boolean => {
  if (!research) return true;
  if (!research.keywordsFetchedAt) return true;
  if (!research.primaryKeywords || research.primaryKeywords.length === 0) return true;

  const now = new Date();
  const fetchedAt = research.keywordsFetchedAt.toDate();
  const staleDays = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);

  return staleDays > KEYWORD_CACHE_DAYS;
};

/**
 * Generate seed keywords using AI based on category and brand context
 */
export const generateSeedKeywords = async (
  categoryName: string,
  categoryDescription: string,
  project: Project,
  parentCategoryName?: string
): Promise<string[]> => {
  console.log(`[Keywords] Generating seed keywords for: ${categoryName}`);

  const ai = getClient();

  // Build context from project - use project name, description, and positioning
  const brandContext = [
    project.name && `Brand/Site: ${project.name}`,
    project.description && `Description: ${project.description}`,
    project.websiteUrl && `Website: ${project.websiteUrl}`,
    project.settings?.positioningStatement && `Positioning: ${project.settings.positioningStatement}`,
    project.settings?.rules && `Content Rules: ${project.settings.rules}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are an SEO keyword research expert. Generate ${TARGET_KEYWORD_COUNT} search keywords that people would use to find content about this topic.

CATEGORY: ${categoryName}
${categoryDescription ? `DESCRIPTION: ${categoryDescription}` : ''}
${parentCategoryName ? `PARENT CATEGORY: ${parentCategoryName}` : ''}

BRAND CONTEXT:
${brandContext || 'General content site'}

REQUIREMENTS:
1. Generate exactly ${TARGET_KEYWORD_COUNT} keywords
2. Include a mix of:
   - Head terms (1-2 words, high volume)
   - Long-tail keywords (3-5 words, specific intent)
   - Question-based keywords ("how to", "what is", "best way to")
   - Commercial intent keywords ("best", "top", "review", "vs")
3. Focus on keywords relevant to both the category AND the brand's target audience
4. Include variations and synonyms
5. Consider search intent (informational, commercial, transactional)

Return ONLY a JSON array of keyword strings, nothing else.
Example format: ["keyword 1", "keyword 2", "keyword 3"]`;

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI generation timed out')), AI_TIMEOUT_MS);
    });

    const generatePromise = ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.7,
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const text = response.text || '';
    const keywords = JSON.parse(text) as string[];

    console.log(`[Keywords] Generated ${keywords.length} seed keywords`);
    return keywords.slice(0, TARGET_KEYWORD_COUNT);

  } catch (error: any) {
    console.error('[Keywords] Failed to generate seed keywords:', error);

    // Fallback: generate basic keywords from category name
    const fallbackKeywords = [
      categoryName,
      `${categoryName} guide`,
      `${categoryName} tips`,
      `how to ${categoryName}`,
      `best ${categoryName}`,
      `${categoryName} for beginners`,
      `${categoryName} strategies`,
      `${categoryName} examples`,
      `${categoryName} tutorial`,
      `what is ${categoryName}`,
    ];

    return fallbackKeywords;
  }
};

/**
 * Fetch keyword data from DataForSEO and update CategoryResearch
 */
export const fetchCategoryKeywords = async (
  categoryId: string,
  category: Category,
  project: Project,
  organization: Organization,
  parentCategoryName?: string
): Promise<KeywordData[]> => {
  console.log(`[Keywords] Fetching keywords for category: ${category.name}`);

  try {
    // 1. Generate seed keywords using AI
    const seedKeywords = await generateSeedKeywords(
      category.name,
      category.description,
      project,
      parentCategoryName
    );

    // 2. Fetch volume data from DataForSEO
    let keywordData: KeywordData[];
    try {
      keywordData = await getKeywordData(seedKeywords);

      // If DataForSEO returned empty results, use seed keywords as fallback
      if (keywordData.length === 0) {
        console.warn('[Keywords] DataForSEO returned 0 results, using seed keywords');
        keywordData = seedKeywords.map(kw => ({
          keyword: kw,
          searchVolume: null,
          difficulty: null,
          cpc: null,
          trend: null,
          source: 'ai_estimated' as const
        }));
      }
    } catch (apiError: any) {
      console.warn('[Keywords] DataForSEO API failed, using estimates:', apiError.message);
      // Fallback to AI-estimated data
      keywordData = seedKeywords.map(kw => ({
        keyword: kw,
        searchVolume: null,
        difficulty: null,
        cpc: null,
        trend: null,
        source: 'ai_estimated'
      }));
    }

    // Sort by search volume (highest first), nulls at end
    keywordData.sort((a, b) => {
      if (a.searchVolume === null && b.searchVolume === null) return 0;
      if (a.searchVolume === null) return 1;
      if (b.searchVolume === null) return -1;
      return b.searchVolume - a.searchVolume;
    });

    // 3. Save to CategoryResearch
    const researchRef = doc(db, 'categoryResearch', categoryId);
    const existingResearch = await getDoc(researchRef);

    if (existingResearch.exists()) {
      // Update existing research
      await updateDoc(researchRef, {
        primaryKeywords: keywordData,
        keywordsFetchedAt: Timestamp.now(),
      });
    } else {
      // Create new research document
      const newResearch: CategoryResearch = {
        id: categoryId,
        categoryId: categoryId,
        projectId: project.id,
        organizationId: organization.id,
        researchType: 'shallow',
        primaryKeywords: keywordData,
        relatedKeywords: [],
        questionsToAnswer: [],
        contentGaps: [],
        coveredTopics: [],
        suggestedTopics: [],
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + KEYWORD_CACHE_DAYS * 24 * 60 * 60 * 1000)
        ),
        creditCost: 1,
        keywordsFetchedAt: Timestamp.now(),
      };
      await setDoc(researchRef, newResearch);
    }

    console.log(`[Keywords] Saved ${keywordData.length} keywords for category: ${category.name}`);
    return keywordData;

  } catch (error: any) {
    console.error('[Keywords] fetchCategoryKeywords failed:', error);
    throw error;
  }
};

/**
 * Result type for operations that can fail or return no data
 */
export type FetchResult<T> =
  | { success: true; data: T }
  | { success: true; data: null; reason: 'not_found' }
  | { success: false; error: Error };

/**
 * Get existing keywords for a category (from cache)
 * Returns discriminated result to distinguish "no data" from "error"
 */
export const getCategoryKeywords = async (
  categoryId: string
): Promise<FetchResult<KeywordData[]>> => {
  try {
    const researchRef = doc(db, 'categoryResearch', categoryId);
    const researchDoc = await getDoc(researchRef);

    if (!researchDoc.exists()) {
      return { success: true, data: null, reason: 'not_found' };
    }

    const research = researchDoc.data() as CategoryResearch;
    return { success: true, data: research.primaryKeywords || [] };

  } catch (error) {
    console.error('[Keywords] getCategoryKeywords failed:', error);
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

/**
 * Get the full CategoryResearch document
 * Returns discriminated result to distinguish "no data" from "error"
 */
export const getCategoryResearch = async (
  categoryId: string
): Promise<FetchResult<CategoryResearch>> => {
  try {
    const researchRef = doc(db, 'categoryResearch', categoryId);
    const researchDoc = await getDoc(researchRef);

    if (!researchDoc.exists()) {
      return { success: true, data: null, reason: 'not_found' };
    }

    return { success: true, data: researchDoc.data() as CategoryResearch };

  } catch (error) {
    console.error('[Keywords] getCategoryResearch failed:', error);
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

/**
 * Format search volume for display (e.g., 12100 -> "12.1K")
 */
export const formatSearchVolume = (volume: number | null): string => {
  if (volume === null) return '—';
  if (volume < 1000) return volume.toString();
  if (volume < 1000000) return `${(volume / 1000).toFixed(1)}K`;
  return `${(volume / 1000000).toFixed(1)}M`;
};

/**
 * Get trend icon for display
 */
export const getTrendIcon = (trend: 'rising' | 'stable' | 'declining' | null): string => {
  switch (trend) {
    case 'rising': return '▲';
    case 'declining': return '▼';
    case 'stable': return '—';
    default: return '';
  }
};

/**
 * Get difficulty color class
 */
export const getDifficultyColor = (difficulty: number | null): string => {
  if (difficulty === null) return 'text-slate-500';
  if (difficulty < 30) return 'text-emerald-400';
  if (difficulty < 60) return 'text-amber-400';
  return 'text-red-400';
};

export const categoryKeywordService = {
  areKeywordsStale,
  generateSeedKeywords,
  fetchCategoryKeywords,
  getCategoryKeywords,
  getCategoryResearch,
  formatSearchVolume,
  getTrendIcon,
  getDifficultyColor,
};
