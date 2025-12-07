import { Timestamp } from 'firebase/firestore';

// UI Navigation
export enum Screen {
  CATEGORIES = 'categories',
  POSTS = 'posts',
  PUBLISHING = 'publishing',
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
  CASE_STUDY = 'Case Study'
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
      provider: 'nano-banana-2'; // Extensible
      defaultStylePrompt: string;
      defaultAspectRatio: '16:9' | '1:1' | '4:3';
    };
    // WordPress Export (credentials per project, enabled at org level)
    wordpress?: {
      siteUrl: string;           // e.g., "https://mysite.com"
      username: string;          // WordPress username
      appPassword: string;       // Application password
      defaultStatus: 'publish' | 'draft' | 'pending';
      defaultAuthor?: number;    // WP author ID (optional)
    };
  };
  businessProfile?: BusinessProfile;
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
}

// Posts
export enum PostStatus {
  PENDING = 'pending',           // Idea only, no content yet
  GENERATING = 'generating',     // AI is writing content
  NEEDS_REVIEW = 'needs_review', // Content ready for human review
  APPROVED = 'approved',         // Reviewed, ready to schedule
  SCHEDULED = 'scheduled',       // Has future publish date
  PUBLISHED = 'published',       // Live on site
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
  scheduledAt?: Timestamp;    // When to publish (for SCHEDULED posts)
  publishedAt?: Timestamp;    // When actually went live
  lastEditedAt?: Timestamp;   // Last edit after publishing
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
}

// Generation Queue
export enum TaskType {
  GENERATE_TITLES = 'Generate Titles',
  GENERATE_CONTENT = 'Generate Content',
  GENERATE_IMAGE = 'Generate Image'
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

// Image Assets
export interface ImageAsset {
  id: string;
  organizationId: string;
  projectId: string;
  url: string;
  path: string; // Storage path
  prompt?: string;
  altText?: string;
  createdAt: Timestamp;
  createdBy: string;
  type: 'generated' | 'uploaded';
  costInCredits: number;
}

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export type OnboardingStep =
  | 'url_input'
  | 'analyzing'
  | 'profile_review'
  | 'demo_output'
  | 'project_selection'
  | 'category_generation'
  | 'account_creation'
  | 'subcategory_generation'
  | 'workspace_intro'
  | 'complete';

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
}

export interface SubcategorySuggestion {
  id: string;
  parentCategoryId: string;
  name: string;
  description: string;
  demandScore: number;
  demandLevel: DemandLevel;
  audienceMatch: 'high' | 'medium' | 'low';
  selected: boolean;
}

export type OnboardingMode = 'client' | 'project';

export interface OnboardingSession {
  sessionId: string;
  mode: OnboardingMode;
  organizationId?: string; // For project mode
  websiteUrl: string;
  businessProfile: BusinessProfile | null;
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
}

export interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (orgId: string) => void;
  createOrganization: (name: string) => Promise<string>;
  loading: boolean;
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
  loading: boolean;
}

export interface OnboardingContextType {
  session: OnboardingSession | null;
  loading: boolean;
  error: string | null;
  analysisProgress: number; // 0-100

  // Analysis Actions
  startAnalysis: (url: string) => Promise<void>;
  updateProfile: (updates: Partial<BusinessProfile>) => void;
  regenerateProfileSection: (section: keyof BusinessProfile) => Promise<void>;

  // Project Actions
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
