import React from 'react';
import { Plus, Layers, FileText } from 'lucide-react';

export type WorkspaceTab = 'categories' | 'briefs';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  categoryCount?: number;
  briefCount?: number;
  onAddClick?: () => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  activeTab,
  onTabChange,
  categoryCount = 0,
  briefCount = 0,
  onAddClick,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#0a0a0f]">
      {/* Tab buttons */}
      <div className="flex items-center gap-1">
        <TabButton
          active={activeTab === 'categories'}
          onClick={() => onTabChange('categories')}
          icon={<Layers size={16} />}
          label="Categories"
          count={categoryCount}
        />
        <TabButton
          active={activeTab === 'briefs'}
          onClick={() => onTabChange('briefs')}
          icon={<FileText size={16} />}
          label="Briefs"
          count={briefCount}
        />
      </div>

      {/* Add button - changes based on active tab */}
      {onAddClick && (
        <button
          onClick={() => {
            console.log('[WorkspaceTabs] Add button clicked');
            onAddClick();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {activeTab === 'categories' ? 'Add Category' : 'Add Brief'}
        </button>
      )}
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all relative
      ${active
        ? 'text-white'
        : 'text-zinc-500 hover:text-zinc-300'
      }
    `}
  >
    {icon}
    <span>{label}</span>
    {count !== undefined && count > 0 && (
      <span className={`
        min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full flex items-center justify-center
        ${active ? 'bg-purple-500 text-white' : 'bg-zinc-700 text-zinc-400'}
      `}>
        {count}
      </span>
    )}
    {/* Active indicator line */}
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
    )}
  </button>
);

export default WorkspaceTabs;
