import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, Building2, Shield, Eye, EyeOff } from 'lucide-react';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Organization, GlobalRole, OrgMemberRole } from '../types';

interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAddUserModal: React.FC<AdminAddUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [globalRole, setGlobalRole] = useState<GlobalRole>(GlobalRole.USER);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgRole, setOrgRole] = useState<OrgMemberRole>(OrgMemberRole.MEMBER);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState('');

  // Fetch organizations on mount
  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const snapshot = await getDocs(collection(db, 'organizations'));
      const orgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Organization))
        .filter(org => !org.isArchived);
      setOrganizations(orgs);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !displayName || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Get Firebase config for API key
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Firebase API key not configured');
      }

      // Create user via Firebase Auth REST API
      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: false // Don't return tokens since admin doesn't need them
          })
        }
      );

      const authData = await authResponse.json();

      if (authData.error) {
        throw new Error(authData.error.message || 'Failed to create user');
      }

      const userId = authData.localId;

      // Create user document in Firestore
      const userDoc = {
        email,
        displayName,
        globalRole,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'users', userId), userDoc);

      // If organization selected, add membership
      if (selectedOrgId) {
        const membershipId = `${selectedOrgId}_${userId}`;
        const membership = {
          organizationId: selectedOrgId,
          userId,
          role: orgRole,
          invitedBy: 'admin',
          invitedAt: Timestamp.now(),
          joinedAt: Timestamp.now()
        };

        await setDoc(doc(db, 'organizationMembers', membershipId), membership);
      }

      // Success - reset form and close
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating user:', err);
      // Parse Firebase error messages
      let errorMessage = err.message || 'Failed to create user';
      if (errorMessage.includes('EMAIL_EXISTS')) {
        errorMessage = 'A user with this email already exists';
      } else if (errorMessage.includes('INVALID_EMAIL')) {
        errorMessage = 'Invalid email address';
      } else if (errorMessage.includes('WEAK_PASSWORD')) {
        errorMessage = 'Password is too weak';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setDisplayName('');
    setPassword('');
    setShowPassword(false);
    setGlobalRole(GlobalRole.USER);
    setSelectedOrgId('');
    setOrgRole(OrgMemberRole.MEMBER);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="text-cyan-400" />
            Add New User
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Share this password securely with the user
            </p>
          </div>

          {/* Global Role */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                System Role
              </div>
            </label>
            <select
              value={globalRole}
              onChange={(e) => setGlobalRole(e.target.value as GlobalRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value={GlobalRole.USER}>User</option>
              <option value={GlobalRole.ORG_OWNER}>Organization Owner</option>
              <option value={GlobalRole.SYSTEM_ADMIN}>System Admin</option>
            </select>
          </div>

          {/* Organization Assignment */}
          <div className="border-t border-slate-800 pt-5">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Assign to Organization (Optional)
              </div>
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              disabled={loadingOrgs}
            >
              <option value="">No organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {/* Organization Role (only show if org selected) */}
          {selectedOrgId && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Organization Role
              </label>
              <select
                value={orgRole}
                onChange={(e) => setOrgRole(e.target.value as OrgMemberRole)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={OrgMemberRole.MEMBER}>Member</option>
                <option value={OrgMemberRole.ADMIN}>Admin</option>
                <option value={OrgMemberRole.OWNER}>Owner</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAddUserModal;
