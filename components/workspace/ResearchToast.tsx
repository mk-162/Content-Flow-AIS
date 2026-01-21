import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, FlaskConical } from 'lucide-react';

interface Toast {
  id: string;
  categoryId: string;
  categoryName: string;
  type: 'complete' | 'error';
  message?: string;
}

interface ResearchToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onView: (categoryId: string) => void;
}

const AUTO_DISMISS_MS = 10000;

export const ResearchToastContainer: React.FC<ResearchToastContainerProps> = ({
  toasts,
  onDismiss,
  onView,
}) => {
  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <ResearchToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => onDismiss(toast.id)}
            onView={() => onView(toast.categoryId)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ResearchToastItemProps {
  toast: Toast;
  onDismiss: () => void;
  onView: () => void;
}

const ResearchToastItem: React.FC<ResearchToastItemProps> = ({
  toast,
  onDismiss,
  onView,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (isHovered) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [isHovered, onDismiss]);

  const isError = toast.type === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-3 px-4 py-3 shadow-lg border ${
        isError
          ? 'bg-red-900/90 border-red-700/50'
          : 'bg-zinc-900/95 border-zinc-700/50'
      } backdrop-blur-sm`}
    >
      {/* Icon */}
      <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
        isError ? 'bg-red-500/20' : 'bg-emerald-500/20'
      }`}>
        {isError ? (
          <X className="w-4 h-4 text-red-400" />
        ) : (
          <Check className="w-4 h-4 text-emerald-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {isError ? 'Research failed' : 'Research complete'}
        </p>
        <p className="text-xs text-zinc-400 truncate">
          {toast.categoryName}
        </p>
      </div>

      {/* Actions */}
      {!isError && (
        <button
          onClick={onView}
          className="px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors shrink-0"
        >
          View
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="p-1 text-zinc-500 hover:text-white transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Hook to manage research toasts
export function useResearchToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (categoryId: string, categoryName: string, type: 'complete' | 'error', message?: string) => {
    const id = `${categoryId}-${Date.now()}`;
    setToasts(prev => [...prev, { id, categoryId, categoryName, type, message }]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    dismissToast,
    clearAll,
  };
}

export default ResearchToastContainer;
