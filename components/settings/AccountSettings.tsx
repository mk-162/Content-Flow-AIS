import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile form
  const [displayName, setDisplayName] = useState(user?.displayName || '');

  // Password form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser || !user) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName });

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.id), {
        displayName,
        updatedAt: new Date(),
      });

      showSuccess('Profile updated successfully!');
    } catch (error: any) {
      showError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    if (!auth.currentUser || !auth.currentUser.email) {
      showError('No user logged in');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);

      showSuccess('Password changed successfully!');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        showError('Current password is incorrect');
      } else {
        showError(error.message || 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          Profile
        </h2>

        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300">{user?.email}</span>
              <span className="text-xs text-slate-500">(cannot be changed)</span>
            </div>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Account Role
            </label>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300 capitalize">
                {user?.globalRole?.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Save Profile Button */}
          <button
            onClick={handleUpdateProfile}
            disabled={loading || displayName === user?.displayName}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-400" />
          Security
        </h2>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 pr-10"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                placeholder="Enter new password"
                minLength={6}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Changing...' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Notifications Section (Placeholder) */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" />
          Notifications
        </h2>

        <p className="text-slate-400 text-sm">
          Notification preferences coming soon. You'll be able to configure email alerts for:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-500">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
            Content generation completions
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
            Credit balance alerts
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
            Team member invitations
          </li>
        </ul>
      </section>
    </div>
  );
};
