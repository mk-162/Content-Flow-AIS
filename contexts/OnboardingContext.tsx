import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  OnboardingContextType,
  OnboardingSession,
  OnboardingStep,
  OnboardingMode,
  BusinessProfile,
  ProjectSuggestion,
  CategorySuggestion,
  SubcategorySuggestion,
  ChannelRecommendation,
  ChannelType,
} from '../types';
import {
  analyzeWebsite,
  generateProjectSuggestions,
  generateOnboardingCategories,
  generateDemoArticle,
  DemoArticle,
} from '../services/websiteAnalysisService';
import { suggestCategories as suggestSubcategories } from '../services/geminiService';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'missioncontent_onboarding_session';
const SESSION_EXPIRY_HOURS = 24;

// Step order for new users (not logged in)
const NEW_USER_STEP_ORDER: OnboardingStep[] = [
  'url_input',
  'analyzing',
  'profile_review',
  'channel_recommendations',
  'account_creation',
  'complete',
];

// Step order for existing users (logged in, creating new project)
// Skips URL analysis (uses existing profile) and account creation
const EXISTING_USER_STEP_ORDER: OnboardingStep[] = [
  'profile_review',         // Review/edit existing business profile
  'channel_recommendations', // Select channel for new project
  'complete',               // Create project and redirect
];

// Get step order based on mode
const getStepOrder = (mode: OnboardingMode): OnboardingStep[] => {
  return mode === 'existing' ? EXISTING_USER_STEP_ORDER : NEW_USER_STEP_ORDER;
};

// ============================================================================
// CONTEXT
// ============================================================================

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const createEmptySession = (mode: OnboardingMode = 'client', organizationId?: string): OnboardingSession => {
  const now = new Date();
  const expiry = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
  const stepOrder = getStepOrder(mode);

  return {
    sessionId: generateSessionId(),
    mode,
    organizationId,
    websiteUrl: '',
    businessProfile: null,
    channelRecommendations: [],
    selectedChannel: null,
    selectedProject: null,
    suggestedProjects: [],
    categories: [],
    subcategories: {},
    currentStep: stepOrder[0], // First step depends on mode
    createdAt: now,
    expiresAt: expiry,
  };
};

const loadSessionFromStorage = (): OnboardingSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as OnboardingSession;

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.expiresAt = new Date(session.expiresAt);

    return session;
  } catch (error) {
    console.error('[Onboarding] Error loading session from storage:', error);
    return null;
  }
};

const saveSessionToStorage = (session: OnboardingSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('[Onboarding] Error saving session to storage:', error);
  }
};

// ============================================================================
// PROVIDER
// ============================================================================

interface OnboardingProviderProps {
  children: React.ReactNode;
  mode?: OnboardingMode;
  organizationId?: string;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  mode = 'client',
  organizationId
}) => {
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Initialize session from localStorage on mount
  useEffect(() => {
    const stored = loadSessionFromStorage();
    if (stored) {
      console.log('[Onboarding] Restored session from storage:', stored.sessionId);
      setSession(stored);
    } else {
      setSession(createEmptySession(mode, organizationId));
    }
  }, [mode, organizationId]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      saveSessionToStorage(session);
    }
  }, [session]);

  // ============================================================================
  // ANALYSIS ACTIONS
  // ============================================================================

  const startAnalysis = useCallback(async (url: string, demo: boolean = false) => {
    setLoading(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      // Update session with URL and move to analyzing step
      setSession(prev => prev ? {
        ...prev,
        websiteUrl: url || 'demo.example.com',
        currentStep: 'analyzing',
      } : null);

      let profile: BusinessProfile;
      let projects: ProjectSuggestion[];
      let demoArticle: DemoArticle | undefined;

      if (demo || !url) {
        // DEMO MODE: Simulate analysis with placeholder data
        console.log('[Onboarding] Running demo analysis...');

        // Simulate progress over ~4 seconds
        const stages = [
          { progress: 15, delay: 400 },
          { progress: 30, delay: 600 },
          { progress: 45, delay: 500 },
          { progress: 60, delay: 700 },
          { progress: 75, delay: 500 },
          { progress: 85, delay: 400 },
          { progress: 95, delay: 300 },
        ];

        for (const stage of stages) {
          await new Promise(resolve => setTimeout(resolve, stage.delay));
          setAnalysisProgress(stage.progress);
        }

        // Generate demo business profile (must match BusinessProfile type)
        // This is rich, compelling demo data that shows the value of the analysis
        profile = {
          id: `demo_${Date.now()}`,
          websiteUrl: url || 'demo.example.com',
          analyzedAt: Timestamp.now(),
          businessName: 'TechFlow Solutions',
          businessSummary: 'TechFlow helps mid-market companies modernize their tech stack without the enterprise price tag. Founded by ex-AWS engineers, they specialize in cloud migrations that actually finish on time and on budget.',
          industry: {
            primary: 'Cloud Infrastructure & DevOps Consulting',
            secondary: 'Software Development Services',
            tertiary: 'IT Managed Services',
            confidence: 92,
          },
          offerings: {
            type: 'services',
            categories: [
              'Cloud Migration (AWS, Azure, GCP)',
              'DevOps Implementation & CI/CD',
              'Infrastructure as Code (Terraform)',
              'Kubernetes & Container Orchestration',
              '24/7 Managed Cloud Support',
            ],
          },
          targetAudience: {
            primary: 'CTOs and VP of Engineering at mid-market companies ($10M-$500M revenue) struggling with legacy infrastructure, slow deployments, or cloud cost overruns',
            secondary: 'IT Directors managing hybrid cloud environments who need to reduce operational overhead',
            demographics: {
              ageRange: '35-50',
              income: '$150K-$300K decision makers',
              geographic: ['United States', 'Canada', 'United Kingdom'],
            },
            painPoints: [
              'Cloud bills spiraling out of control (avg 40% overspend)',
              'Deployments taking days instead of minutes',
              'On-call burnout causing engineer turnover',
              'Security compliance gaps (SOC2, HIPAA)',
              'Vendor lock-in fears preventing cloud adoption',
            ],
          },
          brandVoice: {
            tone: ['Technical but accessible', 'Confident without arrogance', 'Results-focused'],
            style: 'Engineer-to-engineer conversations backed by real metrics and case studies',
            personality: ['Pragmatic problem-solvers', 'Cloud-native advocates', 'Cost-conscious'],
            uniqueSellingPoints: [
              'Average 47% cloud cost reduction in first 90 days',
              'Ex-FAANG engineering team (AWS, Google, Netflix)',
              'Fixed-price migrations with money-back guarantee',
              'SOC2 Type II certified with HIPAA expertise',
            ],
          },
          contentStyle: {
            types: ['Technical deep-dives', 'ROI calculators', 'Migration playbooks', 'Architecture reviews'],
            averageLength: 'long',
            technicalLevel: 'advanced',
          },
          opportunityScore: {
            overall: 34,
            contentGaps: 127,
            potentialTraffic: '15,000-28,000 monthly visits',
          },
          // Top keywords with real-looking volume data
          topKeywords: [
            { keyword: 'cloud migration services', searchVolume: 8100, difficulty: 67, intent: 'commercial' },
            { keyword: 'aws cost optimization', searchVolume: 6600, difficulty: 58, intent: 'informational' },
            { keyword: 'kubernetes consulting', searchVolume: 4400, difficulty: 52, intent: 'commercial' },
            { keyword: 'devops implementation cost', searchVolume: 2900, difficulty: 45, intent: 'commercial' },
            { keyword: 'terraform vs cloudformation', searchVolume: 5400, difficulty: 38, intent: 'informational' },
            { keyword: 'cloud migration checklist', searchVolume: 3600, difficulty: 41, intent: 'informational' },
            { keyword: 'reduce aws bill', searchVolume: 4100, difficulty: 55, intent: 'informational' },
            { keyword: 'soc2 compliance for startups', searchVolume: 2400, difficulty: 48, intent: 'informational' },
          ],
          // Strategic content angles that show real insight
          contentAngles: [
            {
              angle: 'Cloud Cost Horror Stories & Fixes',
              description: 'Document real examples of cloud cost disasters and step-by-step fixes. High search intent from panicked CTOs.',
              priority: 'high',
            },
            {
              angle: 'Migration Timelines & What Actually Happens',
              description: 'Honest content about migration phases, common delays, and how to avoid them. Builds trust through transparency.',
              priority: 'high',
            },
            {
              angle: 'Build vs Buy Decision Frameworks',
              description: 'Help prospects decide when to use managed services vs self-host. Positions you as advisor, not vendor.',
              priority: 'medium',
            },
            {
              angle: 'On-Call Burnout & Platform Engineering',
              description: 'Address the human cost of poor infrastructure. Resonates emotionally with engineering leaders.',
              priority: 'medium',
            },
          ],
          // Competitor insights
          competitorInsights: {
            topCompetitors: ['Accenture Cloud', 'Slalom', 'Contino', '2nd Watch'],
            contentGapsVsCompetitors: [
              'No competitors have ROI calculators for cloud migration',
              'Limited technical deep-dives on Kubernetes cost optimization',
              'No one addressing mid-market specifically (all enterprise-focused)',
            ],
            differentiators: [
              'Fixed-price model vs time & materials',
              'Smaller team = faster decisions, senior engineers on every project',
              'Public case studies with actual metrics (competitors hide numbers)',
            ],
          },
        };

        // Generate demo projects
        projects = [
          {
            id: 'demo_proj_1',
            name: 'Technology Insights Blog',
            icon: '📝',
            description: 'Share industry expertise and thought leadership to establish authority in the technology space.',
            coverage: 'Blog content strategy',
            estimatedOpportunities: 45,
            selected: true,
          },
          {
            id: 'demo_proj_2',
            name: 'Product Knowledge Base',
            icon: '📚',
            description: 'Self-service documentation to help customers succeed and reduce support burden.',
            coverage: 'Help center content',
            estimatedOpportunities: 32,
            selected: false,
          },
        ];

        demoArticle = {
          title: 'The Future of Digital Transformation: Trends to Watch',
          preview: 'Discover the key trends shaping digital transformation in 2025 and how businesses can stay ahead of the curve.',
          outline: [
            'Introduction to Digital Transformation',
            'Key Trends for 2025',
            'AI and Automation',
            'Cloud-First Strategies',
            'Implementation Best Practices',
            'Conclusion',
          ],
          topicSuggestions: [
            'How to Build a Digital-First Culture',
            'ROI of Digital Transformation Initiatives',
            'Common Digital Transformation Mistakes to Avoid',
          ],
        };

      } else {
        // REAL MODE: Run actual analysis
        const analysisProfile = await analyzeWebsite(url, (stage, percent) => {
          const mappedPercent = Math.floor(percent * 0.8);
          setAnalysisProgress(mappedPercent);
          console.log(`[Onboarding] Analysis: ${stage} (${percent}% -> ${mappedPercent}%)`);
        });

        profile = analysisProfile;
        setAnalysisProgress(85);

        projects = await generateProjectSuggestions(profile);
        setAnalysisProgress(95);

        demoArticle = await generateDemoArticle(profile);
      }

      // Update session with results
      setSession(prev => prev ? {
        ...prev,
        businessProfile: profile,
        suggestedProjects: projects,
        selectedProject: projects.find(p => p.selected) || null,
        demoArticle,
        currentStep: 'profile_review',
      } : null);

      setAnalysisProgress(100);
    } catch (err: any) {
      console.error('[Onboarding] Analysis failed:', err);
      setError(err.message || 'Analysis failed. Please try again.');
      // Go back to URL input on error
      setSession(prev => prev ? {
        ...prev,
        currentStep: 'url_input',
      } : null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize session with existing profile (for logged-in users creating new projects)
  const initializeWithExistingProfile = useCallback((
    profile: BusinessProfile,
    orgId: string,
    channelRecs?: ChannelRecommendation[]
  ) => {
    console.log('[Onboarding] Initializing with existing profile for org:', orgId);

    const now = new Date();
    const expiry = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    const newSession: OnboardingSession = {
      sessionId: generateSessionId(),
      mode: 'existing',
      organizationId: orgId,
      websiteUrl: profile.websiteUrl || '',
      businessProfile: profile,
      channelRecommendations: channelRecs || [],
      selectedChannel: null,
      selectedProject: null,
      suggestedProjects: [],
      categories: [],
      subcategories: {},
      currentStep: 'profile_review', // Start at profile review for existing users
      createdAt: now,
      expiresAt: expiry,
    };

    setSession(newSession);
    saveSessionToStorage(newSession);
    setError(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<BusinessProfile>) => {
    setSession(prev => {
      if (!prev || !prev.businessProfile) return prev;
      return {
        ...prev,
        businessProfile: {
          ...prev.businessProfile,
          ...updates,
        },
      };
    });
  }, []);

  const regenerateProfileSection = useCallback(async (section: keyof BusinessProfile) => {
    // TODO: Implement regeneration of specific profile sections
    console.log('[Onboarding] Regenerating section:', section);
    setError('Regeneration not yet implemented');
  }, []);

  // ============================================================================
  // CHANNEL ACTIONS (new channel-first approach)
  // ============================================================================

  // Generate placeholder channel recommendations based on business profile
  const generateChannelRecommendations = useCallback(async () => {
    if (!session?.businessProfile) {
      setError('Please complete profile review first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = session.businessProfile;
      const industry = profile.industry.primary || 'Business';
      const businessName = profile.businessName || 'your company';

      // Generate placeholder channel recommendations based on business profile
      // In production, this would call an AI service
      const seed = industry.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = (min: number, max: number, offset: number = 0) => {
        const val = ((seed + offset) * 9301 + 49297) % 233280;
        return Math.floor(min + (val / 233280) * (max - min));
      };

      // Knowledge Base first - key for Answer Engine Optimization (AEO)
      const channels: ChannelRecommendation[] = [
        {
          id: 'channel_kb',
          channelType: 'knowledge_base' as ChannelType,
          title: `${industry} Answer Hub`,
          description: `The foundation of Answer Engine Optimization. When AI assistants like ChatGPT, Claude, or Google's AI answer questions about ${industry.toLowerCase()}, YOUR content becomes the source. Build a comprehensive library answering every question your customers ask—from basics to edge cases. This is how you get cited by AI.`,
          suggestedCategories: [
            'Common Questions',
            'How It Works',
            'Troubleshooting',
            'Comparisons',
            'Getting Started'
          ],
          targetKeywords: [
            { keyword: `what is ${industry.toLowerCase()}`, searchVolume: seededRandom(5000, 20000, 1) },
            { keyword: `how does ${industry.toLowerCase()} work`, searchVolume: seededRandom(3000, 12000, 2) },
            { keyword: `${industry.toLowerCase()} vs`, searchVolume: seededRandom(4000, 15000, 3) },
          ],
          selected: false,
          totalMonthlySearches: seededRandom(15000, 50000, 10),
        },
        {
          id: 'channel_blog',
          channelType: 'blog' as ChannelType,
          title: `${industry} Insights Blog`,
          description: `Establish thought leadership and capture search traffic. Share expert perspectives on ${industry.toLowerCase()} trends, publish original research, and create the definitive takes that journalists and AI models reference when covering your space.`,
          suggestedCategories: [
            'Industry Trends',
            'Expert Analysis',
            'Original Research',
            'Opinion & Commentary',
            'News & Updates'
          ],
          targetKeywords: [
            { keyword: `${industry.toLowerCase()} trends 2025`, searchVolume: seededRandom(2000, 8000, 4) },
            { keyword: `${industry.toLowerCase()} best practices`, searchVolume: seededRandom(1500, 5000, 5) },
            { keyword: `future of ${industry.toLowerCase()}`, searchVolume: seededRandom(2000, 10000, 6) },
          ],
          selected: false,
          totalMonthlySearches: seededRandom(8000, 25000, 11),
        },
        {
          id: 'channel_guides',
          channelType: 'guides' as ChannelType,
          title: `${industry} Learning Center`,
          description: `Comprehensive tutorials and step-by-step guides that rank for "how to" searches. When someone asks an AI "how do I..." in your space, these guides become the answer. Educational content that builds trust and captures high-intent traffic.`,
          suggestedCategories: [
            'Beginner Guides',
            'Step-by-Step Tutorials',
            'Advanced Techniques',
            'Best Practices',
            'Quick Tips'
          ],
          targetKeywords: [
            { keyword: `how to ${industry.toLowerCase()}`, searchVolume: seededRandom(4000, 18000, 7) },
            { keyword: `${industry.toLowerCase()} tutorial`, searchVolume: seededRandom(2500, 10000, 8) },
            { keyword: `${industry.toLowerCase()} guide`, searchVolume: seededRandom(3000, 12000, 9) },
          ],
          selected: false,
          totalMonthlySearches: seededRandom(12000, 40000, 12),
        },
        {
          id: 'channel_comparisons',
          channelType: 'archive' as ChannelType,
          title: `${industry} Comparison Hub`,
          description: `"X vs Y" and "Best X for Y" content that captures high-intent decision-stage traffic. When customers ask AI to compare options, your objective analysis becomes the trusted source. Build the definitive comparison resource in your space.`,
          suggestedCategories: [
            'Product Comparisons',
            'Best Of Lists',
            'Buyer\'s Guides',
            'Pros & Cons Analysis',
            'Use Case Breakdowns'
          ],
          targetKeywords: [
            { keyword: `best ${industry.toLowerCase()}`, searchVolume: seededRandom(5000, 25000, 13) },
            { keyword: `${industry.toLowerCase()} comparison`, searchVolume: seededRandom(2000, 8000, 14) },
            { keyword: `${industry.toLowerCase()} reviews`, searchVolume: seededRandom(3000, 15000, 15) },
          ],
          selected: false,
          totalMonthlySearches: seededRandom(10000, 45000, 16),
        },
      ];

      setSession(prev => prev ? {
        ...prev,
        channelRecommendations: channels,
      } : null);

    } catch (err: any) {
      console.error('[Onboarding] Channel generation failed:', err);
      setError(err.message || 'Failed to generate channel recommendations');
    } finally {
      setLoading(false);
    }
  }, [session?.businessProfile]);

  const selectChannel = useCallback((id: string) => {
    setSession(prev => {
      if (!prev) return prev;

      const updatedChannels = prev.channelRecommendations.map(c => ({
        ...c,
        selected: c.id === id,
      }));

      const selectedChannel = updatedChannels.find(c => c.id === id) || null;

      // Also create a project from the selected channel
      const projectFromChannel: ProjectSuggestion | null = selectedChannel ? {
        id: `proj_${selectedChannel.id}`,
        name: selectedChannel.title,
        icon: selectedChannel.channelType === 'blog' ? '📝' :
              selectedChannel.channelType === 'knowledge_base' ? '📚' :
              selectedChannel.channelType === 'guides' ? '📖' :
              selectedChannel.channelType === 'archive' ? '🗂️' : '🏢',
        description: selectedChannel.description,
        coverage: `${selectedChannel.channelType} channel`,
        estimatedOpportunities: selectedChannel.suggestedCategories.length * 10,
        selected: true,
      } : null;

      return {
        ...prev,
        channelRecommendations: updatedChannels,
        selectedChannel,
        selectedProject: projectFromChannel,
      };
    });
  }, []);

  // ============================================================================
  // PROJECT ACTIONS
  // ============================================================================

  const selectProject = useCallback((id: string) => {
    setSession(prev => {
      if (!prev) return prev;

      const updatedProjects = prev.suggestedProjects.map(p => ({
        ...p,
        selected: p.id === id,
      }));

      return {
        ...prev,
        suggestedProjects: updatedProjects,
        selectedProject: updatedProjects.find(p => p.id === id) || null,
      };
    });
  }, []);

  const createCustomProject = useCallback((name: string, description: string) => {
    setSession(prev => {
      if (!prev) return prev;

      const customProject: ProjectSuggestion = {
        id: `custom_${Date.now()}`,
        name,
        icon: '📁',
        description,
        coverage: 'Custom project',
        estimatedOpportunities: 50,
        selected: true,
      };

      const updatedProjects = prev.suggestedProjects.map(p => ({
        ...p,
        selected: false,
      }));

      return {
        ...prev,
        suggestedProjects: [...updatedProjects, customProject],
        selectedProject: customProject,
      };
    });
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<ProjectSuggestion>) => {
    setSession(prev => {
      if (!prev) return prev;

      const updatedProjects = prev.suggestedProjects.map(p =>
        p.id === id ? { ...p, ...updates } : p
      );

      // Also update selectedProject if it's the one being modified
      const selectedProject = prev.selectedProject?.id === id
        ? { ...prev.selectedProject, ...updates }
        : prev.selectedProject;

      return {
        ...prev,
        suggestedProjects: updatedProjects,
        selectedProject,
      };
    });
  }, []);

  // ============================================================================
  // CATEGORY ACTIONS
  // ============================================================================

  const toggleCategory = useCallback((id: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === id ? { ...c, selected: !c.selected } : c
        ),
      };
    });
  }, []);

  const addCustomCategory = useCallback((name: string, description: string) => {
    setSession(prev => {
      if (!prev) return prev;

      const customCategory: CategorySuggestion = {
        id: `custom_${Date.now()}`,
        name,
        description,
        demandScore: 50,
        demandLevel: 'Medium',
        targetMatchScore: 75,
        audienceMatch: 'high',
        competitionLevel: 'medium',
        estimatedArticles: 10,
        selected: true,
        isUserAdded: true,
      };

      return {
        ...prev,
        categories: [...prev.categories, customCategory],
      };
    });
  }, []);

  const removeCategory = useCallback((id: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.filter(c => c.id !== id),
        subcategories: (() => {
          const newSubs = { ...prev.subcategories };
          delete newSubs[id];
          return newSubs;
        })(),
      };
    });
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<CategorySuggestion>) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
      };
    });
  }, []);

  const generateMoreCategories = useCallback(async () => {
    if (!session?.businessProfile || !session?.selectedProject) {
      setError('Please complete profile review first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newCategories = await generateOnboardingCategories(
        session.businessProfile,
        session.selectedProject.name,
        5
      );

      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: [...prev.categories, ...newCategories],
        };
      });
    } catch (err: any) {
      console.error('[Onboarding] Category generation failed:', err);
      setError(err.message || 'Failed to generate categories');
    } finally {
      setLoading(false);
    }
  }, [session?.businessProfile, session?.selectedProject]);

  // ============================================================================
  // SUBCATEGORY ACTIONS
  // ============================================================================

  const generateSubcategories = useCallback(async (categoryId: string) => {
    const category = session?.categories.find(c => c.id === categoryId);
    if (!category) {
      setError('Category not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the existing gemini service to generate subcategories
      const suggestions = await suggestSubcategories(
        session?.businessProfile?.industry.primary || 'General',
        category.name
      );

      const subcategories: SubcategorySuggestion[] = suggestions.map((s, index) => ({
        id: `sub_${categoryId}_${index}_${Date.now()}`,
        parentCategoryId: categoryId,
        name: s.name,
        description: s.description,
        demandScore: 50 + Math.floor(Math.random() * 40), // 50-90
        demandLevel: 'Medium-High' as const,
        estimatedArticles: 8 + Math.floor(Math.random() * 12), // 8-20
        selected: true,
      }));

      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          subcategories: {
            ...prev.subcategories,
            [categoryId]: subcategories,
          },
        };
      });
    } catch (err: any) {
      console.error('[Onboarding] Subcategory generation failed:', err);
      setError(err.message || 'Failed to generate subcategories');
    } finally {
      setLoading(false);
    }
  }, [session?.categories, session?.businessProfile]);

  const toggleSubcategory = useCallback((categoryId: string, subcategoryId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const subs = prev.subcategories[categoryId] || [];
      return {
        ...prev,
        subcategories: {
          ...prev.subcategories,
          [categoryId]: subs.map(s =>
            s.id === subcategoryId ? { ...s, selected: !s.selected } : s
          ),
        },
      };
    });
  }, []);

  const removeSubcategory = useCallback((categoryId: string, subcategoryId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const subs = prev.subcategories[categoryId] || [];
      return {
        ...prev,
        subcategories: {
          ...prev.subcategories,
          [categoryId]: subs.filter(s => s.id !== subcategoryId),
        },
      };
    });
  }, []);

  const updateSubcategory = useCallback((categoryId: string, subcategoryId: string, updates: Partial<SubcategorySuggestion>) => {
    setSession(prev => {
      if (!prev) return prev;
      const subs = prev.subcategories[categoryId] || [];
      return {
        ...prev,
        subcategories: {
          ...prev.subcategories,
          [categoryId]: subs.map(s =>
            s.id === subcategoryId ? { ...s, ...updates } : s
          ),
        },
      };
    });
  }, []);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToStep = useCallback((step: OnboardingStep) => {
    setSession(prev => prev ? { ...prev, currentStep: step } : null);
    setError(null);
  }, []);

  const nextStep = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;

      const stepOrder = getStepOrder(prev.mode);
      let currentIndex = stepOrder.indexOf(prev.currentStep);
      let nextIndex = currentIndex + 1;

      const nextStepName = stepOrder[Math.min(nextIndex, stepOrder.length - 1)];

      // Ensure selectedProject is set from channel selection
      let selectedProject = prev.selectedProject;
      if (!selectedProject && prev.selectedChannel) {
        selectedProject = {
          id: `proj_${prev.selectedChannel.id}`,
          name: prev.selectedChannel.title,
          icon: prev.selectedChannel.channelType === 'blog' ? '📝' :
                prev.selectedChannel.channelType === 'knowledge_base' ? '📚' :
                prev.selectedChannel.channelType === 'guides' ? '📖' :
                prev.selectedChannel.channelType === 'archive' ? '🗂️' : '🏢',
          description: prev.selectedChannel.description,
          coverage: `${prev.selectedChannel.channelType} channel`,
          estimatedOpportunities: prev.selectedChannel.suggestedCategories.length * 10,
          selected: true,
        };
      }

      return {
        ...prev,
        currentStep: nextStepName,
        selectedProject,
      };
    });
    setError(null);
  }, []);

  const previousStep = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;

      const stepOrder = getStepOrder(prev.mode);
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);

      return { ...prev, currentStep: stepOrder[prevIndex] };
    });
    setError(null);
  }, []);

  // ============================================================================
  // COMPLETION
  // ============================================================================

  const completeOnboarding = useCallback(async (
    email: string,
    password: string,
    displayName: string
  ) => {
    // This will be called after account creation to finalize the onboarding
    // The actual account creation happens in the AccountCreationStep component
    // which uses the AuthContext

    setSession(prev => prev ? { ...prev, currentStep: 'complete' } : null);

    // Clear session from storage after completion
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(createEmptySession(mode, organizationId));
    setError(null);
    setAnalysisProgress(0);
  }, [mode, organizationId]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: OnboardingContextType = {
    session,
    loading,
    error,
    analysisProgress,
    startAnalysis,
    initializeWithExistingProfile,
    updateProfile,
    regenerateProfileSection,
    // Channel actions
    selectChannel,
    generateChannelRecommendations,
    // Project actions
    selectProject,
    createCustomProject,
    updateProject,
    toggleCategory,
    addCustomCategory,
    removeCategory,
    updateCategory,
    generateMoreCategories,
    generateSubcategories,
    toggleSubcategory,
    removeSubcategory,
    updateSubcategory,
    goToStep,
    nextStep,
    previousStep,
    completeOnboarding,
    clearSession,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
