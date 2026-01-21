import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Check, Circle } from 'lucide-react';
import { Post } from '../../types';
import { feedColors, feedCard, feedButton } from '../../styles/designTokens';

interface GeneratingCardProps {
  post: Post;
  progress?: number;
  onCancel: (id: string) => void;
}

// Mock key points for when pitch data is missing
const MOCK_KEY_POINTS = [
  'Energy-efficient equipment ROI breakdown',
  'Waste reduction strategies with case studies',
  'Water recycling systems comparison',
  'Employee engagement in sustainability programs',
];

export const GeneratingCard: React.FC<GeneratingCardProps> = ({
  post,
  progress = 45,
  onCancel,
}) => {
  const title = post.pitch?.headline || post.title;
  const keyPoints = post.pitch?.keyPoints?.length ? post.pitch.keyPoints : MOCK_KEY_POINTS;

  // Calculate which key points are "completed" based on progress
  const completedPoints = Math.floor((progress / 100) * keyPoints.length);
  const currentPoint = completedPoints < keyPoints.length ? completedPoints : -1;

  // Estimate time remaining (~2 min total)
  const estimatedTime = Math.max(1, Math.ceil((100 - progress) / 100 * 2));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: -300,
        scale: 0.9,
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1],
        }
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      layout="position"
      layoutId={`generating-card-${post.id}`}
      className={feedCard.generating}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={14} style={{ color: feedColors.state.generating }} />
          </motion.div>
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: feedColors.state.generating }}
          >
            Generating
          </span>
        </div>
        <span className="text-xs text-[#a1a1aa]">
          ~{estimatedTime} min
        </span>
      </div>

      {/* Title */}
      <div className="px-6 pb-4">
        <h2
          className="text-2xl font-semibold leading-tight tracking-tight"
          style={{ color: feedColors.text.primary, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          "{title}"
        </h2>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${feedColors.state.generating}, ${feedColors.brand.primary})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-2 text-xs text-[#a1a1aa]">
          {progress < 25 && 'Analyzing topic...'}
          {progress >= 25 && progress < 50 && 'Researching content...'}
          {progress >= 50 && progress < 75 && 'Writing sections...'}
          {progress >= 75 && 'Finalizing article...'}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-[#27272a]" />

      {/* Key Points with progress */}
      <div className="px-6 py-4">
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: feedColors.text.muted }}
        >
          Key Points (will be covered)
        </h3>
        <ul className="space-y-2">
          {keyPoints.map((point, idx) => {
            const isComplete = idx < completedPoints;
            const isCurrent = idx === currentPoint;

            return (
              <li key={idx} className="flex items-start gap-3">
                {isComplete ? (
                  <Check
                    size={14}
                    className="mt-1 shrink-0"
                    style={{ color: feedColors.brand.success }}
                  />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Circle
                      size={14}
                      className="mt-1 shrink-0"
                      style={{ color: feedColors.state.generating }}
                    />
                  </motion.div>
                ) : (
                  <Circle
                    size={14}
                    className="mt-1 shrink-0"
                    style={{ color: feedColors.text.muted }}
                  />
                )}
                <span
                  className="text-[15px] font-medium leading-relaxed"
                  style={{
                    color: isComplete
                      ? feedColors.text.primary
                      : isCurrent
                      ? feedColors.text.secondary
                      : feedColors.text.muted,
                  }}
                >
                  {point}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-[#8b5cf6]">(in progress)</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Divider */}
      <div className="border-t border-[#27272a]" />

      {/* Actions */}
      <div className="px-6 py-4">
        <button
          onClick={() => onCancel(post.id)}
          className={`${feedButton.cancel} flex items-center gap-2`}
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </motion.div>
  );
};
