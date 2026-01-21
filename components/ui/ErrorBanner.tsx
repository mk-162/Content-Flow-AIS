import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

// ============================================================================
// REUSABLE ERROR BANNER COMPONENT
// Section 5: Error Handling UI - DO ALL OF IT
// ============================================================================

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  variant = 'error'
}) => {
  const variants = {
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-400',
      text: 'text-red-400',
      button: 'text-red-400 hover:text-red-300',
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      text: 'text-amber-400',
      button: 'text-amber-400 hover:text-amber-300',
    },
    info: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      icon: 'text-cyan-400',
      text: 'text-cyan-400',
      button: 'text-cyan-400 hover:text-cyan-300',
    },
  };

  const style = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${style.bg} border ${style.border} p-4 flex items-start gap-3`}
    >
      <AlertCircle className={`w-5 h-5 ${style.icon} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`${style.text} text-sm`}>{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`mt-2 text-xs ${style.button} flex items-center gap-1.5 font-medium`}
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`${style.button} p-1 hover:bg-white/5 transition-colors`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

export default ErrorBanner;
