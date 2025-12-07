import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Organization,
  OrganizationMember,
  Project,
  ProjectMember,
  Category,
  SubscriptionTier,
  OrgMemberRole,
  ProjectMemberRole,
} from '../../types';

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
  const { session, nextStep, previousStep } = useOnboarding();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = session?.categories.filter(c => c.selected) || [];
  const subcategories = session?.subcategories || {};
  const totalSubcategories = Object.values(subcategories).flat().filter(s => s.selected).length;
  const projectName = session?.selectedProject?.name || 'Your Project';
  const opportunityCount = session?.businessProfile?.opportunityScore.contentGaps || 0;

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

      // Create organization for the new user
      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orgName = session?.businessProfile?.industry.primary
        ? `${displayName}'s ${session.businessProfile.industry.primary}`
        : `${displayName}'s Organization`;

      const newOrg: Omit<Organization, 'id'> = {
        name: orgName,
        ownerId: newUser.id,
        subscriptionTier: SubscriptionTier.FREE,
        settings: {
          allowUserInvites: true,
          maxProjects: 5,
          maxUsersPerProject: 10,
        },
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
        systemPrompts: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'organizations', orgId), newOrg);

      // Add user as organization owner
      const orgMembershipId = `${orgId}_${newUser.id}`;
      const orgMembership: Omit<OrganizationMember, 'id'> = {
        organizationId: orgId,
        userId: newUser.id,
        role: OrgMemberRole.OWNER,
        invitedBy: newUser.id,
        invitedAt: Timestamp.now(),
        joinedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'organizationMembers', orgMembershipId), orgMembership);

      // Create project from onboarding selection
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const selectedProject = session?.selectedProject;

      const newProject: Omit<Project, 'id'> = {
        organizationId: orgId,
        name: selectedProject?.name || 'My First Project',
        description: selectedProject?.description || 'Content project created during onboarding',
        createdBy: newUser.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        websiteUrl: session?.websiteUrl, // Store the analyzed website URL
        businessProfile: session?.businessProfile, // Store the full business profile for context
        settings: {
          autoPublish: false,
        },
      };

      await setDoc(doc(db, `organizations/${orgId}/projects`, projectId), newProject);

      // Add user as project admin
      const projMembershipId = `${projectId}_${newUser.id}`;
      const projMembership: Omit<ProjectMember, 'id'> = {
        organizationId: orgId,
        projectId,
        userId: newUser.id,
        role: ProjectMemberRole.ADMIN,
        addedBy: newUser.id,
        addedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'projectMembers', projMembershipId), projMembership);

      // Create categories from onboarding selection
      const selectedCategories = session?.categories.filter(c => c.selected) || [];
      const sessionSubcategories = session?.subcategories || {};

      // Map to track session category ID -> Firestore category ID
      const categoryIdMap = new Map<string, string>();

      for (let i = 0; i < selectedCategories.length; i++) {
        const cat = selectedCategories[i];
        const categoryId = `cat_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

        // Store mapping for subcategory parent resolution
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

      // Create subcategories from onboarding selection
      let subcategoryOrder = 0;
      for (const [sessionCategoryId, subs] of Object.entries(sessionSubcategories)) {
        const parentCategoryId = categoryIdMap.get(sessionCategoryId);
        if (!parentCategoryId) continue; // Skip if parent category wasn't selected

        for (const sub of subs) {
          if (!sub.selected) continue; // Skip unselected subcategories

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

      // Set localStorage for current org and project so MainWorkspace loads them
      localStorage.setItem('currentOrganizationId', orgId);
      localStorage.setItem(`currentProjectId_${orgId}`, projectId);

      // Move to next step
      nextStep();

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 text-sm mb-4">
          <Save className="w-4 h-4" />
          Save Your Progress
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Create your free account
        </h1>
        <p className="text-slate-400">
          Don't lose the work you've done
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
            <span className="text-slate-300">Business profile created</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-slate-300">{projectName} project</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-slate-300">{categories.length} categories configured</span>
          </li>
          {totalSubcategories > 0 && (
            <li className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-500" />
              </div>
              <span className="text-slate-300">{totalSubcategories} subcategories created</span>
            </li>
          )}
          <li className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-slate-300">{opportunityCount} content opportunities identified</span>
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
        <p className="text-sm text-slate-400 mb-3">Create a free account to:</p>
        <ul className="space-y-2 text-sm text-slate-500">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            Save everything you've built
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            Generate 5 AI-powered articles free
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            Generate subcategories for your categories
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-500" />
            Access your content opportunity roadmap
          </li>
        </ul>
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
            <a href="/login" className="text-cyan-400 hover:underline">Log in</a>
          </p>
        </div>
      </motion.form>
    </div>
  );
};

export default AccountCreationStep;
