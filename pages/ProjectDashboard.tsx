import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Folder,
  Users,
  Calendar,
  Settings,
  Info,
  ChevronRight,
  Zap,
  X,
  ExternalLink,
  Coins,
  Globe,
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
import { PostStatus } from '../types';

interface ProjectStats {
  categoryCount: number;
  titleCount: number;      // PENDING posts (stubs)
  reviewCount: number;     // NEEDS_REVIEW + GENERATING
  liveCount: number;       // PUBLISHED
  channelUrl?: string;     // from settings.deployment.customDomain
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
  const [orgMemberCount, setOrgMemberCount] = useState(0);

  // Fetch organization member count
  useEffect(() => {
    if (!currentOrg) return;

    const fetchOrgMemberCount = async () => {
      try {
        const membersQuery = query(
          collection(db, 'organizationMembers'),
          where('organizationId', '==', currentOrg.id)
        );
        const snapshot = await getDocs(membersQuery);
        setOrgMemberCount(snapshot.size);
      } catch (error) {
        console.error('Error fetching org member count:', error);
      }
    };

    fetchOrgMemberCount();
  }, [currentOrg]);

  // Fetch stats for each project
  useEffect(() => {
    if (!currentOrg || projects.length === 0) return;

    const fetchProjectStats = async () => {
      const stats: Record<string, ProjectStats> = {};

      for (const project of projects) {
        try {
          // Get category count
          const categoriesSnapshot = await getDocs(
            collection(db, `organizations/${currentOrg.id}/projects/${project.id}/categories`)
          );

          // Get posts and count by status
          const postsSnapshot = await getDocs(
            collection(db, `organizations/${currentOrg.id}/projects/${project.id}/posts`)
          );

          let titleCount = 0;
          let reviewCount = 0;
          let liveCount = 0;

          postsSnapshot.docs.forEach(doc => {
            const status = doc.data().status as PostStatus;
            if (status === PostStatus.PENDING) {
              titleCount++;
            } else if (status === PostStatus.NEEDS_REVIEW || status === PostStatus.GENERATING) {
              reviewCount++;
            } else if (status === PostStatus.PUBLISHED) {
              liveCount++;
            }
          });

          // Get custom domain URL from project settings
          const channelUrl = project.settings?.deployment?.customDomain;

          stats[project.id] = {
            categoryCount: categoriesSnapshot.size,
            titleCount,
            reviewCount,
            liveCount,
            channelUrl,
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
    <AppShell showProject={true}>
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

          {/* Organization Info Bar */}
          <div className="flex items-center justify-between mb-6 p-4 bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">{currentOrg.name}</h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Member Count */}
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4" />
                <span className="text-sm">{orgMemberCount} Member{orgMemberCount !== 1 ? 's' : ''}</span>
              </div>
              {/* Credits */}
              <div className="flex items-center gap-2 text-slate-400">
                <Coins className="w-4 h-4" />
                <span className="text-sm">
                  {currentOrg.credits?.balance ?? 0} / {currentOrg.credits?.monthlyAllowance ?? 0}
                </span>
              </div>
              {/* Plan Badge - Clickable */}
              <button
                onClick={() => navigate('/admin/settings', { state: { tab: 'billing' } })}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-colors"
              >
                {currentOrg.subscriptionTier || 'FREE'}
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white">Projects</h1>
            <div className="flex items-center gap-2">
              {/* Quick Create Shortcut */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center w-9 h-9 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all"
                title="Quick Create (skip wizard)"
              >
                <Zap className="w-4 h-4" />
              </button>
              {/* New Project Button */}
              <button
                onClick={() => setShowCreationHub(true)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white
                         text-xs font-bold uppercase tracking-wider py-2 px-4 transition-colors"
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
                  categoryCount: 0,
                  titleCount: 0,
                  reviewCount: 0,
                  liveCount: 0,
                  channelUrl: undefined,
                };

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/80 border border-slate-700/50 overflow-hidden
                             hover:border-cyan-500/30 hover:bg-slate-900 transition-all duration-200 group
                             shadow-lg shadow-black/20"
                  >
                    {/* Project Header */}
                    <div className="p-5 bg-slate-800/30">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-white">{project.name}</h3>
                        <div className="flex items-center gap-2">
                          {project.projectType && (
                            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] uppercase tracking-wider border border-cyan-500/20">
                              {project.projectType.replace('_', ' ')}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentProject(project.id);
                              navigate('/', { state: { initialScreen: 'settings' } });
                            }}
                            className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-slate-700/50"
                            title="Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Channel URL - only show if configured */}
                      {stats.channelUrl && (
                        <a
                          href={`https://${stats.channelUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors mt-1"
                        >
                          <Globe className="w-3 h-3" />
                          <span>{stats.channelUrl.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="p-4 bg-slate-950/50">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-slate-800/50 p-3 text-center">
                          <p className="text-xl font-bold text-white">{stats.categoryCount}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Categories</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 text-center">
                          <p className="text-xl font-bold text-white">{stats.titleCount}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Titles</p>
                        </div>
                        <div className="bg-amber-500/10 p-3 text-center border border-amber-500/20">
                          <p className="text-xl font-bold text-amber-400">{stats.reviewCount}</p>
                          <p className="text-[9px] text-amber-500/70 uppercase tracking-widest mt-1">Review</p>
                        </div>
                        <div className="bg-emerald-500/10 p-3 text-center border border-emerald-500/20">
                          <p className="text-xl font-bold text-emerald-400">{stats.liveCount}</p>
                          <p className="text-[9px] text-emerald-500/70 uppercase tracking-widest mt-1">Live</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 bg-slate-800/20 flex items-center justify-between border-t border-slate-700/30">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        <span>Open</span>
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
