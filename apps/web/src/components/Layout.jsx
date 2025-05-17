import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Initialize from localStorage or default to 'personal'
  const [contextType, setContextType] = useState(() => localStorage.getItem('contextType') || 'personal');
  const [organization, setOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const orgsLoadedRef = useRef(false); // Ref to track if organizations were loaded
  const location = useLocation();
  const { toast } = useToast();

  // Route protection logic
  useEffect(() => {
    const protectedRoutes = [
      '/dashboard',
      '/projects',
      '/tasks',
      '/settings'
    ];
    
    const publicRoutes = [
      '/',
      '/login',
      '/auth/callback'
    ];
    
    // Check if current path is a protected route or starts with one
    const isProtected = protectedRoutes.some(route => 
      location.pathname === route || 
      (location.pathname.startsWith(route) && route !== '/')
    );
    
    const isPublic = publicRoutes.some(route => location.pathname === route);
    
    // If on protected route and not authenticated, redirect to login
    if (isProtected && !authLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to access this page',
        variant: 'default'
      });
      navigate('/');
    }
  }, [location.pathname, user, authLoading, navigate, toast]);

  // Effect to fetch GitHub organizations when user is authenticated - with proper control to prevent infinite loops
  useEffect(() => {
    // Only fetch if:
    // 1. User is authenticated
    // 2. Not currently loading auth state
    // 3. Not currently loading organizations
    // 4. Organizations haven't been loaded yet (using ref to track)
    if (user && !authLoading && !loadingOrgs && !orgsLoadedRef.current) {
      const fetchUserOrganizations = async () => {
        console.log("Layout.jsx: Attempting to fetch user organizations from backend.");
        setLoadingOrgs(true);
        try {
          const orgs = await apiClient.github.getOrganizations();
          console.log("Layout.jsx: Orgs fetched successfully from backend:", orgs);
          setOrganizations(orgs || []);
          orgsLoadedRef.current = true; // Mark organizations as loaded
        } catch (error) {
          console.error("Layout.jsx: Error fetching organizations:", error);
          toast({
            title: "Could not fetch GitHub organizations",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
          });
          setOrganizations([]);
          // Even on error, mark as loaded to prevent retries - user can manually refresh
          orgsLoadedRef.current = true;
        } finally {
          setLoadingOrgs(false);
        }
      };

      fetchUserOrganizations();
    } else if (!user && !authLoading) {
      // If user logs out, clear organizations and reset loaded flag
      console.log("Layout.jsx: User logged out. Clearing organizations.");
      setOrganizations([]);
      setLoadingOrgs(false);
      orgsLoadedRef.current = false; // Reset loaded flag on logout
    }
  }, [user, authLoading, toast]); // Removed loadingOrgs from dependencies to prevent infinite loops

  // Effect to rehydrate organization from localStorage once organizations are fetched
  useEffect(() => {
    const storedOrgId = localStorage.getItem('selectedOrgId');
    const storedContextType = localStorage.getItem('contextType');

    if (storedContextType) {
        setContextType(storedContextType);
    }

    if (storedOrgId && organizations.length > 0) {
      // Assuming org IDs are numbers or can be compared directly
      const foundOrg = organizations.find(org => org.id?.toString() === storedOrgId);
      if (foundOrg) {
        setOrganization(foundOrg);
        // Ensure contextType is 'organization' if an org is successfully rehydrated
        if (storedContextType !== 'organization') {
            setContextType('organization');
            localStorage.setItem('contextType', 'organization');
        }
      } else {
        // If stored org_id not found in fetched orgs, clear from localStorage and reset to personal
        localStorage.removeItem('selectedOrgId');
        localStorage.setItem('contextType', 'personal');
        setContextType('personal');
        setOrganization(null);
      }
    } else if (storedContextType === 'personal') {
        setOrganization(null); // Ensure org is null if context is personal
    }
    // This effect should run when organizations array is populated or changes.
  }, [organizations]);


  const handleContextChange = (type, orgData = null) => {
    setContextType(type);
    setOrganization(orgData);
    localStorage.setItem('contextType', type);
    if (type === 'organization' && orgData) {
      localStorage.setItem('selectedOrgId', orgData.id?.toString()); // Store ID as string
    } else {
      localStorage.removeItem('selectedOrgId');
    }
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Welcome';
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/projects') && path.length > 9) return 'Project Details';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/tasks') && path.length > 6) return 'Task Details';
    if (path.startsWith('/tasks')) return 'My Tasks';
    if (path.startsWith('/settings/organizations')) return 'Organizations';
    if (path.startsWith('/settings/ai-integration')) return 'AI Integration';
    if (path.startsWith('/settings')) return 'Settings';
    if (path.startsWith('/auth/callback')) return 'GitHub Authentication';
    return 'DevFlow AI';
  };

  return (
    <div className="app-layout h-screen flex flex-col">
      <div className="flex h-full">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className={`main-content flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
          <Header
            title={getPageTitle()}
            contextType={contextType}
            organization={organization}
            organizations={organizations}
            onContextChange={handleContextChange}
          />
          <main className="flex-1 overflow-auto">
            <Outlet context={{ contextType, selectedOrganization: organization, organizations, loadingOrgs }} />
          </main>
        </div>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
  );
};

export default Layout;