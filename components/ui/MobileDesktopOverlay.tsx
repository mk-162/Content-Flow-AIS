import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, X, ChevronRight } from 'lucide-react';

// ============================================================================
// MOBILE DESKTOP OVERLAY
// Section 3: Mobile Responsiveness - Desktop Required Notice for Main App
// ============================================================================

interface MobileDesktopOverlayProps {
  isOnboarding?: boolean;
}

export const MobileDesktopOverlay: React.FC<MobileDesktopOverlayProps> = ({
  isOnboarding = false
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't show overlay if not mobile or if dismissed
  if (!isMobile || dismissed) return null;

  // For onboarding, show a dismissible banner instead of blocking overlay
  if (isOnboarding) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border-b border-amber-500/30 px-4 py-3"
        >
          <div className="max-w-lg mx-auto flex items-start gap-3">
            <Monitor className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-200 font-medium">
                Onboarding works on mobile!
              </p>
              <p className="text-xs text-amber-300/70 mt-0.5">
                The main workspace requires a desktop browser for the best experience.
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-400 hover:text-amber-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // For main app, show blocking overlay
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="text-center max-w-sm">
        {/* Icon with animated ring */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-cyan-500/20 animate-ping rounded-full" />
          <div className="relative w-20 h-20 bg-slate-900 border-2 border-cyan-500/50 rounded-full flex items-center justify-center">
            <Monitor className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Desktop Required
        </h2>

        <p className="text-slate-400 mb-6 leading-relaxed">
          MissionContent's workspace is optimized for desktop browsers.
          Please visit us on a laptop or desktop computer for the full experience.
        </p>

        {/* Visual separator */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
        >
          Continue anyway (limited experience)
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default MobileDesktopOverlay;
