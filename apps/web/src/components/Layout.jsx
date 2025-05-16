import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';
import { supabase } from '../lib/supabaseClient';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { storeGitHubToken } from '../services/githubApi';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState(null);
  // Initialize from localStorage or default to 'personal'
  const [contextType, setContextType] = useState(() => localStorage.getItem('contextType') || 'personal');
  const [organization, setOrganization] = useState(null); // Will be populated from localStorage or selection
  const [organizations, setOrganizations] = useState([]); // Fetched from GitHub
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  // Effect for initial session check and auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      // If we have a provider_token, store it immediately
      if (currentSession?.provider_token) {
        console.log('Layout.jsx: Provider token detected on initial session, attempting to store it.');
        storeGitHubToken(currentSession.provider_token)
          .then(() => {
            console.log('GitHub token stored successfully on initial session');
          })
          .catch(err => {
            console.error('Error storing GitHub token on initial session:', err);
            toast({
              title: 'GitHub Connection Error',
              description: 'Failed to store GitHub access token',
              variant: 'destructive',
            });
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Layout.jsx: onAuthStateChange event:', event);
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        console.log('Layout.jsx: Session details on TOKEN_REFRESHED or SIGNED_IN:', newSession);
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.provider_token) {
        console.log('Layout.jsx: Provider token detected, attempting to store it.');
        try {
          storeGitHubToken(newSession.provider_token)
            .then(() => {
              console.log('GitHub token stored successfully');
              // After successful token storage, we don't need to call fetchUserOrganizations
              // explicitly since it will be triggered by the session change
            })
            .catch(err => {
              console.error('Error storing GitHub token:', err);
              toast({
                title: 'GitHub Connection Error',
                description: 'Failed to store GitHub access token',
                variant: 'destructive',
              });
            });
        } catch (error) {
          console.error('Error in token storage process:', error);
        }
      }
      setSession(newSession);
      if (!newSession) { // User logged out
        console.log('Layout.jsx: User logged out, clearing organizations and localStorage context.');
        setOrganizations([]); // Clear orgs on logout
        localStorage.removeItem('contextType');
        localStorage.removeItem('selectedOrgId');
        setContextType('personal');
        setOrganization(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [toast]);

  // Effect to fetch GitHub organizations when session (and provider_token) is available
  useEffect(() => {
    // Explicitly wait if session is still in its initial null state
    // This outer useEffect dependency on 'session' (from onAuthStateChange) is still important
    // to trigger this logic when the user signs in or out.
    if (session === null && !loadingOrgs) { // Added !loadingOrgs to prevent multiple calls if already loading
      console.log("Layout.jsx: Overall session state not yet determined by onAuthStateChange. Waiting...");
      return; 
    }
    
    // If session is explicitly false (logged out), don't attempt to fetch.
    if (session === false) {
        console.log("Layout.jsx: User is logged out (session is false). Orgs will not be fetched.");
        setOrganizations([]);
        setLoadingOrgs(false); // Ensure loading is false
        return;
    }


    const fetchUserOrganizations = async () => {
      console.log("Layout.jsx: Attempting to fetch user organizations by calling getSession().");
      setLoadingOrgs(true);

      const { data: { session: currentSessionFromGetSession }, error: getSessionError } = await supabase.auth.getSession();

      if (getSessionError) {
        console.error("Layout.jsx: Error calling supabase.auth.getSession():", getSessionError);
        setOrganizations([]);
        toast({
          title: "Session Error",
          description: "Could not retrieve current session details.",
          variant: "destructive",
        });
        setLoadingOrgs(false);
        return;
      }

      console.log("Layout.jsx: Session object from getSession():", currentSessionFromGetSession);

      // If we have a provider_token in the current session, store it first
      if (currentSessionFromGetSession?.provider_token) {
        try {
          await storeGitHubToken(currentSessionFromGetSession.provider_token);
          console.log("Layout.jsx: Successfully stored provider_token before fetching organizations");
        } catch (storeError) {
          console.error("Layout.jsx: Error storing provider_token:", storeError);
        }
      }

      // The Edge Function now handles provider token retrieval.
      // We just need to ensure there's an authenticated session to make the call.
      if (currentSessionFromGetSession) {
        console.log("Layout.jsx: Authenticated session found. Invoking get-github-user-organizations function.");
        try {
          const { data: orgsData, error: orgsError } = await supabase.functions.invoke(
            'get-github-user-organizations',
            { method: 'POST' } // Body is not needed as function retrieves token from user context
          );

          if (orgsError) { // orgsError is a FunctionsHttpError
            const response = orgsError.context; // This is the raw Response object
            const statusCode = response?.status; // Get status from the Response object
            let detailedMessage = orgsError.message; // Default to generic message

            if (response) {
              try {
                // Attempt to read the response body as JSON
                const errorData = await response.json(); // Asynchronously read and parse
                if (errorData && errorData.error) {
                  detailedMessage = errorData.error;
                } else if (typeof errorData === 'string') { // If response was just a string
                    detailedMessage = errorData;
                }
                // If errorData is an object but doesn't have .error, detailedMessage remains orgsError.message
              } catch (e) {
                // If .json() fails (e.g., not JSON), try to read as text
                try {
                  detailedMessage = await response.text();
                } catch (textError) {
                  console.error("Layout.jsx: Failed to read error response body as text:", textError);
                  // Keep detailedMessage as orgsError.message
                }
              }
            }

            console.warn(`Layout.jsx: Error from get-github-user-organizations (Status: ${statusCode}). Detailed Message: "${detailedMessage}". Raw Response Context:`, response, 'Full Error Object:', orgsError);

            if (statusCode === 403 && detailedMessage?.includes('GitHub access token not found')) {
              toast({
                title: "GitHub Connection Issue",
                description: detailedMessage || "Could not fetch organizations. Please log out and log back in with GitHub to refresh your connection.",
                variant: "warning",
                duration: 9000,
              });
            } else { // Handles other errors from the function, including GitHub API 403s
              toast({
                title: "Could not fetch GitHub organizations",
                description: detailedMessage || "An unexpected error occurred.",
                variant: "destructive",
              });
            }
            setOrganizations([]);
          } else {
            console.log("Layout.jsx: Orgs fetched successfully from GitHub:", orgsData);
            setOrganizations(orgsData || []);
          }
        } catch (unexpectedError) { // Catches errors from invoke() itself (e.g. network) or from processing the response
          console.error("Layout.jsx: Unexpected error during organization fetch process:", unexpectedError);
          
          let displayMessage = "An unexpected error occurred.";
          // Attempt to get a more specific message if unexpectedError is also a FunctionsHttpError
          if (unexpectedError.context instanceof Response) { // Check if context is a Response
            try {
              const errorBody = await unexpectedError.context.json();
              if (errorBody && errorBody.error) displayMessage = errorBody.error;
              else if (typeof errorBody === 'string') displayMessage = errorBody;
              else if (unexpectedError.message) displayMessage = unexpectedError.message;
            } catch (e) {
              try {
                displayMessage = await unexpectedError.context.text();
              } catch (textE) {
                if (unexpectedError.message) displayMessage = unexpectedError.message;
              }
            }
          } else if (unexpectedError.message) {
            displayMessage = unexpectedError.message;
          }

          toast({
            title: "Failed to Fetch Organizations",
            description: displayMessage,
            variant: "destructive",
          });
          setOrganizations([]);
        } finally {
          setLoadingOrgs(false);
        }
      } else if (!currentSessionFromGetSession) {
        setOrganizations([]);
        console.log("Layout.jsx: No authenticated session available from getSession(). Orgs will not be fetched.");
        setLoadingOrgs(false); // Ensure loading is stopped
      }
      // The case for currentSessionFromGetSession && !currentSessionFromGetSession.provider_token is removed
      // as the provider_token check is no longer done on the client for this purpose.
    };
    
    // Only call fetchUserOrganizations if there's a session (or it's null initially, to let getSession handle it)
    // Avoid calling if session is explicitly false (logged out)
    if (session !== false) {
        fetchUserOrganizations();
    } else {
        // If session is false (logged out), ensure organizations are cleared and loading is false.
        // This is also handled by onAuthStateChange, but good for belt-and-suspenders.
        if (organizations.length > 0) setOrganizations([]);
        if (loadingOrgs) setLoadingOrgs(false);
    }

  }, [session, toast, organizations.length, loadingOrgs]); // Added loadingOrgs and organizations.length to dependencies to refine re-runs

  // Effect to rehydrate organization from localStorage once organizations are fetched
  useEffect(() => {
    const storedOrgId = localStorage.getItem('selectedOrgId');
    const storedContextType = localStorage.getItem('contextType');

    if (storedContextType) {
        setContextType(storedContextType);
    }

    if (storedOrgId && organizations.length > 0) {
      const orgIdNumber = parseInt(storedOrgId, 10); // Assuming org IDs are numbers
      const foundOrg = organizations.find(org => org.id === orgIdNumber);
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
        localStorage.setItem('contextType', 'personal'); // Or removeItem if personal is default
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
      localStorage.setItem('selectedOrgId', orgData.id.toString());
    } else {
      localStorage.removeItem('selectedOrgId');
    }
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
