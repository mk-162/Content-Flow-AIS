import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  ShoppingBag,
  MessageSquare,
  FileText,
  ChevronRight,
  Edit2,
  RefreshCw,
  Check,
  Info,
} from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { BusinessProfile } from '../../types';

// ============================================================================
// PROFILE CARD COMPONENT
// ============================================================================

interface ProfileCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  confidence?: number;
  source?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  isEditing?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  icon,
  title,
  children,
  confidence,
  source,
  onEdit,
  onRegenerate,
  isEditing
}) => {
  return (
    <div className={`bg-slate-900/50 border ${isEditing ? 'border-cyan-500/50 bg-slate-800/50' : 'border-slate-800'} p-5 transition-colors duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            {icon}
          </div>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && !isEditing && (
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors rounded"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onRegenerate && !isEditing && (
            <button
              onClick={onRegenerate}
              className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors rounded"
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="text-slate-300 text-sm leading-relaxed mb-3">
        {children}
      </div>

      {(confidence !== undefined || source) && !isEditing && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {confidence !== undefined && (
            <div className="flex items-center gap-1">
              {confidence >= 80 ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : confidence >= 60 ? (
                <Info className="w-3 h-3 text-yellow-500" />
              ) : (
                <Info className="w-3 h-3 text-orange-500" />
              )}
              <span>{confidence}% confident</span>
            </div>
          )}
          {source && (
            <span className="text-slate-600">
              Detected from: {source}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CONTENT GAP COMPONENT
// ============================================================================

interface OpportunityScoreProps {
  score: number;
  contentGaps: number;
}

const OpportunityScore: React.FC<OpportunityScoreProps> = ({ score, contentGaps }) => {
  // Convert score (0-100) to gap percentage (100 = 0% gap, 0 = 100% gap)
  const gapPercentage = 100 - score;
  const coveragePercentage = score;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-6 mb-6">
      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
        Content Gap Analysis
      </h2>

      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-sm text-slate-400">Content Gap:</span>
          <span className="text-4xl font-bold text-orange-400">
            {gapPercentage}%
          </span>
        </div>

        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            You're missing <span className="text-white font-semibold">{gapPercentage}%</span> of customer searches in your market.
          </p>
          <p>
            Your content covers only <span className="text-cyan-400 font-semibold">{coveragePercentage}%</span> of what buyers are looking for.
          </p>
        </div>
      </div>

      {/* Progress bar showing coverage */}
      <div className="h-3 bg-slate-800 mb-3 overflow-hidden">
        <motion.div
          className="h-full bg-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${coveragePercentage}%` }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ChevronRight className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-medium">Close your content gap</span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProfileReviewStep: React.FC = () => {
  const { session, nextStep, previousStep, updateProfile, loading } = useOnboarding();
  const profile = session?.businessProfile;
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (!editingField) return;

    // Update the profile based on the field being edited
    if (editingField === 'industry') {
      updateProfile({
        industry: {
          ...profile!.industry,
          primary: editValue,
        },
      });
    } else if (editingField === 'audience') {
      updateProfile({
        targetAudience: {
          ...profile!.targetAudience,
          primary: editValue,
        },
      });
    } else if (editingField === 'products') {
      // Split by comma and clean up whitespace
      const categories = editValue.split(',').map(c => c.trim()).filter(Boolean);
      updateProfile({
        offerings: {
          ...profile!.offerings,
          categories: categories,
        }
      });
    }

    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No profile data available. Please start over.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded"
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          We've analyzed your website
        </h1>
        <p className="text-slate-400">
          Review your business profile and make any corrections
        </p>
      </motion.div>

      {/* Opportunity Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <OpportunityScore
          score={profile.opportunityScore.overall}
          contentGaps={profile.opportunityScore.contentGaps}
        />
      </motion.div>

      {/* Profile Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 mb-8"
      >
        {/* Industry */}
        {/* Fix: Allow formatting (whitespace-pre-wrap) and use Textarea for editing */}
        <ProfileCard
          icon={<Building2 className="w-4 h-4" />}
          title="Industry"
          confidence={Math.round(profile.industry.confidence * 100)}
          source="Homepage, About page"
          onEdit={() => handleEdit('industry', profile.industry.primary)}
          isEditing={editingField === 'industry'}
        >
          {editingField === 'industry' ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-slate-800 border border-cyan-500/50 text-white text-sm focus:outline-none focus:border-cyan-500 rounded resize-y"
                autoFocus
                placeholder="Describe your industry..."
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <p className="font-medium text-white whitespace-pre-wrap">
              {profile.industry.primary}
            </p>
          )}
        </ProfileCard>

        {/* Target Audience */}
        {/* Fix: Use Textarea and whitespace-pre-wrap */}
        <ProfileCard
          icon={<Users className="w-4 h-4" />}
          title="Target Audience"
          source="About page, Product descriptions"
          onEdit={() => handleEdit('audience', profile.targetAudience.primary)}
          isEditing={editingField === 'audience'}
        >
          {editingField === 'audience' ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-32 px-3 py-2 bg-slate-800 border border-cyan-500/50 text-white text-sm focus:outline-none focus:border-cyan-500 rounded resize-y"
                autoFocus
                placeholder="Describe your target audience..."
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <strong className="text-slate-400 block mb-1 text-xs uppercase tracking-wider">Primary Audience</strong>
                <p className="text-white whitespace-pre-wrap">{profile.targetAudience.primary}</p>
              </div>

              {(profile.targetAudience.demographics.ageRange || profile.targetAudience.demographics.geographic.length > 0) && (
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800/50">
                  {profile.targetAudience.demographics.ageRange && (
                    <div>
                      <span className="text-slate-500 text-xs">Age Range:</span>
                      <p className="text-slate-300">{profile.targetAudience.demographics.ageRange}</p>
                    </div>
                  )}
                  {profile.targetAudience.demographics.geographic.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-xs">Location:</span>
                      <p className="text-slate-300">{profile.targetAudience.demographics.geographic.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ProfileCard>

        {/* Products/Services */}
        {/* Fix: Display list and allow editing as comma-separated list */}
        <ProfileCard
          icon={<ShoppingBag className="w-4 h-4" />}
          title="Products & Services"
          source="Navigation, Product pages"
          onEdit={() => handleEdit('products', profile.offerings.categories.join(', '))}
          isEditing={editingField === 'products'}
        >
          {editingField === 'products' ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-500">Edit products/services (comma separated):</label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-slate-800 border border-cyan-500/50 text-white text-sm focus:outline-none focus:border-cyan-500 rounded resize-y"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div>
              {profile.offerings.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.offerings.categories.map((cat, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded text-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No specific products/services detected.</p>
              )}
            </div>
          )}
        </ProfileCard>

        {/* Brand Voice */}
        <ProfileCard
          icon={<MessageSquare className="w-4 h-4" />}
          title="Brand Voice"
          source="Blog posts, About page copy"
        >
          <ul className="space-y-1">
            <li>
              <strong className="text-slate-400">Tone:</strong>{' '}
              <span className="text-white">{profile.brandVoice.tone.join(', ')}</span>
            </li>
            <li>
              <strong className="text-slate-400">Style:</strong>{' '}
              <span className="text-white">{profile.brandVoice.style}</span>
            </li>
            <li>
              <strong className="text-slate-400">Personality:</strong>{' '}
              <span className="text-white">{profile.brandVoice.personality.join(', ')}</span>
            </li>
          </ul>
        </ProfileCard>

        {/* Content Style */}
        <ProfileCard
          icon={<FileText className="w-4 h-4" />}
          title="Content Style"
          source="Blog, Resources section"
        >
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.contentStyle.types.map((type, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-cyan-500/10 text-xs text-cyan-400 rounded"
              >
                {type}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Length: {profile.contentStyle.averageLength} |
            Level: {profile.contentStyle.technicalLevel}
          </p>
        </ProfileCard>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <div className="flex justify-center gap-4">
          <button
            onClick={() => previousStep ? previousStep() : window.location.reload()}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-lg shadow-cyan-900/20"
          >
            Looks Good! Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          You can make edits above to refine your profile
        </p>
      </motion.div>
    </div>
  );
};

export default ProfileReviewStep;
