import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, GlobalRole } from '../../types';
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  ChevronDown,
  MoreVertical,
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { AdminAddUserModal } from '../../components/AdminAddUserModal';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<GlobalRole | 'ALL'>('ALL');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.globalRole === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const updateUserRole = async (userId: string, newRole: GlobalRole) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        globalRole: newRole,
        updatedAt: Timestamp.now()
      });
      setUsers(users.map(u =>
        u.id === userId ? { ...u, globalRole: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    } finally {
      setUpdating(null);
      setActionMenuOpen(null);
    }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive: !isActive,
        updatedAt: Timestamp.now()
      });
      setUsers(users.map(u =>
        u.id === userId ? { ...u, isActive: !isActive } : u
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to update user status');
    } finally {
      setUpdating(null);
      setActionMenuOpen(null);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role: GlobalRole) => {
    switch (role) {
      case GlobalRole.SYSTEM_ADMIN:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case GlobalRole.ORG_OWNER:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">User Management</h1>
          <p className="text-slate-500 text-sm">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as GlobalRole | 'ALL')}
          className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Roles</option>
          <option value={GlobalRole.SYSTEM_ADMIN}>System Admin</option>
          <option value={GlobalRole.ORG_OWNER}>Org Owner</option>
          <option value={GlobalRole.USER}>User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-4">
                    <div className="animate-pulse h-8 bg-slate-800 rounded"></div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50">
                  {/* User Info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.displayName}</p>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.globalRole)}`}>
                      {user.globalRole === GlobalRole.SYSTEM_ADMIN && <Shield className="w-3 h-3" />}
                      {user.globalRole}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    {user.isActive === false ? (
                      <span className="inline-flex items-center gap-1.5 text-red-400 text-sm">
                        <UserX className="w-4 h-4" />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-green-400 text-sm">
                        <UserCheck className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-5 py-4 text-slate-400 text-sm">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                        disabled={updating === user.id}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {updating === user.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </button>

                      {/* Dropdown Menu */}
                      {actionMenuOpen === user.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                          <div className="py-1">
                            <p className="px-3 py-2 text-xs text-slate-500 uppercase font-semibold">
                              Change Role
                            </p>
                            {Object.values(GlobalRole).map((role) => (
                              <button
                                key={role}
                                onClick={() => updateUserRole(user.id, role)}
                                disabled={user.globalRole === role}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                  user.globalRole === role
                                    ? 'text-purple-400 bg-purple-500/10'
                                    : 'text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-slate-700 py-1">
                            <button
                              onClick={() => toggleUserActive(user.id, user.isActive !== false)}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                user.isActive === false
                                  ? 'text-green-400 hover:bg-green-500/10'
                                  : 'text-red-400 hover:bg-red-500/10'
                              }`}
                            >
                              {user.isActive === false ? 'Reactivate User' : 'Suspend User'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <AdminAddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchUsers();
          setShowAddModal(false);
        }}
      />
    </div>
  );
};

export default AdminUsers;
