import React from 'react';
import { Navigate } from 'react-router-dom';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { OnboardingFlow } from './OnboardingFlow';

export const ProjectOnboardingFlow: React.FC = () => {
    const { currentOrg, loading } = useOrganization();

    // Show loading spinner while checking organization
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Redirect if no organization (using Navigate component, not navigate hook)
    if (!currentOrg) {
        return <Navigate to="/projects" replace />;
    }

    return (
        <OnboardingProvider mode="project" organizationId={currentOrg.id}>
            <OnboardingFlow />
        </OnboardingProvider>
    );
};

export default ProjectOnboardingFlow;
