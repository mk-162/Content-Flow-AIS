import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { MainWorkspace } from './pages/MainWorkspace';
import { GlobalRole } from './types';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <OrganizationProvider>
          <ProjectProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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

              {/* System Admin Routes (Future) */}
              {/* <Route
                path="/admin"
                element={
                  <ProtectedRoute requireRole={GlobalRole.SYSTEM_ADMIN}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              /> */}

              {/* Catch all - redirect to login */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProjectProvider>
        </OrganizationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
