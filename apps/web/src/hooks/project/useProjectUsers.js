// src/hooks/project/useProjectUsers.js
import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

export const useProjectUsers = (toast) => {
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [leaderSearchTerm, setLeaderSearchTerm] = useState('');
  const [leaderSelectOpen, setLeaderSelectOpen] = useState(false);

  // Fetch users for project (leaders, members)
  const fetchUsers = useCallback(
    async (projectOrg, repoFullName = null) => {
      setLoadingLeaders(true);
      setAvailableLeaders([]);

      const token = localStorage.getItem('jwtToken');
      if (!token) {
        console.error('No authentication token found');
        setLoadingLeaders(false);
        return;
      }

      try {
        let combinedGithubLogins = new Set();

        if (projectOrg && projectOrg !== 'Personal') {
          // Fetch GitHub org members using apiClient
          try {
            const orgMembers = await apiClient.github.getOrganizations();
            const orgMemberLogins =
              orgMembers
                ?.map((member) => member.login)
                .filter((login) => login) || [];
            orgMemberLogins.forEach((login) => combinedGithubLogins.add(login));
          } catch (orgErr) {
            console.error(
              `Error fetching GitHub org members for ${projectOrg}:`,
              orgErr
            );
            toast({
              title: 'Error Fetching Org Members',
              description: orgErr.message,
              variant: 'destructive',
            });
          }
        }

        // If a repo is specified, also get its collaborators
        if (repoFullName) {
          try {
            const collaborators = await apiClient.github.getRepositories(repoFullName.split('/')[0]);
            const collaboratorLogins =
              collaborators
                ?.map((collab) => collab.login || collab.owner?.login)
                .filter((login) => login) || [];
            collaboratorLogins.forEach((login) =>
              combinedGithubLogins.add(login)
            );
          } catch (collabError) {
            console.warn(
              `Error fetching collaborators for ${repoFullName}:`,
              collabError
            );
            toast({
              title: 'Error Fetching Collaborators',
              description: collabError.message,
              variant: 'destructive',
            });
          }
        }

        const finalGithubLogins = Array.from(combinedGithubLogins);

        if (finalGithubLogins.length > 0) {
          // In the new server API, we'll use the appropriate endpoint
          // This is a placeholder - you might need to create a specific endpoint for this
          try {
            const response = await fetch('/api/users/by-github-logins', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ github_logins: finalGithubLogins }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to fetch users by GitHub logins');
            }
            
            const supabaseUsers = await response.json();
            setAvailableLeaders(supabaseUsers || []);
            
            // If no users found, set current user as default
            if ((!supabaseUsers || supabaseUsers.length === 0) && finalGithubLogins.length === 0) {
              try {
                // Fetch current user profile
                const profileResponse = await fetch('/api/auth/profile', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                
                if (profileResponse.ok) {
                  const currentUserProfile = await profileResponse.json();
                  setAvailableLeaders([
                    {
                      id: currentUserProfile.id,
                      display_name:
                        currentUserProfile?.full_name ||
                        currentUserProfile?.username ||
                        currentUserProfile?.email ||
                        'Current User',
                    },
                  ]);
                }
              } catch (profileError) {
                console.error('Error fetching user profile:', profileError);
              }
            }
          } catch (mapError) {
            console.error(
              'Error mapping GitHub logins to users:',
              mapError
            );
            toast({
              title: 'Error Mapping Users',
              description: mapError.message,
              variant: 'destructive',
            });
            
            // Fallback to current user
            try {
              const profileResponse = await fetch('/api/auth/profile', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (profileResponse.ok) {
                const currentUserProfile = await profileResponse.json();
                setAvailableLeaders([
                  {
                    id: currentUserProfile.id,
                    display_name:
                      currentUserProfile?.full_name ||
                      currentUserProfile?.username ||
                      currentUserProfile?.email ||
                      'Current User',
                  },
                ]);
              }
            } catch (profileError) {
              console.error('Error fetching user profile:', profileError);
            }
          }
        } else {
          // No GitHub members or collaborators found from org or repo
          console.warn(
            'No GitHub logins found from org members or collaborators. Setting current user as default leader.'
          );
          
          try {
            const profileResponse = await fetch('/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (profileResponse.ok) {
              const currentUserProfile = await profileResponse.json();
              setAvailableLeaders([
                {
                  id: currentUserProfile.id,
                  display_name:
                    currentUserProfile?.full_name ||
                    currentUserProfile?.username ||
                    currentUserProfile?.email ||
                    'Current User',
                },
              ]);
            }
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
          }
        }
      } catch (error) {
        console.error('Error fetching users for project edit:', error);
        toast({
          title: 'Error Fetching Users',
          description: error.message,
          variant: 'destructive',
        });
        
        // Fallback to current user on any error
        try {
          const profileResponse = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (profileResponse.ok) {
            const currentUserProfile = await profileResponse.json();
            setAvailableLeaders([
              {
                id: currentUserProfile.id,
                display_name:
                  currentUserProfile?.full_name ||
                  currentUserProfile?.username ||
                  currentUserProfile?.email ||
                  'Current User',
              },
            ]);
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
        }
      } finally {
        setLoadingLeaders(false);
      }
    },
    [toast]
  );

  return {
    availableLeaders,
    loadingLeaders,
    leaderSearchTerm,
    leaderSelectOpen,
    setLeaderSearchTerm,
    setLeaderSelectOpen,
    fetchUsers,
  };
};