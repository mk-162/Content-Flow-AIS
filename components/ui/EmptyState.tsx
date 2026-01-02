import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}) => {
  const ActionIcon = action?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}
    >
      <div className={`bg-slate-800/50 flex items-center justify-center mb-4 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
        <Icon className={`text-slate-600 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      </div>

      <h3 className={`font-bold text-white mb-2 ${compact ? 'text-base' : 'text-lg'}`}>
        {title}
      </h3>

      <p className={`text-slate-500 mb-6 max-w-md ${compact ? 'text-xs' : 'text-sm'}`}>
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Inline empty state for smaller sections
interface InlineEmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const InlineEmptyState: React.FC<InlineEmptyStateProps> = ({
  icon: Icon,
  message,
  action,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-slate-500">
      <Icon className="w-4 h-4" />
      <span className="text-sm">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium underline underline-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
