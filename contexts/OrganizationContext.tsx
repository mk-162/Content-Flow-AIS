import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Organization,
  OrganizationContextType,
  OrganizationMember,
  SubscriptionTier,
  OrgMemberRole,
} from '../types';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrgState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get organization memberships for the current user
      const membershipsQuery = query(
        collection(db, 'organizationMembers'),
        where('userId', '==', user.id)
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);

      // Fetch organization details
      const orgPromises = membershipsSnapshot.docs.map(async (memberDoc) => {
        const membership = memberDoc.data() as OrganizationMember;
        const orgDoc = await getDoc(doc(db, 'organizations', membership.organizationId));

        if (orgDoc.exists()) {
          return {
            id: orgDoc.id,
            ...orgDoc.data(),
          } as Organization;
        }
        return null;
      });

      const orgs = (await Promise.all(orgPromises)).filter(
        (org): org is Organization => org !== null
      );

      setOrganizations(orgs);

      // Set current org if not already set
      if (!currentOrg && orgs.length > 0) {
        // Try to get from localStorage
        const savedOrgId = localStorage.getItem('currentOrganizationId');
        const savedOrg = orgs.find((o) => o.id === savedOrgId);
        setCurrentOrgState(savedOrg || orgs[0]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen to organization changes
  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrgState(null);
      setLoading(false);
      return;
    }

    fetchOrganizations();
  }, [user]);

  // Listen to current organization updates
  useEffect(() => {
    if (!currentOrg) return;

    const unsubscribe = onSnapshot(
      doc(db, 'organizations', currentOrg.id),
      (snapshot) => {
        if (snapshot.exists()) {
          setCurrentOrgState({
            id: snapshot.id,
            ...snapshot.data(),
          } as Organization);
        }
      },
      (error) => {
        console.error('Error listening to organization:', error);
      }
    );

    return unsubscribe;
  }, [currentOrg?.id]);

  // Set current organization
  const setCurrentOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrgState(org);
      localStorage.setItem('currentOrganizationId', orgId);
    }
  };

  // Create new organization
  const createOrganization = async (name: string): Promise<string> => {
    if (!user) throw new Error('Must be authenticated to create organization');

    try {
      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newOrg: Omit<Organization, 'id'> = {
        name,
        ownerId: user.id,
        subscriptionTier: SubscriptionTier.FREE,
        settings: {
          allowUserInvites: true,
          maxProjects: 5,
          maxUsersPerProject: 10,
        },
        systemPrompts: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Create organization document
      await setDoc(doc(db, 'organizations', orgId), newOrg);

      // Add user as owner
      const membershipId = `${orgId}_${user.id}`;
      const membership: Omit<OrganizationMember, 'id'> = {
        organizationId: orgId,
        userId: user.id,
        role: OrgMemberRole.OWNER,
        invitedBy: user.id,
        invitedAt: Timestamp.now(),
        joinedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'organizationMembers', membershipId), membership);

      // Set as current organization immediately (before state update)
      const createdOrg: Organization = {
        id: orgId,
        ...newOrg,
      };
      setCurrentOrgState(createdOrg);
      localStorage.setItem('currentOrganizationId', orgId);

      // Refresh organizations list in background
      fetchOrganizations();

      return orgId;
    } catch (error: any) {
      console.error('Error creating organization:', error);
      throw new Error(error.message || 'Failed to create organization');
    }
  };

  const value: OrganizationContextType = {
    currentOrg,
    organizations,
    setCurrentOrg,
    createOrganization,
    loading,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};
