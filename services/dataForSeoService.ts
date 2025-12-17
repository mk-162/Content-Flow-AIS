/**
 * DataForSEO Service
 * Provides real keyword data and SERP analysis for PROFESSIONAL/ENTERPRISE tiers
 *
 * API Documentation: https://docs.dataforseo.com/
 *
 * Note: API key is stored in adminConfig/settings.dataForSeoApiKey
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { KeywordData } from '../types';

// Cache for API credentials
let apiCredentialsCache: { login: string; password: string } | null = null;
let credentialsCacheTime = 0;
const CREDENTIALS_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get DataForSEO API credentials from admin config
 */
const getCredentials = async (): Promise<{ login: string; password: string } | null> => {
  const now = Date.now();

  // Return cached credentials if still valid
  if (apiCredentialsCache && (now - credentialsCacheTime) < CREDENTIALS_TTL) {
    return apiCredentialsCache;
  }

  try {
    const settingsDoc = await getDoc(doc(db, 'adminConfig', 'settings'));
    if (!settingsDoc.exists()) {
      console.warn('[DataForSEO] No admin settings found');
      return null;
    }

    const settings = settingsDoc.data();
    if (!settings.dataForSeoLogin || !settings.dataForSeoPassword) {
      console.warn('[DataForSEO] API credentials not configured');
      return null;
    }

    apiCredentialsCache = {
      login: settings.dataForSeoLogin,
      password: settings.dataForSeoPassword
    };
    credentialsCacheTime = now;

    return apiCredentialsCache;
  } catch (error) {
    console.error('[DataForSEO] Error fetching credentials:', error);
    return null;
  }
};

/**
 * Make authenticated request to DataForSEO API
 */
const apiRequest = async (endpoint: string, data: any[]): Promise<any> => {
  const credentials = await getCredentials();
  if (!credentials) {
    throw new Error('DataForSEO API not configured. Please add credentials in Admin settings.');
  }

  const authString = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64');

  try {
    const response = await fetch(`https://api.dataforseo.com/v3${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DataForSEO] API error:', response.status, errorText);
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.status_code !== 20000) {
      console.error('[DataForSEO] API returned error:', result.status_message);
      throw new Error(result.status_message || 'DataForSEO API error');
    }

    return result;
  } catch (error: any) {
    console.error('[DataForSEO] Request failed:', error);
    throw error;
  }
};

/**
 * Get keyword data for a list of keywords
 * Uses DataForSEO Keywords Data API
 */
export const getKeywordData = async (
  keywords: string[],
  location: string = 'United States',
  language: string = 'en'
): Promise<KeywordData[]> => {
  if (!keywords.length) return [];

  console.log(`[DataForSEO] Fetching data for ${keywords.length} keywords`);

  try {
    // Use Keywords Data API - Search Volume endpoint
    const requestData = [{
      keywords: keywords.slice(0, 100), // API limit: 100 keywords per request
      location_name: location,
      language_name: language,
      date_from: getDateMonthsAgo(12), // Get 12 months of data
      include_serp_info: false,
      include_clickstream_data: false
    }];

    const result = await apiRequest('/keywords_data/google_ads/search_volume/live', requestData);

    // Parse results
    const keywordResults: KeywordData[] = [];

    if (result.tasks && result.tasks[0] && result.tasks[0].result) {
      for (const item of result.tasks[0].result) {
        if (item.keyword) {
          keywordResults.push({
            keyword: item.keyword,
            searchVolume: item.search_volume ?? null,
            difficulty: item.keyword_info?.competition_level === 'LOW' ? 25 :
                       item.keyword_info?.competition_level === 'MEDIUM' ? 50 :
                       item.keyword_info?.competition_level === 'HIGH' ? 75 : null,
            cpc: item.cpc ?? null,
            trend: determineTrend(item.monthly_searches),
            source: 'dataforseo'
          });
        }
      }
    }

    console.log(`[DataForSEO] Retrieved data for ${keywordResults.length} keywords`);
    return keywordResults;

  } catch (error: any) {
    console.error('[DataForSEO] getKeywordData failed:', error);
    throw error;
  }
};

/**
 * Get SERP competitors for a keyword
 * Analyzes top 10 results for content insights
 */
export const getSerpCompetitors = async (
  keyword: string,
  location: string = 'United States',
  limit: number = 10
): Promise<{
  competitors: { title: string; url: string; wordCount: number }[];
  avgWordCount: number;
  missingTopics: string[];
}> => {
  console.log(`[DataForSEO] Analyzing SERP for: "${keyword}"`);

  try {
    // Use SERP API
    const requestData = [{
      keyword,
      location_name: location,
      language_name: 'English',
      device: 'desktop',
      os: 'windows',
      depth: limit
    }];

    const result = await apiRequest('/serp/google/organic/live/regular', requestData);

    const competitors: { title: string; url: string; wordCount: number }[] = [];

    if (result.tasks && result.tasks[0] && result.tasks[0].result) {
      const items = result.tasks[0].result[0]?.items || [];

      for (const item of items) {
        if (item.type === 'organic' && item.title && item.url) {
          competitors.push({
            title: item.title,
            url: item.url,
            wordCount: item.description?.split(/\s+/).length * 10 || 1500 // Estimate from snippet
          });
        }
      }
    }

    // Calculate average word count (rough estimate)
    const avgWordCount = competitors.length > 0
      ? Math.round(competitors.reduce((sum, c) => sum + c.wordCount, 0) / competitors.length)
      : 1500;

    // Extract common topics from titles (simple analysis)
    const titleWords = competitors
      .flatMap(c => c.title.toLowerCase().split(/\s+/))
      .filter(w => w.length > 4);

    const wordFreq = new Map<string, number>();
    titleWords.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));

    const missingTopics = Array.from(wordFreq.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    console.log(`[DataForSEO] Found ${competitors.length} competitors, avg word count: ${avgWordCount}`);

    return {
      competitors,
      avgWordCount,
      missingTopics
    };

  } catch (error: any) {
    console.error('[DataForSEO] getSerpCompetitors failed:', error);
    throw error;
  }
};

/**
 * Test DataForSEO connection
 * Returns true if credentials are valid
 */
export const testConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const credentials = await getCredentials();
    if (!credentials) {
      return { success: false, message: 'API credentials not configured' };
    }

    // Try a simple API call to verify credentials
    const authString = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64');

    const response = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { success: false, message: `API returned status ${response.status}` };
    }

    const result = await response.json();

    if (result.status_code === 20000) {
      const balance = result.tasks?.[0]?.result?.[0]?.money?.balance || 0;
      return {
        success: true,
        message: `Connected successfully. Balance: $${balance.toFixed(2)}`
      };
    }

    return { success: false, message: result.status_message || 'Unknown error' };

  } catch (error: any) {
    return { success: false, message: error.message || 'Connection failed' };
  }
};

/**
 * Clear credentials cache (use after updating settings)
 */
export const clearCredentialsCache = (): void => {
  apiCredentialsCache = null;
  credentialsCacheTime = 0;
  console.log('[DataForSEO] Credentials cache cleared');
};

// Helper: Get date string for months ago
const getDateMonthsAgo = (months: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
};

// Helper: Determine trend from monthly search data
const determineTrend = (monthlySearches: any[]): 'rising' | 'stable' | 'declining' | undefined => {
  if (!monthlySearches || monthlySearches.length < 3) return undefined;

  const recent = monthlySearches.slice(0, 3);
  const older = monthlySearches.slice(-3);

  const recentAvg = recent.reduce((sum: number, m: any) => sum + (m.search_volume || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum: number, m: any) => sum + (m.search_volume || 0), 0) / older.length;

  if (olderAvg === 0) return undefined;

  const change = (recentAvg - olderAvg) / olderAvg;

  if (change > 0.15) return 'rising';
  if (change < -0.15) return 'declining';
  return 'stable';
};

export const dataForSeoService = {
  getKeywordData,
  getSerpCompetitors,
  testConnection,
  clearCredentialsCache
};
