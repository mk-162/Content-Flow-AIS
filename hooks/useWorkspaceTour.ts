/**
 * Workspace Tour Hook
 *
 * Manages the state for the onboarding tour in the workspace.
 * Checks localStorage to determine if tour should be shown and
 * persists completion state.
 */

import { useState, useEffect, useCallback } from 'react';

// Storage keys
const SHOW_TOUR_KEY = 'showOnboardingTooltip';
const TOUR_COMPLETED_KEY = 'workspaceTourCompleted';

interface UseWorkspaceTourReturn {
  /** Whether the tour is currently active */
  isActive: boolean;
  /** Whether the tour has been completed */
  isComplete: boolean;
  /** Start the tour manually */
  startTour: () => void;
  /** Mark the tour as complete */
  completeTour: () => void;
  /** Dismiss the tour without completing */
  dismissTour: () => void;
  /** Reset the tour (for testing) */
  resetTour: () => void;
}

export function useWorkspaceTour(): UseWorkspaceTourReturn {
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Check localStorage on mount to determine if tour should show
  useEffect(() => {
    const shouldShow = localStorage.getItem(SHOW_TOUR_KEY) === 'true';
    const hasCompleted = localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';

    if (shouldShow && !hasCompleted) {
      // Delay slightly to let workspace render first
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);

      return () => clearTimeout(timer);
    }

    if (hasCompleted) {
      setIsComplete(true);
    }
  }, []);

  const startTour = useCallback(() => {
    setIsActive(true);
    setIsComplete(false);
    localStorage.removeItem(TOUR_COMPLETED_KEY);
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setIsComplete(true);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    localStorage.removeItem(SHOW_TOUR_KEY);
    console.log('[WorkspaceTour] Tour completed');
  }, []);

  const dismissTour = useCallback(() => {
    setIsActive(false);
    setIsComplete(true);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    localStorage.removeItem(SHOW_TOUR_KEY);
    console.log('[WorkspaceTour] Tour dismissed');
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    localStorage.setItem(SHOW_TOUR_KEY, 'true');
    setIsComplete(false);
    setIsActive(false);
    // Small delay then activate
    setTimeout(() => setIsActive(true), 100);
    console.log('[WorkspaceTour] Tour reset');
  }, []);

  return {
    isActive,
    isComplete,
    startTour,
    completeTour,
    dismissTour,
    resetTour,
  };
}

export default useWorkspaceTour;
