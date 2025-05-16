
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '@/components/Layout';
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
} from '@/pages/index.jsx';
import './App.css';
import { AuthCallback } from './pages';

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
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'projects/:id',
        element: <ProjectPage />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
      },
      {
        path: 'tasks/:id',
        element: <TaskDetailPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'settings/organizations',
        element: <OrganizationsPage />,
      },
      {
        path: 'settings/ai-integration',
        element: <AIIntegrationPage />,
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
      <RouterProvider router={router} />
    </React.StrictMode>
  );
};

export default App;
