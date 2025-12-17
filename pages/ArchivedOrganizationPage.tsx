import React from 'react';
import { Archive, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MissionLogo from '../Mission.svg';

interface ArchivedOrganizationPageProps {
  organizationName?: string;
}

export const ArchivedOrganizationPage: React.FC<ArchivedOrganizationPageProps> = ({
  organizationName
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      navigate('/login');
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <img src={MissionLogo} alt="MissionContent" className="h-12 mx-auto mb-8" />

        {/* Archive Icon */}
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Archive className="w-10 h-10 text-amber-500" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Organization Archived
        </h1>

        {organizationName && (
          <p className="text-slate-400 mb-2">
            <span className="font-medium text-slate-300">{organizationName}</span>
          </p>
        )}

        <p className="text-slate-500 mb-8 leading-relaxed">
          This organization has been archived and is no longer accessible.
          If you believe this is an error or need to restore access, please contact our support team.
        </p>

        {/* Contact Support */}
        <a
          href="mailto:support@missioncontent.io"
          className="inline-flex items-center justify-center gap-2 w-full bg-cyan-600 hover:bg-cyan-500
                   text-white font-bold uppercase tracking-wider py-3 px-6 transition-colors mb-4"
        >
          <Mail className="w-4 h-4" />
          Contact Support
        </a>

        <p className="text-slate-600 text-xs mb-6">
          support@missioncontent.io
        </p>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300
                   transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
};

export default ArchivedOrganizationPage;
