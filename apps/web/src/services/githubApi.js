// src/services/githubApi.js
import { supabase } from '@/lib/supabaseClient';

// Store GitHub token after OAuth login
export const storeGitHubToken = async (providerToken) => {
    console.log("Attempting to store GitHub token. Token exists:", !!providerToken);
    
    if (!providerToken) {
      console.error("No provider token available to store");
      throw new Error("No GitHub token available to store");
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('github-auth', {
        body: { token: providerToken },
        query: { action: 'store-token' },
        method: 'POST',
      });
      
      if (error) {
        console.error("Error response from github-auth function:", error);
        throw error;
      }
      
      console.log("GitHub token stored successfully. Response:", data);
      return data;
    } catch (error) {
      console.error('Error storing GitHub token:', error);
      throw error;
    }
  };

// Get GitHub organizations
export const getGitHubOrgs = async () => {
    try {
        const { data, error } = await supabase.functions.invoke(
            'get-github-user-organizations',
            { method: 'POST' }
        );

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching GitHub organizations:', error);
        throw error;
    }
};

// Get organization repositories
export const getOrgRepos = async (orgName) => {
    try {
        const { data, error } = await supabase.functions.invoke('github-repos', {
            method: 'POST',
            query: { org: orgName },
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching repositories for ${orgName}:`, error);
        throw error;
    }
};
