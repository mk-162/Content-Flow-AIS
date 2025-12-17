import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Folder,
  Users,
  FileText,
  Calendar,
  Settings,
  Info,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { QuickCreateProjectModal } from '../components/QuickCreateProjectModal';
import { ProjectCreationHub } from '../components/project/ProjectCreationHub';
import { CloneProjectModal, CloneOptions } from '../components/project/CloneProjectModal';
import { AppShell } from '../components/layout';

interface ProjectStats {
  memberCount: number;
  categoryCount: number;
  postCount: number;
  categories: Array<{ id: string; name: string }>;
}

export const ProjectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentOrg, createOrganization } = useOrganization();
  const { projects, createProject, cloneProject, setCurrentProject } = useProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreationHub, setShowCreationHub] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showProjectInfo, setShowProjectInfo] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});

  // Organization creation state
  const [showOrgCreateModal, setShowOrgCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [orgCreating, setOrgCreating] = useState(false);
  const [orgError, setOrgError] = useState('');

  // Fetch stats for each project
  useEffect(() => {
    if (!currentOrg || projects.length === 0) return;

    const fetchProjectStats = async () => {
      const stats: Record<string, ProjectStats> = {};

      for (const project of projects) {
        try {
          // Get member count
          const membersQuery = query(
            collection(db, 'projectMembers'),
            where('projectId', '==', project.id)
          );
          const membersSnapshot = await getDocs(membersQuery);

          // Get category count and names
          const categoriesSnapshot = await getDocs(
            collection(db, `organizations/${currentOrg.id}/projects/${project.id}/categories`)
          );
          const categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
          }));

          // Get post count
          const postsSnapshot = await getDocs(
            collection(db, `organizations/${currentOrg.id}/projects/${project.id}/posts`)
          );

          stats[project.id] = {
            memberCount: membersSnapshot.size,
            categoryCount: categoriesSnapshot.size,
            postCount: postsSnapshot.size,
            categories,
          };
        } catch (error) {
          console.error(`Error fetching stats for project ${project.id}:`, error);
        }
      }

      setProjectStats(stats);
    };

    fetchProjectStats();
  }, [projects, currentOrg]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setCreating(true);
      const projectId = await createProject(newProjectName.trim(), newProjectDescription.trim());
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateModal(false);
      // Navigate to the new project
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError('');

    if (!newOrgName.trim()) {
      setOrgError('Organization name is required');
      return;
    }

    try {
      setOrgCreating(true);
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setShowOrgCreateModal(false);
      // Organization context will automatically update and reload the page
    } catch (err: any) {
      setOrgError(err.message || 'Failed to create organization');
    } finally {
      setOrgCreating(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId);
    navigate('/');
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!currentOrg) {
    return (
      <AppShell showProject={false}>
        {/* Main content - no org */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Folder className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Welcome to MissionContent!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Get started by creating your first organization
            </p>
            <button
              onClick={() => setShowOrgCreateModal(true)}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500
                       text-white text-xs font-bold uppercase tracking-wider py-3 px-6 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Organization
            </button>
          </div>
        </div>

        {/* Create Organization Modal */}
        {showOrgCreateModal && (
          <>
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
              onClick={() => !orgCreating && setShowOrgCreateModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6"
              >
                <h2 className="text-lg font-bold text-white mb-4">Create Organization</h2>

                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div>
                    <label htmlFor="orgName" className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                      Organization Name
                    </label>
                    <input
                      id="orgName"
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="My Company"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                               text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500
                               transition-colors"
                      disabled={orgCreating}
                      autoFocus
                    />
                  </div>

                  {orgError && <p className="text-red-400 text-xs">{orgError}</p>}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={orgCreating}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4
                               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orgCreating ? 'Creating...' : 'Create Organization'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOrgCreateModal(false);
                        setNewOrgName('');
                        setOrgError('');
                      }}
                      disabled={orgCreating}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-2.5 px-4
                               transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell showProject={false}>
      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Explainer Widget */}
          {showProjectInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg relative"
            >
              <button
                onClick={() => setShowProjectInfo(false)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 mb-1">What is a Project?</h3>
                  <p className="text-xs text-slate-300">
                    A project is a collection of content organized by categories. Each project can have its own team members,
                    content categories, and posts. Use projects to separate different websites, brands, or content initiatives.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
              <p className="text-slate-500 text-sm">
                Manage your content generation projects for {currentOrg.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Create Shortcut */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 transition-all group"
                title="Quick Create (skip wizard)"
              >
                <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
              {/* New Project Button */}
              <button
                onClick={() => setShowCreationHub(true)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white
                         text-xs font-bold uppercase tracking-wider py-2.5 px-5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No projects yet</h3>
              <p className="text-slate-500 text-sm mb-6">
                Create your first project to start generating content
              </p>
              <button
                onClick={() => setShowCreationHub(true)}
                className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500
                         text-white text-xs font-bold uppercase tracking-wider py-2.5 px-5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const stats = projectStats[project.id] || {
                  memberCount: 0,
                  categoryCount: 0,
                  postCount: 0,
                  categories: [],
                };

                const displayCategories = stats.categories.slice(0, 3);
                const remainingCount = stats.categoryCount - displayCategories.length;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 overflow-hidden
                             hover:border-cyan-500/50 transition-colors group flex flex-col"
                  >
                    {/* Project Header */}
                    <div className="p-5 border-b border-slate-800">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center">
                            <Folder className="w-5 h-5 text-cyan-400" />
                          </div>
                          {project.projectType && (
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] uppercase tracking-wider border border-purple-500/30">
                              {project.projectType.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentProject(project.id);
                            navigate('/', { state: { initialScreen: 'settings' } });
                          }}
                          className="text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100
                                   transition-opacity"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{project.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                        {project.description || 'No description'}
                      </p>

                      {/* Website URL */}
                      {project.websiteUrl && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-2">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span className="truncate">{project.websiteUrl}</span>
                        </div>
                      )}
                    </div>

                    {/* Categories Preview */}
                    {displayCategories.length > 0 && (
                      <div className="px-5 py-3 border-b border-slate-800">
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                          <Folder className="w-3 h-3" />
                          <span>Categories</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {displayCategories.map((cat) => (
                            <span
                              key={cat.id}
                              className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px]"
                            >
                              {cat.name}
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px]">
                              +{remainingCount} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Project Stats */}
                    <div className="p-5 flex-1">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-1 text-slate-600 text-[10px] uppercase tracking-wider mb-1">
                            <Users className="w-3 h-3" />
                            <span>Members</span>
                          </div>
                          <p className="text-lg font-bold text-white">{stats.memberCount}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-slate-600 text-[10px] uppercase tracking-wider mb-1">
                            <Folder className="w-3 h-3" />
                            <span>Categories</span>
                          </div>
                          <p className="text-lg font-bold text-white">
                            {stats.categoryCount}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-slate-600 text-[10px] uppercase tracking-wider mb-1">
                            <FileText className="w-3 h-3" />
                            <span>Posts</span>
                          </div>
                          <p className="text-lg font-bold text-white">{stats.postCount}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-600 uppercase tracking-wider mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(project.createdAt)}</span>
                        </div>
                      </div>

                      {/* Open Button */}
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Open Project</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6"
            >
              <h2 className="text-lg font-bold text-white mb-4">Create New Project</h2>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Project Name
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Content Project"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                             text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500
                             transition-colors"
                    disabled={creating}
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="projectDescription" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="projectDescription"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                             text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500
                             transition-colors resize-none"
                    disabled={creating}
                  />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewProjectName('');
                      setNewProjectDescription('');
                      setError('');
                    }}
                    disabled={creating}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider py-2.5 px-4
                             transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}

      {/* Project Creation Hub Modal */}
      <ProjectCreationHub
        isOpen={showCreationHub}
        onClose={() => setShowCreationHub(false)}
        existingProjects={projects}
        onQuickCreate={() => setShowCreateModal(true)}
        onCloneProject={() => setShowCloneModal(true)}
      />

      {/* Quick Create Modal */}
      <QuickCreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdvancedSetup={() => {
          setShowCreateModal(false);
          navigate('/onboarding/project');
        }}
      />

      {/* Clone Project Modal */}
      <CloneProjectModal
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        projects={projects}
        onClone={async (sourceProjectId, newName, newDescription, options) => {
          await cloneProject(sourceProjectId, newName, newDescription, options);
          navigate('/');
        }}
      />
    </AppShell>
  );
};
