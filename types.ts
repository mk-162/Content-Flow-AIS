import { Timestamp } from 'firebase/firestore';

// UI Navigation
export enum Screen {
  CATEGORIES = 'categories',
  POSTS = 'posts',
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
export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isArchived?: boolean;
  settings?: {
    defaultPromptId?: string;
    autoPublish?: boolean;
    publishVelocity?: number;
    positioningStatement?: string;
    rules?: string;
  };
}

// Categories (now scoped to projects)
export interface Category {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  description: string;
  parentId: string | null;
  children?: Category[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Posts
export enum PostStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface Post {
  id: string;
  projectId: string;
  organizationId: string;
  categoryId: string;
  title: string;
  teaser?: string;
  content?: string;
  status: PostStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  generatedAt?: Timestamp;
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  tags?: string[];
  metaKeywords?: string;
  metaDescription?: string;
  editor?: string;
  contentType?: ContentType;
  tone?: Tone;
  metadata?: {
    wordCount?: number;
    readingTime?: number;
  };
}

// Generation Queue
export enum TaskType {
  GENERATE_TITLES = 'Generate Titles',
  GENERATE_CONTENT = 'Generate Content'
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

// Context Types (for React Context)
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
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

export interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (projectId: string) => void;
  createProject: (name: string, description: string) => Promise<string>;
  loading: boolean;
}
