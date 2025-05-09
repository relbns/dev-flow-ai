
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false); // Added collapsed state
  const [contextType, setContextType] = useState('personal');
  const [organization, setOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([
    { id: 'org1', name: 'Frontend Team' },
    { id: 'org2', name: 'Backend Engineers' },
    { id: 'org3', name: 'Mobile Dev Group' },
  ]);
  const location = useLocation();

  const handleContextChange = (type, orgData = null) => {
    setContextType(type);
    setOrganization(orgData);
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/projects') && path.length > 9) return 'Project Details';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/tasks') && path.length > 6) return 'Task Details';
    if (path.startsWith('/tasks')) return 'My Tasks';
    if (path.startsWith('/settings/organizations')) return 'Organizations';
    if (path.startsWith('/settings/ai-integration')) return 'AI Integration';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="app-layout h-screen flex flex-col">
      <div className="flex h-full">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} /> {/* Pass state and updater */}
        <div className={`main-content flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}> {/* Dynamic margin */}
          <Header
            title={getPageTitle()}
            contextType={contextType}
            organization={organization}
            organizations={organizations}
            onContextChange={handleContextChange}
          />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
};

export default Layout;
