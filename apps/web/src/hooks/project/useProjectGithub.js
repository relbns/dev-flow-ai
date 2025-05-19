// src/hooks/project/useProjectGithub.js
import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

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
        // Use the apiClient instead of direct supabase calls
        const repositories = await apiClient.github.getRepositories(orgName);
        setGithubOrgRepos(repositories || []);
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