import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Folder,
  Users,
  FileText,
  Calendar,
  MoreVertical,
  UserPlus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ProjectStats {
  memberCount: number;
  categoryCount: number;
  postCount: number;
}

export const ProjectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentOrg, createOrganization } = useOrganization();
  const { projects, createProject, setCurrentProject } = useProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
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

          // Get category count
          const categoriesSnapshot = await getDocs(
            collection(db, `organizations/${currentOrg.id}/projects/${project.id}/categories`)
          );

          // Get post count
          const postsSnapshot = await getDocs(
            collection(db, `organizations/${currentOrg.id}/projects/${project.id}/posts`)
          );

          stats[project.id] = {
            memberCount: membersSnapshot.size,
            categoryCount: categoriesSnapshot.size,
            postCount: postsSnapshot.size,
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
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Top bar with sign out */}
        <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              <span className="text-slate-200 font-semibold">ContentFlow AI</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">{user?.email}</span>
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
                className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Folder className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to ContentFlow AI!</h2>
            <p className="text-slate-400 mb-6">
              Get started by creating your first organization
            </p>
            <button
              onClick={() => setShowOrgCreateModal(true)}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600
                       text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Organization
            </button>
          </div>
        </div>

        {/* Create Organization Modal */}
        {showOrgCreateModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => !orgCreating && setShowOrgCreateModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-lg p-6"
              >
                <h2 className="text-2xl font-bold text-slate-200 mb-4">Create Organization</h2>

                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div>
                    <label htmlFor="orgName" className="block text-sm font-medium text-slate-300 mb-2">
                      Organization Name
                    </label>
                    <input
                      id="orgName"
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="My Company"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg
                               text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500
                               focus:ring-2 focus:ring-cyan-500/20 transition-colors"
                      disabled={orgCreating}
                      autoFocus
                    />
                  </div>

                  {orgError && <p className="text-red-400 text-sm">{orgError}</p>}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={orgCreating}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2.5 px-4
                               rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-4
                               rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 mb-2">Projects</h1>
            <p className="text-slate-400">
              Manage your content generation projects for {currentOrg.name}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white
                     font-medium py-3 px-5 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No projects yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first project to start generating content
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600
                       text-white font-medium py-3 px-5 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const stats = projectStats[project.id] || {
                memberCount: 0,
                categoryCount: 0,
                postCount: 0,
              };

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden
                           hover:border-cyan-500/50 transition-colors group cursor-pointer"
                  onClick={() => handleSelectProject(project.id)}
                >
                  {/* Project Header */}
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                        <Folder className="w-6 h-6 text-cyan-400" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentProject(project.id);
                          navigate('/', { state: { initialScreen: 'settings' } });
                        }}
                        className="text-slate-400 hover:text-slate-300 opacity-0 group-hover:opacity-100
                                 transition-opacity"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-1">{project.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                  </div>

                  {/* Project Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>Members</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-200">{stats.memberCount}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                          <Folder className="w-3.5 h-3.5" />
                          <span>Categories</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-200">
                          {stats.categoryCount}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Posts</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-200">{stats.postCount}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created {formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-lg p-6"
            >
              <h2 className="text-2xl font-bold text-slate-200 mb-4">Create New Project</h2>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-slate-300 mb-2">
                    Project Name
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Content Project"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg
                             text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500
                             focus:ring-2 focus:ring-cyan-500/20 transition-colors"
                    disabled={creating}
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="projectDescription" className="block text-sm font-medium text-slate-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="projectDescription"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg
                             text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500
                             focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
                    disabled={creating}
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2.5 px-4
                             rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-4
                             rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};
