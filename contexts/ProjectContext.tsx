import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, ProjectContextType, ProjectMember, ProjectMemberRole } from '../types';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';

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
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects for current organization
  const fetchProjects = async () => {
    if (!user || !currentOrg) {
      setProjects([]);
      setCurrentProjectState(null);
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

      const memberProjects = (await Promise.all(memberProjectsPromises)).filter(
        (p): p is Project => p !== null
      );

      setProjects(memberProjects);

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

  // Refetch projects when organization changes
  useEffect(() => {
    if (currentOrg) {
      fetchProjects();
    } else {
      setProjects([]);
      setCurrentProjectState(null);
      setLoading(false);
    }
  }, [currentOrg, user]);

  // Listen to current project updates
  useEffect(() => {
    if (!currentOrg || !currentProject) return;

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
  }, [currentOrg?.id, currentProject?.id]);

  // Set current project
  const setCurrentProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project && currentOrg) {
      setCurrentProjectState(project);
      localStorage.setItem(`currentProjectId_${currentOrg.id}`, projectId);
    }
  };

  // Create new project
  const createProject = async (name: string, description: string): Promise<string> => {
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

  const value: ProjectContextType = {
    currentProject,
    projects,
    setCurrentProject,
    createProject,
    loading,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};
