import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  BookOpen,
  HelpCircle,
  Archive,
  Building2,
  ChevronRight,
  Search,
  Check,
  Sparkles,
  RefreshCw,
  MessageCircle,
  Square,
  CheckSquare,
  Award,
} from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { ChannelRecommendation, ChannelType, CHANNEL_TYPE_LABELS } from '../../types';
import { ChannelCardSkeleton } from '../ui/Skeleton';

// ============================================================================
// CHANNEL ICON MAP
// ============================================================================

const CHANNEL_ICONS: Record<ChannelType, React.ElementType> = {
  blog: FileText,
  knowledge_base: HelpCircle,
  guides: BookOpen,
  archive: Archive,
  industry_vertical: Building2,
};

const CHANNEL_COLORS: Record<ChannelType, string> = {
  blog: 'cyan',
  knowledge_base: 'emerald',
  guides: 'violet',
  archive: 'amber',
  industry_vertical: 'rose',
};

// ============================================================================
// FORMAT HELPERS
// ============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// ============================================================================
// CHANNEL CARD COMPONENT
// ============================================================================

interface ChannelCardProps {
  channel: ChannelRecommendation;
  onSelect: (id: string) => void;
  isBestMatch?: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onSelect, isBestMatch = false }) => {
  const IconComponent = CHANNEL_ICONS[channel.channelType];
  const colorName = CHANNEL_COLORS[channel.channelType];

  // Dynamic color classes based on channel type
  const colorClasses = {
    cyan: {
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      icon: 'bg-cyan-500/10 text-cyan-400',
      selected: 'border-cyan-500 ring-2 ring-cyan-500/30',
      checkbox: 'text-cyan-400',
    },
    emerald: {
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: 'bg-emerald-500/10 text-emerald-400',
      selected: 'border-emerald-500 ring-2 ring-emerald-500/30',
      checkbox: 'text-emerald-400',
    },
    violet: {
      badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      icon: 'bg-violet-500/10 text-violet-400',
      selected: 'border-violet-500 ring-2 ring-violet-500/30',
      checkbox: 'text-violet-400',
    },
    amber: {
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: 'bg-amber-500/10 text-amber-400',
      selected: 'border-amber-500 ring-2 ring-amber-500/30',
      checkbox: 'text-amber-400',
    },
    rose: {
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: 'bg-rose-500/10 text-rose-400',
      selected: 'border-rose-500 ring-2 ring-rose-500/30',
      checkbox: 'text-rose-400',
    },
  };

  const colors = colorClasses[colorName];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)' }}
      onClick={() => onSelect(channel.id)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(channel.id);
        }
      }}
      className={`
        relative bg-slate-900/70 border p-5 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50
        ${channel.selected
          ? colors.selected + ' bg-slate-800/50'
          : 'border-slate-700 hover:border-slate-600'
        }
        ${isBestMatch ? 'ring-2 ring-emerald-500/30' : ''}
      `}
    >
      {/* Best Match Badge - Section 2 UX Fix */}
      {isBestMatch && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
          <Award className="w-3.5 h-3.5" />
          Best Match
        </div>
      )}

      {/* Checkbox - prominent selection indicator */}
      <div className="absolute top-4 right-4">
        {channel.selected ? (
          <CheckSquare className={`w-6 h-6 ${colors.checkbox}`} />
        ) : (
          <Square className="w-6 h-6 text-slate-600 hover:text-slate-400 transition-colors" />
        )}
      </div>

      {/* Channel Type Badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-xs font-medium uppercase tracking-wider mb-4 ${isBestMatch ? 'mt-2' : ''} ${colors.badge}`}>
        <IconComponent className="w-3.5 h-3.5" />
        {CHANNEL_TYPE_LABELS[channel.channelType]}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2 pr-8">
        {channel.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-400 leading-relaxed mb-4">
        {channel.description}
      </p>

      {/* Categories Preview */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Categories</p>
        <div className="flex flex-wrap gap-1.5">
          {channel.suggestedCategories.slice(0, 4).map((cat, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs"
            >
              {cat}
            </span>
          ))}
          {channel.suggestedCategories.length > 4 && (
            <span className="px-2 py-0.5 text-slate-500 text-xs">
              +{channel.suggestedCategories.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Keywords with Demand Data */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Target Keywords</p>
        <div className="space-y-1.5">
          {channel.targetKeywords.slice(0, 3).map((kw, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-300 truncate flex-1 mr-2">"{kw.keyword}"</span>
              <span className="text-cyan-400 font-medium flex-shrink-0 flex items-center gap-1">
                <Search className="w-3 h-3" />
                {formatNumber(kw.searchVolume)}/mo
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total Keyword Demand */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MessageCircle className="w-4 h-4 text-cyan-400" />
          <span>Total Keyword Demand:</span>
        </div>
        <span className="text-lg font-bold text-cyan-400">
          {formatNumber(channel.totalMonthlySearches || 0)}/mo
        </span>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ChannelRecommendationStep: React.FC = () => {
  const {
    session,
    loading,
    selectChannel,
    generateChannelRecommendations,
    nextStep,
    previousStep,
  } = useOnboarding();

  const [validationError, setValidationError] = useState<string | null>(null);

  const channels = session?.channelRecommendations || [];
  const selectedChannel = session?.selectedChannel;

  // Clear validation error when user selects a channel
  useEffect(() => {
    if (selectedChannel) {
      setValidationError(null);
    }
  }, [selectedChannel]);

  // Generate recommendations on mount if not already done
  useEffect(() => {
    if (channels.length === 0 && !loading) {
      generateChannelRecommendations();
    }
  }, [channels.length, loading, generateChannelRecommendations]);

  const handleContinue = () => {
    if (!selectedChannel) {
      setValidationError('Please select a channel to continue');
      return;
    }
    nextStep();
  };

  const handleRegenerate = () => {
    generateChannelRecommendations();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with AEO Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Answer Engine Optimization
        </div>
        <h1 className="text-3xl font-bold mb-3">
          Choose Your Content Channel
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto mb-4">
          AI assistants are becoming the first place people search for answers.
          Build content channels that get <strong className="text-white">cited by ChatGPT, Claude, and Google AI</strong> when
          customers ask questions about your industry.
        </p>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          <strong className="text-slate-300">Click a card to select it.</strong> You can create additional channels later from your dashboard.
        </p>
      </motion.div>

      {/* Loading State with Skeleton Cards */}
      {loading && channels.length === 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <ChannelCardSkeleton />
          <ChannelCardSkeleton />
        </div>
      )}

      {/* Channel Grid */}
      {channels.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          {channels.map((channel, index) => {
            // First channel (highest demand) gets Best Match badge
            const isBestMatch = index === 0;
            return (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={isBestMatch ? 'pt-3' : ''}
              >
                <ChannelCard
                  channel={channel}
                  onSelect={selectChannel}
                  isBestMatch={isBestMatch}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Regenerate Button */}
      {channels.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-center mb-6"
        >
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-cyan-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Generate Alternative Options
          </button>
        </motion.div>
      )}

      {/* No Selection Warning */}
      {!selectedChannel && channels.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-yellow-500 text-sm mb-4"
        >
          Please select a channel to continue
        </motion.p>
      )}

      {/* Validation Error */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center rounded"
        >
          {validationError}
        </motion.div>
      )}

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center gap-4"
      >
        <button
          onClick={previousStep}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wider transition-colors shadow-lg shadow-cyan-900/20"
        >
          Continue with {selectedChannel ? CHANNEL_TYPE_LABELS[selectedChannel.channelType] : 'Channel'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Helper Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-slate-500 mt-4"
      >
        All channel recommendations are saved. Create additional channels anytime from your dashboard.
      </motion.p>
    </div>
  );
};

export default ChannelRecommendationStep;
