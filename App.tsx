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
import { Settings } from './pages/Settings';
import { AdminPrompts } from './pages/AdminPrompts';
import { AdminPromptsReference } from './pages/admin/AdminPromptsReference';
import { OnboardingFlow } from './pages/OnboardingFlow';
import { ProjectOnboardingFlow } from './pages/ProjectOnboardingFlow';
import { HomePage } from './pages/HomePage';
import { AdminDashboard, AdminOverview, AdminUsers, AdminOrganizations, AdminDeployments, AdminSettings } from './pages/admin';
import { UpgradePage } from './pages/UpgradePage';
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
                <Routes>
                {/* Public Routes */}
                <Route path="/home" element={<HomePage />} />
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
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upgrade"
                  element={
                    <ProtectedRoute>
                      <UpgradePage />
                    </ProtectedRoute>
                  }
                />
                {/* Redirect old organization settings URL */}
                <Route
                  path="/settings/organization"
                  element={<Navigate to="/settings" replace />}
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
                  <Route path="deployments" element={<AdminDeployments />} />
                  <Route path="prompts" element={<AdminPrompts />} />
                  <Route path="prompts-reference" element={<AdminPromptsReference />} />
                  <Route path="settings" element={<AdminSettings />} />
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
