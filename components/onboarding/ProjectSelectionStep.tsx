import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Plus, FolderOpen } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const ProjectSelectionStep: React.FC = () => {
  const {
    session,
    selectProject,
    createCustomProject,
    updateProject,
    nextStep,
    previousStep,
    loading,
  } = useOnboarding();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Editing state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const projects = session?.suggestedProjects || [];
  const selectedProject = session?.selectedProject;

  const handleCreateCustom = () => {
    if (customName.trim()) {
      createCustomProject(customName.trim(), customDescription.trim());
      setShowCustomForm(false);
      setCustomName('');
      setCustomDescription('');
    }
  };

  const startEditing = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditDescription(project.description);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingProjectId && editName.trim()) {
      updateProject(editingProjectId, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setEditingProjectId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 text-sm mb-4">
          <FolderOpen className="w-4 h-4" />
          Step 1 of 2: Choose Your Project
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Let's create your first project
        </h1>
        <p className="text-slate-400">
          Based on your profile, we've identified {projects.length} main content areas
        </p>
      </motion.div>

      {/* Project Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3 mb-6"
      >
        {projects.map((project, index) => (
          <div
            key={project.id}
            onClick={() => selectProject(project.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectProject(project.id); }}
            className={`
              w-full text-left p-5 border transition-all cursor-pointer
              ${project.selected
                ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500/50'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{project.icon}</div>
                <div>
                  {editingProjectId === project.id ? (
                    <div className="mb-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="block w-full mb-2 px-2 py-1 bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="Project Name"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="block w-full mb-2 px-2 py-1 bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-500"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1 group/title">
                        <h3 className="font-semibold text-white">
                          {project.name}
                        </h3>
                        <button
                          onClick={(e) => startEditing(e, project)}
                          className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
                          title="Edit Project"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        {project.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Coverage: {project.coverage}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-cyan-400">
                    {project.estimatedOpportunities}
                  </p>
                  <p className="text-xs text-slate-500">opportunities</p>
                </div>

                <div
                  className={`
                    w-6 h-6 border-2 flex items-center justify-center
                    ${project.selected
                      ? 'border-cyan-500 bg-cyan-500'
                      : 'border-slate-600'
                    }
                  `}
                >
                  {project.selected && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Custom Project */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        {!showCustomForm ? (
          <button
            onClick={() => setShowCustomForm(true)}
            className="w-full p-4 border border-dashed border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Or create a custom project
          </button>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 p-5">
            <h3 className="font-medium text-white mb-4">Create Custom Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Product Education"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="What topics will this project cover?"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateCustom}
                  disabled={!customName.trim()}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  Create Project
                </button>
                <button
                  onClick={() => {
                    setShowCustomForm(false);
                    setCustomName('');
                    setCustomDescription('');
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Info Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/30 border border-slate-800 p-4 mb-8 text-center"
      >
        <p className="text-sm text-slate-500">
          Start with one project. You can add more projects later (Starter plan and above).
        </p>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <div className="flex justify-center gap-4">
          <button
            onClick={previousStep}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider transition-colors"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={loading || !selectedProject}
            className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            Continue with {selectedProject?.name || 'selected project'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectSelectionStep;
