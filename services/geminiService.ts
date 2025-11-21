
import { GoogleGenAI, Type } from "@google/genai";
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    // Estimate cost (example: $0.001 per 1000 tokens)
    const cost = (tokensUsed / 1000) * 0.001;

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
  organizationId?: string
): Promise<GeneratedTitleData[]> => {
  console.log(`[Gemini] Starting title generation for "${categoryName}" (${count} titles)`);

  try {
    console.log('[Gemini] Getting AI client...');
    const ai = getClient();

    console.log('[Gemini] Calling generateContent...');
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Generate ${count} high-quality blog post ideas for a category named "${categoryName}".
      Context/Description: ${categoryDescription}.

      For each idea, provide:
      1. A catchy, SEO-friendly Title.
      2. A "Teaser" or "Prompt": A 1-2 sentence description of what the post should cover. This will be used as instructions for the writer.
      3. Keywords: 3-5 target keywords or topics.`,
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
    });

    console.log('[Gemini] Response received, parsing JSON...');
    const json = JSON.parse(response.text || '{"ideas": []}');
    const ideas = json.ideas || [];
    console.log(`[Gemini] Successfully generated ${ideas.length} titles`);
    return ideas;
  } catch (error) {
    console.error("❌ [Gemini] Title Generation Error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    // Fallback mock data
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

export const generatePostOutline = async (
  title: string,
  categoryName: string,
  teaser?: string,
  tags?: string[],
  organizationId?: string
): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `Write a detailed blog post outline for the title: "${title}" in the category "${categoryName}".

    ${teaser ? `**Specific Instructions/Focus:** ${teaser}` : ''}
    ${tags && tags.length > 0 ? `**Target Keywords to Include:** ${tags.join(', ')}` : ''}

    Include:
    1. Engaging Introduction
    2. 3-4 Main Section Headings with detailed bullet points
    3. Key Takeaways
    4. Conclusion

    IMPORTANT: Start directly with the markdown content. Do not include any preambles like "Here is the outline:" or similar introductory text.
    Format in clean Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const rawContent = response.text || "Could not generate content.";
    return stripPreamble(rawContent);
  } catch (error) {
    console.error("Gemini Content Generation Error:", error);
    return `## ${title}\n\n**Introduction**\n- Brief overview...\n\n**Section 1**\n- Key point...\n\n(Mock Content due to generation error)`;
  }
};

export const getCategorySuggestions = async (categoryName: string): Promise<string[]> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Analyze the content category "${categoryName}" and suggest 3 quick improvements or sub-niches to make it more specific and engaging for an audience. Return as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
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

    let prompt = "";

    if (parentCategoryName) {
      // Subcategory Mode
      prompt = `You are an expert Content Strategist.
        The user has a main category: "${parentCategoryName}".
        
        Task: Break this down into 6 logical, distinct sub-categories or sub-niches.
        ${query ? `Focus specifically on areas related to: "${query}".` : 'Ensure a broad coverage.'}
        
        Return a list of objects with name, description, and reason.`;
    } else {
      // Root Mode
      prompt = `You are an expert Content Strategist.
        The user is looking for ideas for a new top-level content category related to: "${query}".
        
        Task: Suggest 5 distinct, high-value category names.
        
        Return a list of objects with name, description, and reason.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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
  } catch (error) {
    console.error("Error generating category suggestions", error);
    return [];
  }
}
