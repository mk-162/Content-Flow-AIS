import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { doc, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Organization,
  OrganizationMember,
  Project,
  ProjectMember,
  SubscriptionTier,
  OrgMemberRole,
  ProjectMemberRole,
  TIER_LIMITS,
} from '../../types';
import { generateAndCreateCategories } from '../../services/categoryGenerationService';

// Demo account constants
const DEMO_FREE_CREDITS = 50;

// ============================================================================
// PASSWORD STRENGTH
// ============================================================================

const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
  if (password.length < 6) return { strength: 'Too short', color: 'bg-red-500', width: '20%' };
  if (password.length < 8) return { strength: 'Weak', color: 'bg-orange-500', width: '40%' };

  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (password.length >= 10 && score >= 3) return { strength: 'Strong', color: 'bg-green-500', width: '100%' };
  if (password.length >= 8 && score >= 2) return { strength: 'Moderate', color: 'bg-yellow-500', width: '70%' };
  return { strength: 'Weak', color: 'bg-orange-500', width: '40%' };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AccountCreationStep: React.FC = () => {
  const { session, previousStep, clearSession, nextStep } = useOnboarding();
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user is already authenticated, skip this step
  useEffect(() => {
    if (!authLoading && user) {
      console.log('[AccountCreationStep] User already authenticated, skipping to complete');
      nextStep(); // Will go to 'complete' step
    }
  }, [user, authLoading, nextStep]);

  const channelName = session?.selectedChannel?.title || 'Your Channel';
  const channelType = session?.selectedChannel?.channelType || 'blog';
  const businessName = session?.businessProfile?.businessName || 'Your Business';
  const totalKeywordDemand = session?.selectedChannel?.totalMonthlySearches || 0;

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Shared function to create org, project, and redirect to workspace
  const createAccountData = async (userId: string, displayName: string) => {
    // Create organization for the new user
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orgName = session?.businessProfile?.industry.primary
      ? `${displayName}'s ${session.businessProfile.industry.primary}`
      : `${displayName}'s Organization`;

    const newOrg: Omit<Organization, 'id'> = {
      name: orgName,
      ownerId: userId,
      subscriptionTier: SubscriptionTier.FREE,
      settings: {
        allowUserInvites: true,
        maxProjects: TIER_LIMITS[SubscriptionTier.FREE].maxProjects,
        maxUsersPerProject: TIER_LIMITS[SubscriptionTier.FREE].maxUsersPerProject,
      },
      // Demo account flag and credits
      isDemo: true,
      freeCredits: DEMO_FREE_CREDITS,
      creditsUsed: 0,
      // Populate defaults from business profile
      targetAudience: session?.businessProfile?.targetAudience ? {
        primary: session.businessProfile.targetAudience.primary,
        secondary: session.businessProfile.targetAudience.secondary || '',
        demographics: {
          ageRange: session.businessProfile.targetAudience.demographics.ageRange,
          income: session.businessProfile.targetAudience.demographics.income,
          geographic: session.businessProfile.targetAudience.demographics.geographic
        }
      } : undefined,
      brandCompliance: session?.businessProfile?.compliance || '',
      brandMessage: session?.businessProfile?.businessSummary || '',
      // Store ALL channel recommendations for upsell on dashboard
      channelRecommendations: session?.channelRecommendations || [],
      // Mark the selected channel as used (for Channel Shortcuts feature)
      usedChannelRecommendationIds: session?.selectedChannel ? [session.selectedChannel.id] : [],
      // Store unselected project suggestions for upsell on projects page
      suggestedProjects: (session?.suggestedProjects || [])
        .filter(p => !p.selected)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          icon: p.icon,
          coverage: p.coverage,
          estimatedOpportunities: p.estimatedOpportunities,
        })),
      systemPrompts: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Add user as organization owner
    const orgMembershipId = `${orgId}_${userId}`;
    const orgMembership: Omit<OrganizationMember, 'id'> = {
      organizationId: orgId,
      userId: userId,
      role: OrgMemberRole.OWNER,
      invitedBy: userId,
      invitedAt: Timestamp.now(),
      joinedAt: Timestamp.now(),
    };

    // Create project from channel selection
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const selectedChannel = session?.selectedChannel;

    const newProject: Omit<Project, 'id'> = {
      organizationId: orgId,
      name: selectedChannel?.title || 'My First Project',
      description: selectedChannel?.description || 'Content project created during onboarding',
      channelType: selectedChannel?.channelType || 'blog',
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      websiteUrl: session?.websiteUrl,
      businessProfile: session?.businessProfile,
      // Store channel recommendations for later use
      channelRecommendations: session?.channelRecommendations,
      suggestedCategories: selectedChannel?.suggestedCategories || [],
      settings: {
        autoPublish: false,
      },
    };

    // Add user as project admin
    const projMembershipId = `${projectId}_${userId}`;
    const projMembership: Omit<ProjectMember, 'id'> = {
      organizationId: orgId,
      projectId,
      userId: userId,
      role: ProjectMemberRole.ADMIN,
      addedBy: userId,
      addedAt: Timestamp.now(),
    };

    // Use batch write for atomic document creation
    // This ensures all documents are created together or none at all
    // Prevents permissions issues from partial document creation
    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', orgId), newOrg);
    batch.set(doc(db, 'organizationMembers', orgMembershipId), orgMembership);
    batch.set(doc(db, `organizations/${orgId}/projects`, projectId), newProject);
    batch.set(doc(db, 'projectMembers', projMembershipId), projMembership);
    await batch.commit();

    // Set localStorage for current org and project so MainWorkspace loads them
    localStorage.setItem('currentOrganizationId', orgId);
    localStorage.setItem(`currentProjectId_${orgId}`, projectId);

    // Set flag for new user onboarding tooltip
    localStorage.setItem('showOnboardingTooltip', 'true');

    // Generate AI-powered categories with descriptions (2 parents + 3 subs each)
    // This runs after the project is created so categories are ready when user lands on workspace
    if (session?.businessProfile) {
      console.log('[AccountCreation] Generating AI-powered categories...');
      try {
        const result = await generateAndCreateCategories(
          projectId,
          orgId,
          session.businessProfile,
          selectedChannel?.title || 'Content Channel'
        );
        console.log('[AccountCreation] Category generation result:', result);

        // Notify user if fallback categories were used
        if (!result.success || result.error) {
          localStorage.setItem('categoryGenerationWarning',
            result.error || 'AI categories unavailable - generic categories were created instead.');
        }
      } catch (catError: any) {
        console.error('[AccountCreation] Category generation failed:', catError);
        // Store warning for display on workspace - don't block account creation
        localStorage.setItem('categoryGenerationWarning',
          `Category generation failed: ${catError.message || 'Unknown error'}. You can add categories manually in your workspace.`);
      }
    }

    // Clear onboarding session and redirect to workspace
    clearSession();
    navigate('/');
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      if (!user) {
        throw new Error('Google sign-in failed');
      }

      await createAccountData(user.id, user.displayName || user.email.split('@')[0]);
    } catch (err: any) {
      console.error('Google sign-up failed:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // Create the account using AuthContext
      const displayName = email.split('@')[0];
      const newUser = await signUp(email, password, displayName);

      if (!newUser) {
        throw new Error('Account creation failed');
      }

      await createAccountData(newUser.id, displayName);

    } catch (err: any) {
      console.error('Account creation failed:', err);

      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead, or use a different email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
      setLoading(false);
    }
  };

  // Show loading if checking auth or user already exists (will redirect)
  if (authLoading || user) {
    return (
      <div className="max-w-lg mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          Almost There!
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Create your free account
        </h1>
        <p className="text-slate-400">
          Get {DEMO_FREE_CREDITS} free credits to start building content
        </p>
      </motion.div>

      {/* Progress Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900/50 border border-slate-800 p-5 mb-6"
      >
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-slate-300">Business profile for <strong className="text-white">{businessName}</strong></span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-slate-300">Channel: <strong className="text-white">{channelName}</strong></span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-slate-300">Targeting <strong className="text-cyan-400">{totalKeywordDemand.toLocaleString()}</strong> monthly searches</span>
          </li>
        </ul>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <p className="text-sm text-slate-400 mb-3">Your free account includes:</p>
        <ul className="space-y-2 text-sm text-slate-500">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            <strong className="text-white">{DEMO_FREE_CREDITS} free AI credits</strong> to generate content
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            Category and subcategory generation
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            Full access to workspace and tools
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            All onboarding data saved to your project
          </li>
        </ul>
      </motion.div>

      {/* Google Sign Up Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mb-4"
      >
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Signing up...' : 'Continue with Google'}
        </button>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.19 }}
        className="flex items-center gap-4 mb-4"
      >
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 uppercase">or</span>
        <div className="flex-1 h-px bg-slate-700" />
      </motion.div>

      {/* Sign Up Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 p-6"
      >
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Work Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 pr-12 bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Password Strength */}
          {password && (
            <div className="mt-2">
              <div className="h-1 bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${passwordStrength.color} transition-all`}
                  style={{ width: passwordStrength.width }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Password strength: {passwordStrength.strength}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            className={`
              w-full px-4 py-3 bg-slate-950 border text-white placeholder-slate-600 focus:outline-none
              ${confirmPassword && (passwordsMatch ? 'border-green-500/50' : 'border-red-500/50')}
              ${!confirmPassword && 'border-slate-700 focus:border-cyan-500'}
            `}
            disabled={loading}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Passwords match
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={previousStep}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !email || !password || !passwordsMatch}
            className="flex-[2] py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Free Account
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Terms */}
        <p className="text-xs text-slate-500 text-center mt-4">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-cyan-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a>.
        </p>

        {/* Login Link */}
        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login?returnTo=onboarding" className="text-cyan-400 hover:underline">Log in</Link>
          </p>
        </div>
      </motion.form>
    </div>
  );
};

export default AccountCreationStep;
