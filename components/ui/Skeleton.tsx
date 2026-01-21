import React from 'react';

// ============================================================================
// SKELETON LOADING COMPONENTS
// Section 4: Loading States & Feedback - Implement Recommendations
// ============================================================================

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`bg-slate-800 animate-pulse ${className}`} />
);

// Channel Card Skeleton for ChannelRecommendationStep loading state
export const ChannelCardSkeleton: React.FC = () => (
  <div className="bg-slate-900/70 border border-slate-800 p-5 animate-pulse">
    {/* Badge */}
    <div className="h-6 w-28 bg-slate-800 mb-4" />

    {/* Title */}
    <div className="h-6 w-3/4 bg-slate-800 mb-3" />

    {/* Description lines */}
    <div className="h-4 w-full bg-slate-800 mb-2" />
    <div className="h-4 w-5/6 bg-slate-800 mb-4" />

    {/* Categories */}
    <div className="mb-4">
      <div className="h-3 w-16 bg-slate-800 mb-2" />
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-6 w-20 bg-slate-800" />
        ))}
      </div>
    </div>

    {/* Keywords */}
    <div className="mb-4">
      <div className="h-3 w-24 bg-slate-800 mb-2" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-32 bg-slate-800" />
            <div className="h-4 w-16 bg-slate-800" />
          </div>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
      <div className="h-4 w-32 bg-slate-800" />
      <div className="h-6 w-20 bg-slate-800" />
    </div>
  </div>
);

// Profile Card Skeleton for ProfileReviewStep
export const ProfileCardSkeleton: React.FC = () => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-slate-800" />
      <div className="h-5 w-28 bg-slate-800" />
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full bg-slate-800" />
      <div className="h-4 w-3/4 bg-slate-800" />
    </div>
  </div>
);

// Text line skeleton
export const TextSkeleton: React.FC<{ width?: string }> = ({ width = 'w-full' }) => (
  <div className={`h-4 bg-slate-800 animate-pulse ${width}`} />
);

export default Skeleton;
