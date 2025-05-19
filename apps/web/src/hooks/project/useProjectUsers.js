// src/hooks/project/useProjectUsers.js
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const localCurrentUserId = session?.user?.id;

      try {
        let combinedGithubLogins = new Set();

        if (projectOrg && projectOrg !== 'Personal') {
          // Fetch GitHub org members
          const { data: orgMembers, error: orgMembersError } =
            await supabase.functions.invoke('list-github-org-members', {
              method: 'POST',
              body: { orgName: projectOrg },
            });

          if (orgMembersError) {
            console.error(
              `Error fetching GitHub org members for ${projectOrg}:`,
              orgMembersError
            );
            toast({
              title: 'Error Fetching Org Members',
              description: orgMembersError.message,
              variant: 'destructive',
            });
            // Continue to fetch collaborators or fallback to current user
          } else {
            const orgMemberLogins =
              orgMembers
                ?.map((member) => member.login)
                .filter((login) => login) || [];
            orgMemberLogins.forEach((login) => combinedGithubLogins.add(login));
          }
        }

        // If a repo is specified, also get its collaborators
        if (repoFullName) {
          try {
            // Ensure access_token is available for this call
            if (!session?.access_token) {
              throw new Error(
                'User not authenticated or access token missing for repo collaborators fetch.'
              );
            }
            const collaboratorsFunctionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-repo-collaborators?repoFullName=${encodeURIComponent(
              repoFullName
            )}`;
            const collaboratorsResponse = await fetch(
              collaboratorsFunctionUrl,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (collaboratorsResponse.ok) {
              const collaborators = await collaboratorsResponse.json();
              const collaboratorLogins =
                collaborators
                  ?.map((collab) => collab.login)
                  .filter((login) => login) || [];
              collaboratorLogins.forEach((login) =>
                combinedGithubLogins.add(login)
              );
            } else {
              const errorData = await collaboratorsResponse
                .json()
                .catch(() => ({
                  error: `Failed to fetch repo collaborators: ${collaboratorsResponse.statusText}`,
                }));
              console.warn(
                `Could not fetch collaborators for ${repoFullName}: ${
                  errorData.error || collaboratorsResponse.statusText
                }`
              );
              toast({
                title: 'Warning',
                description: `Could not fetch collaborators for ${repoFullName}. Users list might be incomplete.`,
                variant: 'default',
              });
            }
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
          const { data: supabaseUsers, error: mapError } =
            await supabase.functions.invoke(
              'get-supabase-users-by-github-logins',
              { method: 'POST', body: { github_logins: finalGithubLogins } }
            );

          if (mapError) {
            console.error(
              'Error mapping GitHub logins to Supabase users:',
              mapError
            );
            toast({
              title: 'Error Mapping Users',
              description: mapError.message,
              variant: 'destructive',
            });
            if (localCurrentUserId) {
              // Fallback to current user if mapping fails
              const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('id, full_name, username')
                .eq('id', localCurrentUserId)
                .single();
              setAvailableLeaders([
                {
                  id: localCurrentUserId,
                  display_name:
                    currentUserProfile?.full_name ||
                    currentUserProfile?.username ||
                    session?.user?.email ||
                    'Current User',
                },
              ]);
            }
          } else {
            setAvailableLeaders(supabaseUsers || []);
            if (
              (!supabaseUsers || supabaseUsers.length === 0) &&
              localCurrentUserId &&
              finalGithubLogins.length === 0
            ) {
              // Only if no logins were found at all
              console.warn(
                'No Supabase users found for combined logins. Setting current user as default leader.'
              );
              const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('id, full_name, username')
                .eq('id', localCurrentUserId)
                .single();
              setAvailableLeaders([
                {
                  id: localCurrentUserId,
                  display_name:
                    currentUserProfile?.full_name ||
                    currentUserProfile?.username ||
                    session?.user?.email ||
                    'Current User',
                },
              ]);
            }
          }
        } else {
          // No GitHub members or collaborators found from org or repo
          console.warn(
            'No GitHub logins found from org members or collaborators. Setting current user as default leader.'
          );
          if (localCurrentUserId) {
            const { data: currentUserProfile } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .eq('id', localCurrentUserId)
              .single();
            setAvailableLeaders([
              {
                id: localCurrentUserId,
                display_name:
                  currentUserProfile?.full_name ||
                  currentUserProfile?.username ||
                  session?.user?.email ||
                  'Current User',
              },
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching users for project edit:', error);
        toast({
          title: 'Error Fetching Users',
          description: error.message,
          variant: 'destructive',
        });
        if (localCurrentUserId) {
          // Fallback to current user on any error
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .eq('id', localCurrentUserId)
            .single();
          setAvailableLeaders([
            {
              id: localCurrentUserId,
              display_name:
                currentUserProfile?.full_name ||
                currentUserProfile?.username ||
                session?.user?.email ||
                'Current User',
            },
          ]);
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