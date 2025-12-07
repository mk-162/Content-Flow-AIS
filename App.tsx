import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { MainWorkspace } from './pages/MainWorkspace';
import { OrganizationSettings } from './pages/OrganizationSettings';
import { AdminPrompts } from './pages/AdminPrompts';
import { OnboardingFlow } from './pages/OnboardingFlow';
import { ProjectOnboardingFlow } from './pages/ProjectOnboardingFlow';
import { AdminDashboard, AdminOverview, AdminUsers, AdminOrganizations } from './pages/admin';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { GlobalRole } from './types';

const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to console in development
        console.error('Global Error:', error, errorInfo);

        // TODO: In production, send to error tracking service
        // Example: Sentry, LogRocket, etc.
      }}
    >
      <Router>
        <AuthProvider>
          <ImpersonationProvider>
            <OrganizationProvider>
              <ProjectProvider>
                <ImpersonationBanner />
                <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/onboarding" element={<OnboardingFlow />} />
                <Route
                  path="/onboarding/project"
                  element={
                    <ProtectedRoute>
                      <ProjectOnboardingFlow />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <ProjectDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainWorkspace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/organization"
                  element={
                    <ProtectedRoute>
                      <OrganizationSettings />
                    </ProtectedRoute>
                  }
                />
                {/* Admin Routes - requires SYSTEM_ADMIN role */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireRole={GlobalRole.SYSTEM_ADMIN}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="organizations" element={<AdminOrganizations />} />
                  <Route path="prompts" element={<AdminPrompts />} />
                </Route>

                {/* Catch all - redirect to login */}
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ProjectProvider>
            </OrganizationProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
