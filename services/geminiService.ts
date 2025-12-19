
import { GoogleGenAI, Type } from "@google/genai";
import { doc, getDoc, getDocs, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContentType, Tone, PromptType, AdminConfig, Project, TIER_FEATURES, SubscriptionTier, CategoryResearch, ContentFormat } from '../types';
import { buildContentContext, buildPromptBlock } from './contextBuilder';
import { researchService, getExistingResearch, buildResearchContext } from './researchService';
import { deduplicationService } from './deduplicationService';

const getClient = () => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Fetch system prompts for an organization
const getSystemPrompts = async (organizationId: string): Promise<Record<string, string>> => {
  try {
    const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      return orgData.systemPrompts || {};
    }
  } catch (error) {
    console.error('Error fetching system prompts:', error);
  }
  return {};
};

// Estimate tokens from text (rough approximation: 1 token ≈ 0.75 words)
const estimateTokens = (text: string): number => {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 0.75);
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

    // Only retry on specific errors (503, 429, timeout)
    const isRetryable =
      error?.message?.includes('503') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.message?.includes('overloaded') ||
      error?.message?.includes('429') ||
      error?.message?.includes('timed out');

    if (!isRetryable) throw error;

    console.warn(`⚠️ [Gemini] Request failed. Retrying in ${baseDelay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    return withRetry(fn, retries - 1, baseDelay * 2);
  }
};

// Track AI API usage for billing
const trackUsage = async (
  organizationId: string,
  projectId: string,
  userId: string,
  apiCalls: number,
  tokensUsed: number,
  model: string
) => {
  try {
    // Gemini pricing: $0.00001875 per 1K input tokens, $0.000075 per 1K output tokens
    // Average: ~$0.00004675 per 1K tokens
    const cost = (tokensUsed / 1000) * 0.00004675;

    await addDoc(collection(db, 'usage'), {
      organizationId,
      projectId,
      userId,
      timestamp: Timestamp.now(),
      apiCalls,
      tokensUsed,
      cost,
      model,
    });
    console.log(`[Usage] Tracked: ${apiCalls} API call(s), ${tokensUsed} tokens, $${cost.toFixed(6)}`);
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
};

// ============================================
// PROMPT HELPER FUNCTIONS
// ============================================

/**
 * Replace variables in a prompt template with actual values
 * Supports:
 * - {{variable}} - simple replacement
 * - {{#if variable}}...{{/if}} - conditional blocks (included if variable has value)
 * @param template - The prompt template with {{variable}} placeholders
 * @param variables - Object with variable names and their values
 * @returns The template with all variables replaced
 */
export const replacePromptVariables = (
  template: string,
  variables: Record<string, string | string[] | undefined>
): string => {
  let result = template;

  // First, handle {{#if variable}}...{{/if}} conditionals
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (match, varName, content) => {
    const value = variables[varName];
    // If variable has a truthy value, include the content; otherwise remove the block
    if (value && (Array.isArray(value) ? value.length > 0 : value.trim() !== '')) {
      return content;
    }
    return '';
  });

  // Then, replace simple {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) {
      continue;
    }

    // Convert arrays to comma-separated strings
    const stringValue = Array.isArray(value) ? value.join(', ') : value;

    // Replace all occurrences of {{key}} with the value
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, stringValue);
  }

  // Clean up any remaining empty {{variable}} placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  // Clean up excessive newlines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
};

/**
 * Validate that all required variables are present in a template
 * @param template - The prompt template to validate
 * @param requiredVars - Array of required variable names
 * @returns Object with isValid flag and array of missing variables
 */
export const validatePromptVariables = (
  template: string,
  requiredVars: string[]
): { isValid: boolean; missing: string[] } => {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
    if (!regex.test(template)) {
      missing.push(varName);
    }
  }

  return {
    isValid: missing.length === 0,
    missing
  };
};

export interface GeneratedTitleData {
  title: string;
  teaser: string;
  keywords: string[];
  searchIntent?: 'informational' | 'commercial' | 'transactional';
  contentFormat?: ContentFormat;
}

export const generateCategoryTitles = async (
  categoryName: string,
  categoryDescription: string,
  count: number = 5,
  organizationId?: string,
  projectId?: string,
  userId?: string,
  categoryId?: string  // NEW: For research and deduplication
): Promise<GeneratedTitleData[]> => {
  console.log(`[Gemini] Starting title generation for "${categoryName}" (${count} titles)`);

  try {
    console.log('[Gemini] Getting AI client...');
    const ai = getClient();

    // Build comprehensive business context from project
    let fullContext = '';
    if (organizationId && projectId) {
      try {
        const projectDoc = await getDoc(doc(db, `organizations/${organizationId}/projects`, projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          const bp = projectData.businessProfile;

          if (bp) {
            const contextParts: string[] = [];

            // Business Identity
            contextParts.push('**BUSINESS CONTEXT**');
            if (bp.businessName) contextParts.push(`Business: ${bp.businessName}`);
            if (bp.businessSummary) contextParts.push(`About: ${bp.businessSummary}`);

            // Industry
            let industryStr = bp.industry?.primary || '';
            if (bp.industry?.secondary) industryStr += ` / ${bp.industry.secondary}`;
            if (bp.industry?.tertiary) industryStr += ` / ${bp.industry.tertiary}`;
            if (industryStr) contextParts.push(`Industry: ${industryStr}`);

            // Offerings
            if (bp.offerings?.categories?.length) {
              const offeringLabel = bp.offerings.type === 'products' ? 'Products' :
                bp.offerings.type === 'services' ? 'Services' : 'Offerings';
              contextParts.push(`${offeringLabel}: ${bp.offerings.categories.join(', ')}`);
            }

            // Unique Value
            if (bp.brandVoice?.uniqueSellingPoints?.length) {
              contextParts.push(`Value Proposition: ${bp.brandVoice.uniqueSellingPoints.join('. ')}`);
            }

            // Target Audience
            contextParts.push('');
            contextParts.push('**TARGET AUDIENCE**');
            if (bp.targetAudience?.primary) contextParts.push(`Primary: ${bp.targetAudience.primary}`);
            if (bp.targetAudience?.demographics) {
              const demo = bp.targetAudience.demographics;
              if (demo.ageRange || demo.income) {
                contextParts.push(`Demographics: ${demo.ageRange || 'All ages'}${demo.income ? `, ${demo.income}` : ''}`);
              }
            }
            if (bp.targetAudience?.painPoints?.length) {
              contextParts.push(`Pain Points: ${bp.targetAudience.painPoints.join('; ')}`);
            }

            // Brand Voice
            if (bp.brandVoice?.tone?.length) {
              contextParts.push('');
              contextParts.push('**BRAND VOICE**');
              contextParts.push(`Tone: ${bp.brandVoice.tone.join(', ')}`);
            }

            fullContext = contextParts.join('\n');
            console.log(`[Gemini] Using comprehensive business context`);
          } else {
            // Minimal context from project
            fullContext = `Project: ${projectData.name}${projectData.description ? ` - ${projectData.description}` : ''}`;
            console.log(`[Gemini] Using minimal project context: ${fullContext}`);
          }
        }
      } catch (err) {
        console.warn('[Gemini] Could not fetch project context:', err);
      }
    }

    // Fetch admin config for prompt template
    const adminConfig = await getAdminConfig();
    let prompt = '';

    // ========================================
    // RESEARCH & DEDUPLICATION CONTEXT
    // ========================================
    let researchData: CategoryResearch | null = null;
    let existingTitles = '';
    let coveredTopics: string[] = [];
    let suggestedFormats: ContentFormat[] = [];
    let orgTier: SubscriptionTier = SubscriptionTier.FREE;

    if (categoryId && organizationId && projectId) {
      try {
        // Get org tier for determining what to show
        const orgSnap = await getDoc(doc(db, 'organizations', organizationId));
        if (orgSnap.exists()) {
          orgTier = orgSnap.data().subscriptionTier || SubscriptionTier.FREE;
        }

        // Fetch existing research (don't generate new - that happens on-demand)
        researchData = await getExistingResearch(categoryId);
        console.log(`[Gemini] Research data: ${researchData ? 'found' : 'not found'}`);

        // Fetch deduplication context
        [existingTitles, coveredTopics, suggestedFormats] = await Promise.all([
          deduplicationService.getExistingTitlesContext(categoryId, organizationId, projectId, 30),
          deduplicationService.getCoveredTopics(categoryId, organizationId, projectId),
          deduplicationService.suggestContentFormats(categoryId, organizationId, projectId)
        ]);

        console.log(`[Gemini] Dedup context: ${existingTitles ? 'found' : 'none'}, ${coveredTopics.length} topics, ${suggestedFormats.length} format suggestions`);
      } catch (err) {
        console.warn('[Gemini] Could not fetch research/dedup context:', err);
      }
    }

    // Build research context for prompt
    const showMetrics = TIER_FEATURES[orgTier].showKeywordMetrics;
    const formatKeywords = (keywords: any[] | undefined) => {
      if (!keywords || keywords.length === 0) return '';
      return keywords.map(k => {
        if (showMetrics && k.searchVolume) {
          return `${k.keyword} (${k.searchVolume}/mo)`;
        }
        return k.keyword;
      }).join(', ');
    };

    const formatContentGaps = (gaps: any[] | undefined) => {
      if (!gaps || gaps.length === 0) return '';
      return gaps.map(g => `- ${g.topic}: ${g.opportunity}`).join('\n');
    };

    if (adminConfig?.prompts?.[PromptType.TITLE_GENERATION]) {
      // Use admin prompt template with helper function
      prompt = replacePromptVariables(adminConfig.prompts[PromptType.TITLE_GENERATION], {
        count: count.toString(),
        categoryName,
        categoryDescription,
        projectContext: fullContext,
        businessContext: '',
        // Research data
        researchData: researchData ? 'true' : '',
        primaryKeywords: formatKeywords(researchData?.primaryKeywords),
        relatedKeywords: formatKeywords(researchData?.relatedKeywords),
        questionsToAnswer: researchData?.questionsToAnswer?.join('\n') || '',
        contentGaps: formatContentGaps(researchData?.contentGaps),
        // Deduplication data
        existingTitles,
        coveredTopics: coveredTopics.join(', '),
        suggestedFormats: suggestedFormats.join(', ')
      });

      // If template doesn't include context, prepend it
      if (fullContext && !prompt.includes('**BUSINESS CONTEXT**')) {
        prompt = `${fullContext}\n\n${prompt}`;
      }
    } else {
      // Fallback prompt with comprehensive context
      prompt = `You are an expert Content Strategist specializing in AI-optimized content.

${fullContext || 'No business context available.'}

**CATEGORY CONTEXT**
└─ Category: "${categoryName}"
   Description: "${categoryDescription}"

---

**TASK:** Generate exactly ${count} high-quality blog post ideas for this category.

CRITICAL REQUIREMENTS:
1. Titles MUST be directly relevant to the category AND the business context above
2. Titles should address the target audience's needs and pain points
3. Each title should be specific, actionable, and SEO-friendly
4. Titles should cover topics that AI assistants frequently answer questions about
5. Include power words that drive engagement

For each idea, provide:
1. A catchy, SEO-friendly Title specific to this business
2. A Teaser: 1-2 sentence description guiding what the post should cover
3. Keywords: 3-5 target SEO keywords relevant to this specific business`;
    }

    console.log('[Gemini] Calling generateContent with 60s timeout and retry...');
    const response = await withRetry(() => withTimeout(
      ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
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
                    searchIntent: { type: Type.STRING },
                    contentFormat: { type: Type.STRING }
                  },
                  required: ['title', 'teaser', 'keywords']
                }
              }
            },
            required: ['ideas']
          }
        }
      }),
      60000 // 60 second timeout
    ));

    console.log('[Gemini] Response received, parsing JSON...');

    // Handle potentially malformed JSON from AI
    let json: any;
    try {
      json = JSON.parse(response.text || '{"ideas": []}');
    } catch (parseError) {
      console.warn('[Gemini] JSON parse failed, attempting to fix...');
      const text = response.text || '';
      // Try to find JSON object in response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          json = JSON.parse(match[0]);
        } catch {
          console.error('[Gemini] Could not parse JSON, returning empty');
          json = { ideas: [] };
        }
      } else {
        json = { ideas: [] };
      }
    }

    const ideas = json.ideas || [];
    console.log(`[Gemini] Successfully generated ${ideas.length} titles`);

    // Log first idea to verify teaser is included
    if (ideas.length > 0) {
      console.log(`[Gemini] Sample idea:`, {
        title: ideas[0].title,
        teaser: ideas[0].teaser || '(missing)',
        keywords: ideas[0].keywords
      });
    }

    // Track usage
    if (organizationId && projectId && userId) {
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(response.text || '');
      const totalTokens = inputTokens + outputTokens;

      await trackUsage(
        organizationId,
        projectId,
        userId,
        1, // 1 API call
        totalTokens,
        'gemini-2.0-flash'
      );
    }

    // Ensure we only return the requested number of ideas
    // AI sometimes generates more than asked
    const limitedIdeas = ideas.slice(0, count);
    console.log(`[Gemini] Returning ${limitedIdeas.length} titles (requested: ${count})`);

    return limitedIdeas;
  } catch (error: any) {
    console.error("❌ [Gemini] Title Generation Error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // Check for timeout errors
    if (error?.message?.includes('timed out')) {
      throw new Error('Request timed out. The AI service is taking too long to respond. Please try again.');
    }

    // Check for quota errors - throw so UI can show proper error
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please wait a few minutes and try again, or upgrade your Gemini API plan.');
    }

    if (error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')) {
      throw new Error('API key permission denied. Please check your Gemini API key configuration.');
    }

    if (error?.message?.includes('404')) {
      throw new Error('AI model not found. Please contact support.');
    }

    // Generic error
    throw new Error(error?.message || 'Failed to generate titles. Please try again.');
  }
};

// Helper function to strip common preambles from AI output
const stripPreamble = (content: string): string => {
  // Common preamble patterns that AI models add
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

  // Remove preambles from the beginning
  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove any leading newlines or whitespace
  cleaned = cleaned.trim();

  return cleaned;
};

// Helper to strip title headings from generated content
// Title is stored separately in post.title, so we don't want it in the body
const stripTitleHeading = (content: string, title: string): string => {
  let cleaned = content.trim();

  // Escape special regex characters in title
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Strip markdown H1: # Title (exact or close match)
  cleaned = cleaned.replace(new RegExp(`^#\\s*${escapedTitle}\\s*\\n*`, 'im'), '');

  // Strip markdown H2: ## Title (if it appears right at the start after H1 removal)
  cleaned = cleaned.replace(new RegExp(`^##\\s*${escapedTitle}\\s*\\n*`, 'im'), '');

  // Also strip any H1 at the very beginning (fallback - AI sometimes varies the title slightly)
  cleaned = cleaned.replace(/^#\s+[^\n]+\n+/, '');

  // If content now starts with ## that looks like a duplicate title (short, no period), strip it
  const h2Match = cleaned.match(/^##\s+([^\n]+)\n/);
  if (h2Match && h2Match[1].length < 100 && !h2Match[1].includes('.')) {
    cleaned = cleaned.replace(/^##\s+[^\n]+\n+/, '');
  }

  return cleaned.trim();
};

// ============================================
// CACHING LAYER - Reduces Firestore Reads by 90%+
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache for admin config (changes rarely)
let adminConfigCache: CacheEntry<any> | null = null;
const ADMIN_CONFIG_TTL = 60 * 60 * 1000; // 1 hour

// Cache for organization settings (per org)
const orgSettingsCache = new Map<string, CacheEntry<any>>();
const ORG_SETTINGS_TTL = 30 * 60 * 1000; // 30 minutes

// Fetch Admin Config with caching
const getAdminConfig = async (): Promise<any> => {
  const now = Date.now();

  // Return cached data if still valid
  if (adminConfigCache && (now - adminConfigCache.timestamp) < ADMIN_CONFIG_TTL) {
    console.log('[Cache] Admin config served from cache');
    return adminConfigCache.data;
  }

  // Fetch from Firestore
  try {
    console.log('[Cache] Fetching admin config from Firestore...');
    const docSnap = await getDoc(doc(db, 'adminConfig', 'prompts'));
    const data = docSnap.exists() ? docSnap.data() : null;

    // Update cache
    adminConfigCache = { data, timestamp: now };
    console.log('[Cache] Admin config cached for 1 hour');

    return data;
  } catch (error) {
    console.error('Error fetching admin config:', error);
    // Return stale cache if available
    return adminConfigCache?.data || null;
  }
};

// Fetch Organization Brand Settings with caching
const getOrgSettings = async (orgId: string): Promise<any> => {
  const now = Date.now();
  const cached = orgSettingsCache.get(orgId);

  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < ORG_SETTINGS_TTL) {
    console.log(`[Cache] Org ${orgId} settings served from cache`);
    return cached.data;
  }

  // Fetch from Firestore
  try {
    console.log(`[Cache] Fetching org ${orgId} settings from Firestore...`);
    const docSnap = await getDoc(doc(db, 'organizations', orgId));
    const data = docSnap.exists() ? docSnap.data() : null;

    // Update cache
    orgSettingsCache.set(orgId, { data, timestamp: now });
    console.log(`[Cache] Org ${orgId} settings cached for 30 minutes`);

    return data;
  } catch (error) {
    console.error('Error fetching org settings:', error);
    // Return stale cache if available
    return cached?.data || null;
  }
};

// Cache for project settings
const projectSettingsCache = new Map<string, CacheEntry<any>>();
const PROJECT_SETTINGS_TTL = 30 * 60 * 1000; // 30 minutes

// Fetch Project Settings with caching
const getProjectSettings = async (orgId: string, projectId: string): Promise<any> => {
  const now = Date.now();
  const cacheKey = `${orgId}:${projectId}`;
  const cached = projectSettingsCache.get(cacheKey);

  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < PROJECT_SETTINGS_TTL) {
    console.log(`[Cache] Project ${projectId} settings served from cache`);
    return cached.data;
  }

  // Fetch from Firestore
  try {
    console.log(`[Cache] Fetching project ${projectId} settings from Firestore...`);
    const docSnap = await getDoc(doc(db, `organizations/${orgId}/projects`, projectId));
    const data = docSnap.exists() ? docSnap.data() : null;

    // Update cache
    projectSettingsCache.set(cacheKey, { data, timestamp: now });
    console.log(`[Cache] Project ${projectId} settings cached for 30 minutes`);

    return data;
  } catch (error) {
    console.error('Error fetching project settings:', error);
    // Return stale cache if available
    return cached?.data || null;
  }
};

/**
 * Resolve a prompt using hierarchical override system.
 * Priority: Project → Organization → Admin (most specific wins)
 * 
 * @param promptKey - The prompt key (ContentType, PromptType, or 'imageGeneration')
 * @param orgId - Organization ID (optional)
 * @param projectId - Project ID (optional)
 * @returns The resolved prompt template string, or null if not found
 */
export const resolvePrompt = async (
  promptKey: string,
  orgId?: string,
  projectId?: string
): Promise<string | null> => {
  // 1. Check project-level override (highest priority)
  if (orgId && projectId) {
    const projectData = await getProjectSettings(orgId, projectId);
    if (projectData?.promptOverrides?.[promptKey]) {
      console.log(`[Prompt] Using PROJECT override for ${promptKey}`);
      return projectData.promptOverrides[promptKey];
    }
  }

  // 2. Check org-level override
  if (orgId) {
    const orgData = await getOrgSettings(orgId);
    if (orgData?.promptOverrides?.[promptKey]) {
      console.log(`[Prompt] Using ORG override for ${promptKey}`);
      return orgData.promptOverrides[promptKey];
    }
  }

  // 3. Fall back to admin default (lowest priority)
  const adminConfig = await getAdminConfig();
  if (adminConfig?.prompts?.[promptKey]) {
    console.log(`[Prompt] Using ADMIN default for ${promptKey}`);
    return adminConfig.prompts[promptKey];
  }

  console.warn(`[Prompt] No prompt found for key: ${promptKey}`);
  return null;
};

// Clear all caches (useful for testing or when data is updated)
export const clearCaches = () => {
  adminConfigCache = null;
  orgSettingsCache.clear();
  console.log('[Cache] All caches cleared');
};

// Clear specific org cache (useful when org settings are updated)
export const clearOrgCache = (orgId: string) => {
  orgSettingsCache.delete(orgId);
  console.log(`[Cache] Org ${orgId} cache cleared`);
};

export const generatePostOutline = async (
  title: string,
  categoryName: string,
  teaser?: string,
  tags?: string[],
  organizationId?: string,
  projectId?: string,
  userId?: string,
  categoryDescription?: string,
  contentType: ContentType = ContentType.ARTICLE,
  tone: Tone = Tone.PROFESSIONAL,
  categoryId?: string,  // NEW: For research data
  postContentFormat?: ContentFormat  // NEW: Content format from title generation
): Promise<string> => {
  try {
    console.log(`[Gemini] 🎯 Starting content generation for: "${title}"`);
    const ai = getClient();
    let prompt = '';
    let modelVersion = 'gemini-2.0-flash';

    // 1. Fetch Admin Config, Org Settings, and Project
    console.log('[Gemini] 📥 Fetching context data...');
    const [adminConfig, orgData, projectDoc] = await Promise.all([
      getAdminConfig(),
      organizationId ? getOrgSettings(organizationId) : null,
      (organizationId && projectId) ? getDoc(doc(db, `organizations/${organizationId}/projects`, projectId)) : null
    ]);

    // Fetch research data for SEO context
    let researchData: CategoryResearch | null = null;
    if (categoryId) {
      researchData = await getExistingResearch(categoryId);
      console.log(`[Gemini] Research data for content: ${researchData ? 'found' : 'not found'}`);
    }

    // Build Business Context using Context Builder
    let businessContextBlock = '';
    if (projectDoc && projectDoc.exists()) {
      const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
      // We don't have parent categories here easily, but we have the current category
      const context = buildContentContext(projectData);

      // Override the category chain in the context builder since we have specific params
      context.categoryChain = [{ name: categoryName, description: categoryDescription || '' }];

      businessContextBlock = buildPromptBlock(context);
      console.log('[Gemini] ✅ Built business context from project profile');
    } else {
      console.warn('[Gemini] ⚠️ Project context not found, using defaults');
    }

    console.log('[Gemini] ✅ Config fetched:', {
      hasAdminConfig: !!adminConfig,
      modelVersion: adminConfig?.modelVersion,
      hasPromptForType: !!(adminConfig?.prompts?.[contentType]),
      contentType,
      tone
    });

    // 2. Determine Model Version
    if (adminConfig?.modelVersion) {
      modelVersion = adminConfig.modelVersion;

      // Auto-migrate old model names to new ones
      if (modelVersion === 'gemini-1.5-flash-001' || modelVersion === 'gemini-1.5-flash-latest') {
        console.warn('⚠️ [Gemini] Auto-migrating old model name to gemini-1.5-flash');
        modelVersion = 'gemini-2.0-flash';
      }
    }

    // 3. Construct Prompt
    // Check hierarchy: Project > Org > Admin > Default
    let template = adminConfig?.prompts?.[contentType];

    // Check Project Overrides
    if (projectDoc && projectDoc.exists()) {
      const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
      if (projectData.promptOverrides?.[contentType]) {
        template = projectData.promptOverrides[contentType];
        console.log(`[Gemini] 🚩 Using Project Override for ${contentType}`);
      }
    }

    // Check Org Overrides (if no project override)
    if (!projectDoc?.data()?.promptOverrides?.[contentType] && orgData?.promptOverrides?.[contentType]) {
      template = orgData.promptOverrides[contentType];
      console.log(`[Gemini] 🏢 Using Organization Override for ${contentType}`);
    }

    if (template) {
      // Use Resolved Prompt Template
      // Extract geographic location from org data
      let geographic = 'Global';
      if (orgData?.targetAudience?.demographics?.geographic) {
        geographic = Array.isArray(orgData.targetAudience.demographics.geographic)
          ? orgData.targetAudience.demographics.geographic.join(', ')
          : orgData.targetAudience.demographics.geographic;
      }

      // Build SEO context from research
      const primaryKeyword = researchData?.primaryKeywords?.[0]?.keyword || '';
      const secondaryKeywords = researchData?.primaryKeywords?.slice(1, 4).map(k => k.keyword).join(', ') || '';
      const targetWordCount = researchData?.avgCompetitorWordCount
        ? Math.ceil(researchData.avgCompetitorWordCount * 1.2)
        : 1500;

      // Use helper function for variable replacement
      prompt = replacePromptVariables(template, {
        topic: title,
        category: categoryName,
        categoryDescription: categoryDescription || '',
        contentFormat: postContentFormat || '',
        targetAudience: orgData?.targetAudience?.primary || 'General Audience',
        geographic,
        tone,
        brandMessage: orgData?.brandMessage || 'Not specified',
        brandCompliance: orgData?.brandCompliance || 'None',
        keywords: tags?.join(', ') || 'None',
        teaser: teaser || 'None',
        businessContext: businessContextBlock, // Inject the built context
        // SEO/Research variables
        researchData: researchData ? 'true' : '',
        primaryKeyword,
        secondaryKeywords,
        targetWordCount: targetWordCount.toString(),
        questionsToAnswer: researchData?.questionsToAnswer?.join('\n') || '',
        // Competitor analysis
        competitorAnalysis: researchData?.avgCompetitorWordCount ? 'true' : '',
        avgCompetitorWordCount: researchData?.avgCompetitorWordCount?.toString() || '',
        missingTopics: researchData?.missingTopics?.join(', ') || ''
      });

      // If template doesn't include businessContext variable, prepend it
      if (businessContextBlock && !prompt.includes('**BUSINESS CONTEXT**') && !prompt.includes('{{businessContext}}')) {
        prompt = `${businessContextBlock}\n\n${prompt}`;
      }
    } else {
      // Extract geographic location from org data for fallback
      let geographic = 'Global';
      if (orgData?.targetAudience?.demographics?.geographic) {
        geographic = Array.isArray(orgData.targetAudience.demographics.geographic)
          ? orgData.targetAudience.demographics.geographic.join(', ')
          : orgData.targetAudience.demographics.geographic;
      }

      // Fallback to hardcoded prompt (Article default)
      prompt = `
      ${businessContextBlock}

      Write a detailed ${contentType.toLowerCase()} about: "${title}" in the category "${categoryName}".

      ${categoryDescription ? `Category Context: ${categoryDescription}` : ''}
      Tone: ${tone}
      Target Geographic Location: ${geographic}
      ${teaser ? `**Specific Instructions/Focus:** ${teaser}` : ''}
      ${tags && tags.length > 0 ? `**Target Keywords to Include:** ${tags.join(', ')}` : ''}

      ${orgData?.brandMessage ? `**Brand Message:** ${orgData.brandMessage}` : ''}
      ${orgData?.brandCompliance ? `**Compliance Guidelines:** ${orgData.brandCompliance}` : ''}

      IMPORTANT:
      - DO NOT include the title as a heading (H1 or H2). The title "${title}" will be added separately as front matter.
      - Start directly with an engaging introduction paragraph.
      - Use H2 (##) for section headings, H3 (###) for subsections.
      - Do not include any preambles like "Here is..." or "Sure...".
      - Use spelling, terminology, and cultural references appropriate for ${geographic} audience.
      - Format in clean Markdown.`;
    }

    console.log('[Gemini] 📤 Calling API with model:', modelVersion);
    console.log('[Gemini] 📝 Prompt length:', prompt.length, 'chars');

    // FIXED: Added timeout wrapper to prevent indefinite hangs
    const response = await withRetry(() => withTimeout(
      ai.models.generateContent({
        model: modelVersion,
        contents: prompt,
      }),
      60000 // 60 second timeout for content generation (longer than title generation)
    ));

    console.log('[Gemini] ✅ API response received');
    const rawContent = response.text || "Could not generate content.";
    console.log('[Gemini] 📄 Content generated:', rawContent.length, 'chars');
    let cleanedContent = stripPreamble(rawContent);
    // Strip title heading - title is stored in post.title, not in content body
    cleanedContent = stripTitleHeading(cleanedContent, title);
    console.log('[Gemini] ✨ Content cleaned (title stripped from body)');

    // Track usage
    if (organizationId && projectId && userId) {
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(rawContent);
      const totalTokens = inputTokens + outputTokens;

      await trackUsage(
        organizationId,
        projectId,
        userId,
        1, // 1 API call
        totalTokens,
        modelVersion
      );
    }

    return cleanedContent;
  } catch (error: any) {
    console.error("❌ [Gemini] Content Generation Error:", error);
    console.error("❌ [Gemini] Error details:", JSON.stringify(error, null, 2));

    // Check for timeout errors
    if (error?.message?.includes('timed out')) {
      const msg = 'Request timed out. The AI service is taking too long to respond. Please try again.';
      console.error(`❌ [Gemini] ${msg}`);
      throw new Error(msg);
    }

    // Check for quota errors
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      const msg = 'API quota exceeded. Please wait a few minutes and try again, or upgrade your Gemini API plan.';
      console.error(`❌ [Gemini] ${msg}`);
      throw new Error(msg);
    }

    if (error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('overloaded')) {
      const msg = 'The AI service is currently overloaded. Please wait a moment and try again.';
      console.error(`❌ [Gemini] ${msg}`);
      throw new Error(msg);
    }

    if (error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')) {
      const msg = 'API key permission denied. Please check your Gemini API key configuration.';
      console.error(`❌ [Gemini] ${msg}`);
      throw new Error(msg);
    }

    if (error?.message?.includes('404')) {
      const msg = 'AI model not found. Please check the model version in Admin settings.';
      console.error(`❌ [Gemini] ${msg}`);
      throw new Error(msg);
    }

    // Return mock content for other errors
    console.warn('⚠️ [Gemini] Returning mock content due to error');
    return `## ${title}\n\n**Introduction**\n- Brief overview...\n\n**Section 1**\n- Key point...\n\n(Mock Content due to generation error)`;
  }
};

export const getCategorySuggestions = async (categoryName: string): Promise<string[]> => {
  try {
    const ai = getClient();
    const adminConfig = await getAdminConfig();
    let prompt = '';

    if (adminConfig?.prompts?.[PromptType.CATEGORY_SUGGESTIONS]) {
      prompt = replacePromptVariables(adminConfig.prompts[PromptType.CATEGORY_SUGGESTIONS], {
        categoryName
      });
    } else {
      prompt = `Analyze the content category "${categoryName}" and suggest 3 quick improvements or sub-niches to make it more specific and engaging for an audience. Return as a JSON array of strings.`;
    }

    const response = await withRetry(() => withTimeout(
      ai.models.generateContent({
        model: 'gemini-2.0-flash', // Using 1.5-flash for suggestions
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }),
      60000 // 60 second timeout
    ));

    // Handle potentially malformed JSON
    try {
      return JSON.parse(response.text || '[]');
    } catch {
      const text = response.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { return []; }
      }
      return [];
    }
  } catch (error: any) {
    console.error("Error getting category suggestions", error);

    // Check for quota errors
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please wait a few minutes and try again.');
    }

    // Return fallback suggestions for other errors
    return [
      "Focus on current year trends",
      "Add a 'Beginner's Guide' sub-section",
      "Include case studies or real-world examples"
    ];
  }
};

export interface CategorySuggestion {
  name: string;
  description: string;
  reason: string;
}

export const suggestCategories = async (
  query: string,
  parentCategoryName?: string,
  organizationId?: string,
  projectId?: string,
  parentCategoryDescription?: string // NEW: Pass parent's description for context
): Promise<CategorySuggestion[]> => {
  try {
    const ai = getClient();
    const adminConfig = await getAdminConfig();
    let prompt = "";

    // Build comprehensive business context from project
    let fullContext = '';
    let existingCategoriesContext = '';

    if (organizationId && projectId) {
      try {
        // Fetch project AND existing categories for context
        const [projectDoc, categoriesSnap] = await Promise.all([
          getDoc(doc(db, `organizations/${organizationId}/projects`, projectId)),
          getDocs(collection(db, `organizations/${organizationId}/projects/${projectId}/categories`))
        ]);

        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          const bp = projectData.businessProfile;
          const contextParts: string[] = [];

          // ALWAYS include project name and description
          contextParts.push('**PROJECT CONTEXT**');
          contextParts.push(`Project Name: ${projectData.name}`);
          if (projectData.description) {
            contextParts.push(`Project Focus: ${projectData.description}`);
          }
          if (projectData.websiteUrl) {
            contextParts.push(`Website: ${projectData.websiteUrl}`);
          }

          // Add business profile if available
          if (bp) {
            contextParts.push('');
            contextParts.push('**BUSINESS CONTEXT**');
            if (bp.businessName) contextParts.push(`Business: ${bp.businessName}`);
            if (bp.businessSummary) contextParts.push(`About: ${bp.businessSummary}`);

            // Industry
            let industryStr = bp.industry?.primary || '';
            if (bp.industry?.secondary) industryStr += ` / ${bp.industry.secondary}`;
            if (bp.industry?.tertiary) industryStr += ` / ${bp.industry.tertiary}`;
            if (industryStr) contextParts.push(`Industry: ${industryStr}`);

            // Offerings
            if (bp.offerings?.categories?.length) {
              const offeringLabel = bp.offerings.type === 'products' ? 'Products' :
                bp.offerings.type === 'services' ? 'Services' : 'Offerings';
              contextParts.push(`${offeringLabel}: ${bp.offerings.categories.join(', ')}`);
            }

            // Unique Value
            if (bp.brandVoice?.uniqueSellingPoints?.length) {
              contextParts.push(`Value Proposition: ${bp.brandVoice.uniqueSellingPoints.join('. ')}`);
            }

            // Target Audience
            contextParts.push('');
            contextParts.push('**TARGET AUDIENCE**');
            if (bp.targetAudience?.primary) contextParts.push(`Primary: ${bp.targetAudience.primary}`);
            if (bp.targetAudience?.demographics) {
              const demo = bp.targetAudience.demographics;
              if (demo.ageRange || demo.income) {
                contextParts.push(`Demographics: ${demo.ageRange || 'All ages'}${demo.income ? `, ${demo.income}` : ''}`);
              }
            }
            if (bp.targetAudience?.painPoints?.length) {
              contextParts.push(`Pain Points: ${bp.targetAudience.painPoints.join('; ')}`);
            }

            // Brand Voice
            if (bp.brandVoice?.tone?.length || bp.contentStyle?.types?.length) {
              contextParts.push('');
              contextParts.push('**BRAND VOICE**');
              if (bp.brandVoice?.tone?.length) contextParts.push(`Tone: ${bp.brandVoice.tone.join(', ')}`);
              if (bp.contentStyle?.types?.length) contextParts.push(`Content Types: ${bp.contentStyle.types.join(', ')}`);
            }
          }

          fullContext = contextParts.join('\n');

          // Build existing categories context
          if (!categoriesSnap.empty) {
            const categories = categoriesSnap.docs.map(d => {
              const data = d.data();
              return `- ${data.name}${data.description ? `: ${data.description}` : ''}`;
            });
            if (categories.length > 0) {
              existingCategoriesContext = `\n**EXISTING CATEGORIES (for reference, don't duplicate):**\n${categories.slice(0, 10).join('\n')}`;
            }
          }
        }

        console.log('[Gemini] Category suggestion context:', fullContext.substring(0, 200) + '...');

      } catch (err) {
        console.warn('[Gemini] Could not fetch project context for categories:', err);
      }
    }

    if (adminConfig?.prompts?.[PromptType.CATEGORY_BREAKDOWN]) {
      // Use admin prompt template
      prompt = adminConfig.prompts[PromptType.CATEGORY_BREAKDOWN];

      // Simple variable replacement (Handlebars-like syntax in prompt)
      if (parentCategoryName) {
        prompt = prompt.replace('{{#if parentCategory}}', '');
        prompt = prompt.replace('{{/if}}', '');
        prompt = prompt.replace('{{else}}', '<!-- SKIP -->');
        prompt = prompt.replace('{{parentCategory}}', parentCategoryName);
        prompt = prompt.replace('{{query}}', query || '');
        // Remove the else block
        const skipStart = prompt.indexOf('<!-- SKIP -->');
        if (skipStart !== -1) {
          const skipEnd = prompt.indexOf('{{/if}}', skipStart);
          if (skipEnd !== -1) {
            prompt = prompt.substring(0, skipStart) + prompt.substring(skipEnd + 7);
          }
        }
      } else {
        // Remove if block, keep else block
        const ifStart = prompt.indexOf('{{#if parentCategory}}');
        const elsePos = prompt.indexOf('{{else}}');
        const ifEnd = prompt.indexOf('{{/if}}');
        if (ifStart !== -1 && elsePos !== -1 && ifEnd !== -1) {
          prompt = prompt.substring(0, ifStart) + prompt.substring(elsePos + 8, ifEnd) + prompt.substring(ifEnd + 7);
        }
        prompt = prompt.replace('{{query}}', query);
      }

      // Append context if available
      if (fullContext) {
        prompt = `${fullContext}${existingCategoriesContext}\n\n${prompt}`;
      }

      // Force description requirement even for admin prompts
      prompt += "\n\nIMPORTANT: You must provide a clear, specific description for each category explaining WHAT content belongs, WHO it helps, and WHY it matters to them.";
    } else {
      // Fallback prompt with comprehensive context
      if (parentCategoryName) {
        prompt = `You are an Editorial Director breaking down a content category into compelling subcategories.

${fullContext || 'No business context available - use the parent category name to infer the business domain.'}
${existingCategoriesContext}

**PARENT CATEGORY TO EXPAND**
└─ "${parentCategoryName}"
${parentCategoryDescription ? `   Vision: "${parentCategoryDescription}"` : ''}

---

**TASK:** Create 6 distinct subcategories that bring "${parentCategoryName}" to life.
${query ? `Focus specifically on: "${query}"` : ''}

**SUBCATEGORY REQUIREMENTS:**
1. Each subcategory must feel like a natural, exciting extension of the parent
2. Subcategories should address DISTINCT aspects - no overlap
3. Think: What specific content would make someone's eyes light up?
4. Mix practical guides with inspirational/storytelling angles

**DESCRIPTION REQUIREMENTS - THIS IS CRITICAL:**
Each description must be a compelling EDITORIAL BRIEF (3-4 sentences) that:
- Paints a vivid picture of what content belongs here
- Uses evocative, magazine-quality language that SELLS the category
- Includes specific content hooks, themes, and story angles
- Describes the reader transformation - what they'll discover, learn, or experience
- Makes a content creator EXCITED to write for this subcategory

**EXAMPLE GOOD DESCRIPTION:**
"Pre-ride fueling strategies and meal planning for peak performance. From race-day breakfast rituals to carb-loading timelines, this is the science of eating for endurance—made practical. Covers glycogen optimization, gut-friendly foods, hydration timing, and the meals elite cyclists swear by. For riders who want to start strong and finish stronger."

**EXAMPLE BAD DESCRIPTION:**
"Content about nutrition before rides." (too generic, no vision, doesn't inspire)

**RETURN FORMAT:** JSON array with:
- "name": Subcategory name (2-4 words, evocative)
- "description": Rich editorial brief (3-4 sentences - make it COMPELLING)
- "reason": Why this subcategory will captivate readers`;
      } else {
        prompt = `You are an Editorial Director creating compelling content categories for a media brand.

${fullContext || 'No business context available - ask for clarification about the business.'}
${existingCategoriesContext}

---

**TASK:** Create 6 distinct content categories that will excite readers and inspire great content.
${query ? `Focus on topics related to: "${query}"` : ''}

**CATEGORY REQUIREMENTS:**
1. Each category should feel like a gateway to exploration - not just a filing system
2. Categories must be specific to this business's world - no generic "Tips & Tricks"
3. Think editorially: what would make someone EXCITED to dive into this category?
4. Mix practical utility with storytelling potential

**DESCRIPTION REQUIREMENTS - THIS IS CRITICAL:**
Each description must be a compelling EDITORIAL BRIEF (3-4 sentences) that:
- Paints a vivid picture of what content belongs here
- Uses evocative, magazine-quality language
- Includes specific content angles, themes, and story hooks
- Mentions the TYPE of reader this serves and what transformation they'll experience
- Makes someone WANT to explore this category

**EXAMPLE GOOD DESCRIPTION:**
"Epic multi-day routes and weekend escapes across Britain's most dramatic landscapes. From coastal cliff paths to moorland climbs, canal towpaths to forest singletrack—each route framed as an experience, not just a ride. Features terrain insights, elevation profiles, seasonal timing, café stops, wild camping spots, and the 'type of rider' each adventure suits. Where bikepacking meets storytelling."

**EXAMPLE BAD DESCRIPTION:**
"Content about cycling routes in the UK." (too generic, no editorial vision, doesn't inspire)

**RETURN FORMAT:** JSON array of objects with:
- "name": Category name (2-4 words, evocative and specific)
- "description": Rich editorial brief (3-4 sentences - make it INSPIRING)
- "reason": Why this category will captivate the target audience`;
      }
    }

    const response = await withRetry(() => withTimeout(
      ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          }
        }
      }),
      60000 // 60 second timeout
    ));

    // Handle potentially malformed JSON
    console.log('[Gemini] Category suggestion raw response:', response.text?.substring(0, 500));
    try {
      const results = JSON.parse(response.text || '[]');
      console.log('[Gemini] Parsed categories:', results.length, 'items');
      return results.map((r: any) => ({
        name: r.name || 'Untitled Category',
        description: r.description || `Content related to ${r.name}`,
        reason: r.reason || 'Relevant to business context'
      }));
    } catch (parseError) {
      console.error('[Gemini] JSON parse error:', parseError);
      const text = response.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const fallbackResults = JSON.parse(match[0]);
          console.log('[Gemini] Fallback parsed:', fallbackResults.length, 'items');
          return fallbackResults;
        } catch {
          console.error('[Gemini] Fallback parse also failed');
          return [];
        }
      }
      console.error('[Gemini] No JSON array found in response');
      return [];
    }
  } catch (error: any) {
    console.error("Error generating category suggestions", error);

    // Check for specific error types and throw user-friendly messages
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please wait a few minutes and try again, or upgrade your Gemini API plan.');
    }

    if (error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')) {
      throw new Error('API key permission denied. Please check your Gemini API key configuration.');
    }

    if (error?.message?.includes('404')) {
      throw new Error('AI model not found. Please contact support.');
    }

    // Generic error - still throw it so UI can show the error
    throw new Error(error?.message || 'Failed to generate category suggestions. Please try again.');
  }
}

// ============================================
// BRAND RESEARCH
// ============================================

import { fetchWebsiteContent, extractTextContent } from './websiteAnalysisService';

export const fetchBrandInfo = async (
  websiteUrl: string,
  organizationId: string
): Promise<any> => {
  console.log(`[Gemini] Fetching brand info for: ${websiteUrl}`);
  const ai = getClient();

  // 1. Get Admin Config for Prompt
  let adminConfig: AdminConfig | null = null;
  try {
    const adminDoc = await getDoc(doc(db, 'adminConfig', 'prompts'));
    if (adminDoc.exists()) {
      adminConfig = adminDoc.data() as AdminConfig;
    }
  } catch (e) {
    console.warn('Could not fetch admin config, using defaults');
  }

  // 2. Fetch Website Content
  let websiteContent = '';
  try {
    const pageContent = await fetchWebsiteContent(websiteUrl);
    websiteContent = extractTextContent(pageContent.html);
    console.log(`[Gemini] Successfully fetched ${websiteContent.length} chars of content`);
  } catch (error) {
    console.warn('[Gemini] Could not fetch website content directly:', error);
    // We continue without content, letting the AI try to use its internal knowledge or give general advice
  }

  // 3. Construct Prompt
  let prompt = '';
  if (adminConfig?.prompts?.[PromptType.BRAND_RESEARCH]) {
    prompt = replacePromptVariables(adminConfig.prompts[PromptType.BRAND_RESEARCH], {
      websiteUrl
    });
  } else {
    prompt = `You are a Brand Analyst. Analyze the website ${websiteUrl} and extract brand information (Voice, Message, Audience, Colors, Compliance). Return as JSON.`;
  }

  // Append content if available
  if (websiteContent) {
    prompt += `\n\nHere is the text content extracted from the website:\n"""\n${websiteContent.substring(0, 15000)}\n"""\n\nBased ONLY on this content, extract the brand information.`;
  }

  // 4. Call AI
  try {
    const modelVersion = adminConfig?.modelVersion || 'gemini-2.5-flash';
    const response = await withRetry(() => withTimeout(
      ai.models.generateContent({
        model: modelVersion,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      }),
      45000
    ));

    const text = response.text || '{}';
    try {
      return JSON.parse(text);
    } catch (e) {
      // Try to find JSON block
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Invalid JSON response');
    }
  } catch (error) {
    console.error('[Gemini] Brand research failed:', error);
    throw error;
  }
};
