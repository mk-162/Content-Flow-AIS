import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import { Category, Project, ProjectMember, ProjectMemberRole, BusinessProfile } from '../types';
import { URLInputStep } from '../components/onboarding/URLInputStep';
import { AnalysisLoadingStep } from '../components/onboarding/AnalysisLoadingStep';
import { ProfileReviewStep } from '../components/onboarding/ProfileReviewStep';
import { ChannelRecommendationStep } from '../components/onboarding/ChannelRecommendationStep';
import { ProjectSelectionStep } from '../components/onboarding/ProjectSelectionStep';
import { CategoryGenerationStep } from '../components/onboarding/CategoryGenerationStep';
import { AccountCreationStep } from '../components/onboarding/AccountCreationStep';
import { SubcategoryGenerationStep } from '../components/onboarding/SubcategoryGenerationStep';
import { WorkspaceIntroStep } from '../components/onboarding/WorkspaceIntroStep';
import { OnboardingStep } from '../types';
import MissionLogo from '../Mission.svg';

// ============================================================================
// STEP COMPONENTS MAP
// ============================================================================

const StepComponents: Record<OnboardingStep, React.FC> = {
  url_input: URLInputStep,
  analyzing: AnalysisLoadingStep,
  profile_review: ProfileReviewStep,
  channel_recommendations: ChannelRecommendationStep,
  project_selection: ProjectSelectionStep,
  category_generation: CategoryGenerationStep,
  account_creation: AccountCreationStep,
  subcategory_generation: SubcategoryGenerationStep,
  workspace_intro: WorkspaceIntroStep,
  demo_output: () => null, // Removed - kept for type compatibility
  complete: () => null, // Redirect happens in context
};

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

// Steps for new users (not logged in)
const CLIENT_MODE_STEPS: OnboardingStep[] = [
  'url_input',
  'profile_review',
  'channel_recommendations',
  'account_creation',
];

// Steps for existing users (logged in, creating new project)
const EXISTING_USER_STEPS: OnboardingStep[] = [
  'profile_review',
  'channel_recommendations',
];

// Legacy project mode (same as client for now)
const PROJECT_MODE_STEPS: OnboardingStep[] = [
  'url_input',
  'profile_review',
  'channel_recommendations',
  'account_creation',
];

// Get visible steps based on mode
const getVisibleSteps = (mode: string): OnboardingStep[] => {
  if (mode === 'existing') return EXISTING_USER_STEPS;
  if (mode === 'project') return PROJECT_MODE_STEPS;
  return CLIENT_MODE_STEPS;
};

const STEP_LABELS: Record<string, string> = {
  url_input: 'Analyze',
  profile_review: 'Profile',
  channel_recommendations: 'Channels',
  project_selection: 'Project',
  category_generation: 'Categories',
  subcategory_generation: 'Subcategories',
  account_creation: 'Account',
};

const getDemandColor = (level: string) => {
  switch (level) {
    case 'high':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-slate-600';
    default:
      return 'bg-slate-700';
  }
};

// ============================================================================
// STEP COUNTER (Header Badge)
// ============================================================================

const StepCounter: React.FC = () => {
  const { session } = useOnboarding();
  if (!session) return null;

  const currentStep = session.currentStep;
  const mode = session.mode || 'client';
  const VISIBLE_STEPS = getVisibleSteps(mode);
  const currentIndex = VISIBLE_STEPS.indexOf(currentStep);

  // Don't show counter on analyzing, demo_output, complete, or workspace_intro steps
  if (
    currentStep === 'analyzing' ||
    currentStep === 'demo_output' ||
    currentStep === 'workspace_intro' ||
    currentStep === 'complete' ||
    currentIndex < 0
  ) {
    return null;
  }

  const totalSteps = VISIBLE_STEPS.length;
  const stepNumber = currentIndex + 1;

  return (
    <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-700">
      <span className="text-sm text-slate-500">
        Step <span className="text-white font-medium">{stepNumber}</span> of{' '}
        <span className="text-white font-medium">{totalSteps}</span>
      </span>
    </div>
  );
};

const ProgressIndicator: React.FC = () => {
  const { session } = useOnboarding();
  if (!session) return null;

  const currentStep = session.currentStep;
  const mode = session.mode || 'client';
  const VISIBLE_STEPS = getVisibleSteps(mode);
  const currentIndex = VISIBLE_STEPS.indexOf(currentStep);

  // Don't show progress on analyzing, demo_output, or workspace_intro steps
  if (currentStep === 'analyzing' || currentStep === 'demo_output' || currentStep === 'workspace_intro') {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {VISIBLE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''}
                  ${isPending ? 'bg-slate-800 text-slate-500' : ''}
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={`
                  text-xs font-medium hidden sm:block
                  ${isCurrent ? 'text-cyan-400' : 'text-slate-500'}
                `}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {index < VISIBLE_STEPS.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 transition-colors duration-300
                  ${index < currentIndex ? 'bg-cyan-500' : 'bg-slate-700'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================================
// ONBOARDING CONTENT
// ============================================================================

const OnboardingContent: React.FC = () => {
  const { session, error, clearSession, initializeWithExistingProfile, nextStep } = useOnboarding();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrganization();
  const { projects, loading: projectsLoading } = useProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const [existingUserInitialized, setExistingUserInitialized] = useState(false);

  const currentStep = session?.currentStep || 'url_input';
  const CurrentStepComponent = StepComponents[currentStep];

  // Check if this is an existing user creating a new project (from URL param or logged-in state)
  const isExistingUserMode = searchParams.get('mode') === 'existing';

  // For existing user mode, wait for all data to load
  const isLoadingExistingData = isExistingUserMode && (authLoading || orgLoading || projectsLoading);

  // Initialize existing user with their stored business profile
  useEffect(() => {
    // Don't run until all data is loaded
    if (isExistingUserMode && !isLoadingExistingData && !existingUserInitialized) {
      console.log('[Onboarding] Existing mode - checking for profile...', {
        user: !!user,
        currentOrg: !!currentOrg,
        projects: projects.length,
        projectsWithProfile: projects.filter(p => p.businessProfile).length
      });

      if (!user || !currentOrg) {
        // User not logged in or no org - redirect to login
        console.warn('[Onboarding] No user or org for existing mode, redirecting to login');
        navigate('/login');
        return;
      }

      // Get business profile from first project that has one
      const existingProject = projects.find(p => p.businessProfile);
      let existingProfile = existingProject?.businessProfile;

      // If no project has businessProfile, try to construct one from org data
      if (!existingProfile && currentOrg) {
        console.log('[Onboarding] No project profile found, constructing from org data...');

        // Build a minimal profile from organization data if available
        if (currentOrg.targetAudience || currentOrg.brandMessage || currentOrg.website) {
          existingProfile = {
            id: `profile_${Date.now()}`,
            websiteUrl: currentOrg.website || projects[0]?.websiteUrl || '',
            analyzedAt: Timestamp.now(),
            businessName: currentOrg.name || '',
            businessSummary: currentOrg.brandMessage || '',
            industry: {
              primary: '',
              secondary: '',
              tertiary: '',
              confidence: 50,
            },
            targetAudience: currentOrg.targetAudience || {
              primary: '',
              demographics: { ageRange: '', income: '', geographic: [] },
            },
            offerings: {
              type: 'services',
              categories: [],
            },
            brandVoice: {
              tone: [],
              style: '',
              personality: [],
              uniqueSellingPoints: [],
            },
            contentStyle: {
              types: [],
              averageLength: 'medium',
              technicalLevel: 'intermediate',
            },
            opportunityScore: {
              overall: 50,
              contentGaps: 0,
              potentialTraffic: 'Unknown',
            },
          } as BusinessProfile;
        }
      }

      // For existing users, ALWAYS go to profile review - create minimal profile if needed
      if (!existingProfile) {
        console.log('[Onboarding] Creating minimal profile for existing user...');
        existingProfile = {
          id: `profile_${Date.now()}`,
          websiteUrl: projects[0]?.websiteUrl || currentOrg.website || '',
          analyzedAt: Timestamp.now(),
          businessName: currentOrg.name?.replace(/'s Organization$/, '') || '',
          businessSummary: currentOrg.brandMessage || '',
          industry: {
            primary: '',
            secondary: '',
            tertiary: '',
            confidence: 0,
          },
          targetAudience: currentOrg.targetAudience || {
            primary: '',
            demographics: { ageRange: '', income: '', geographic: [] },
          },
          offerings: {
            type: 'services',
            categories: [],
          },
          brandVoice: {
            tone: [],
            style: '',
            personality: [],
            uniqueSellingPoints: [],
          },
          contentStyle: {
            types: [],
            averageLength: 'medium',
            technicalLevel: 'intermediate',
          },
          opportunityScore: {
            overall: 0,
            contentGaps: 0,
            potentialTraffic: 'Not analyzed yet',
          },
        } as BusinessProfile;
      }

      console.log('[Onboarding] Initializing with profile for existing user...');
      // Clear any existing session first, then initialize with existing profile
      clearSession();
      // Small delay to ensure session is cleared before reinitializing
      setTimeout(() => {
        initializeWithExistingProfile(
          existingProfile!,
          currentOrg.id,
          currentOrg.channelRecommendations || []
        );
        setExistingUserInitialized(true);
      }, 100);
    }
  }, [isExistingUserMode, isLoadingExistingData, user, currentOrg, projects, existingUserInitialized, initializeWithExistingProfile, clearSession, navigate]);

  // Check for existing session on mount (once session is loaded)
  useEffect(() => {
    if (session && !checkComplete && !isExistingUserMode) {
      // Only prompt if we have a URL and aren't on the first step
      if (session.currentStep !== 'url_input' && session.websiteUrl) {
        setShowResumePrompt(true);
      }
      setCheckComplete(true);
    }
  }, [session, checkComplete, isExistingUserMode]);

  const handleStartFresh = () => {
    clearSession();
    setShowResumePrompt(false);
  };

  const handleResume = () => {
    setShowResumePrompt(false);
  };

  // Handle project mode completion - save data and redirect
  useEffect(() => {
    const saveProjectData = async () => {
      if (
        currentStep === 'complete' &&
        session?.mode === 'project' &&
        session?.organizationId &&
        !isSaving
      ) {
        setIsSaving(true);

        try {
          const orgId = session.organizationId;
          const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const selectedProject = session.selectedProject;

          // Create project
          const newProject = {
            organizationId: orgId,
            name: selectedProject?.name || session.businessProfile?.industry.primary || 'New Project',
            description: selectedProject?.description || 'Created via AI-powered setup',
            createdBy: user?.id || 'unknown',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            settings: { autoPublish: false },
            businessProfile: session.businessProfile || null,
          };

          await setDoc(doc(db, `organizations/${orgId}/projects`, projectId), newProject);

          // Save categories
          const selectedCategories = session.categories.filter(c => c.selected) || [];
          const categoryIdMap = new Map<string, string>();

          for (let i = 0; i < selectedCategories.length; i++) {
            const cat = selectedCategories[i];
            const categoryId = `cat_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
            categoryIdMap.set(cat.id, categoryId);

            const newCategory: Omit<Category, 'id'> = {
              projectId,
              organizationId: orgId,
              name: cat.name,
              description: cat.description || '',
              parentId: null,
              order: i,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            await setDoc(
              doc(db, `organizations/${orgId}/projects/${projectId}/categories`, categoryId),
              newCategory
            );
          }

          // Save subcategories
          const sessionSubcategories = session.subcategories || {};
          let subcategoryOrder = 0;
          for (const [sessionCategoryId, subs] of Object.entries(sessionSubcategories)) {
            const parentCategoryId = categoryIdMap.get(sessionCategoryId);
            if (!parentCategoryId) continue;

            for (const sub of subs) {
              if (!sub.selected) continue;

              const subcategoryId = `cat_${Date.now()}_sub_${subcategoryOrder}_${Math.random().toString(36).substr(2, 9)}`;

              const newSubcategory: Omit<Category, 'id'> = {
                projectId,
                organizationId: orgId,
                name: sub.name,
                description: sub.description || '',
                parentId: parentCategoryId,
                order: subcategoryOrder,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              };

              await setDoc(
                doc(db, `organizations/${orgId}/projects/${projectId}/categories`, subcategoryId),
                newSubcategory
              );

              subcategoryOrder++;
            }
          }

          // Set current project in localStorage
          localStorage.setItem(`currentProjectId_${orgId}`, projectId);

          // Clear session and redirect
          clearSession();
          navigate('/');
        } catch (err) {
          console.error('[OnboardingFlow] Error saving project:', err);
          setIsSaving(false);
        }
      }
    };

    saveProjectData();
  }, [currentStep, session, user, isSaving, clearSession, navigate]);

  // Handle existing user mode completion - create project in existing org
  useEffect(() => {
    const createProjectForExistingUser = async () => {
      if (
        currentStep === 'complete' &&
        session?.mode === 'existing' &&
        session?.organizationId &&
        user &&
        !isSaving
      ) {
        setIsSaving(true);

        try {
          const orgId = session.organizationId;
          const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const selectedChannel = session.selectedChannel;

          // Create new project from channel selection
          const newProject: Omit<Project, 'id'> = {
            organizationId: orgId,
            name: selectedChannel?.title || 'New Content Project',
            description: selectedChannel?.description || 'Created via AI-powered channel recommendation',
            createdBy: user.id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            channelType: selectedChannel?.channelType,
            channelRecommendations: session.channelRecommendations,
            suggestedCategories: selectedChannel?.suggestedCategories || [],
            businessProfile: session.businessProfile || undefined,
            settings: { autoPublish: false },
          };

          // Create project membership
          const projMembershipId = `${projectId}_${user.id}`;
          const projMembership: Omit<ProjectMember, 'id'> = {
            organizationId: orgId,
            projectId,
            userId: user.id,
            role: ProjectMemberRole.ADMIN,
            addedBy: user.id,
            addedAt: Timestamp.now(),
          };

          // Use batch write for atomic creation
          const batch = writeBatch(db);
          batch.set(doc(db, `organizations/${orgId}/projects`, projectId), newProject);
          batch.set(doc(db, 'projectMembers', projMembershipId), projMembership);
          await batch.commit();

          // Set current project in localStorage
          localStorage.setItem(`currentProjectId_${orgId}`, projectId);

          // Clear session and redirect to workspace
          clearSession();
          navigate('/');
        } catch (err) {
          console.error('[OnboardingFlow] Error creating project for existing user:', err);
          setIsSaving(false);
        }
      }
    };

    createProjectForExistingUser();
  }, [currentStep, session, user, isSaving, clearSession, navigate]);

  // Show loading state while loading existing user data
  if (isExistingUserMode && (isLoadingExistingData || !existingUserInitialized)) {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading your business profile...</p>
          <p className="text-sm text-slate-500 mt-1">Preparing project wizard</p>
        </div>
      </div>
    );
  }

  // Show loading state while saving project data
  if (isSaving) {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Creating your project...</p>
          <p className="text-sm text-slate-500 mt-1">Saving categories and subcategories</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f172a] text-white flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 -z-10" />

      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={MissionLogo} alt="MissionContent" className="h-10" />
            <StepCounter />
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-slate-500">{user.email}</span>
                <a
                  href="/projects"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Back to Projects
                </a>
              </>
            ) : (
              <a
                href="/login"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Already have an account? Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: '#475569 #0f172a',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">

          {/* Resume Prompt Modal */}
          <AnimatePresence>
            {showResumePrompt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-slate-800 border border-slate-700 p-6 shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-4 text-cyan-400">
                    <div className="p-2 bg-cyan-500/10 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Restore Previous Progress?</h2>
                  </div>

                  <p className="text-slate-300 mb-6 leading-relaxed">
                    We found an unfinished analysis for <span className="text-white font-semibold">{session?.websiteUrl}</span> saved in this browser.
                  </p>

                  <div className="bg-slate-900/50 p-3 rounded mb-6 text-xs text-slate-400 border border-slate-700/50 flex gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    <span>This data is stored locally on your device and hasn't been saved to an account yet.</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleResume}
                      className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors"
                    >
                      Continue Previous Session
                    </button>
                    <button
                      onClick={handleStartFresh}
                      className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase tracking-wider transition-colors"
                    >
                      Start Fresh
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step content with animations */}
          <AnimatePresence mode="wait">
            {!showResumePrompt && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentStepComponent />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>MissionContent - AI-Powered Content Strategy</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const OnboardingFlow: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
};

export default OnboardingFlow;
