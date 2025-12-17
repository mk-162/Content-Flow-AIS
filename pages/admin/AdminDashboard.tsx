import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Terminal,
  Settings,
  ArrowLeft,
  Shield,
  Rocket,
} from 'lucide-react';
import { TopBar } from '../../components/layout';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/users', icon: Users, label: 'Users', end: false },
  { to: '/admin/organizations', icon: Building2, label: 'Organizations', end: false },
  { to: '/admin/deployments', icon: Rocket, label: 'Deployments', end: false },
  { to: '/admin/prompts', icon: Terminal, label: 'Prompts', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-slate-200 font-sans">
      {/* Top Bar */}
      <TopBar showProject={false} />

      {/* Main Layout with Admin Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
          {/* Admin Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-slate-500">System Management</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-purple-600/20 text-purple-400 border-l-2 border-purple-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-l-2 border-transparent'
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Back to App */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
