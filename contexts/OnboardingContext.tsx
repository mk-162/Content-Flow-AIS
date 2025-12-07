import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  OnboardingContextType,
  OnboardingSession,
  OnboardingStep,
  OnboardingMode,
  BusinessProfile,
  ProjectSuggestion,
  CategorySuggestion,
  SubcategorySuggestion,
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

const STORAGE_KEY = 'contentflow_onboarding_session';
const SESSION_EXPIRY_HOURS = 24;

const STEP_ORDER: OnboardingStep[] = [
  'url_input',
  'analyzing',
  'profile_review',
  'project_selection',
  'category_generation',
  'subcategory_generation', // Moved before account_creation so subcategories are saved
  'account_creation',
  'workspace_intro',
  'complete',
];

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

  return {
    sessionId: generateSessionId(),
    mode,
    organizationId,
    websiteUrl: '',
    businessProfile: null,
    selectedProject: null,
    suggestedProjects: [],
    categories: [],
    subcategories: {},
    currentStep: 'url_input',
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

  const startAnalysis = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      // Update session with URL and move to analyzing step
      setSession(prev => prev ? {
        ...prev,
        websiteUrl: url,
        currentStep: 'analyzing',
      } : null);

      // Run the analysis with progress updates
      // We map the analysis progress (which is 0-100 of the analysis phase)
      // to 0-80% of the TOTAL loading time, leaving 20% for the subsequent generation steps
      const profile = await analyzeWebsite(url, (stage, percent) => {
        // Cap analysis phase at 80%
        const mappedPercent = Math.floor(percent * 0.8);
        setAnalysisProgress(mappedPercent);
        console.log(`[Onboarding] Analysis: ${stage} (${percent}% -> ${mappedPercent}%)`);
      });

      // Analysis complete, now moving to project suggestions
      setAnalysisProgress(85);

      // Generate project suggestions
      const projects = await generateProjectSuggestions(profile);

      // Projects generated, now moving to demo article
      setAnalysisProgress(95);

      // Generate demo article
      const demoArticle = await generateDemoArticle(profile);

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

      const mode = prev.mode || 'client';
      let currentIndex = STEP_ORDER.indexOf(prev.currentStep);
      let nextIndex = currentIndex + 1;

      // Skip steps based on mode
      while (nextIndex < STEP_ORDER.length) {
        const nextStepName = STEP_ORDER[nextIndex];

        // In project mode, skip project_selection and account_creation
        if (mode === 'project' && (nextStepName === 'project_selection' || nextStepName === 'account_creation')) {
          nextIndex++;
          continue;
        }

        // In project mode, skip workspace_intro (returning users already know the workspace)
        if (mode === 'project' && nextStepName === 'workspace_intro') {
          nextIndex++;
          continue;
        }

        break;
      }

      const nextStepName = STEP_ORDER[Math.min(nextIndex, STEP_ORDER.length - 1)];

      // Ensure selectedProject is set before entering category_generation
      // This handles both project mode (where project_selection is skipped) and
      // cases where no project was pre-selected
      let selectedProject = prev.selectedProject;
      if (nextStepName === 'category_generation' && !selectedProject) {
        // Try to find a pre-selected project from suggestions
        selectedProject = prev.suggestedProjects.find(p => p.selected) || null;

        // If still null but we have suggestions, select the first one
        if (!selectedProject && prev.suggestedProjects.length > 0) {
          selectedProject = { ...prev.suggestedProjects[0], selected: true };
        }

        // If still null but we have a business profile, create a default project
        if (!selectedProject && prev.businessProfile) {
          selectedProject = {
            id: `default_${Date.now()}`,
            name: prev.businessProfile.industry.primary || 'Content Project',
            icon: '📁',
            description: `Content strategy for ${prev.businessProfile.industry.primary || 'your business'}`,
            coverage: 'Full coverage',
            estimatedOpportunities: 50,
            selected: true,
          };
        }
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

      const mode = prev.mode || 'client';
      let currentIndex = STEP_ORDER.indexOf(prev.currentStep);
      let prevIndex = currentIndex - 1;

      // Skip steps based on mode
      while (prevIndex >= 0) {
        const prevStepName = STEP_ORDER[prevIndex];

        // In project mode, skip project_selection and account_creation
        if (mode === 'project' && (prevStepName === 'project_selection' || prevStepName === 'account_creation')) {
          prevIndex--;
          continue;
        }

        // In project mode, skip workspace_intro
        if (mode === 'project' && prevStepName === 'workspace_intro') {
          prevIndex--;
          continue;
        }

        break;
      }

      return { ...prev, currentStep: STEP_ORDER[Math.max(prevIndex, 0)] };
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
    updateProfile,
    regenerateProfileSection,
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
