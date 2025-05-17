// src/services/githubApi.js
import { apiClient } from '@/lib/apiClient';

/**
 * Fetch GitHub organizations for the authenticated user
 * @returns {Promise<Array>} - Array of GitHub organization objects
 */
export const getGitHubOrgs = async () => {
  try {
    const response = await fetch('/api/github/organizations', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch GitHub organizations');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub organizations:', error);
    throw error;
  }
};

/**
 * Fetch repositories for the authenticated user or specified organization
 * @param {string} orgName - Optional GitHub organization name
 * @returns {Promise<Array>} - Array of repository objects
 */
export const getRepositories = async (orgName) => {
  try {
    const response = await fetch(`/api/github/repositories${orgName ? `?org=${orgName}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch repositories');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
};

/**
 * Initiates GitHub OAuth flow
 * @returns {Promise<string>} - The URL to redirect to for GitHub authentication
 */
export const getGitHubAuthUrl = async () => {
  try {
    const response = await fetch('/api/auth/github/login');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get GitHub auth URL');
    }
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting GitHub auth URL:', error);
    throw error;
  }
};

/**
 * Handles the GitHub login flow
 */
export const handleGitHubLogin = () => {
  window.location.href = '/api/auth/github/login';
};
