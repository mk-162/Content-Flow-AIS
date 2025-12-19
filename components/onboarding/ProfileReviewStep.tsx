import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  HelpCircle,
  Search,
  Target,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Zap,
  Award,
} from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { BusinessProfile } from '../../types';

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded shadow-lg min-w-[200px] max-w-[280px]"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="border-8 border-transparent border-t-slate-800" />
            </div>
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Get confidence explanation based on level
const getConfidenceExplanation = (confidence: number, source?: string): string => {
  const sourceText = source ? ` Based on analysis of ${source.toLowerCase()}.` : '';

  if (confidence >= 80) {
    return `High confidence - Strong signals detected from multiple page elements.${sourceText}`;
  } else if (confidence >= 60) {
    return `Medium confidence - Some signals found but data may be incomplete.${sourceText} Consider verifying.`;
  } else {
    return `Low confidence - Limited signals detected.${sourceText} We recommend reviewing and editing if needed.`;
  }
};

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
            <Tooltip content={getConfidenceExplanation(confidence, source)}>
              <div className="flex items-center gap-1">
                {confidence >= 80 ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : confidence >= 60 ? (
                  <Info className="w-3 h-3 text-yellow-500" />
                ) : (
                  <Info className="w-3 h-3 text-orange-500" />
                )}
                <span>{confidence}% confident</span>
                <HelpCircle className="w-3 h-3 text-slate-600 ml-0.5" />
              </div>
            </Tooltip>
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
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          Content Gap Analysis
        </h2>
        <Tooltip
          content={
            <div className="space-y-2">
              <p><strong className="text-white">What is Content Gap?</strong></p>
              <p>This measures the percentage of customer questions and search queries in your industry that your website doesn't currently answer.</p>
              <p className="text-cyan-400">Lower gap = better coverage. Our goal is to help you close this gap with targeted content.</p>
            </div>
          }
        >
          <HelpCircle className="w-4 h-4 text-slate-500 hover:text-slate-400" />
        </Tooltip>
      </div>

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
      {profile.opportunityScore?.overall !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <OpportunityScore
            score={profile.opportunityScore.overall}
            contentGaps={profile.opportunityScore.contentGaps ?? 0}
          />
        </motion.div>
      )}

      {/* USPs - Unique Selling Points */}
      {profile.brandVoice.uniqueSellingPoints && profile.brandVoice.uniqueSellingPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-emerald-900/30 to-slate-900 border border-emerald-500/30 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-medium text-emerald-400 uppercase tracking-wider">
              Your Competitive Advantages
            </h2>
          </div>
          <div className="grid gap-3">
            {profile.brandVoice.uniqueSellingPoints.map((usp, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-800">
                <Zap className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-medium">{usp}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Keywords */}
      {profile.topKeywords && profile.topKeywords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Top Keyword Opportunities
            </h2>
            <span className="ml-auto text-xs text-slate-500">
              {profile.topKeywords.reduce((sum, k) => sum + k.searchVolume, 0).toLocaleString()} total monthly searches
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="pb-3 pr-4">Keyword</th>
                  <th className="pb-3 pr-4 text-right">Volume</th>
                  <th className="pb-3 pr-4 text-right">Difficulty</th>
                  <th className="pb-3">Intent</th>
                </tr>
              </thead>
              <tbody>
                {profile.topKeywords.map((kw, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 pr-4">
                      <span className="text-white font-medium">{kw.keyword}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="text-cyan-400 font-mono">{kw.searchVolume.toLocaleString()}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`font-mono ${
                        kw.difficulty < 40 ? 'text-green-400' :
                        kw.difficulty < 60 ? 'text-yellow-400' : 'text-orange-400'
                      }`}>
                        {kw.difficulty}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-xs uppercase tracking-wider ${
                        kw.intent === 'commercial' ? 'bg-amber-500/20 text-amber-400' :
                        kw.intent === 'transactional' ? 'bg-green-500/20 text-green-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {kw.intent}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Content Angles */}
      {profile.contentAngles && profile.contentAngles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-900/50 border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Strategic Content Angles
            </h2>
          </div>
          <div className="space-y-3">
            {profile.contentAngles.map((angle, i) => (
              <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-white font-semibold">{angle.angle}</h3>
                  <span className={`px-2 py-0.5 text-xs uppercase tracking-wider flex-shrink-0 ${
                    angle.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    angle.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {angle.priority} priority
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{angle.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pain Points */}
      {profile.targetAudience.painPoints && profile.targetAudience.painPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/50 border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Customer Pain Points to Address
            </h2>
          </div>
          <div className="grid gap-2">
            {profile.targetAudience.painPoints.map((pain, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-orange-500/5 border border-orange-500/20">
                <Target className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">{pain}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Competitor Insights */}
      {profile.competitorInsights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-slate-900/50 border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Competitive Analysis
            </h2>
          </div>
          <div className="space-y-4">
            {profile.competitorInsights.topCompetitors.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Top Competitors</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.competitorInsights.topCompetitors.map((comp, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-sm">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.competitorInsights.contentGapsVsCompetitors.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Content Gaps vs Competitors</h3>
                <ul className="space-y-2">
                  {profile.competitorInsights.contentGapsVsCompetitors.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.competitorInsights.differentiators.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Differentiators</h3>
                <ul className="space-y-2">
                  {profile.competitorInsights.differentiators.map((diff, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Zap className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Profile Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 mb-8"
      >
        {/* Industry */}
        {/* Fix: Allow formatting (whitespace-pre-wrap) and use Textarea for editing */}
        <ProfileCard
          icon={<Building2 className="w-4 h-4" />}
          title="Industry"
          confidence={profile.industry.confidence}
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
            Recommend Channels
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Review your profile above, then we'll recommend content channels for your business
        </p>
      </motion.div>
    </div>
  );
};

export default ProfileReviewStep;
