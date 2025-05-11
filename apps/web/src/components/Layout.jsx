
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';
import { supabase } from '../lib/supabaseClient';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from "@/hooks/use-toast"; // Import useToast

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState(null);
  const [contextType, setContextType] = useState('personal'); // 'personal' or 'organization'
  const [organization, setOrganization] = useState(null); // Stores the selected org object
  const [organizations, setOrganizations] = useState([]); // Fetched from GitHub
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  // Effect for initial session check and auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) { // User logged out
        setOrganizations([]); // Clear orgs on logout
        setContextType('personal');
        setOrganization(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Effect to fetch GitHub organizations when session (and provider_token) is available
  // useEffect(() => {
  //   const fetchUserOrganizations = async () => {
  //     console.log("Layout.jsx: Checking session for provider_token. Full session object:", JSON.stringify(session, null, 2)); 
  //     if (session?.provider_token) {
  //       console.log("Layout.jsx: Found provider_token:", session.provider_token, "Attempting to fetch orgs.");
  //       setLoadingOrgs(true);
  //       try {
  //         const { data: orgsData, error: orgsError } = await supabase.functions.invoke(
  //           'get-github-orgs-via-token',
  //           {
  //             method: 'POST',
  //             body: { provider_token: session.provider_token },
  //           }
  //         );
  //         if (orgsError) throw orgsError;
  //         setOrganizations(orgsData || []);
  //       } catch (error) {
  //         console.error("Error fetching GitHub organizations:", error);
  //         toast({
  //           title: "Could not fetch GitHub organizations",
  //           description: error.message,
  //           variant: "destructive",
  //         });
  //         setOrganizations([]); 
  //       } finally {
  //         setLoadingOrgs(false);
  //       }
  //     } else if (session && !session.provider_token) {
  //       setOrganizations([]); 
  //        console.warn("Layout.jsx: Session exists but provider_token is missing. Orgs will not be fetched.");
  //     } else if (!session) {
  //       console.log("Layout.jsx: No session available. Orgs will not be fetched.");
  //       setOrganizations([]);
  //     }
  //   };

  //   fetchUserOrganizations();
  // }, [session?.provider_token, session?.user?.id, toast]); 
  // Commented out for now: Organization fetching is deferred. `organizations` state will remain [].

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
            session={session} 
          />
          <main className="flex-1 overflow-auto">
            <Outlet context={{ contextType, selectedOrganization: organization, organizations, loadingOrgs }} /> {/* Pass context */}
          </main>
        </div>
      </div>
      <CommandPalette />
      <Toaster /> {/* Add Toaster here for global toasts */}
    </div>
  );
};

export default Layout;
