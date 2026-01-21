/**
 * Category Generation Service
 *
 * Generates AI-powered categories and subcategories for new projects
 * during onboarding. Uses business profile context to create relevant,
 * specific categories rather than generic ones.
 */

import { doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BusinessProfile, Category } from '../types';
import { generateOnboardingCategories } from './websiteAnalysisService';
import { suggestCategories as suggestSubcategories } from './geminiService';

// ============================================================================
// TYPES
// ============================================================================

interface GeneratedCategory {
  id: string;
  name: string;
  description: string;
  order: number;
  parentId: string | null;
}

interface CategoryGenerationResult {
  success: boolean;
  categoriesCreated: number;
  error?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

/** Counter for ensuring unique IDs within the same millisecond */
let idCounter = 0;

/**
 * Generate a unique category ID using timestamp, counter, and random suffix.
 * Avoids collisions even when called rapidly in loops.
 */
function generateCategoryId(prefix: string = ''): string {
  const timestamp = Date.now();
  const counter = idCounter++;
  const random = Math.random().toString(36).substring(2, 11);
  return `cat_${timestamp}_${prefix}${counter}_${random}`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generates and creates categories for a new project
 * Creates 2 parent categories with 3 subcategories each (8 total)
 *
 * @param projectId - The project ID to create categories for
 * @param organizationId - The organization ID
 * @param businessProfile - Business profile from onboarding analysis
 * @param channelTitle - The name of the selected channel
 * @returns Result with success status and count of categories created
 */
export async function generateAndCreateCategories(
  projectId: string,
  organizationId: string,
  businessProfile: BusinessProfile,
  channelTitle: string
): Promise<CategoryGenerationResult> {
  console.log('[CategoryGeneration] Starting category generation for project:', projectId);

  try {
    // Step 1: Generate 2 parent categories with AI
    const parentCategories = await generateParentCategories(
      businessProfile,
      channelTitle,
      2
    );

    if (parentCategories.length === 0) {
      console.warn('[CategoryGeneration] No parent categories generated, using fallback');
      return await createFallbackCategories(projectId, organizationId, businessProfile);
    }

    console.log('[CategoryGeneration] Generated', parentCategories.length, 'parent categories');

    // Step 2: Generate 3 subcategories for each parent
    const allCategories: GeneratedCategory[] = [];
    let order = 0;

    for (const parent of parentCategories) {
      // Add parent category
      const parentId = generateCategoryId('p');
      allCategories.push({
        id: parentId,
        name: parent.name,
        description: parent.description,
        order: order++,
        parentId: null,
      });

      // Generate subcategories for this parent
      try {
        const subcategories = await generateSubcategoriesForParent(
          businessProfile,
          parent.name,
          3
        );

        for (const sub of subcategories) {
          allCategories.push({
            id: generateCategoryId('s'),
            name: sub.name,
            description: sub.description,
            order: order++,
            parentId: parentId,
          });
        }

        console.log('[CategoryGeneration] Generated', subcategories.length, 'subcategories for', parent.name);
      } catch (subError) {
        console.warn('[CategoryGeneration] Failed to generate subcategories for', parent.name, subError);
        // Continue without subcategories for this parent
      }
    }

    // Step 3: Batch write all categories to Firestore
    await batchWriteCategories(projectId, organizationId, allCategories);

    console.log('[CategoryGeneration] Successfully created', allCategories.length, 'categories');

    return {
      success: true,
      categoriesCreated: allCategories.length,
    };
  } catch (error: any) {
    console.error('[CategoryGeneration] Failed to generate categories:', error);

    // Try fallback on any error
    try {
      return await createFallbackCategories(projectId, organizationId, businessProfile);
    } catch (fallbackError) {
      console.error('[CategoryGeneration] Fallback also failed:', fallbackError);
      return {
        success: false,
        categoriesCreated: 0,
        error: error.message || 'Failed to generate categories',
      };
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate parent categories using AI
 */
async function generateParentCategories(
  profile: BusinessProfile,
  channelTitle: string,
  count: number
): Promise<Array<{ name: string; description: string }>> {
  try {
    const categories = await generateOnboardingCategories(profile, channelTitle, count);

    return categories.map(cat => ({
      name: cat.name,
      description: cat.description || '',
    }));
  } catch (error) {
    console.error('[CategoryGeneration] Parent category generation failed:', error);
    return [];
  }
}

/**
 * Generate subcategories for a parent category using AI
 */
async function generateSubcategoriesForParent(
  profile: BusinessProfile,
  parentName: string,
  count: number
): Promise<Array<{ name: string; description: string }>> {
  try {
    const industry = profile.industry?.primary || 'General';
    const suggestions = await suggestSubcategories(industry, parentName);

    // Take only the requested count
    return suggestions.slice(0, count).map(s => ({
      name: s.name,
      description: s.description || `Content related to ${s.name} within ${parentName}`,
    }));
  } catch (error) {
    console.error('[CategoryGeneration] Subcategory generation failed for', parentName, ':', error);
    return [];
  }
}

/**
 * Batch write categories to Firestore
 */
async function batchWriteCategories(
  projectId: string,
  organizationId: string,
  categories: GeneratedCategory[]
): Promise<void> {
  const batch = writeBatch(db);

  for (const category of categories) {
    const categoryDoc: Omit<Category, 'id'> = {
      projectId,
      organizationId,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      order: category.order,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(
      doc(db, `organizations/${organizationId}/projects/${projectId}/categories`, category.id),
      categoryDoc
    );
  }

  await batch.commit();
  console.log('[CategoryGeneration] Batch write complete:', categories.length, 'categories');
}

/**
 * Create fallback categories when AI generation fails
 * Creates basic but contextual categories based on business profile
 */
async function createFallbackCategories(
  projectId: string,
  organizationId: string,
  profile: BusinessProfile
): Promise<CategoryGenerationResult> {
  console.log('[CategoryGeneration] Creating fallback categories');

  const industry = profile.industry?.primary || 'Business';
  const location = profile.targetAudience?.demographics?.geographic?.[0] || '';
  const locationPrefix = location && location !== 'Global' ? `${location} ` : '';

  // Create contextual fallback categories
  const fallbackCategories: GeneratedCategory[] = [
    {
      id: generateCategoryId('fb_p'),
      name: `${locationPrefix}${industry} Essentials`,
      description: `Core concepts and fundamentals of ${industry.toLowerCase()}${location ? ` in ${location}` : ''}. Everything you need to know to get started, from basic terminology to best practices.`,
      order: 0,
      parentId: null,
    },
    {
      id: generateCategoryId('fb_p'),
      name: 'How-To Guides',
      description: `Step-by-step tutorials and practical guides for ${industry.toLowerCase()}. Learn how to accomplish specific tasks with clear instructions and expert tips.`,
      order: 1,
      parentId: null,
    },
  ];

  // Add simple subcategories for the first parent
  const parentId = fallbackCategories[0].id;
  const subNames = ['Getting Started', 'Common Questions', 'Best Practices'];

  subNames.forEach((name, index) => {
    fallbackCategories.push({
      id: generateCategoryId('fb_s'),
      name,
      description: `${name} content for ${industry.toLowerCase()}.`,
      order: index + 2,
      parentId: parentId,
    });
  });

  try {
    await batchWriteCategories(projectId, organizationId, fallbackCategories);

    return {
      success: true,
      categoriesCreated: fallbackCategories.length,
    };
  } catch (error: any) {
    console.error('[CategoryGeneration] Fallback write failed:', error);
    return {
      success: false,
      categoriesCreated: 0,
      error: error.message,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { generateParentCategories, generateSubcategoriesForParent, createFallbackCategories };
