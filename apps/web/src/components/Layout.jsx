
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
  useEffect(() => {
    // Explicitly wait if session is still in its initial null state
    if (session === null) {
      console.log("Layout.jsx: Session state not yet determined. Waiting...");
      return; // Don't proceed until the first effect has potentially set the session
    }

    const fetchUserOrganizations = async () => {
      console.log("Layout.jsx: Session state determined. Checking for provider_token.");
      if (session?.provider_token) { // Now check the determined session object
        console.log("Layout.jsx: Found provider_token, attempting to fetch orgs.");
        setLoadingOrgs(true);
        try {
          // Ensure the function name matches the deployed function
          // The function now expects POST and the provider_token in the body
          const { data: orgsData, error: orgsError } = await supabase.functions.invoke(
            'get-github-user-organizations',
            {
              method: 'POST',
              body: { provider_token: session.provider_token }, // Send token in body
            }
          );

          if (orgsError) {
             // Check if it's the specific provider_token missing error
            if (orgsError.context?.status === 403 && orgsError.message?.includes('provider_token not found')) {
              console.warn("Layout.jsx: Failed to fetch orgs due to missing provider_token (403). Prompting re-login.");
              toast({
                title: "GitHub Connection Issue",
                description: "Could not fetch organizations. Please log out and log back in with GitHub to refresh your connection and ensure 'read:org' permissions are granted.",
                variant: "warning", // Use warning variant
                duration: 9000, // Longer duration
              });
            } else {
              // Throw other errors to be caught below
              throw orgsError;
            }
            setOrganizations([]); // Clear orgs on error
          } else {
            console.log("Layout.jsx: Orgs fetched successfully:", orgsData);
            setOrganizations(orgsData || []);
          }
        } catch (error) { // Catch errors thrown from above or other unexpected errors
          console.error("Error fetching GitHub organizations:", error);
          // Avoid showing the raw error message if it was the handled 403
          if (!(error.context?.status === 403 && error.message?.includes('provider_token not found'))) {
            toast({
              title: "Could not fetch GitHub organizations",
              description: error.message || "An unexpected error occurred.",
              variant: "destructive",
            });
          }
          setOrganizations([]); 
        } finally {
          setLoadingOrgs(false);
        }
      } else if (session && !session.provider_token) {
        setOrganizations([]); 
         console.warn("Layout.jsx: Session exists but provider_token is missing. Orgs will not be fetched.");
      } else if (!session) {
        console.log("Layout.jsx: No session available. Orgs will not be fetched.");
        setOrganizations([]);
      } else { // This case now correctly means session is known to be null (logged out)
        console.log("Layout.jsx: No session available (user logged out). Orgs will not be fetched.");
        setOrganizations([]);
      }
    };

    fetchUserOrganizations();
    // Depend on the session object itself. The function logic handles null/token presence.
  }, [session, toast]); 

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
