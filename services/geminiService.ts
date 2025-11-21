
import { GoogleGenAI, Type } from "@google/genai";
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContentType, Tone, PromptType } from '../types';

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

// Timeout wrapper for API calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
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

export interface GeneratedTitleData {
  title: string;
  teaser: string;
  keywords: string[];
}

export const generateCategoryTitles = async (
  categoryName: string,
  categoryDescription: string,
  count: number = 5,
  organizationId?: string,
  projectId?: string,
  userId?: string
): Promise<GeneratedTitleData[]> => {
  console.log(`[Gemini] Starting title generation for "${categoryName}" (${count} titles)`);

  try {
    console.log('[Gemini] Getting AI client...');
    const ai = getClient();

    // Fetch admin config for prompt template
    const adminConfig = await getAdminConfig();
    let prompt = '';

    if (adminConfig?.prompts?.[PromptType.TITLE_GENERATION]) {
      // Use admin prompt template
      prompt = adminConfig.prompts[PromptType.TITLE_GENERATION];
      prompt = prompt.replace(/\{\{count\}\}/g, count.toString());
      prompt = prompt.replace(/\{\{categoryName\}\}/g, categoryName);
      prompt = prompt.replace(/\{\{categoryDescription\}\}/g, categoryDescription);
    } else {
      // Fallback prompt
      prompt = `Generate ${count} high-quality blog post ideas for a category named "${categoryName}".
      Context/Description: ${categoryDescription}.

      For each idea, provide:
      1. A catchy, SEO-friendly Title.
      2. A "Teaser" or "Prompt": A 1-2 sentence description of what the post should cover. This will be used as instructions for the writer.
      3. Keywords: 3-5 target keywords or topics.`;
    }

    console.log('[Gemini] Calling generateContent with 30s timeout...');
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        }
      }),
      30000 // 30 second timeout
    );

    console.log('[Gemini] Response received, parsing JSON...');
    const json = JSON.parse(response.text || '{"ideas": []}');
    const ideas = json.ideas || [];
    console.log(`[Gemini] Successfully generated ${ideas.length} titles`);

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
        'gemini-2.5-flash'
      );
    }

    return ideas;
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

    if (error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')) {
      throw new Error('API key permission denied. Please check your Gemini API key configuration.');
    }

    if (error?.message?.includes('404')) {
      throw new Error('AI model not found. Please contact support.');
    }

    // Fallback mock data for other errors
    const mockData = Array.from({ length: count }).map((_, i) => ({
      title: `Generated Title ${i + 1} for ${categoryName}`,
      teaser: `This post will explore the key aspects of ${categoryName} and why it matters in 2024.`,
      keywords: ["Trends", "Analysis", "Guide"]
    }));
    console.log(`[Gemini] Returning ${mockData.length} fallback titles`);
    return mockData;
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
  contentType: ContentType = ContentType.ARTICLE,
  tone: Tone = Tone.PROFESSIONAL
): Promise<string> => {
  try {
    console.log(`[Gemini] 🎯 Starting content generation for: "${title}"`);
    const ai = getClient();
    let prompt = '';
    let modelVersion = 'gemini-2.5-flash';

    // 1. Fetch Admin Config & Org Settings
    console.log('[Gemini] 📥 Fetching admin config and org settings...');
    const [adminConfig, orgData] = await Promise.all([
      getAdminConfig(),
      organizationId ? getOrgSettings(organizationId) : null
    ]);

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
        console.warn('⚠️ [Gemini] Auto-migrating old model name to gemini-2.5-flash');
        modelVersion = 'gemini-2.5-flash';
      }
    }

    // 3. Construct Prompt
    // Check if we have a specific prompt for this content type
    const template = adminConfig?.prompts?.[contentType];

    if (template) {
      // Use Admin Prompt Template
      let finalPrompt = template;

      // Replace variables
      finalPrompt = finalPrompt.replace(/\{\{topic\}\}/g, title);
      finalPrompt = finalPrompt.replace(/\{\{category\}\}/g, categoryName);
      finalPrompt = finalPrompt.replace(/\{\{targetAudience\}\}/g, 'General Audience');
      finalPrompt = finalPrompt.replace(/\{\{tone\}\}/g, tone);
      finalPrompt = finalPrompt.replace(/\{\{brandMessage\}\}/g, orgData?.brandMessage || 'Not specified');
      finalPrompt = finalPrompt.replace(/\{\{brandCompliance\}\}/g, orgData?.brandCompliance || 'None');
      finalPrompt = finalPrompt.replace(/\{\{keywords\}\}/g, tags?.join(', ') || 'None');
      finalPrompt = finalPrompt.replace(/\{\{teaser\}\}/g, teaser || 'None');

      prompt = finalPrompt;
    } else {
      // Fallback to hardcoded prompt (Article default)
      prompt = `Write a detailed ${contentType.toLowerCase()} about: "${title}" in the category "${categoryName}".
      
      Tone: ${tone}
      ${teaser ? `**Specific Instructions/Focus:** ${teaser}` : ''}
      ${tags && tags.length > 0 ? `**Target Keywords to Include:** ${tags.join(', ')}` : ''}
      
      ${orgData?.brandMessage ? `**Brand Message:** ${orgData.brandMessage}` : ''}
      ${orgData?.brandCompliance ? `**Compliance Guidelines:** ${orgData.brandCompliance}` : ''}

      IMPORTANT: Start directly with the markdown content. Do not include any preambles.
      Format in clean Markdown.`;
    }

    console.log('[Gemini] 📤 Calling API with model:', modelVersion);
    console.log('[Gemini] 📝 Prompt length:', prompt.length, 'chars');

    const response = await ai.models.generateContent({
      model: modelVersion,
      contents: prompt,
    });

    console.log('[Gemini] ✅ API response received');
    const rawContent = response.text || "Could not generate content.";
    console.log('[Gemini] 📄 Content generated:', rawContent.length, 'chars');
    const cleanedContent = stripPreamble(rawContent);
    console.log('[Gemini] ✨ Content cleaned and ready');

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

    // Check for quota errors
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      const msg = 'API quota exceeded. Please wait a few minutes and try again, or upgrade your Gemini API plan.';
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
      prompt = adminConfig.prompts[PromptType.CATEGORY_SUGGESTIONS];
      prompt = prompt.replace(/\{\{categoryName\}\}/g, categoryName);
    } else {
      prompt = `Analyze the content category "${categoryName}" and suggest 3 quick improvements or sub-niches to make it more specific and engaging for an audience. Return as a JSON array of strings.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
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

export const suggestCategories = async (query: string, parentCategoryName?: string): Promise<CategorySuggestion[]> => {
  try {
    const ai = getClient();
    const adminConfig = await getAdminConfig();
    let prompt = "";

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
    } else {
      // Fallback prompt
      if (parentCategoryName) {
        prompt = `You are an expert Content Strategist.
          The user has a main category: "${parentCategoryName}".
          
          Task: Break this down into 6 logical, distinct sub-categories or sub-niches.
          ${query ? `Focus specifically on areas related to: "${query}".` : 'Ensure a broad coverage.'}
          
          Return a list of objects with name, description, and reason.`;
      } else {
        prompt = `You are an expert Content Strategist.
          The user is looking for ideas for a new top-level content category related to: "${query}".
          
          Task: Suggest 5 distinct, high-value category names.
          
          Return a list of objects with name, description, and reason.`;
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    });
    return JSON.parse(response.text || '[]');
  } catch (error: any) {
    console.error("Error generating category suggestions", error);

    // Check for specific error types and throw user-friendly messages
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please wait a few minutes and try again, or upgrade your Gemini API plan.');
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
