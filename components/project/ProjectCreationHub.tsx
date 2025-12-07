import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Sparkles, Copy, ArrowRight } from 'lucide-react';
import { Project } from '../../types';

interface ProjectCreationHubProps {
  isOpen: boolean;
  onClose: () => void;
  existingProjects: Project[];
  onQuickCreate: () => void;
  onCloneProject: () => void;
}

type CreationPath = 'selection' | 'quick' | 'advanced' | 'clone';

export const ProjectCreationHub: React.FC<ProjectCreationHubProps> = ({
  isOpen,
  onClose,
  existingProjects,
  onQuickCreate,
  onCloneProject,
}) => {
  const navigate = useNavigate();
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdvancedSetup = () => {
    onClose();
    navigate('/onboarding/project');
  };

  const handleQuickCreate = () => {
    onClose();
    onQuickCreate();
  };

  const handleCloneProject = () => {
    onClose();
    onCloneProject();
  };

  const hasExistingProjects = existingProjects.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Project</h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose how you'd like to set up your project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* Quick Create */}
          <button
            onClick={handleQuickCreate}
            onMouseEnter={() => setHoveredOption('quick')}
            onMouseLeave={() => setHoveredOption(null)}
            className={`
              w-full p-5 text-left border transition-all duration-200
              ${hoveredOption === 'quick'
                ? 'bg-cyan-500/10 border-cyan-500/50'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 flex items-center justify-center transition-colors
                ${hoveredOption === 'quick' ? 'bg-cyan-500/20' : 'bg-slate-700'}
              `}>
                <Zap className={`w-6 h-6 ${hoveredOption === 'quick' ? 'text-cyan-400' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">Quick Create</h3>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs uppercase">
                    Fastest
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Just enter a name and description. Get started in seconds.
                </p>
              </div>
              <ArrowRight className={`w-5 h-5 mt-1 transition-colors ${
                hoveredOption === 'quick' ? 'text-cyan-400' : 'text-slate-600'
              }`} />
            </div>
          </button>

          {/* AI-Powered Setup */}
          <button
            onClick={handleAdvancedSetup}
            onMouseEnter={() => setHoveredOption('advanced')}
            onMouseLeave={() => setHoveredOption(null)}
            className={`
              w-full p-5 text-left border transition-all duration-200
              ${hoveredOption === 'advanced'
                ? 'bg-purple-500/10 border-purple-500/50'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 flex items-center justify-center transition-colors
                ${hoveredOption === 'advanced' ? 'bg-purple-500/20' : 'bg-slate-700'}
              `}>
                <Sparkles className={`w-6 h-6 ${hoveredOption === 'advanced' ? 'text-purple-400' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">AI-Powered Setup</h3>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs uppercase">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Analyze your website and auto-generate categories, subcategories, and content strategy.
                </p>
              </div>
              <ArrowRight className={`w-5 h-5 mt-1 transition-colors ${
                hoveredOption === 'advanced' ? 'text-purple-400' : 'text-slate-600'
              }`} />
            </div>
          </button>

          {/* Clone Existing */}
          <button
            onClick={handleCloneProject}
            onMouseEnter={() => setHoveredOption('clone')}
            onMouseLeave={() => setHoveredOption(null)}
            disabled={!hasExistingProjects}
            className={`
              w-full p-5 text-left border transition-all duration-200
              ${!hasExistingProjects
                ? 'opacity-50 cursor-not-allowed bg-slate-900/50 border-slate-800'
                : hoveredOption === 'clone'
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 flex items-center justify-center transition-colors
                ${hoveredOption === 'clone' && hasExistingProjects ? 'bg-green-500/20' : 'bg-slate-700'}
              `}>
                <Copy className={`w-6 h-6 ${
                  hoveredOption === 'clone' && hasExistingProjects ? 'text-green-400' : 'text-slate-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">Clone Existing Project</h3>
                </div>
                <p className="text-sm text-slate-400">
                  {hasExistingProjects
                    ? `Copy structure from one of your ${existingProjects.length} existing project${existingProjects.length === 1 ? '' : 's'}.`
                    : 'No existing projects to clone. Create your first project above.'
                  }
                </p>
              </div>
              <ArrowRight className={`w-5 h-5 mt-1 transition-colors ${
                hoveredOption === 'clone' && hasExistingProjects ? 'text-green-400' : 'text-slate-600'
              }`} />
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/50">
          <p className="text-xs text-slate-600 text-center">
            You can always add more projects later or modify your project settings after creation.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectCreationHub;
