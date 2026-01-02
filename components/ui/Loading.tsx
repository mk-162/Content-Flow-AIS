import React from 'react';
import { motion } from 'framer-motion';

// Animated loading bar - the standard loading indicator for the app
interface LoadingBarProps {
  className?: string;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ className = '' }) => (
  <div className={`h-1 bg-slate-700 rounded-full overflow-hidden ${className}`}>
    <motion.div
      className="h-full w-1/3 bg-cyan-500 rounded-full"
      animate={{ x: ['0%', '200%'] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

// Spinner - for inline loading states
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'w-3 h-3 border',
  md: 'w-4 h-4 border-2',
  lg: 'w-6 h-6 border-2',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <span
    className={`inline-block rounded-full border-current/30 border-t-current animate-spin ${spinnerSizes[size]} ${className}`}
  />
);

// Full-page loading state
interface PageLoadingProps {
  message?: string;
  subtitle?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...',
  subtitle,
}) => (
  <div className="h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white font-medium">{message}</p>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

// Skeleton loader for content placeholders
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
}) => (
  <div className={`bg-slate-800 animate-pulse rounded ${width} ${height} ${className}`} />
);

// Progress bar
interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  variant?: 'primary' | 'success' | 'warning';
  className?: string;
}

const progressColors = {
  primary: 'bg-cyan-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  variant = 'primary',
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`relative ${className}`}>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${progressColors[variant]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs text-slate-400 font-mono">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};

export default LoadingBar;
