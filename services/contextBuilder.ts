/**
 * Context Builder Service
 * 
 * Builds comprehensive prompt context from project's business profile
 * for use in category, subcategory, and title generation.
 */

import { Project, Category, BusinessProfile } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentContext {
    // Business Identity
    businessName: string;
    businessSummary: string;
    industry: {
        primary: string;
        secondary: string;
        tertiary?: string;
    };

    // Offerings
    offeringType: 'products' | 'services' | 'both';
    offerings: string[];
    uniqueValueProp?: string;

    // Audience
    targetAudience: string;
    demographics: {
        ageRange: string;
        income: string;
        geographic: string[];
    };
    painPoints?: string[];

    // Voice & Style
    brandVoice: string[];
    contentTypes: string[];
    compliance?: string;

    // Category Chain (for subcategories/titles)
    categoryChain?: { name: string; description: string }[];
}

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Build comprehensive content context from project data
 */
export function buildContentContext(
    project: Project,
    parentCategories?: Category[]
): ContentContext {
    const bp = project.businessProfile;

    if (!bp) {
        // Return minimal context if no business profile
        return {
            businessName: project.name,
            businessSummary: project.description || '',
            industry: { primary: 'General', secondary: '' },
            offeringType: 'both',
            offerings: [],
            targetAudience: '',
            demographics: { ageRange: '', income: '', geographic: [] },
            brandVoice: [],
            contentTypes: [],
            categoryChain: parentCategories?.map(c => ({ name: c.name, description: c.description || '' }))
        };
    }

    return {
        // Business Identity
        businessName: bp.businessName || project.name,
        businessSummary: bp.businessSummary || project.description || '',
        industry: {
            primary: bp.industry?.primary || '',
            secondary: bp.industry?.secondary || '',
            tertiary: bp.industry?.tertiary
        },

        // Offerings
        offeringType: bp.offerings?.type || 'both',
        offerings: bp.offerings?.categories || [],
        uniqueValueProp: bp.brandVoice?.uniqueSellingPoints?.join('. '),

        // Audience
        targetAudience: bp.targetAudience?.primary || '',
        demographics: {
            ageRange: bp.targetAudience?.demographics?.ageRange || '',
            income: bp.targetAudience?.demographics?.income || '',
            geographic: bp.targetAudience?.demographics?.geographic || []
        },
        painPoints: bp.targetAudience?.painPoints || [],

        // Voice & Style
        brandVoice: bp.brandVoice?.tone || [],
        contentTypes: bp.contentStyle?.types || [],
        compliance: bp.compliance,

        // Category Chain
        categoryChain: parentCategories?.map(c => ({
            name: c.name,
            description: c.description || ''
        }))
    };
}

/**
 * Build a formatted prompt block from content context
 */
export function buildPromptBlock(context: ContentContext): string {
    const sections: string[] = [];

    // Business Identity
    const businessLines: string[] = [];
    if (context.businessName) businessLines.push(`Business: ${context.businessName}`);
    if (context.businessSummary) businessLines.push(`About: ${context.businessSummary}`);
    if (context.industry.primary) {
        let industryStr = context.industry.primary;
        if (context.industry.secondary) industryStr += ` / ${context.industry.secondary}`;
        if (context.industry.tertiary) industryStr += ` / ${context.industry.tertiary}`;
        businessLines.push(`Industry: ${industryStr}`);
    }
    if (context.offerings.length > 0) {
        businessLines.push(`${context.offeringType === 'products' ? 'Products' : context.offeringType === 'services' ? 'Services' : 'Offerings'}: ${context.offerings.join(', ')}`);
    }
    if (context.uniqueValueProp) {
        businessLines.push(`Value Proposition: ${context.uniqueValueProp}`);
    }

    if (businessLines.length > 0) {
        sections.push(`**BUSINESS CONTEXT**\n${businessLines.join('\n')}`);
    }

    // Target Audience
    const audienceLines: string[] = [];
    if (context.targetAudience) audienceLines.push(`Primary Audience: ${context.targetAudience}`);
    if (context.demographics.ageRange || context.demographics.income) {
        const demoItems: string[] = [];
        if (context.demographics.ageRange) demoItems.push(`Age: ${context.demographics.ageRange}`);
        if (context.demographics.income) demoItems.push(`Income: ${context.demographics.income}`);
        if (context.demographics.geographic.length > 0) demoItems.push(`Location: ${context.demographics.geographic.join(', ')}`);
        audienceLines.push(`Demographics: ${demoItems.join(', ')}`);
    }
    if (context.painPoints && context.painPoints.length > 0) {
        audienceLines.push(`Pain Points: ${context.painPoints.join('; ')}`);
    }

    if (audienceLines.length > 0) {
        sections.push(`**TARGET AUDIENCE**\n${audienceLines.join('\n')}`);
    }

    // Brand Voice & Style
    const styleLines: string[] = [];
    if (context.brandVoice.length > 0) styleLines.push(`Tone: ${context.brandVoice.join(', ')}`);
    if (context.contentTypes.length > 0) styleLines.push(`Content Types: ${context.contentTypes.join(', ')}`);
    if (context.compliance) styleLines.push(`Compliance: ${context.compliance}`);

    if (styleLines.length > 0) {
        sections.push(`**BRAND VOICE**\n${styleLines.join('\n')}`);
    }

    // Category Chain (for subcategory/title generation)
    if (context.categoryChain && context.categoryChain.length > 0) {
        const chainLines = context.categoryChain.map((cat, i) => {
            const indent = '  '.repeat(i);
            return `${indent}└─ ${cat.name}${cat.description ? `\n${indent}   "${cat.description}"` : ''}`;
        });
        sections.push(`**CATEGORY CONTEXT**\n${chainLines.join('\n')}`);
    }

    return sections.join('\n\n');
}

/**
 * Build minimal context for quick operations
 */
export function buildMinimalContext(context: ContentContext): string {
    const parts: string[] = [];

    if (context.businessName) parts.push(`Business: ${context.businessName}`);
    if (context.industry.primary) parts.push(`Industry: ${context.industry.primary}`);
    if (context.targetAudience) parts.push(`Audience: ${context.targetAudience}`);
    if (context.offerings.length > 0) parts.push(`Offerings: ${context.offerings.slice(0, 3).join(', ')}`);

    return parts.join(' | ');
}
