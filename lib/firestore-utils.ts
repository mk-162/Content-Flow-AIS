import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentReference,
  CollectionReference,
  WhereFilterOp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
export const collections = {
  users: () => collection(db, 'users'),
  organizations: () => collection(db, 'organizations'),
  organizationMembers: () => collection(db, 'organizationMembers'),
  projectMembers: () => collection(db, 'projectMembers'),
  generationQueue: () => collection(db, 'generationQueue'),
  auditLogs: () => collection(db, 'auditLogs'),

  // Subcollections
  projects: (orgId: string) => collection(db, `organizations/${orgId}/projects`),
  categories: (orgId: string, projectId: string) =>
    collection(db, `organizations/${orgId}/projects/${projectId}/categories`),
  posts: (orgId: string, projectId: string) =>
    collection(db, `organizations/${orgId}/projects/${projectId}/posts`),
};

// Helper to create document references
export const docRef = {
  user: (userId: string) => doc(db, 'users', userId),
  organization: (orgId: string) => doc(db, 'organizations', orgId),
  orgMember: (orgId: string, userId: string) =>
    doc(db, 'organizationMembers', `${orgId}_${userId}`),
  project: (orgId: string, projectId: string) =>
    doc(db, `organizations/${orgId}/projects`, projectId),
  category: (orgId: string, projectId: string, categoryId: string) =>
    doc(db, `organizations/${orgId}/projects/${projectId}/categories`, categoryId),
  post: (orgId: string, projectId: string, postId: string) =>
    doc(db, `organizations/${orgId}/projects/${projectId}/posts`, postId),
};

// Generic CRUD operations
export const firestoreOps = {
  async get<T>(reference: DocumentReference): Promise<T | null> {
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as T;
  },

  async getAll<T>(collectionRef: CollectionReference, ...constraints: QueryConstraint[]): Promise<T[]> {
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  },

  async create<T>(reference: DocumentReference, data: T): Promise<void> {
    await setDoc(reference, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  async update<T>(reference: DocumentReference, data: Partial<T>): Promise<void> {
    await updateDoc(reference, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(reference: DocumentReference): Promise<void> {
    await deleteDoc(reference);
  },
};

// Query helpers
export const queryHelpers = {
  byOrganization: (organizationId: string) => where('organizationId', '==', organizationId),
  byProject: (projectId: string) => where('projectId', '==', projectId),
  byUser: (userId: string) => where('userId', '==', userId),
  byStatus: (status: string) => where('status', '==', status),
  orderByCreated: (direction: 'asc' | 'desc' = 'desc') =>
    orderBy('createdAt', direction),
  limitTo: (count: number) => limit(count),
};

// Convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Convert Date to Firestore Timestamp
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};
