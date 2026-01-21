import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Folder, LayoutGrid } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';

interface ProjectSelectorProps {
  collapsed?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const { currentProject, projects, setCurrentProject } = useProject();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProjectSelect = (projectId: string) => {
    setCurrentProject(projectId);
    setShowDropdown(false);
  };

  if (!currentProject) return null;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="All Projects"
        >
          <LayoutGrid size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 min-w-0" ref={dropdownRef}>
      {/* Dashboard icon */}
      <button
        onClick={() => navigate('/projects')}
        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        title="All Projects"
      >
        <LayoutGrid size={16} />
      </button>

      {/* Project dropdown */}
      <div className="relative flex-1 min-w-0">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-slate-900/50 hover:bg-slate-800
                   text-slate-200 transition-colors border border-slate-700/50 hover:border-slate-600 min-w-0"
        >
          <Folder className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span className="font-medium text-sm truncate flex-1 text-left">{currentProject.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-700 shadow-xl z-50">
            <div className="py-1 max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project.id)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-700 transition-colors ${
                    currentProject.id === project.id ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </div>
                  {currentProject.id === project.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-700">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/projects');
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Manage All Projects
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
