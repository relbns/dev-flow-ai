import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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

// Define router configuration
const router = createBrowserRouter([
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
  return (
    <React.StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </React.StrictMode>
  );
};

export default App;