import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  msg: string;
  type: 'success' | 'info';
}

export interface UseNotificationsResult {
  notifications: Notification[];
  notify: (msg: string, type?: 'success' | 'info') => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * Hook for managing toast notifications
 * Extracted from MainWorkspace for reusability
 */
export function useNotifications(autoHideDuration = 3000): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((msg: string, type: 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36);
    setNotifications((prev) => [...prev, { id, msg, type }]);

    if (autoHideDuration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, autoHideDuration);
    }
  }, [autoHideDuration]);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    notify,
    clearNotification,
    clearAll,
  };
}
