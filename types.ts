import { Timestamp } from 'firebase/firestore';

// UI Navigation
export enum Screen {
  FEED = 'feed',                // New feed-based workflow
  CATEGORIES = 'categories',
  BRIEFS = 'briefs',            // Briefs sub-screen under Content Engine
  POSTS = 'posts',
  LIVE_POSTS = 'live_posts',
  PUBLISHING = 'publishing',    // Launch Pad - review & publish content
  PROJECTS = 'projects',
  SETTINGS = 'settings',
  ADMIN = 'admin'
}

// User & Authentication
export enum GlobalRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  ORG_OWNER = 'ORG_OWNER',
  USER = 'USER'
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  globalRole: GlobalRole;
  isActive?: boolean;       // For admin suspension
  lastActiveAt?: Timestamp; // Track last activity
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Usage tracking for free tier limits
  usageStats?: {
    articlesGenerated: number;
    categoriesCreated: number;
    titlesGenerated: number;
    lastGeneratedAt?: Timestamp;
  };
}

// Organizations
export enum SubscriptionTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE'
}

// Tier limits for subscription management
export interface TierLimits {
  maxProjects: number;
  maxUsersPerProject: number;
  maxArticlesPerMonth: number;
  maxTokensPerMonth: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: { maxProjects: 1, maxUsersPerProject: 1, maxArticlesPerMonth: 5, maxTokensPerMonth: 50000 },
  [SubscriptionTier.STARTER]: { maxProjects: 3, maxUsersPerProject: 3, maxArticlesPerMonth: 50, maxTokensPerMonth: 500000 },
  [SubscriptionTier.PROFESSIONAL]: { maxProjects: 10, maxUsersPerProject: 10, maxArticlesPerMonth: 200, maxTokensPerMonth: 2000000 },
  [SubscriptionTier.ENTERPRISE]: { maxProjects: -1, maxUsersPerProject: -1, maxArticlesPerMonth: -1, maxTokensPerMonth: -1 } // -1 = unlimited
};

export interface OrganizationSettings {
  allowUserInvites: boolean;
  maxProjects: number;
  maxUsersPerProject: number;
}

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  version: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum PromptType {
  TITLE_GENERATION = 'Title Generation',
  CATEGORY_SUGGESTIONS = 'Category Suggestions',
  CATEGORY_BREAKDOWN = 'Category Breakdown',
  BRAND_RESEARCH = 'Brand Research'
}

export enum ContentType {
  ARTICLE = 'Article',
  SOCIAL_MEDIA = 'Social Media',
  EMAIL = 'Email',
  CASE_STUDY = 'Case Study',
  CATEGORY_PAGE = 'Category Page'
}

// Hierarchical Prompt Overrides (Project > Org > Admin)
export interface PromptOverrides {
  // Content Generation Prompts
  [ContentType.ARTICLE]?: string;
  [ContentType.SOCIAL_MEDIA]?: string;
  [ContentType.EMAIL]?: string;
  [ContentType.CASE_STUDY]?: string;
  // System Prompts
  [PromptType.TITLE_GENERATION]?: string;
  [PromptType.CATEGORY_SUGGESTIONS]?: string;
  [PromptType.CATEGORY_BREAKDOWN]?: string;
  [PromptType.BRAND_RESEARCH]?: string;
  // Image Generation
  imageGeneration?: string;
}

export enum Tone {
  PROFESSIONAL = 'Professional',
  WITTY = 'Witty',
  URGENT = 'Urgent',
  EMPATHETIC = 'Empathetic',
  AUTHORITATIVE = 'Authoritative'
}

// ============================================================================
// RESEARCH & SEO TYPES
// ============================================================================

// Source of keyword data
export type KeywordSource = 'ai_estimated' | 'dataforseo';

// Content format for diversity tracking
export type ContentFormat =
  | 'how-to'
  | 'listicle'
  | 'comparison'
  | 'guide'
  | 'case-study'
  | 'news'
  | 'opinion'
  | 'review';

// Keyword data - unified for both AI estimates and DataForSEO
export interface KeywordData {
  keyword: string;
  searchVolume: number | null;    // Monthly searches (null if unknown)
  difficulty: number | null;       // 0-100 scale (null if unknown)
  cpc: number | null;              // Cost per click in USD
  trend: 'rising' | 'stable' | 'declining' | null;  // null if unknown (Firestore doesn't accept undefined)
  source: KeywordSource;
}

// Research report stored per category
export interface CategoryResearch {
  id: string;
  categoryId: string;
  projectId: string;
  organizationId: string;

  // Research type
  researchType: 'shallow' | 'deep';

  // Keywords
  primaryKeywords: KeywordData[];
  relatedKeywords: KeywordData[];
  questionsToAnswer: string[];

  // Content gaps
  contentGaps: {
    topic: string;
    opportunity: string;
    angle: string;
  }[];

  // Competitor insights (deep research only)
  competitors?: {
    title: string;
    url: string;
    wordCount: number;
  }[];
  avgCompetitorWordCount?: number;
  missingTopics?: string[];

  // Topic tracking for deduplication
  coveredTopics: string[];
  suggestedTopics: string[];

  // Metadata
  createdAt: Timestamp;
  expiresAt: Timestamp;
  creditCost: number;
  keywordsFetchedAt?: Timestamp;  // When keywords were last fetched from DataForSEO
}

// Tier-specific feature configuration
export interface TierFeatures {
  researchType: 'shallow' | 'deep';
  showKeywordMetrics: boolean;
  maxKeywordsPerResearch: number;
  googleDeepResearchEnabled: boolean;  // Google Deep Research (20 credits)
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  [SubscriptionTier.FREE]: {
    researchType: 'shallow',
    showKeywordMetrics: false,
    maxKeywordsPerResearch: 10,
    googleDeepResearchEnabled: false
  },
  [SubscriptionTier.STARTER]: {
    researchType: 'shallow',
    showKeywordMetrics: true,
    maxKeywordsPerResearch: 20,
    googleDeepResearchEnabled: false
  },
  [SubscriptionTier.PROFESSIONAL]: {
    researchType: 'deep',
    showKeywordMetrics: true,
    maxKeywordsPerResearch: 50,
    googleDeepResearchEnabled: true
  },
  [SubscriptionTier.ENTERPRISE]: {
    researchType: 'deep',
    showKeywordMetrics: true,
    maxKeywordsPerResearch: 100,
    googleDeepResearchEnabled: true
  }
};

export interface AdminConfig {
  prompts: Record<ContentType, string> & Record<PromptType, string> & {
    summaryPrompt: string;
    [key: string]: string;
  };
  modelVersion: string;
  updatedAt: Timestamp;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string; // URL-safe identifier (e.g., "acme-corp")
  ownerId: string;
  subscriptionTier: SubscriptionTier;
  settings: OrganizationSettings;
  systemPrompts: Record<string, SystemPrompt>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Admin Management
  isActive?: boolean;  // For admin suspension
  // Stripe Integration (ready for future use)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
  trialEndsAt?: Timestamp;
  currentPeriodEnd?: Timestamp;
  // Credit System
  credits?: {
    balance: number;
    monthlyAllowance: number;
    lastRefillAt: Timestamp;
    nextRefillAt: Timestamp;
  };
  // Demo Account Flags
  isDemo?: boolean;           // True for accounts created via onboarding demo flow
  freeCredits?: number;       // Initial free credits given (e.g., 50)
  creditsUsed?: number;       // Track how many free credits have been used
  // Brand Settings
  website?: string;
  customBranding?: {
    logoURL?: string;
    primaryColor?: string;
    secondaryColor?: string;
    font?: string;
  };
  brandMessage?: string;
  brandCompliance?: string;
  targetAudience?: {
    primary: string;
    secondary?: string;
    demographics?: {
      ageRange?: string;
      income?: string;
      geographic?: string[];
    };
  };
  brandImageStyle?: {
    description: string;
    referenceImageUrl?: string;
  };
  // Hierarchical Prompt Overrides
  promptOverrides?: PromptOverrides;
  // Feature Flags (Admin-controlled)
  wordpressEnabled?: boolean;
  // Archive (soft delete)
  isArchived?: boolean;
  archivedAt?: Timestamp;
  // Channel recommendations from onboarding (for upsell)
  channelRecommendations?: ChannelRecommendation[];
  // Track which channel recommendations have been converted to projects
  usedChannelRecommendationIds?: string[];
  // Unselected project suggestions from onboarding (for upsell on projects page)
  suggestedProjects?: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
    coverage?: string;
    estimatedOpportunities?: number;
  }>;
}

// Credit Transaction
export interface CreditTransaction {
  id: string;
  organizationId: string;
  userId: string;
  amount: number; // Negative for usage, Positive for purchase/refill
  balanceAfter: number; // Snapshot of balance for auditing
  type: 'usage' | 'purchase' | 'refund' | 'adjustment' | 'gift';
  description: string;
  metadata?: {
    projectId?: string;
    postId?: string;
    feature?: string; // e.g., 'article_generation', 'image_generation'
    adminId?: string; // For manual adjustments/gifts
  };
  createdAt: Timestamp;
}

// Organization & Project Membership
export enum OrgMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export interface OrganizationMember {
  id: string; // Format: {orgId}_{userId}
  organizationId: string;
  userId: string;
  role: OrgMemberRole;
  invitedBy: string;
  invitedAt: Timestamp;
  joinedAt: Timestamp;
}

export enum ProjectMemberRole {
  ADMIN = 'ADMIN',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
  VIEWER = 'VIEWER'
}

export interface ProjectMember {
  id: string; // Format: {projectId}_{userId}
  organizationId: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  addedBy: string;
  addedAt: Timestamp;
}

// Projects
export enum ProjectType {
  CONTENT = 'content',
  SOCIAL_MEDIA = 'social_media',
  PRODUCT_DESCRIPTIONS = 'product_descriptions',
  IMAGE_GENERATION = 'image_generation'
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug?: string; // URL-safe identifier (e.g., "main-blog")
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isArchived?: boolean;
  websiteUrl?: string;
  projectType?: ProjectType;
  settings?: {
    defaultPromptId?: string;
    autoPublish?: boolean;
    publishVelocity?: number;
    positioningStatement?: string;
    rules?: string;
    imageGeneration?: {
      enabled: boolean;
      autoGenerate?: boolean;
      provider: 'nano-banana-2'; // Extensible - future: 'dall-e-3', 'midjourney', etc.
      defaultStylePrompt: string;
      defaultAspectRatio: '16:9' | '1:1' | '4:3';
      // Design brief for image generation
      designBrief?: string;
      // Style constraints (checkboxes that inject system prompts)
      styleConstraints?: {
        noTextInImages?: boolean;        // "Do not include any text, words, or letters in the image"
        noLogos?: boolean;               // "Do not include logos or brand marks"
        photorealistic?: boolean;        // "Generate photorealistic images"
        illustrationStyle?: boolean;     // "Use illustration/vector art style"
        minimalistStyle?: boolean;       // "Use minimalist, clean aesthetic"
        abstractStyle?: boolean;         // "Use abstract, conceptual imagery"
      };
      // Phase 2: Reference image for style matching
      referenceImageUrl?: string;        // URL to uploaded style reference image
    };
    // WordPress Export (credentials per project, enabled at org level)
    wordpress?: {
      siteUrl: string;           // e.g., "https://mysite.com"
      username: string;          // WordPress username
      appPassword: string;       // Application password
      defaultStatus: 'publish' | 'draft' | 'pending';
      defaultAuthor?: number;    // WP author ID (optional)
    };
    // CloudFlare/Terraform Deployment Configuration
    deployment?: {
      theme?: string;                    // Theme folder name in astromssn repo (e.g., "default", "ribble")
      webhookUrl?: string;               // CloudFlare Pages deploy hook URL
      customDomain?: string;             // Published site domain (e.g., "ribble.mssnhst.com")
      lastBuildTriggeredAt?: Timestamp;  // Last time a build was triggered
      lastBuildTriggeredBy?: string;     // userId who triggered the build
    };
    // Auto-generation settings for stubs
    autoGeneration?: {
      enabled: boolean;                  // Master toggle (default true for new projects)
      stubThreshold: number;             // Stubs per category (default 5, range 1-25)
      migrationPromptShown?: boolean;    // Track if existing user saw migration prompt
    };
    // Deep Research (expensive - 20 credits, OFF by default)
    enableDeepResearch?: boolean;        // Must be explicitly enabled per project
    // Launch Pad settings
    launchPad?: {
      defaultToDraft: boolean;           // New posts start as drafts (default: false)
    };
    // Default author name for posts
    defaultAuthorName?: string;
  };
  businessProfile?: BusinessProfile;
  // Channel/Content type (from onboarding)
  channelType?: ChannelType;
  // Saved channel recommendations from onboarding
  channelRecommendations?: ChannelRecommendation[];
  // Suggested categories from selected channel
  suggestedCategories?: string[];
  // Hierarchical Prompt Overrides
  promptOverrides?: PromptOverrides;
}

// Categories (now scoped to projects)
export interface Category {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  description: string;
  parentId: string | null;
  order: number;
  children?: Category[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Research tracking
  researchId?: string;           // Link to CategoryResearch document
  lastResearchAt?: Timestamp;    // When research was last generated
  // Google Deep Research (PROFESSIONAL+ tier)
  enableGoogleDeepResearch?: boolean;
  googleDeepResearch?: {
    content: string;
    generatedAt: Timestamp;
    startedAt?: Timestamp;  // When research was initiated (for timer display)
    status: 'pending' | 'running' | 'complete' | 'failed';
    error?: string;
  };
  // Category page post reference
  categoryPagePostId?: string;   // Link to the Post with isCategoryPage: true
  // Hero image (same structure as Post.heroImage)
  heroImage?: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: Timestamp;
    providerId: string;
    aspectRatio: string;
  };
  // Per-category content settings (overrides project defaults)
  contentSettings?: {
    targetArticles: number;           // Target number of articles (null = use project default)
    rollUpSubcategories: boolean;     // Include subcategory counts toward this target
    autoReplenish: boolean;           // Auto-generate stubs when below target
  };
  // Enhanced SEO fields (for topical authority strategy)
  searchIntent?: 'informational' | 'commercial' | 'navigational' | 'transactional';  // Primary search intent
  keywordCluster?: string[];          // Target keyword cluster for this category
  contentGapOpportunity?: string;     // Underserved angle this category addresses
  categoryTier?: 'pillar' | 'cluster';  // Topical authority hierarchy
}

// Posts
export enum PostStatus {
  // New feed-based workflow statuses
  PITCH = 'pitch',               // Ready for generate/skip decision
  SKIPPED = 'skipped',           // User skipped this pitch
  GENERATING = 'generating',     // AI is writing content
  READY = 'ready',               // Content ready to launch (renamed from NEEDS_REVIEW)
  PUBLISHED = 'published',       // Live on site
  // Legacy statuses (kept for backward compatibility during transition)
  PENDING = 'pending',           // Idea only, no content yet
  NEEDS_REVIEW = 'needs_review', // Content ready for human review
  APPROVED = 'approved',         // Reviewed, ready to publish
  ARCHIVED = 'archived',         // Soft delete (recoverable)
  REJECTED = 'rejected'          // Rejected by editor
}

export interface Post {
  id: string;
  projectId: string;
  organizationId: string;
  categoryId: string;
  title: string;
  slug?: string;              // URL-friendly version of title
  teaser?: string;
  content?: string;
  status: PostStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  generatedAt?: Timestamp;
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  // Publishing fields
  publishedAt?: Timestamp;    // When actually went live (set on build trigger)
  // SEO & metadata
  tags?: string[];
  metaKeywords?: string[];
  metaDescription?: string;
  editor?: string;
  contentType?: ContentType;
  tone?: Tone;
  metadata?: {
    wordCount?: number;
    readingTime?: number;
  };
  heroImage?: {
    url: string;
    prompt: string;
    altText: string;
    generatedAt: Timestamp;
    providerId: string;
    aspectRatio: string;
  };
  galleryImages?: { url: string; caption?: string; altText?: string }[];
  // Commercial linking (for Astro banners/products)
  commercialTag?: string;
  // WordPress Export
  wordpressExportedAt?: Timestamp;
  wordpressPostId?: number;         // The ID returned from WordPress
  // SEO & Research (for deduplication and keyword tracking)
  embedding?: number[];             // Vector embedding for similarity detection
  contentFormat?: ContentFormat;    // Content format type for diversity
  primaryAngle?: string;            // Main angle/hook of this post
  targetKeyword?: string;           // Primary keyword this post targets
  // Enhanced SEO fields
  contentTier?: 'pillar' | 'cluster';  // Topical authority classification
  serpFeature?: 'featured-snippet' | 'people-also-ask' | 'list-snippet' | 'table-snippet';  // Target SERP feature
  searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational';  // Search intent type
  // Category Page Content (when isCategoryPage is true)
  isCategoryPage?: boolean;         // Discriminator for category pages vs regular posts
  categoryPageContent?: {
    introduction: string;           // Public page intro (WYSIWYG editable)
    aiInstructions?: string;        // Private AI generation context
  };
  // Rich article brief (generated with title, used for article generation)
  articleBrief?: {
    primaryKeyword: string | null;        // Main keyword from research this targets
    secondaryKeywords: string[];          // Supporting keywords to include
    articleType: 'how-to' | 'listicle' | 'guide' | 'comparison' | 'case-study' | 'explainer' | 'article';
    outline: string[];                    // H2 section headings to follow
    keyPoints: string[];                  // Specific facts/stats to include
    targetWordCount: number;              // Recommended word count
    questionsToAnswer: string[];          // Search questions to address
    generatedAt: Timestamp;
  };
  // New feed workflow: pitch data for generate/skip decision
  pitch?: {
    headline: string;                     // The article title/hook
    keyPoints: string[];                  // Bullet points of coverage
    targetKeywords: {
      keyword: string;
      volume: number;                     // Monthly search volume
      difficulty: 'easy' | 'medium' | 'hard';
    }[];
    estimatedWordCount?: number;
  };
  // Draft flag - holds post back from launch
  isDraft?: boolean;                      // true = held in drafts, won't launch
  // Reviewed flag - user has manually reviewed this post
  isReviewed?: boolean;                   // true = user has reviewed, ready for "reviewed-only" launch
  // Author name (overrides project default when set)
  authorName?: string;
  // Pending action flag for live posts - tracks what will happen on next launch
  pendingAction?: 'edit' | 'delete';      // Shows badge on live posts with pending changes
}

// Generation Queue
export enum TaskType {
  GENERATE_TITLES = 'Generate Titles',
  GENERATE_CONTENT = 'Generate Content',
  GENERATE_IMAGE = 'Generate Image',
  GENERATE_CATEGORY_PAGE = 'Generate Category Page',
  GOOGLE_DEEP_RESEARCH = 'Google Deep Research',
  // New feed workflow task types
  GENERATE_PITCH = 'Generate Pitch',             // Generate pitch only (for feed cards)
  GENERATE_FROM_PITCH = 'Generate From Pitch'    // Full article from approved pitch
}

export enum TaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface GenerationTask {
  id: string;
  type: TaskType;
  organizationId: string;
  projectId: string;
  categoryId: string;
  categoryName: string;
  status: TaskStatus;
  progress: number;
  createdBy: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  targetPostId?: string;
  error?: string;
  result?: any;
  // Auto-retry fields
  retryCount?: number;
  lastError?: string;
  nextRetryAt?: Timestamp;
  // Chaining fields
  chainedFromResearch?: boolean;  // True if this task was auto-queued after research completed
}

// Invitations
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

export interface Invitation {
  id: string;
  organizationId: string;
  projectId?: string;
  email: string;
  role: OrgMemberRole | ProjectMemberRole;
  invitedBy: string;
  status: InvitationStatus;
  token: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

// Audit Logging
export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ORG_CREATED = 'ORG_CREATED',
  ORG_UPDATED = 'ORG_UPDATED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  CONTENT_GENERATED = 'CONTENT_GENERATED',
  PROMPT_UPDATED = 'PROMPT_UPDATED',
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string;
  organizationId?: string;
  projectId?: string;
  timestamp: Timestamp;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Usage Tracking
export interface UsageRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  userId: string;
  timestamp: Timestamp;
  apiCalls: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

// Image Asset Variant URLs
export interface ImageVariantUrls {
  webp: string;
  jpeg: string;
}

// Image Asset Original Info
export interface ImageOriginalInfo {
  url: string;
  path: string;
  width: number;
  height: number;
  size: number; // bytes
}

// Image Asset Variants
export interface ImageVariants {
  original: ImageOriginalInfo;
  small: ImageVariantUrls;
  large: ImageVariantUrls;
}

// Image Asset Status
export type ImageAssetStatus = 'active' | 'deleted' | 'pending_deletion';

// Image Assets - Enhanced with variants and lifecycle
export interface ImageAsset {
  id: string;
  organizationId: string;
  projectId: string;
  createdAt: Timestamp;
  createdBy: string;
  type: 'generated' | 'uploaded';
  costInCredits: number;

  // Short slug for public URLs (e.g., "x7Km9")
  slug?: string;

  // Primary URL (backward compatible - points to small WebP)
  url: string;
  publicUrl?: string; // Clean URL via custom domain (e.g., images.missioncontent.com/o/acme/p/blog/i/x7Km9.png)
  path: string; // Storage path (to original)

  // Multiple variants (new)
  variants?: ImageVariants;

  // Metadata
  prompt?: string;
  altText?: string;
  originalDimensions?: { width: number; height: number };
  originalSize?: number; // bytes
  processingTimeMs?: number;

  // Lifecycle management (new)
  status?: ImageAssetStatus;
  deletedAt?: Timestamp;
  deletedBy?: string;
  scheduledDeletionAt?: Timestamp;
  replacedBy?: string; // ID of replacement image
}

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export type OnboardingStep =
  | 'url_input'
  | 'analyzing'
  | 'profile_review'
  | 'channel_recommendations'  // NEW: Select a channel before categories
  | 'demo_output'
  | 'project_selection'
  | 'category_generation'
  | 'account_creation'
  | 'subcategory_generation'
  | 'workspace_intro'
  | 'complete';

// ============================================================================
// CHANNEL TYPES (for onboarding channel-first approach)
// ============================================================================

export type ChannelType =
  | 'blog'
  | 'knowledge_base'
  | 'guides'
  | 'archive'
  | 'industry_vertical';

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  blog: 'Blog',
  knowledge_base: 'Knowledge Base',
  guides: 'Guides',
  archive: 'Archive',
  industry_vertical: 'Industry Vertical'
};

export const CHANNEL_TYPE_DESCRIPTIONS: Record<ChannelType, string> = {
  blog: 'Editorial content, thought leadership, and industry news',
  knowledge_base: 'Self-service support and product documentation',
  guides: 'Educational tutorials, how-tos, and learning resources',
  archive: 'Organized historical and reference content',
  industry_vertical: 'Niche expertise content for specific markets'
};

export interface ChannelKeyword {
  keyword: string;
  searchVolume: number;
  difficulty?: number;
}

export interface ChannelRecommendation {
  id: string;
  channelType: ChannelType;
  title: string;
  description: string;              // Why this channel helps the customer
  suggestedCategories: string[];    // Brief list of 3-5 category names
  targetKeywords: ChannelKeyword[]; // Keywords with demand data
  selected: boolean;
  // Metrics for display
  totalMonthlySearches?: number;    // Sum of keyword volumes
  estimatedTraffic?: number;        // Potential monthly traffic
}

export type DemandLevel = 'Low' | 'Medium' | 'Medium-High' | 'High' | 'Very High';

export interface BusinessProfile {
  id: string;
  websiteUrl: string;
  analyzedAt: Timestamp;

  // Business Identity (NEW)
  businessName?: string;
  businessSummary?: string;

  // Core identification
  industry: {
    primary: string;
    secondary: string;
    tertiary: string;
    confidence: number; // 0-100
  };

  // Audience profiling
  targetAudience: {
    primary: string;
    secondary?: string;
    demographics: {
      ageRange: string;
      income: string;
      geographic: string[];
    };
    painPoints?: string[]; // NEW - audience pain points
  };

  // Product/Service catalog
  offerings: {
    type: 'products' | 'services' | 'both';
    categories: string[];
  };

  // Brand voice analysis
  brandVoice: {
    tone: string[];
    style: string;
    personality: string[];
    uniqueSellingPoints?: string[]; // NEW - USPs
  };

  // Content analysis
  contentStyle: {
    types: string[];
    averageLength: 'short' | 'medium' | 'long';
    technicalLevel: 'beginner' | 'intermediate' | 'advanced';
  };

  // Opportunity scoring
  opportunityScore: {
    overall: number; // 0-100
    contentGaps: number; // Estimated missing pages
    potentialTraffic: string; // e.g. "5,000-10,000 monthly visits"
  };

  // Top keywords with volume data (for profile review display)
  topKeywords?: {
    keyword: string;
    searchVolume: number;
    difficulty: number; // 0-100
    intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  }[];

  // Content angles - strategic content opportunities
  contentAngles?: {
    angle: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];

  // Competitor insights
  competitorInsights?: {
    topCompetitors: string[];
    contentGapsVsCompetitors: string[];
    differentiators: string[];
  };

  // Compliance requirements (NEW)
  compliance?: string;

  // Geographic targeting
  targetGeographies?: {
    countries: string[];      // ISO country codes (e.g., "US", "GB", "CA")
    continents: string[];     // e.g., "North America", "Europe", "Asia"
    customRegions?: string[]; // e.g., "EU", "APAC", "EMEA"
  };

  // User edits tracking
  userEdits?: {
    field: string;
    originalValue: any;
    editedValue: any;
    editedAt: Date;
  }[];

  // Additional research context provided by user (for sparse websites)
  additionalResearchText?: string;

  // Last refresh timestamp
  lastRefreshedAt?: Timestamp;
}

export interface ProjectSuggestion {
  id: string;
  name: string;
  icon: string;
  description: string;
  coverage: string;
  estimatedOpportunities: number;
  selected: boolean;
}

export interface CategorySuggestion {
  id: string;
  name: string;
  description: string;
  demandScore: number; // 0-100
  demandLevel: DemandLevel;
  targetMatchScore: number; // 0-100
  audienceMatch: 'high' | 'medium' | 'low';
  competitionLevel: 'high' | 'medium' | 'low';
  reasoning?: string;
  selected: boolean;
  isUserAdded?: boolean;
  estimatedArticles?: number;
  // New SEO metrics for enhanced display
  searchVolume?: number | null;       // Monthly searches
  difficulty?: number | null;          // 0-100 keyword difficulty
  trend?: 'rising' | 'stable' | 'declining';
  dataSource?: 'dataforseo' | 'estimated';
  competitorCount?: number;            // Articles in top 10 SERP
  trafficPotential?: number;           // Estimated monthly traffic
}

export interface SubcategorySuggestion {
  id: string;
  parentCategoryId: string;
  name: string;
  description: string;
  demandScore: number;
  demandLevel: DemandLevel;
  audienceMatch?: 'high' | 'medium' | 'low';
  selected: boolean;
  estimatedArticles?: number;
}

// 'client' = new user signup flow
// 'project' = existing org creating new project via wizard
// 'existing' = logged-in user creating project (skip URL analysis, use existing profile)
export type OnboardingMode = 'client' | 'project' | 'existing';

export interface OnboardingSession {
  sessionId: string;
  mode: OnboardingMode;
  organizationId?: string; // For project mode
  websiteUrl: string;
  businessProfile: BusinessProfile | null;
  // Channel recommendations (new channel-first approach)
  channelRecommendations: ChannelRecommendation[];
  selectedChannel: ChannelRecommendation | null;
  // Legacy project selection (may be deprecated)
  selectedProject: ProjectSuggestion | null;
  suggestedProjects: ProjectSuggestion[];
  categories: CategorySuggestion[];
  subcategories: Record<string, SubcategorySuggestion[]>; // keyed by category id
  currentStep: OnboardingStep;
  demoArticle?: {
    title: string;
    preview: string;
    outline: string[];
  };
  createdAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Context Types (for React Context)
// ============================================================================

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<User>;
}

export interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (orgId: string) => void;
  createOrganization: (name: string) => Promise<string>;
  loading: boolean;
  archivedOrgBlock: Organization | null;
}

export interface CloneProjectOptions {
  includeCategories: boolean;
  includeSubcategories: boolean;
  includeSettings: boolean;
  includeBusinessProfile: boolean;
}

export interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (projectId: string) => void;
  createProject: (
    name: string,
    description: string,
    options?: {
      websiteUrl?: string;
      projectType?: ProjectType;
      categories?: Array<{ name: string; description: string; order: number }>;
    }
  ) => Promise<string>;
  cloneProject: (
    sourceProjectId: string,
    newName: string,
    newDescription: string,
    options: CloneProjectOptions
  ) => Promise<string>;
  createProjectFromChannel: (
    channel: ChannelRecommendation,
    options?: { createCategories?: boolean }
  ) => Promise<string>;
  loading: boolean;
}

export interface OnboardingContextType {
  session: OnboardingSession | null;
  loading: boolean;
  error: string | null;
  analysisProgress: number; // 0-100

  // Analysis Actions
  startAnalysis: (url: string, demo?: boolean) => Promise<void>;
  initializeWithExistingProfile: (profile: BusinessProfile, orgId: string, channelRecs?: ChannelRecommendation[]) => void;
  updateProfile: (updates: Partial<BusinessProfile>) => void;
  regenerateProfileSection: (section: keyof BusinessProfile) => Promise<void>;

  // Channel Actions (new channel-first approach)
  selectChannel: (id: string) => void;
  generateChannelRecommendations: () => Promise<void>;

  // Project Actions (legacy - may be deprecated)
  selectProject: (id: string) => void;
  createCustomProject: (name: string, description: string) => void;
  updateProject: (id: string, updates: Partial<ProjectSuggestion>) => void;

  // Category Actions
  toggleCategory: (id: string) => void;
  addCustomCategory: (name: string, description: string) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, updates: Partial<CategorySuggestion>) => void;
  generateMoreCategories: () => Promise<void>;

  // Subcategory Actions
  generateSubcategories: (categoryId: string) => Promise<void>;
  toggleSubcategory: (categoryId: string, subcategoryId: string) => void;
  removeSubcategory: (categoryId: string, subcategoryId: string) => void;
  updateSubcategory: (categoryId: string, subcategoryId: string, updates: Partial<SubcategorySuggestion>) => void;

  // Navigation
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Completion
  completeOnboarding: (email: string, password: string, displayName: string) => Promise<void>;
  clearSession: () => void;
}
