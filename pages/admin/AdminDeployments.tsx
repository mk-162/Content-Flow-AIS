import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Project, Organization } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { triggerBuild } from '../../services/deploymentService';
import {
  Search,
  Rocket,
  Globe,
  Palette,
  RefreshCw,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { DeploymentConfigModal } from '../../components/admin/DeploymentConfigModal';

interface ProjectWithOrg extends Project {
  orgName?: string;
}

export const AdminDeployments: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithOrg[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'configured' | 'not-configured'>('all');
  const [triggeringBuild, setTriggeringBuild] = useState<string | null>(null);
  const [configModalProject, setConfigModalProject] = useState<ProjectWithOrg | null>(null);
  const [buildResult, setBuildResult] = useState<{ projectId: string; success: boolean; message: string } | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Fetch all organizations
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const orgsMap = new Map<string, Organization>();
      orgsSnap.docs.forEach(doc => {
        orgsMap.set(doc.id, { id: doc.id, ...doc.data() } as Organization);
      });

      // Fetch projects from each organization's subcollection
      const allProjects: ProjectWithOrg[] = [];

      for (const org of orgsMap.values()) {
        try {
          const projectsSnap = await getDocs(collection(db, `organizations/${org.id}/projects`));
          projectsSnap.docs.forEach(doc => {
            const projectData = doc.data() as Project;
            // Skip archived projects
            if (!projectData.isArchived) {
              allProjects.push({
                id: doc.id,
                ...projectData,
                orgName: org.name
              });
            }
          });
        } catch (err) {
          console.error(`Error fetching projects for org ${org.id}:`, err);
        }
      }

      // Sort: configured first, then by org name, then by project name
      allProjects.sort((a, b) => {
        const aConfigured = !!a.settings?.deployment?.webhookUrl;
        const bConfigured = !!b.settings?.deployment?.webhookUrl;
        if (aConfigured && !bConfigured) return -1;
        if (!aConfigured && bConfigured) return 1;
        // Then by org name
        const orgCompare = (a.orgName || '').localeCompare(b.orgName || '');
        if (orgCompare !== 0) return orgCompare;
        // Then by project name
        return a.name.localeCompare(b.name);
      });

      setProjects(allProjects);
      setFilteredProjects(allProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let filtered = projects;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.orgName?.toLowerCase().includes(query) ||
        p.settings?.deployment?.customDomain?.toLowerCase().includes(query) ||
        p.settings?.deployment?.theme?.toLowerCase().includes(query)
      );
    }

    // Apply config filter
    if (filter === 'configured') {
      filtered = filtered.filter(p => !!p.settings?.deployment?.webhookUrl);
    } else if (filter === 'not-configured') {
      filtered = filtered.filter(p => !p.settings?.deployment?.webhookUrl);
    }

    setFilteredProjects(filtered);
  }, [searchQuery, filter, projects]);

  const handleTriggerBuild = async (project: ProjectWithOrg) => {
    if (!user) return;

    const webhookUrl = project.settings?.deployment?.webhookUrl;
    if (!webhookUrl) {
      setBuildResult({
        projectId: project.id,
        success: false,
        message: 'No webhook URL configured for this project'
      });
      return;
    }

    setTriggeringBuild(project.id);
    setBuildResult(null);

    try {
      const result = await triggerBuild(project.organizationId, project.id, user.id, webhookUrl);
      setBuildResult({
        projectId: project.id,
        success: result.success,
        message: result.success ? 'Build triggered successfully!' : result.error || 'Failed to trigger build'
      });

      // Refresh to get updated timestamps
      if (result.success) {
        await fetchProjects();
      }
    } catch (error) {
      setBuildResult({
        projectId: project.id,
        success: false,
        message: 'Error triggering build'
      });
    } finally {
      setTriggeringBuild(null);
    }
  };

  const handleConfigSaved = () => {
    setConfigModalProject(null);
    fetchProjects();
  };

  const configuredCount = projects.filter(p => !!p.settings?.deployment?.webhookUrl).length;
  const notConfiguredCount = projects.length - configuredCount;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Deployments</h1>
          <p className="text-slate-400 text-sm">
            Manage CloudFlare/Terraform deployment configuration for projects
          </p>
        </div>
        <button
          onClick={fetchProjects}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{projects.length}</div>
              <div className="text-xs text-slate-500">Total Projects</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{configuredCount}</div>
              <div className="text-xs text-slate-500">Configured</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{notConfiguredCount}</div>
              <div className="text-xs text-slate-500">Not Configured</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects, domains, themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 text-sm transition-colors ${
              filter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('configured')}
            className={`px-3 py-2 text-sm transition-colors ${
              filter === 'configured' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            Configured
          </button>
          <button
            onClick={() => setFilter('not-configured')}
            className={`px-3 py-2 text-sm transition-colors ${
              filter === 'not-configured' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            Not Configured
          </button>
        </div>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 text-center">
          <Rocket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No projects found</h3>
          <p className="text-slate-400 text-sm">
            {searchQuery ? 'Try adjusting your search query' : 'No projects exist yet'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Build</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProjects.map((project) => {
                const isConfigured = !!project.settings?.deployment?.webhookUrl;
                const deployment = project.settings?.deployment;
                const lastBuild = deployment?.lastBuildTriggeredAt;

                return (
                  <tr key={project.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 flex items-center justify-center">
                          <Rocket className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{project.name}</div>
                          <div className="text-xs text-slate-500">{project.orgName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {deployment?.theme ? (
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-purple-400" />
                          <span className="text-slate-300 font-mono text-sm">{deployment.theme}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {deployment?.customDomain ? (
                        (() => {
                          const domain = deployment.customDomain.replace(/^https?:\/\//, '');
                          return (
                            <a
                              href={`https://${domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                              <span className="text-sm">{domain}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          );
                        })()
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {lastBuild ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {lastBuild.toDate().toLocaleDateString()} {lastBuild.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isConfigured ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Setup Required
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {buildResult?.projectId === project.id && (
                          <span className={`text-xs ${buildResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {buildResult.message}
                          </span>
                        )}
                        {isConfigured && (
                          <button
                            onClick={() => handleTriggerBuild(project)}
                            disabled={triggeringBuild === project.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm transition-colors disabled:opacity-50"
                          >
                            {triggeringBuild === project.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Rocket className="w-3.5 h-3.5" />
                            )}
                            Build
                          </button>
                        )}
                        <button
                          onClick={() => setConfigModalProject(project)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Configure
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Configuration Modal */}
      {configModalProject && (
        <DeploymentConfigModal
          project={configModalProject}
          onClose={() => setConfigModalProject(null)}
          onSave={handleConfigSaved}
        />
      )}
    </div>
  );
};

export default AdminDeployments;
