import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, Organization } from '../../types';
import {
  Users,
  Building2,
  FileText,
  TrendingUp,
  Clock,
  UserPlus,
  FolderPlus
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalOrganizations: number;
  totalPosts: number;
  activeUsers7Days: number;
}

interface RecentActivity {
  type: 'user_signup' | 'org_created';
  name: string;
  email?: string;
  timestamp: Date;
}

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrganizations: 0,
    totalPosts: 0,
    activeUsers7Days: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];

        // Fetch organizations
        const orgsSnap = await getDocs(collection(db, 'organizations'));
        const orgs = orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Organization[];

        // Calculate active users in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = users.filter(u => {
          if (!u.lastActiveAt) return false;
          const lastActive = u.lastActiveAt.toDate();
          return lastActive >= sevenDaysAgo;
        }).length;

        // Count posts across all orgs/projects (simplified - just count generation queue)
        // In a real app you'd query all posts across projects
        let totalPosts = 0;
        // For now, we'll just show 0 or you can add proper post counting logic

        setStats({
          totalUsers: users.length,
          totalOrganizations: orgs.length,
          totalPosts,
          activeUsers7Days: activeUsers
        });

        // Build recent activity from users and orgs
        const activity: RecentActivity[] = [];

        // Recent user signups (last 5)
        const recentUsers = users
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .slice(0, 5);

        recentUsers.forEach(u => {
          activity.push({
            type: 'user_signup',
            name: u.displayName,
            email: u.email,
            timestamp: u.createdAt.toDate()
          });
        });

        // Recent orgs (last 5)
        const recentOrgs = orgs
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .slice(0, 5);

        recentOrgs.forEach(o => {
          activity.push({
            type: 'org_created',
            name: o.name,
            timestamp: o.createdAt.toDate()
          });
        });

        // Sort all activity by timestamp
        activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecentActivity(activity.slice(0, 10));

      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">System Overview</h1>
        <p className="text-slate-500 text-sm">Monitor your platform's health and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Users */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-sm text-slate-500">Total Users</p>
        </div>

        {/* Total Organizations */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalOrganizations}</p>
          <p className="text-sm text-slate-500">Organizations</p>
        </div>

        {/* Active Users (7 days) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.activeUsers7Days}</p>
          <p className="text-sm text-slate-500">Active (7 days)</p>
        </div>

        {/* Content Generated */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalPosts}</p>
          <p className="text-sm text-slate-500">Posts Generated</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No recent activity
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="px-5 py-3 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'user_signup'
                    ? 'bg-cyan-500/10'
                    : 'bg-purple-500/10'
                }`}>
                  {activity.type === 'user_signup'
                    ? <UserPlus className="w-4 h-4 text-cyan-400" />
                    : <FolderPlus className="w-4 h-4 text-purple-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {activity.type === 'user_signup'
                      ? `New user: ${activity.name}`
                      : `New org: ${activity.name}`
                    }
                  </p>
                  {activity.email && (
                    <p className="text-xs text-slate-500 truncate">{activity.email}</p>
                  )}
                </div>
                <span className="text-xs text-slate-600 whitespace-nowrap">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
