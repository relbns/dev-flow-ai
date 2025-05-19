// src/hooks/project/useProjectGithub.js
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useProjectGithub = (toast) => {
  const [githubOrgRepos, setGithubOrgRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchTerm, setRepoSearchTerm] = useState('');
  const [repoSelectOpen, setRepoSelectOpen] = useState(false);

  // Fetch GitHub repositories for an organization
  const fetchOrgRepos = useCallback(
    async (orgName) => {
      if (!orgName || orgName === 'Personal') {
        setGithubOrgRepos([]);
        setLoadingRepos(false);
        return;
      }

      setLoadingRepos(true);
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('User not authenticated or access token missing.');
        }

        const functionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-org-projects?orgName=${encodeURIComponent(
          orgName
        )}`;

        const response = await fetch(functionUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({
              error: `Failed to fetch repos: ${response.statusText}`,
            }));
          throw new Error(
            errorData.error || `Failed to fetch repos: ${response.statusText}`
          );
        }

        const data = await response.json();
        setGithubOrgRepos(data || []);
      } catch (error) {
        console.error(
          'Error fetching GitHub org repos for project edit:',
          error
        );
        toast({
          title: 'Error Fetching Org Repos',
          description: error.message,
          variant: 'destructive',
        });
        setGithubOrgRepos([]);
      } finally {
        setLoadingRepos(false);
      }
    },
    [toast]
  );

  return {
    githubOrgRepos,
    loadingRepos,
    repoSearchTerm,
    repoSelectOpen,
    setRepoSearchTerm,
    setRepoSelectOpen,
    fetchOrgRepos,
  };
};