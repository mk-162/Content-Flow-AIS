import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Organization, GlobalRole, Project } from '../types';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedOrg: Organization | null;
  impersonatedProjects: Project[];
  startImpersonation: (orgId: string) => Promise<void>;
  stopImpersonation: () => void;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};

interface ImpersonationProviderProps {
  children: React.ReactNode;
}

export const ImpersonationProvider: React.FC<ImpersonationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedOrg, setImpersonatedOrg] = useState<Organization | null>(null);
  const [impersonatedProjects, setImpersonatedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Only system admins can impersonate
  const canImpersonate = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  // Clear impersonation if user logs out or is not admin
  useEffect(() => {
    if (!user || !canImpersonate) {
      setIsImpersonating(false);
      setImpersonatedOrg(null);
      setImpersonatedProjects([]);
    }
  }, [user, canImpersonate]);

  // Load impersonation state from session storage on mount
  useEffect(() => {
    if (!canImpersonate) return;

    const savedOrgId = sessionStorage.getItem('impersonatedOrgId');
    if (savedOrgId) {
      startImpersonation(savedOrgId);
    }
  }, [canImpersonate]);

  const startImpersonation = async (orgId: string) => {
    if (!canImpersonate) {
      console.error('User is not authorized to impersonate');
      return;
    }

    setLoading(true);
    try {
      // Fetch the organization
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = {
        id: orgDoc.id,
        ...orgDoc.data(),
      } as Organization;

      // Fetch the organization's projects
      const projectsSnapshot = await getDocs(
        collection(db, `organizations/${orgId}/projects`)
      );
      const projects = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];

      setImpersonatedOrg(org);
      setImpersonatedProjects(projects);
      setIsImpersonating(true);

      // Save to session storage
      sessionStorage.setItem('impersonatedOrgId', orgId);
    } catch (error) {
      console.error('Error starting impersonation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonation = () => {
    setIsImpersonating(false);
    setImpersonatedOrg(null);
    setImpersonatedProjects([]);
    sessionStorage.removeItem('impersonatedOrgId');
  };

  const value: ImpersonationContextType = {
    isImpersonating,
    impersonatedOrg,
    impersonatedProjects,
    startImpersonation,
    stopImpersonation,
    loading,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};
