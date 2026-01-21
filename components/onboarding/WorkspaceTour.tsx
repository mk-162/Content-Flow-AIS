/**
 * Workspace Tour Component
 *
 * A polished onboarding tour that guides new users through the workspace
 * with floating modals and arrows pointing to key actions.
 *
 * Steps:
 * 1. Welcome - Introduction to the workspace
 * 2. Generate Post - Highlight the generate button
 * 3. Review & Approve - Highlight the approve button
 * 4. Launch - Highlight the launch button
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Sparkles, Zap, CheckCircle, Rocket } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TourStep {
  id: string;
  targetSelector: string | null; // null for centered modal (welcome step)
  title: string;
  content: string;
  icon: React.ReactNode;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
  buttonText: string;
}

interface TargetPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface WorkspaceTourProps {
  isActive: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

// ============================================================================
// TOUR STEPS CONFIGURATION
// ============================================================================

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: null,
    title: 'Welcome to Your Workspace',
    content: 'Your content engine is ready! Let\'s take a quick tour to show you how to create and publish content in 3 simple steps.',
    icon: <Sparkles className="w-6 h-6" />,
    arrowPosition: 'bottom',
    buttonText: 'Start Tour',
  },
  {
    id: 'generate',
    targetSelector: '[data-tour-id="generate-post"]',
    title: 'Step 1: Generate Posts',
    content: 'Start by generating article ideas for your categories. Click "Generate Post" to create full AI-powered content ready for review.',
    icon: <Zap className="w-6 h-6" />,
    arrowPosition: 'bottom',
    buttonText: 'Next',
  },
  {
    id: 'approve',
    targetSelector: '[data-tour-id="approve-post"]',
    title: 'Step 2: Review & Approve',
    content: 'Review AI-generated content in the Posts screen. Edit if needed, then approve posts that are ready for publishing.',
    icon: <CheckCircle className="w-6 h-6" />,
    arrowPosition: 'left',
    buttonText: 'Next',
  },
  {
    id: 'launch',
    targetSelector: '[data-tour-id="launch-posts"]',
    title: 'Step 3: Launch',
    content: 'Click "Launch" to publish all approved posts to your live site. Your content goes live in just a few minutes!',
    icon: <Rocket className="w-6 h-6" />,
    arrowPosition: 'left',
    buttonText: 'Finish Tour',
  },
];

// ============================================================================
// ARROW COMPONENT
// ============================================================================

const Arrow: React.FC<{ position: 'top' | 'bottom' | 'left' | 'right' }> = ({ position }) => {
  const baseClasses = 'absolute w-4 h-4';

  const positionStyles: Record<string, { className: string; transform: string }> = {
    top: {
      className: `${baseClasses} -top-2 left-1/2`,
      transform: 'translateX(-50%) rotate(180deg)',
    },
    bottom: {
      className: `${baseClasses} -bottom-2 left-1/2`,
      transform: 'translateX(-50%)',
    },
    left: {
      className: `${baseClasses} -left-2 top-1/2`,
      transform: 'translateY(-50%) rotate(90deg)',
    },
    right: {
      className: `${baseClasses} -right-2 top-1/2`,
      transform: 'translateY(-50%) rotate(-90deg)',
    },
  };

  const style = positionStyles[position];

  return (
    <svg
      className={style.className}
      style={{ transform: style.transform }}
      viewBox="0 0 16 8"
      fill="none"
    >
      <path d="M8 8L0 0H16L8 8Z" fill="#0891b2" />
    </svg>
  );
};

// ============================================================================
// SPOTLIGHT OVERLAY
// ============================================================================

const SpotlightOverlay: React.FC<{ targetPosition: TargetPosition | null }> = ({ targetPosition }) => {
  if (!targetPosition) {
    // Full overlay for welcome step
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
      />
    );
  }

  // Overlay with spotlight cutout
  const padding = 8;
  const { top, left, width, height } = targetPosition;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] pointer-events-none"
    >
      {/* Dark overlay with hole for target */}
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={left - padding}
              y={top - padding}
              width={width + padding * 2}
              height={height + padding * 2}
              rx="6"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          style={{ backdropFilter: 'blur(2px)' }}
        />
      </svg>

      {/* Pulsing border around target */}
      <motion.div
        className="absolute rounded-md pointer-events-none"
        style={{
          top: top - padding,
          left: left - padding,
          width: width + padding * 2,
          height: height + padding * 2,
        }}
        animate={{
          boxShadow: [
            '0 0 0 2px rgba(6, 182, 212, 0.6), 0 0 20px rgba(6, 182, 212, 0.3)',
            '0 0 0 4px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.2)',
            '0 0 0 2px rgba(6, 182, 212, 0.6), 0 0 20px rgba(6, 182, 212, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
};

// ============================================================================
// TOOLTIP MODAL
// ============================================================================

interface TooltipModalProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetPosition: TargetPosition | null;
  onNext: () => void;
  onDismiss: () => void;
}

const TooltipModal: React.FC<TooltipModalProps> = ({
  step,
  currentStep,
  totalSteps,
  targetPosition,
  onNext,
  onDismiss,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

  // Calculate modal position based on target and arrow direction
  useLayoutEffect(() => {
    if (!targetPosition) {
      // Center the modal for welcome step
      setModalPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 180,
      });
      return;
    }

    const modalWidth = 360;
    const modalHeight = 200;
    const spacing = 20;

    let top = 0;
    let left = 0;

    switch (step.arrowPosition) {
      case 'top':
        // Modal above target
        top = targetPosition.top - modalHeight - spacing;
        left = targetPosition.left + targetPosition.width / 2 - modalWidth / 2;
        break;
      case 'bottom':
        // Modal below target
        top = targetPosition.top + targetPosition.height + spacing;
        left = targetPosition.left + targetPosition.width / 2 - modalWidth / 2;
        break;
      case 'left':
        // Modal to the left of target
        top = targetPosition.top + targetPosition.height / 2 - modalHeight / 2;
        left = targetPosition.left - modalWidth - spacing;
        break;
      case 'right':
        // Modal to the right of target
        top = targetPosition.top + targetPosition.height / 2 - modalHeight / 2;
        left = targetPosition.left + targetPosition.width + spacing;
        break;
    }

    // Keep modal on screen
    const padding = 20;
    top = Math.max(padding, Math.min(top, window.innerHeight - modalHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - modalWidth - padding));

    setModalPosition({ top, left });
  }, [targetPosition, step.arrowPosition]);

  return (
    <motion.div
      ref={modalRef}
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed z-[101] w-[360px]"
      style={{ top: modalPosition.top, left: modalPosition.left }}
    >
      {/* Arrow pointing to target */}
      {targetPosition && <Arrow position={step.arrowPosition} />}

      {/* Modal content */}
      <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white">
                {step.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-xs text-cyan-200">
                  {currentStep > 0 ? `Step ${currentStep} of ${totalSteps - 1}` : 'Getting Started'}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-cyan-200 hover:text-white transition-colors p-1"
              aria-label="Close tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-5">
          <p className="text-cyan-50 text-sm leading-relaxed mb-5">
            {step.content}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onDismiss}
              className="text-cyan-200 hover:text-white text-sm underline transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={onNext}
              className="px-5 py-2.5 bg-white hover:bg-cyan-50 text-cyan-700 font-bold text-sm uppercase tracking-wider rounded transition-colors flex items-center gap-2"
            >
              {step.buttonText}
              {currentStep < totalSteps - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-white'
                  : index < currentStep
                  ? 'bg-white/60'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WorkspaceTour: React.FC<WorkspaceTourProps> = ({
  isActive,
  onComplete,
  onDismiss,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState<TargetPosition | null>(null);
  const [isWaitingForTarget, setIsWaitingForTarget] = useState(false);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Find and track target element position
  const updateTargetPosition = useCallback(() => {
    if (!currentStep.targetSelector) {
      setTargetPosition(null);
      setIsWaitingForTarget(false);
      return;
    }

    const target = document.querySelector(currentStep.targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setIsWaitingForTarget(false);
    } else {
      setTargetPosition(null);
      setIsWaitingForTarget(true);
    }
  }, [currentStep.targetSelector]);

  // Initial target detection + polling for dynamic content
  useEffect(() => {
    if (!isActive) return;

    // Initial check
    updateTargetPosition();

    // Poll for target if not found (dynamic content)
    const pollInterval = setInterval(() => {
      if (currentStep.targetSelector && !targetPosition && isWaitingForTarget) {
        updateTargetPosition();
      }
    }, 500);

    // Update on resize
    const handleResize = () => updateTargetPosition();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, currentStep, updateTargetPosition, targetPosition, isWaitingForTarget]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStepIndex, onComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onDismiss, handleNext]);

  if (!isActive) return null;

  // Show waiting message if target not found
  if (isWaitingForTarget && currentStep.targetSelector) {
    return (
      <>
        <SpotlightOverlay targetPosition={null} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center max-w-sm">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Looking for the next step...</p>
            <p className="text-slate-400 text-sm">
              Navigate to the Categories or Posts screen to continue the tour.
            </p>
            <button
              onClick={onDismiss}
              className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm underline"
            >
              Skip tour
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <SpotlightOverlay key={`overlay-${currentStepIndex}`} targetPosition={targetPosition} />
      <TooltipModal
        key={`modal-${currentStepIndex}`}
        step={currentStep}
        currentStep={currentStepIndex}
        totalSteps={TOUR_STEPS.length}
        targetPosition={targetPosition}
        onNext={handleNext}
        onDismiss={onDismiss}
      />
    </AnimatePresence>
  );
};

export default WorkspaceTour;
