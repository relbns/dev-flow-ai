import React from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  IndexPage,
  ProjectsPage,
  ProjectPage,
  TaskDetailPage,
  TasksPage,
  SettingsPage,
  OrganizationsPage,
  AIIntegrationPage,
  NotFoundPage,
  AuthCallback,
  Dashboard,
} from '@/pages/index.jsx';
import './App.css';
import { AuthProvider } from '@/hooks/useAuth';
import AuthDebugPanel from '@/components/AuthDebugPanel';

// Check if we're running on GitHub Pages
const isGitHubPages = window.location.hostname.includes('github.io');

// Get base path for GitHub Pages deployment
// For HashRouter, we don't need the basename for GitHub Pages
const basePath = '';

console.log("[App] Environment:", import.meta.env.MODE);
console.log("[App] Is GitHub Pages:", isGitHubPages);

// Use HashRouter for GitHub Pages, BrowserRouter for other environments
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'projects',
        element: (
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'projects/:id',
        element: (
          <ProtectedRoute>
            <ProjectPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tasks',
        element: (
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tasks/:id',
        element: (
          <ProtectedRoute>
            <TaskDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/organizations',
        element: (
          <ProtectedRoute>
            <OrganizationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/ai-integration',
        element: (
          <ProtectedRoute>
            <AIIntegrationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'auth/callback',
        element: <AuthCallback />,
      },
    ],
  },
]);

// Export the function component as default
const App = () => {
  // Determine if we should show the debug panel
  const showDebugPanel = import.meta.env.DEV || 
                          localStorage.getItem('showDebug') === 'true' ||
                          window.location.search.includes('debug=true');
  
  return (
    <React.StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
        {showDebugPanel && <AuthDebugPanel />}
      </AuthProvider>
    </React.StrictMode>
  );
};

export default App;