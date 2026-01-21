import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types';

interface UseFirestoreCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for real-time Firestore categories listener
 * Extracted from MainWorkspace for reusability
 */
export function useFirestoreCategories(
  orgId: string | undefined,
  projectId: string | undefined
): UseFirestoreCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId || !projectId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const categoriesRef = collection(
      db,
      `organizations/${orgId}/projects/${projectId}/categories`
    );

    const unsubscribe = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(categoriesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to categories:', err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [orgId, projectId]);

  return { categories, loading, error };
}
