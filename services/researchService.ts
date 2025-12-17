/**
 * Research Service
 * Handles keyword research generation for categories
 * - Shallow research: AI-estimated keywords (FREE/STARTER tiers)
 * - Deep research: DataForSEO real data (PROFESSIONAL/ENTERPRISE tiers)
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
  doc,
  getDoc,
  setDoc,
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
  SubscriptionTier,
  TIER_FEATURES,
} from '../types';
import { CREDIT_COSTS } from './creditService';

// Research cache (7 day TTL)
const RESEARCH_TTL_DAYS = 7;

const getClient = () => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 60000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Helper to add retry logic with exponential backoff
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;

    const isRetryable =
      error?.message?.includes('503') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.message?.includes('overloaded') ||
      error?.message?.includes('429') ||
      error?.message?.includes('timed out');

    if (!isRetryable) throw error;

    console.warn(`[Research] Request failed. Retrying in ${baseDelay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    return withRetry(fn, retries - 1, baseDelay * 2);
  }
};

/**
 * Check if research data is stale (older than TTL)
 */
export const isResearchStale = (research: CategoryResearch | null): boolean => {
  if (!research) return true;

  const now = new Date();
  const expiresAt = research.expiresAt.toDate();
  return now > expiresAt;
};

/**
 * Generate shallow research using AI-estimated keywords
 * Used for FREE and STARTER tiers
 */
export const generateShallowResearch = async (
  category: Category,
  project: Project,
  organization: Organization
): Promise<CategoryResearch> => {
  console.log(`[Research] Generating shallow research for category: ${category.name}`);

  const ai = getClient();
  const tierFeatures = TIER_FEATURES[organization.subscriptionTier];
  const maxKeywords = tierFeatures.maxKeywordsPerResearch;

  // Build context from business profile
  const bp = project.businessProfile;
  let businessContext = '';
  if (bp) {
    const parts: string[] = [];
    if (bp.businessName) parts.push(`Business: ${bp.businessName}`);
    if (bp.businessSummary) parts.push(`About: ${bp.businessSummary}`);
    if (bp.industry?.primary) parts.push(`Industry: ${bp.industry.primary}`);
    if (bp.targetAudience?.primary) parts.push(`Target Audience: ${bp.targetAudience.primary}`);
    if (bp.offerings?.categories?.length) {
      parts.push(`Offerings: ${bp.offerings.categories.join(', ')}`);
    }
    businessContext = parts.join('\n');
  }

  const prompt = `You are an SEO Content Strategist analyzing a content category for keyword research.

**BUSINESS CONTEXT**
${businessContext || 'General business'}

**CATEGORY TO ANALYZE**
Category Name: ${category.name}
Category Description: ${category.description || 'No description provided'}

**TASK:** Provide realistic keyword research estimates for this category.

Analyze and return:
1. Primary Keywords (${Math.min(maxKeywords, 10)}): Main keywords people search for this topic
   - Include estimated monthly search volume (realistic numbers based on topic popularity)
   - Include difficulty score (0-100, where higher = harder to rank)
   - Include estimated CPC (cost per click in USD)

2. Related Long-tail Keywords (${Math.min(maxKeywords, 15)}): More specific variations
   - Same metrics as primary keywords

3. Questions to Answer (5-8): Common questions people ask about this topic
   - Format: Natural language questions

4. Content Gaps (3-5): Topics not being adequately covered by existing content
   - Each gap should include: topic, opportunity description, suggested angle

5. Suggested Topics (5-8): Specific article topics that would perform well

IMPORTANT: All keyword data should be marked as AI estimates. Be realistic with volume estimates:
- Low competition niches: 100-1000 monthly searches
- Medium niches: 1000-10000 monthly searches
- Popular topics: 10000-100000+ monthly searches

Return as JSON with this exact structure.`;

  try {
    const response = await withRetry(() => withTimeout(
      ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryKeywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    searchVolume: { type: Type.NUMBER },
                    difficulty: { type: Type.NUMBER },
                    cpc: { type: Type.NUMBER },
                    trend: { type: Type.STRING }
                  },
                  required: ['keyword', 'searchVolume', 'difficulty']
                }
              },
              relatedKeywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    searchVolume: { type: Type.NUMBER },
                    difficulty: { type: Type.NUMBER },
                    cpc: { type: Type.NUMBER },
                    trend: { type: Type.STRING }
                  },
                  required: ['keyword', 'searchVolume', 'difficulty']
                }
              },
              questionsToAnswer: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              contentGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    opportunity: { type: Type.STRING },
                    angle: { type: Type.STRING }
                  },
                  required: ['topic', 'opportunity', 'angle']
                }
              },
              suggestedTopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['primaryKeywords', 'relatedKeywords', 'questionsToAnswer', 'contentGaps', 'suggestedTopics']
          }
        }
      }),
      90000 // 90 second timeout for research
    ));

    const data = JSON.parse(response.text || '{}');

    // Transform keywords to include source
    const transformKeywords = (keywords: any[]): KeywordData[] => {
      return (keywords || []).map(k => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume ?? null,
        difficulty: k.difficulty ?? null,
        cpc: k.cpc ?? null,
        trend: k.trend as 'rising' | 'stable' | 'declining' | undefined,
        source: 'ai_estimated' as const
      }));
    };

    const now = Timestamp.now();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RESEARCH_TTL_DAYS);

    const research: CategoryResearch = {
      id: '', // Will be set when saved
      categoryId: category.id,
      projectId: project.id,
      organizationId: organization.id,
      researchType: 'shallow',
      primaryKeywords: transformKeywords(data.primaryKeywords),
      relatedKeywords: transformKeywords(data.relatedKeywords),
      questionsToAnswer: data.questionsToAnswer || [],
      contentGaps: data.contentGaps || [],
      coveredTopics: [], // Empty initially, updated as content is created
      suggestedTopics: data.suggestedTopics || [],
      createdAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
      creditCost: CREDIT_COSTS.SHALLOW_RESEARCH
    };

    console.log(`[Research] Shallow research generated: ${research.primaryKeywords.length} primary keywords`);
    return research;

  } catch (error: any) {
    console.error('[Research] Shallow research generation failed:', error);
    throw new Error(error?.message || 'Failed to generate keyword research');
  }
};

/**
 * Generate deep research using DataForSEO real data
 * Used for PROFESSIONAL and ENTERPRISE tiers
 */
export const generateDeepResearch = async (
  category: Category,
  project: Project,
  organization: Organization
): Promise<CategoryResearch> => {
  console.log(`[Research] Generating deep research for category: ${category.name}`);

  // First, generate shallow research as base
  const shallowResearch = await generateShallowResearch(category, project, organization);

  // Try to enhance with DataForSEO data
  try {
    // Import dynamically to avoid circular dependencies
    const { dataForSeoService } = await import('./dataForSeoService');

    // Get real keyword data for primary keywords
    const keywordStrings = shallowResearch.primaryKeywords.map(k => k.keyword);
    const realKeywordData = await dataForSeoService.getKeywordData(
      keywordStrings,
      'US', // Default location, could be from org settings
      'en'  // Default language
    );

    // Merge real data with AI estimates
    const enhancedPrimaryKeywords: KeywordData[] = shallowResearch.primaryKeywords.map(aiKeyword => {
      const realData = realKeywordData.find(
        r => r.keyword.toLowerCase() === aiKeyword.keyword.toLowerCase()
      );
      if (realData) {
        return {
          ...realData,
          source: 'dataforseo' as const
        };
      }
      return aiKeyword;
    });

    // Get SERP competitors for top keyword
    let competitors: { title: string; url: string; wordCount: number }[] = [];
    let avgCompetitorWordCount: number | undefined;
    let missingTopics: string[] = [];

    if (keywordStrings.length > 0) {
      try {
        const serpResults = await dataForSeoService.getSerpCompetitors(
          keywordStrings[0],
          'US',
          10
        );
        competitors = serpResults.competitors;
        avgCompetitorWordCount = serpResults.avgWordCount;
        missingTopics = serpResults.missingTopics || [];
      } catch (serpError) {
        console.warn('[Research] SERP analysis failed, continuing without competitor data:', serpError);
      }
    }

    const now = Timestamp.now();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RESEARCH_TTL_DAYS);

    const deepResearch: CategoryResearch = {
      ...shallowResearch,
      researchType: 'deep',
      primaryKeywords: enhancedPrimaryKeywords,
      competitors,
      avgCompetitorWordCount,
      missingTopics,
      createdAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
      creditCost: CREDIT_COSTS.DEEP_RESEARCH
    };

    console.log(`[Research] Deep research generated with ${competitors.length} competitors analyzed`);
    return deepResearch;

  } catch (error: any) {
    console.warn('[Research] DataForSEO enhancement failed, returning shallow research:', error);
    // If DataForSEO fails, return shallow research but still charge deep research cost
    // (because we attempted the API call)
    return {
      ...shallowResearch,
      researchType: 'deep',
      creditCost: CREDIT_COSTS.DEEP_RESEARCH
    };
  }
};

/**
 * Get or create research for a category
 * Automatically detects tier and generates appropriate research type
 */
export const getOrCreateResearch = async (
  categoryId: string,
  organizationId: string,
  projectId: string,
  forceRefresh: boolean = false
): Promise<CategoryResearch | null> => {
  console.log(`[Research] Getting research for category: ${categoryId}, forceRefresh: ${forceRefresh}`);

  // 1. Check for existing research
  if (!forceRefresh) {
    try {
      const researchRef = doc(db, 'categoryResearch', categoryId);
      const researchSnap = await getDoc(researchRef);

      if (researchSnap.exists()) {
        const existingResearch = { id: researchSnap.id, ...researchSnap.data() } as CategoryResearch;

        if (!isResearchStale(existingResearch)) {
          console.log('[Research] Returning cached research');
          return existingResearch;
        }
        console.log('[Research] Existing research is stale, regenerating...');
      }
    } catch (error) {
      console.warn('[Research] Error fetching existing research:', error);
    }
  }

  // 2. Fetch category, project, and organization
  try {
    const [categorySnap, projectSnap, orgSnap] = await Promise.all([
      getDoc(doc(db, `organizations/${organizationId}/projects/${projectId}/categories`, categoryId)),
      getDoc(doc(db, `organizations/${organizationId}/projects`, projectId)),
      getDoc(doc(db, 'organizations', organizationId))
    ]);

    if (!categorySnap.exists() || !projectSnap.exists() || !orgSnap.exists()) {
      console.error('[Research] Required documents not found');
      return null;
    }

    const category = { id: categorySnap.id, ...categorySnap.data() } as Category;
    const project = { id: projectSnap.id, ...projectSnap.data() } as Project;
    const organization = { id: orgSnap.id, ...orgSnap.data() } as Organization;

    // 3. Determine research type based on tier
    const tierFeatures = TIER_FEATURES[organization.subscriptionTier];
    const researchType = tierFeatures.researchType;

    console.log(`[Research] Tier: ${organization.subscriptionTier}, Research type: ${researchType}`);

    // 4. Generate research
    let research: CategoryResearch;
    if (researchType === 'deep') {
      research = await generateDeepResearch(category, project, organization);
    } else {
      research = await generateShallowResearch(category, project, organization);
    }

    // 5. Save research to Firestore
    const researchRef = doc(db, 'categoryResearch', categoryId);
    research.id = researchRef.id;
    await setDoc(researchRef, research);

    // 6. Update category with research reference
    const categoryRef = doc(db, `organizations/${organizationId}/projects/${projectId}/categories`, categoryId);
    await setDoc(categoryRef, {
      researchId: research.id,
      lastResearchAt: research.createdAt
    }, { merge: true });

    console.log(`[Research] Research saved with ID: ${research.id}`);
    return research;

  } catch (error: any) {
    console.error('[Research] Failed to get or create research:', error);
    throw new Error(error?.message || 'Failed to generate research');
  }
};

/**
 * Get existing research without generating new
 */
export const getExistingResearch = async (
  categoryId: string
): Promise<CategoryResearch | null> => {
  try {
    const researchRef = doc(db, 'categoryResearch', categoryId);
    const researchSnap = await getDoc(researchRef);

    if (researchSnap.exists()) {
      return { id: researchSnap.id, ...researchSnap.data() } as CategoryResearch;
    }
    return null;
  } catch (error) {
    console.error('[Research] Error fetching research:', error);
    return null;
  }
};

/**
 * Build research context for prompt injection
 */
export const buildResearchContext = (
  research: CategoryResearch | null,
  showMetrics: boolean = true
): string => {
  if (!research) return '';

  const parts: string[] = [];
  parts.push('**KEYWORD RESEARCH DATA**');
  parts.push(`Research Type: ${research.researchType === 'deep' ? 'SEO Data' : 'AI Estimated'}`);

  // Primary keywords
  if (research.primaryKeywords.length > 0) {
    parts.push('\nTarget Keywords:');
    research.primaryKeywords.slice(0, 5).forEach(k => {
      if (showMetrics && k.searchVolume !== null) {
        parts.push(`- ${k.keyword} (${k.searchVolume}/mo, difficulty: ${k.difficulty})`);
      } else {
        parts.push(`- ${k.keyword}`);
      }
    });
  }

  // Related keywords
  if (research.relatedKeywords.length > 0) {
    parts.push('\nRelated Keywords:');
    research.relatedKeywords.slice(0, 10).forEach(k => {
      parts.push(`- ${k.keyword}`);
    });
  }

  // Questions
  if (research.questionsToAnswer.length > 0) {
    parts.push('\nQuestions to Address:');
    research.questionsToAnswer.forEach(q => {
      parts.push(`- ${q}`);
    });
  }

  // Content gaps
  if (research.contentGaps.length > 0) {
    parts.push('\nContent Gaps & Opportunities:');
    research.contentGaps.forEach(gap => {
      parts.push(`- ${gap.topic}: ${gap.opportunity}`);
    });
  }

  // Competitor insights (deep research only)
  if (research.researchType === 'deep' && research.avgCompetitorWordCount) {
    parts.push(`\nCompetitor Analysis:`);
    parts.push(`- Average competitor word count: ${research.avgCompetitorWordCount}`);
    if (research.missingTopics && research.missingTopics.length > 0) {
      parts.push(`- Topics competitors miss: ${research.missingTopics.join(', ')}`);
    }
  }

  return parts.join('\n');
};

export const researchService = {
  generateShallowResearch,
  generateDeepResearch,
  getOrCreateResearch,
  getExistingResearch,
  isResearchStale,
  buildResearchContext
};
