/**
 * Website Analysis Service
 *
 * Handles URL validation, website content fetching, and AI-powered business profile generation
 * for the onboarding flow.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import {
  BusinessProfile,
  ProjectSuggestion,
  CategorySuggestion,
  DemandLevel,
} from '../types';

// ============================================================================
// CLIENT & UTILITIES
// ============================================================================

const getClient = () => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
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

// Strip emojis and other unwanted characters from AI responses
const sanitizeText = (text: string): string => {
  if (!text) return text;
  // Remove emojis, pictographs, symbols, and other non-text characters
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{231A}-\u{231B}]/gu, '')   // Watch, Hourglass
    .replace(/[\u{23E9}-\u{23F3}]/gu, '')   // Various tech symbols
    .replace(/[\u{23F8}-\u{23FA}]/gu, '')   // Media controls
    .replace(/[\u{25AA}-\u{25AB}]/gu, '')   // Squares
    .replace(/[\u{25B6}]/gu, '')            // Play button
    .replace(/[\u{25C0}]/gu, '')            // Reverse button
    .replace(/[\u{25FB}-\u{25FE}]/gu, '')   // Squares
    .replace(/[\u{2B05}-\u{2B07}]/gu, '')   // Arrows
    .replace(/[\u{2B1B}-\u{2B1C}]/gu, '')   // Squares
    .replace(/[\u{2B50}]/gu, '')            // Star
    .replace(/[\u{2B55}]/gu, '')            // Circle
    .replace(/[\u{3030}]/gu, '')            // Wavy dash
    .replace(/[\u{303D}]/gu, '')            // Part alternation mark
    .replace(/[\u{3297}]/gu, '')            // Circled Ideograph Congratulation
    .replace(/[\u{3299}]/gu, '')            // Circled Ideograph Secret
    .trim();
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

    console.warn(`⚠️ [WebsiteAnalysis] Request failed. Retrying in ${baseDelay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    return withRetry(fn, retries - 1, baseDelay * 2);
  }
};
// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// URL VALIDATION
// ============================================================================

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl: string;
  error?: string;
}

export function validateUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, normalizedUrl: '', error: 'Please enter a URL' };
  }

  let normalizedUrl = url.trim();

  // Add https:// if no protocol specified
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);

    // Must have a valid hostname
    if (!parsed.hostname || parsed.hostname.length < 4) {
      return { valid: false, normalizedUrl: '', error: 'Invalid domain name' };
    }

    // Must have a proper TLD (at least one dot)
    if (!parsed.hostname.includes('.')) {
      return { valid: false, normalizedUrl: '', error: 'Please enter a complete URL (e.g., example.com)' };
    }

    // Block localhost and private IPs
    if (parsed.hostname === 'localhost' ||
      parsed.hostname.startsWith('192.168.') ||
      parsed.hostname.startsWith('10.') ||
      parsed.hostname === '127.0.0.1') {
      return { valid: false, normalizedUrl: '', error: 'Cannot analyze local or private URLs' };
    }

    return { valid: true, normalizedUrl: parsed.href };
  } catch (e) {
    return { valid: false, normalizedUrl: '', error: 'Invalid URL format' };
  }
}

// ============================================================================
// WEBSITE CONTENT FETCHING
// ============================================================================

export interface PageContent {
  html: string;
  title: string;
  metaDescription: string;
  url: string;
  fetchedAt: Date;
}

export async function fetchWebsiteContent(url: string): Promise<PageContent> {
  console.log(`[WebsiteAnalysis] Fetching content from: ${url}`);

  // Try Cloud Function first, fall back to CORS proxy for development
  try {
    const fetchWebsiteFn = httpsCallable<{ url: string }, { success: boolean; html: string; finalUrl: string }>(
      functions,
      'fetchWebsite'
    );

    // Skip Cloud Function on localhost to avoid CORS errors (unless using emulator)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      throw new Error('Skipping Cloud Function on localhost (CORS)');
    }

    const result = await withTimeout(fetchWebsiteFn({ url }), 20000);

    if (!result.data.success) {
      throw new Error('Failed to fetch website');
    }

    const html = result.data.html;
    const finalUrl = result.data.finalUrl || url;

    return extractPageContent(html, finalUrl);
  } catch (error: any) {
    console.warn('[WebsiteAnalysis] Cloud Function failed, trying CORS proxy fallback:', error.message);

    // Fallback: Use a CORS proxy for development
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return extractPageContent(html, url);
    } catch (fallbackError: any) {
      console.error('[WebsiteAnalysis] CORS proxy fallback also failed:', fallbackError);

      if (fallbackError.name === 'AbortError') {
        throw new Error('Website took too long to respond. Please try again.');
      }
      throw new Error('Could not reach this website. Please check the URL and try again.');
    }
  }
}

// Helper to extract page content from HTML
function extractPageContent(html: string, url: string): PageContent {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const metaDescription = metaMatch ? metaMatch[1].trim() : '';

  console.log(`[WebsiteAnalysis] Fetched ${html.length} chars, title: "${title.substring(0, 50)}..."`);

  return {
    html,
    title,
    metaDescription,
    url,
    fetchedAt: new Date(),
  };
}

// ============================================================================
// TEXT EXTRACTION
// ============================================================================

export function extractTextContent(html: string): string {
  // Remove scripts, styles, and comments
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ');

  // Extract headings with markers
  const headings: string[] = [];
  const headingMatches = text.matchAll(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi);
  for (const match of headingMatches) {
    if (match[1].trim()) {
      headings.push(match[1].trim());
    }
  }

  // Extract paragraphs
  const paragraphs: string[] = [];
  const pMatches = text.matchAll(/<p[^>]*>([^<]*(?:<[^\/p][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/p>/gi);
  for (const match of pMatches) {
    const cleaned = match[1].replace(/<[^>]+>/g, ' ').trim();
    if (cleaned.length > 20) {
      paragraphs.push(cleaned);
    }
  }

  // Extract list items
  const listItems: string[] = [];
  const liMatches = text.matchAll(/<li[^>]*>([^<]+)<\/li>/gi);
  for (const match of liMatches) {
    if (match[1].trim().length > 5) {
      listItems.push(match[1].trim());
    }
  }

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Compose final text with structure
  const structured = [
    '## HEADINGS:',
    headings.slice(0, 20).join('\n'),
    '',
    '## KEY PARAGRAPHS:',
    paragraphs.slice(0, 15).join('\n\n'),
    '',
    '## LIST ITEMS:',
    listItems.slice(0, 30).join('\n'),
    '',
    '## FULL TEXT EXCERPT:',
    text.substring(0, 5000),
  ].join('\n');

  return structured;
}

// ============================================================================
// AI-POWERED BUSINESS PROFILE GENERATION
// ============================================================================

export async function analyzeWebsiteWithAI(
  url: string,
  pageContent: PageContent,
  extractedText: string,
  onProgress?: (stage: string, percent: number) => void
): Promise<BusinessProfile> {
  console.log('[WebsiteAnalysis] Starting AI analysis...');

  const ai = getClient();

  const prompt = `You are an expert business analyst and content strategist.

Analyze this website and extract a comprehensive business profile.

**Website URL:** ${url}
**Page Title:** ${pageContent.title}
**Meta Description:** ${pageContent.metaDescription}

**Extracted Content:**
${extractedText.substring(0, 8000)}

---

CRITICAL OUTPUT RULES:
- DO NOT use emojis in any response
- Keep all text concise and professional
- Use only plain English text
- Each field should be 1-2 sentences maximum

Based on this content, provide a detailed business profile with the following structure:

1. **Industry**: Identify the primary, secondary, and tertiary industry classifications. Rate your confidence 0-100. Keep each classification to 3-5 words max.

2. **Target Audience**:
   - Primary audience description (1 sentence)
   - Secondary audience (if applicable, 1 sentence)
   - Demographics: age range, income level, geographic focus

3. **Offerings**:
   - Type: 'products', 'services', or 'both'
   - List the main product/service categories (up to 8, short names only)

4. **Brand Voice**:
   - Tone: List 2-3 tone descriptors (e.g., "professional", "friendly", "authoritative")
   - Style: One sentence describing the writing style
   - Personality: List 2-3 brand personality traits

5. **Content Style**:
   - Types: What kinds of content they produce (e.g., "blog posts", "case studies", "tutorials")
   - Average Length: 'short', 'medium', or 'long'
   - Technical Level: 'beginner', 'intermediate', or 'advanced'

6. **Opportunity Score**:
   - Overall score 0-100 (how well positioned they are for AI-optimized content)
   - Content Gaps: Estimated number of missing content opportunities
   - Potential Traffic: Estimated monthly traffic potential (e.g., "5,000-10,000")

Be specific and base your analysis on the actual content provided. NO EMOJIS.`;

  onProgress?.('Detecting brand voice', 45);

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
              industry: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  tertiary: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                }
              },
              targetAudience: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  demographics: {
                    type: Type.OBJECT,
                    properties: {
                      ageRange: { type: Type.STRING },
                      income: { type: Type.STRING },
                      geographic: { type: Type.ARRAY, items: { type: Type.STRING } },
                    }
                  }
                }
              },
              offerings: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                }
              },
              brandVoice: {
                type: Type.OBJECT,
                properties: {
                  tone: { type: Type.ARRAY, items: { type: Type.STRING } },
                  style: { type: Type.STRING },
                  personality: { type: Type.ARRAY, items: { type: Type.STRING } },
                }
              },
              contentStyle: {
                type: Type.OBJECT,
                properties: {
                  types: { type: Type.ARRAY, items: { type: Type.STRING } },
                  averageLength: { type: Type.STRING },
                  technicalLevel: { type: Type.STRING },
                }
              },
              opportunityScore: {
                type: Type.OBJECT,
                properties: {
                  overall: { type: Type.NUMBER },
                  contentGaps: { type: Type.NUMBER },
                  potentialTraffic: { type: Type.STRING },
                }
              },
            }
          }
        }
      }),
      45000 // 45 second timeout
    ));

    onProgress?.('Calculating opportunity score', 80);

    // Handle potentially malformed JSON from AI
    let data: any;
    try {
      data = JSON.parse(response.text || '{}');
    } catch (parseError) {
      console.warn('[WebsiteAnalysis] Profile JSON parse failed, attempting to fix...');
      const text = response.text || '';
      // Try to find JSON object in response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {
          console.error('[WebsiteAnalysis] Could not parse profile JSON');
          data = {};
        }
      } else {
        data = {};
      }
    }

    const profile: BusinessProfile = {
      id: generateId(),
      websiteUrl: url,
      analyzedAt: Timestamp.now(),
      industry: {
        primary: sanitizeText(data.industry?.primary) || 'Unknown',
        secondary: sanitizeText(data.industry?.secondary) || '',
        tertiary: sanitizeText(data.industry?.tertiary) || '',
        confidence: data.industry?.confidence || 50,
      },
      targetAudience: {
        primary: sanitizeText(data.targetAudience?.primary) || 'General audience',
        secondary: sanitizeText(data.targetAudience?.secondary),
        demographics: {
          ageRange: sanitizeText(data.targetAudience?.demographics?.ageRange) || 'All ages',
          income: sanitizeText(data.targetAudience?.demographics?.income) || 'All income levels',
          geographic: (data.targetAudience?.demographics?.geographic || ['Global']).map((g: string) => sanitizeText(g)),
        },
      },
      offerings: {
        type: (data.offerings?.type as 'products' | 'services' | 'both') || 'both',
        categories: (data.offerings?.categories || []).map((c: string) => sanitizeText(c)),
      },
      brandVoice: {
        tone: (data.brandVoice?.tone || ['Professional']).map((t: string) => sanitizeText(t)),
        style: sanitizeText(data.brandVoice?.style) || 'Clear and informative',
        personality: (data.brandVoice?.personality || ['Knowledgeable']).map((p: string) => sanitizeText(p)),
      },
      contentStyle: {
        types: (data.contentStyle?.types || ['Articles']).map((t: string) => sanitizeText(t)),
        averageLength: (data.contentStyle?.averageLength as 'short' | 'medium' | 'long') || 'medium',
        technicalLevel: (data.contentStyle?.technicalLevel as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
      },
      opportunityScore: {
        overall: data.opportunityScore?.overall || 65,
        contentGaps: data.opportunityScore?.contentGaps || 100,
        potentialTraffic: sanitizeText(data.opportunityScore?.potentialTraffic) || '1,000-5,000',
      },
    };

    onProgress?.('Analysis complete', 100);
    console.log('[WebsiteAnalysis] Profile generated successfully');

    return profile;
  } catch (error: any) {
    console.error('[WebsiteAnalysis] AI analysis failed:', error);

    if (error?.message?.includes('timed out')) {
      throw new Error('Analysis took too long. Please try again.');
    }
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please wait a few minutes and try again.');
    }

    throw new Error('Failed to analyze website. Please try again.');
  }
}

// ============================================================================
// FULL WEBSITE ANALYSIS PIPELINE
// ============================================================================

export async function analyzeWebsite(
  url: string,
  onProgress?: (stage: string, percent: number) => void
): Promise<BusinessProfile> {
  // Stage 1: Validate URL
  onProgress?.('Validating URL', 5);
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid URL');
  }

  // Stage 2: Fetch website
  onProgress?.('Scanning page structure', 15);
  const pageContent = await fetchWebsiteContent(validation.normalizedUrl);

  // Stage 3: Extract text
  onProgress?.('Analyzing content patterns', 30);
  const extractedText = extractTextContent(pageContent.html);

  // Stage 4-6: AI Analysis
  const profile = await analyzeWebsiteWithAI(
    validation.normalizedUrl,
    pageContent,
    extractedText,
    onProgress
  );

  return profile;
}

// ============================================================================
// PROJECT SUGGESTIONS
// ============================================================================

export async function generateProjectSuggestions(
  profile: BusinessProfile
): Promise<ProjectSuggestion[]> {
  console.log('[WebsiteAnalysis] Generating project suggestions...');

  const ai = getClient();

  const prompt = `You are an Editorial Director creating compelling content verticals for a media brand.

**Business Profile:**
- Industry: ${profile.industry.primary} / ${profile.industry.secondary}
- Offerings: ${profile.offerings.categories.join(', ')}
- Target Audience: ${profile.targetAudience.primary}
- Content Style: ${profile.contentStyle.types.join(', ')}

**TASK:** Create 3 distinct content project verticals that will excite and inspire the content team.

For each project, provide:

1. **name**: A SHORT evocative name (EXACTLY 2-3 words, max 30 characters)
   - Good: "Trail Guides", "Gear Lab", "Ride Stories"
   - Bad: "Cycling Content" (too generic), "Everything About Bikes" (too long)

2. **icon**: An emoji that captures the project's spirit

3. **description**: THIS IS CRITICAL - Write a compelling EDITORIAL VISION (3-4 sentences) that:
   - Sells the VALUE and excitement of this content vertical
   - Paints a vivid picture of what readers will experience
   - Uses evocative, magazine-quality language
   - Explains the unique angle that makes this project special
   - Makes someone WANT to create content for this vertical

   EXAMPLE GOOD DESCRIPTION:
   "Epic multi-day routes and weekend escapes across dramatic landscapes. Each adventure framed as an experience—not just a ride—with terrain insights, seasonal timing, hidden gems, and the 'type of rider' each journey suits. Where exploration meets storytelling, and every route feels like a chapter in a larger adventure."

   EXAMPLE BAD DESCRIPTION:
   "Content about cycling routes." (too generic, no vision, doesn't inspire)

4. **coverage**: Specific themes and content types this vertical encompasses

5. **estimatedOpportunities**: Realistic number of content pieces (50-300)

Make each project DISTINCTLY different in tone and purpose. One might be practical/educational, another inspirational/storytelling, another community-focused.`;

  try {
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
                icon: { type: Type.STRING },
                description: { type: Type.STRING },
                coverage: { type: Type.STRING },
                estimatedOpportunities: { type: Type.NUMBER },
              }
            }
          }
        }
      }),
      30000
    ));

    // Handle potentially malformed JSON from AI
    let data: any[] = [];
    const responseText = response.text || '';

    try {
      data = JSON.parse(responseText);
    } catch {
      // Try to extract JSON array from response
      const match = responseText.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {
          console.warn('[WebsiteAnalysis] Could not parse project JSON, using fallback');
        }
      }
    }

    // Ensure data is an array with items
    if (!Array.isArray(data) || data.length === 0) {
      // Return fallback immediately if no valid data
      throw new Error('No valid project data');
    }

    return data.map((item: any, index: number) => {
      // Validate and clean project name - max 30 chars, no comma-separated lists
      let name = item.name || `Project ${index + 1}`;
      // If name contains commas (AI returned a list), take only the first item
      if (name.includes(',')) {
        name = name.split(',')[0].trim();
      }
      // Truncate to 30 characters max
      if (name.length > 30) {
        name = name.substring(0, 30).trim();
      }

      return {
        id: generateId(),
        name,
        icon: item.icon || '📁',
        description: item.description || '',
        coverage: item.coverage || '',
        estimatedOpportunities: item.estimatedOpportunities || 50,
        selected: index === 0, // First one selected by default
      };
    });
  } catch (error: any) {
    console.error('[WebsiteAnalysis] Project suggestions failed:', error);

    // Return fallback suggestions based on profile
    return [
      {
        id: generateId(),
        name: `${profile.industry.primary} Content`,
        icon: '📚',
        description: `Core content about ${profile.industry.primary.toLowerCase()}`,
        coverage: profile.offerings.categories.slice(0, 3).join(', '),
        estimatedOpportunities: Math.round(profile.opportunityScore.contentGaps * 0.5),
        selected: true,
      },
      {
        id: generateId(),
        name: 'Customer Education',
        icon: '🎓',
        description: 'Educational content for your target audience',
        coverage: 'How-to guides, tutorials, FAQs',
        estimatedOpportunities: Math.round(profile.opportunityScore.contentGaps * 0.3),
        selected: false,
      },
      {
        id: generateId(),
        name: 'Industry Insights',
        icon: '💡',
        description: 'Thought leadership and industry analysis',
        coverage: 'Trends, news, expert commentary',
        estimatedOpportunities: Math.round(profile.opportunityScore.contentGaps * 0.2),
        selected: false,
      },
    ];
  }
}

// ============================================================================
// CATEGORY SUGGESTIONS FOR ONBOARDING
// ============================================================================

function getDemandLevel(score: number): DemandLevel {
  if (score >= 80) return 'Very High';
  if (score >= 65) return 'High';
  if (score >= 50) return 'Medium-High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export async function generateOnboardingCategories(
  profile: BusinessProfile,
  projectName: string,
  count: number = 5
): Promise<CategorySuggestion[]> {
  console.log(`[WebsiteAnalysis] Generating ${count} categories for project: ${projectName}`);

  const ai = getClient();

  // Build comprehensive business context
  const businessContext = `**BUSINESS CONTEXT**
Business: ${profile.businessName || projectName}
${profile.businessSummary ? `About: ${profile.businessSummary}` : ''}
Industry: ${profile.industry.primary}${profile.industry.secondary ? ` / ${profile.industry.secondary}` : ''}${profile.industry.tertiary ? ` / ${profile.industry.tertiary}` : ''}
${profile.offerings.type === 'products' ? 'Products' : profile.offerings.type === 'services' ? 'Services' : 'Offerings'}: ${profile.offerings.categories.join(', ')}
${profile.brandVoice?.uniqueSellingPoints?.length ? `Value Proposition: ${profile.brandVoice.uniqueSellingPoints.join('. ')}` : ''}

**TARGET AUDIENCE**
Primary: ${profile.targetAudience.primary}
Demographics: ${profile.targetAudience.demographics.ageRange || 'All ages'}${profile.targetAudience.demographics.income ? `, ${profile.targetAudience.demographics.income}` : ''}
${profile.targetAudience.demographics.geographic?.length ? `Location: ${profile.targetAudience.demographics.geographic.join(', ')}` : ''}
${profile.targetAudience.painPoints?.length ? `Pain Points: ${profile.targetAudience.painPoints.join('; ')}` : ''}

**BRAND VOICE**
Tone: ${profile.brandVoice?.tone?.join(', ') || 'Professional'}
Content Types: ${profile.contentStyle?.types?.join(', ') || 'Educational articles'}`;

  const prompt = `You are an Editorial Director creating compelling content categories for a brand's content channel.

${businessContext}

**PROJECT:** ${projectName}

---

**TASK:** Create exactly ${count} distinct content categories that will excite readers and inspire great content.

**CATEGORY REQUIREMENTS:**
1. Each category should feel like a gateway to exploration - not just a filing system
2. Categories MUST be specific to this business's world - no generic "Tips & Tricks" or "Industry Basics"
3. Think editorially: what would make someone EXCITED to dive into this category?
4. Mix practical utility with storytelling potential
5. Categories should be topics that AI assistants (ChatGPT, Claude, Gemini) frequently answer questions about

**DESCRIPTION REQUIREMENTS - THIS IS CRITICAL:**
Each description must be a compelling EDITORIAL BRIEF (3-4 sentences) that:
- Paints a vivid picture of what content belongs here
- Uses evocative, magazine-quality language that SELLS the category
- Includes specific content angles, themes, and story hooks
- Mentions the TYPE of reader this serves and what transformation they'll experience
- Makes someone WANT to explore this category

**EXAMPLE GOOD DESCRIPTION:**
"Epic multi-day routes and weekend escapes across dramatic landscapes. From coastal cliff paths to moorland climbs, canal towpaths to forest singletrack—each route framed as an experience, not just a ride. Features terrain insights, elevation profiles, seasonal timing, café stops, and wild camping spots. Where adventure meets storytelling."

**EXAMPLE BAD DESCRIPTION:**
"Content about cycling routes." (too generic, no editorial vision, doesn't inspire)

For each category, provide:
- name: A clear, evocative category name (2-4 words)
- description: Rich editorial brief (3-4 sentences - make it COMPELLING)
- demandScore: Estimated search demand 0-100 (be realistic based on topic popularity)
- targetMatchScore: How well this matches the target audience 0-100
- estimatedArticles: Number of potential articles (10-50)
- reasoning: Why this category will captivate the target audience for THIS specific business`;

  try {
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
                demandScore: { type: Type.NUMBER },
                targetMatchScore: { type: Type.NUMBER },
                estimatedArticles: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              }
            }
          }
        }
      }),
      60000 // 60 second timeout for category generation
    ));

    // Handle potentially malformed JSON from AI
    let data: any[];
    const responseText = response.text || '';
    console.log('[WebsiteAnalysis] Raw category response:', responseText.substring(0, 500));

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('[WebsiteAnalysis] Category JSON parse failed, attempting to fix...');
      // Try to extract JSON array from response
      const match = responseText.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {
          console.warn('[WebsiteAnalysis] Could not parse extracted JSON, using fallback categories');
          return generateFallbackCategories(profile, projectName, count);
        }
      } else {
        console.warn('[WebsiteAnalysis] No JSON array found, using fallback categories');
        return generateFallbackCategories(profile, projectName, count);
      }
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[WebsiteAnalysis] Empty or invalid data array, using fallback categories');
      return generateFallbackCategories(profile, projectName, count);
    }

    return data.map((item: any) => {
      const demandScore = item.demandScore || 50;
      const targetMatchScore = item.targetMatchScore || 70;
      return {
        id: generateId(),
        name: item.name || 'Unnamed Category',
        description: item.description || '',
        demandScore,
        demandLevel: getDemandLevel(demandScore),
        targetMatchScore,
        audienceMatch: targetMatchScore >= 70 ? 'high' : targetMatchScore >= 40 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
        competitionLevel: demandScore >= 70 ? 'high' : demandScore >= 40 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
        estimatedArticles: item.estimatedArticles || 15,
        reasoning: item.reasoning,
        selected: true, // All selected by default
        isUserAdded: false,
      };
    });
  } catch (error: any) {
    console.error('[WebsiteAnalysis] Category generation failed:', error);
    console.warn('[WebsiteAnalysis] Using fallback categories due to error');
    return generateFallbackCategories(profile, projectName, count);
  }
}

// Generate fallback categories based on business profile
function generateFallbackCategories(
  profile: BusinessProfile,
  projectName: string,
  count: number
): CategorySuggestion[] {
  console.log('[WebsiteAnalysis] Generating fallback categories for:', projectName);

  const industry = profile.industry.primary || 'Business';
  const offerings = profile.offerings.categories || [];

  // Base categories with editorial brief style descriptions
  const baseCategories = [
    {
      name: `${industry} Essentials`,
      description: `The foundation every ${industry.toLowerCase()} enthusiast needs. From core concepts to common pitfalls, this is where knowledge begins—packed with clear explanations, practical examples, and the fundamentals that separate amateurs from experts. Perfect for newcomers ready to build confidence fast.`,
      demandScore: 75,
      estimatedArticles: 25,
    },
    {
      name: 'Step-by-Step Guides',
      description: `Hands-on tutorials that take you from start to finish with nothing left to chance. Each guide breaks down complex processes into actionable steps, complete with tips from seasoned practitioners. For those who learn by doing—and want to get it right the first time.`,
      demandScore: 85,
      estimatedArticles: 30,
    },
    {
      name: 'Expert Playbooks',
      description: `Battle-tested strategies and insider techniques from those who've been there. This is where theory meets practice—proven frameworks, real-world case studies, and the hard-won wisdom that only comes from experience. Elevate your game with the playbook the pros use.`,
      demandScore: 70,
      estimatedArticles: 20,
    },
    {
      name: 'Quick Answers',
      description: `The questions everyone asks—answered clearly and completely. No fluff, no jargon, just straight answers to the common (and not-so-common) questions that keep people up at night. Your go-to resource when you need answers fast.`,
      demandScore: 80,
      estimatedArticles: 35,
    },
    {
      name: `What's Next in ${industry}`,
      description: `Where ${industry.toLowerCase()} is heading—and how to stay ahead of the curve. From emerging technologies to shifting consumer expectations, this is your window into tomorrow. For forward-thinkers who want to lead, not follow.`,
      demandScore: 65,
      estimatedArticles: 15,
    },
  ];

  // Add offering-specific categories with dynamic editorial descriptions
  const offeringCategories = offerings.slice(0, 3).map((offering, index) => ({
    name: offering,
    description: `Deep dives into everything ${offering.toLowerCase()}—from fundamentals to advanced techniques. Discover what sets great ${offering.toLowerCase()} apart, explore real-world applications, and unlock insights that transform how you think about this space. For anyone serious about mastering ${offering.toLowerCase()}.`,
    demandScore: 70 + Math.floor(Math.random() * 20),
    estimatedArticles: 15 + Math.floor(Math.random() * 20),
  }));

  // Combine and take requested count
  const allCategories = [...offeringCategories, ...baseCategories];

  return allCategories.slice(0, count).map((cat, index) => {
    const targetMatchScore = 70 + Math.floor(Math.random() * 20);
    return {
      id: generateId(),
      name: cat.name,
      description: cat.description,
      demandScore: cat.demandScore,
      demandLevel: getDemandLevel(cat.demandScore),
      targetMatchScore,
      audienceMatch: targetMatchScore >= 70 ? 'high' : targetMatchScore >= 40 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
      competitionLevel: cat.demandScore >= 70 ? 'high' : cat.demandScore >= 40 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
      estimatedArticles: cat.estimatedArticles,
      reasoning: `This category aligns with ${industry} industry needs and audience interests.`,
      selected: true,
      isUserAdded: false,
    };
  });
}

// ============================================================================
// DEMO ARTICLE GENERATION
// ============================================================================

export interface DemoArticle {
  title: string;
  preview: string;
  outline: string[];
  topicSuggestions: string[];
}

export async function generateDemoArticle(
  profile: BusinessProfile,
  topic?: string
): Promise<DemoArticle> {
  console.log('[WebsiteAnalysis] Generating demo article...');

  const ai = getClient();

  const defaultTopic = profile.offerings.categories[0] || profile.industry.primary;
  const articleTopic = topic || defaultTopic;

  const prompt = `You are a skilled content writer.

Write a demo article preview that showcases this brand's voice.

**Brand Profile:**
- Industry: ${profile.industry.primary}
- Target Audience: ${profile.targetAudience.primary}
- Brand Voice: ${profile.brandVoice.tone.join(', ')}
- Writing Style: ${profile.brandVoice.style}
- Personality: ${profile.brandVoice.personality.join(', ')}
- Technical Level: ${profile.contentStyle.technicalLevel}

**Topic:** ${articleTopic}

Generate:
1. A compelling, SEO-friendly title
2. An engaging opening paragraph (150-200 words) that demonstrates the brand voice
3. An article outline (4-5 bullet points of what the full article would cover)
4. 3 alternative topic suggestions for demo articles

The preview should feel authentic to this brand's voice and immediately demonstrate value.`;

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
              title: { type: Type.STRING },
              preview: { type: Type.STRING },
              outline: { type: Type.ARRAY, items: { type: Type.STRING } },
              topicSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            }
          }
        }
      }),
      30000
    ));

    const data = JSON.parse(response.text || '{}');

    return {
      title: data.title || `Guide to ${articleTopic}`,
      preview: data.preview || 'Demo content could not be generated.',
      outline: data.outline || ['Introduction', 'Key Points', 'Conclusion'],
      topicSuggestions: data.topicSuggestions || [],
    };
  } catch (error: any) {
    console.error('[WebsiteAnalysis] Demo article generation failed:', error);

    // Return fallback content
    return {
      title: `The Complete Guide to ${articleTopic}`,
      preview: `In the world of ${profile.industry.primary.toLowerCase()}, understanding ${articleTopic.toLowerCase()} is essential for success. This comprehensive guide will walk you through everything you need to know, from the basics to advanced strategies that industry leaders use.`,
      outline: [
        `Introduction to ${articleTopic}`,
        'Key concepts and fundamentals',
        'Best practices and strategies',
        'Common mistakes to avoid',
        'Next steps and resources',
      ],
      topicSuggestions: profile.offerings.categories.slice(0, 3),
    };
  }
}
