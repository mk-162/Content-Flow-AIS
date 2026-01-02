import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, ProjectContextType, ProjectMember, ProjectMemberRole, ProjectType, GlobalRole, CloneProjectOptions, Category, ChannelRecommendation } from '../types';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { useImpersonation } from './ImpersonationContext';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { isImpersonating, impersonatedProjects } = useImpersonation();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is system admin
  const isSystemAdmin = user?.globalRole === GlobalRole.SYSTEM_ADMIN;

  // Fetch projects for current organization
  const fetchProjects = async () => {
    if (!user || !currentOrg) {
      setProjects([]);
      setCurrentProjectState(null);
      setLoading(false);
      return;
    }

    // If impersonating, use impersonated projects directly
    if (isImpersonating && impersonatedProjects.length > 0) {
      setProjects(impersonatedProjects);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all projects in the organization
      const projectsQuery = query(
        collection(db, `organizations/${currentOrg.id}/projects`)
      );
      const projectsSnapshot = await getDocs(projectsQuery);

      const projectsList = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];

      // System admins can see all projects, others need to check membership
      let memberProjects: Project[];
      if (isSystemAdmin) {
        memberProjects = projectsList;
      } else {
        // Filter projects where user is a member
        const memberProjectsPromises = projectsList.map(async (project) => {
          const memberDoc = await getDocs(
            query(
              collection(db, 'projectMembers'),
              where('projectId', '==', project.id),
              where('userId', '==', user.id)
            )
          );

          return memberDoc.empty ? null : project;
        });

        memberProjects = (await Promise.all(memberProjectsPromises)).filter(
          (p): p is Project => p !== null
        );
      }

      setProjects(memberProjects.filter(p => !p.isArchived));

      // Set current project if not already set
      if (!currentProject && memberProjects.length > 0) {
        const savedProjectId = localStorage.getItem(
          `currentProjectId_${currentOrg.id}`
        );
        const savedProject = memberProjects.find((p) => p.id === savedProjectId);
        setCurrentProjectState(savedProject || memberProjects[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch projects when organization changes or impersonation changes
  useEffect(() => {
    let isMounted = true;

    if (currentOrg && user) {
      const loadProjects = async () => {
        if (isMounted) {
          await fetchProjects();
        }
      };
      loadProjects();
    } else {
      setProjects([]);
      setCurrentProjectState(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentOrg, user, isImpersonating, impersonatedProjects]);

  // Listen to current project updates
  useEffect(() => {
    if (!currentOrg || !currentProject || !user) return;

    const unsubscribe = onSnapshot(
      doc(db, `organizations/${currentOrg.id}/projects`, currentProject.id),
      (snapshot) => {
        if (snapshot.exists()) {
          setCurrentProjectState({
            id: snapshot.id,
            ...snapshot.data(),
          } as Project);
        }
      },
      (error) => {
        console.error('Error listening to project:', error);
      }
    );

    return unsubscribe;
  }, [currentOrg?.id, currentProject?.id, user]);

  // Set current project
  const setCurrentProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project && currentOrg) {
      setCurrentProjectState(project);
      localStorage.setItem(`currentProjectId_${currentOrg.id}`, projectId);
    }
  };

  // Create new project
  const createProject = async (
    name: string,
    description: string,
    options?: {
      websiteUrl?: string;
      projectType?: ProjectType;
      categories?: Array<{ name: string; description: string; order: number }>;
    }
  ): Promise<string> => {
    if (!user) throw new Error('Must be authenticated to create project');
    if (!currentOrg) throw new Error('Must select an organization');

    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newProject: Omit<Project, 'id'> = {
        organizationId: currentOrg.id,
        name,
        description,
        createdBy: user.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        websiteUrl: options?.websiteUrl,
        projectType: options?.projectType,
        settings: {
          autoPublish: false,
        },
      };

      // Create project document
      await setDoc(
        doc(db, `organizations/${currentOrg.id}/projects`, projectId),
        newProject
      );

      // Add creator as project admin
      const membershipId = `${projectId}_${user.id}`;
      const membership: Omit<ProjectMember, 'id'> = {
        organizationId: currentOrg.id,
        projectId,
        userId: user.id,
        role: ProjectMemberRole.ADMIN,
        addedBy: user.id,
        addedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'projectMembers', membershipId), membership);

      // Create categories if provided
      if (options?.categories && options.categories.length > 0) {
        for (const category of options.categories) {
          const categoryId = `cat_${Date.now()}_${category.order}_${Math.random().toString(36).substr(2, 9)}`;
          const newCategory = {
            projectId,
            organizationId: currentOrg.id,
            name: category.name,
            description: category.description,
            parentId: null,
            order: category.order,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await setDoc(
            doc(db, `organizations/${currentOrg.id}/projects/${projectId}/categories`, categoryId),
            newCategory
          );
        }
      }

      // Set as current project immediately (before state update)
      const createdProject: Project = {
        id: projectId,
        ...newProject,
      };
      setCurrentProjectState(createdProject);
      localStorage.setItem(`currentProjectId_${currentOrg.id}`, projectId);

      // Refresh projects list in background
      fetchProjects();

      return projectId;
    } catch (error: any) {
      console.error('Error creating project:', error);
      throw new Error(error.message || 'Failed to create project');
    }
  };

  // Clone existing project
  const cloneProject = async (
    sourceProjectId: string,
    newName: string,
    newDescription: string,
    options: CloneProjectOptions
  ): Promise<string> => {
    if (!user) throw new Error('Must be authenticated to clone project');
    if (!currentOrg) throw new Error('Must select an organization');

    try {
      // Get source project
      const sourceProjectRef = doc(db, `organizations/${currentOrg.id}/projects`, sourceProjectId);
      const sourceProjectSnap = await getDoc(sourceProjectRef);

      if (!sourceProjectSnap.exists()) {
        throw new Error('Source project not found');
      }

      const sourceProject = { id: sourceProjectSnap.id, ...sourceProjectSnap.data() } as Project;

      // Generate new project ID
      const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build new project data
      const newProject: Omit<Project, 'id'> = {
        organizationId: currentOrg.id,
        name: newName,
        description: newDescription,
        createdBy: user.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        websiteUrl: sourceProject.websiteUrl,
        projectType: sourceProject.projectType,
        settings: options.includeSettings ? { ...sourceProject.settings } : { autoPublish: false },
        businessProfile: options.includeBusinessProfile ? sourceProject.businessProfile : undefined,
      };

      // Create new project document
      await setDoc(
        doc(db, `organizations/${currentOrg.id}/projects`, newProjectId),
        newProject
      );

      // Add creator as project admin
      const membershipId = `${newProjectId}_${user.id}`;
      const membership: Omit<ProjectMember, 'id'> = {
        organizationId: currentOrg.id,
        projectId: newProjectId,
        userId: user.id,
        role: ProjectMemberRole.ADMIN,
        addedBy: user.id,
        addedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'projectMembers', membershipId), membership);

      // Clone categories if requested
      if (options.includeCategories) {
        const categoriesSnapshot = await getDocs(
          collection(db, `organizations/${currentOrg.id}/projects/${sourceProjectId}/categories`)
        );

        const allCategories = categoriesSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Category[];

        // Separate parent categories and subcategories
        const parentCategories = allCategories.filter(c => !c.parentId);
        const subcategories = allCategories.filter(c => c.parentId);

        // Map old category IDs to new category IDs
        const categoryIdMap = new Map<string, string>();

        // Clone parent categories first
        for (const category of parentCategories) {
          const newCategoryId = `cat_${Date.now()}_${category.order}_${Math.random().toString(36).substr(2, 9)}`;
          categoryIdMap.set(category.id, newCategoryId);

          const newCategory: Omit<Category, 'id'> = {
            projectId: newProjectId,
            organizationId: currentOrg.id,
            name: category.name,
            description: category.description,
            parentId: null,
            order: category.order,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await setDoc(
            doc(db, `organizations/${currentOrg.id}/projects/${newProjectId}/categories`, newCategoryId),
            newCategory
          );
        }

        // Clone subcategories if requested
        if (options.includeSubcategories) {
          let subOrder = 0;
          for (const subcategory of subcategories) {
            const newParentId = categoryIdMap.get(subcategory.parentId!);
            if (!newParentId) continue; // Parent wasn't cloned, skip this subcategory

            const newSubcategoryId = `cat_${Date.now()}_sub_${subOrder}_${Math.random().toString(36).substr(2, 9)}`;

            const newSubcategory: Omit<Category, 'id'> = {
              projectId: newProjectId,
              organizationId: currentOrg.id,
              name: subcategory.name,
              description: subcategory.description,
              parentId: newParentId,
              order: subcategory.order,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            await setDoc(
              doc(db, `organizations/${currentOrg.id}/projects/${newProjectId}/categories`, newSubcategoryId),
              newSubcategory
            );

            subOrder++;
          }
        }
      }

      // Set as current project
      const createdProject: Project = {
        id: newProjectId,
        ...newProject,
      };
      setCurrentProjectState(createdProject);
      localStorage.setItem(`currentProjectId_${currentOrg.id}`, newProjectId);

      // Refresh projects list
      fetchProjects();

      return newProjectId;
    } catch (error: any) {
      console.error('Error cloning project:', error);
      throw new Error(error.message || 'Failed to clone project');
    }
  };

  // Create project from a channel recommendation (used by Channel Shortcuts)
  const createProjectFromChannel = async (
    channel: ChannelRecommendation,
    options: { createCategories?: boolean } = { createCategories: true }
  ): Promise<string> => {
    if (!user) throw new Error('Must be authenticated to create project');
    if (!currentOrg) throw new Error('Must select an organization');

    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newProject: Omit<Project, 'id'> = {
        organizationId: currentOrg.id,
        name: channel.title,
        description: channel.description,
        channelType: channel.channelType,
        suggestedCategories: channel.suggestedCategories,
        createdBy: user.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        settings: {
          autoPublish: false,
        },
      };

      // Use batch write for atomicity
      const batch = writeBatch(db);

      // Create project
      batch.set(
        doc(db, `organizations/${currentOrg.id}/projects`, projectId),
        newProject
      );

      // Add user as project admin
      const membershipId = `${projectId}_${user.id}`;
      batch.set(doc(db, 'projectMembers', membershipId), {
        organizationId: currentOrg.id,
        projectId,
        userId: user.id,
        role: ProjectMemberRole.ADMIN,
        addedBy: user.id,
        addedAt: Timestamp.now(),
      });

      // Create categories from suggestedCategories if requested
      if (options.createCategories && channel.suggestedCategories?.length) {
        channel.suggestedCategories.forEach((categoryName, index) => {
          const categoryId = `cat_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
          batch.set(
            doc(db, `organizations/${currentOrg.id}/projects/${projectId}/categories`, categoryId),
            {
              projectId,
              organizationId: currentOrg.id,
              name: categoryName,
              description: '',
              parentId: null,
              order: index,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            }
          );
        });
      }

      // Mark recommendation as used in Organization
      const currentUsedIds = currentOrg.usedChannelRecommendationIds || [];
      if (!currentUsedIds.includes(channel.id)) {
        batch.update(doc(db, 'organizations', currentOrg.id), {
          usedChannelRecommendationIds: [...currentUsedIds, channel.id],
          updatedAt: Timestamp.now(),
        });
      }

      await batch.commit();

      // Update local state
      const createdProject: Project = {
        id: projectId,
        ...newProject,
      };
      setCurrentProjectState(createdProject);
      localStorage.setItem(`currentProjectId_${currentOrg.id}`, projectId);

      // Refresh projects list
      fetchProjects();

      return projectId;
    } catch (error: any) {
      console.error('Error creating project from channel:', error);
      throw new Error(error.message || 'Failed to create project from channel');
    }
  };

  const value: ProjectContextType = {
    currentProject,
    projects,
    setCurrentProject,
    createProject,
    cloneProject,
    createProjectFromChannel,
    loading,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};
