// src/services/githubApi.js
import { apiClient } from '@/lib/apiClient';

// Helper function to determine the API base URL
const getApiBaseUrl = () => {
  // If we're on GitHub Pages, use the absolute Vercel URL
  if (window.location.hostname.includes('github.io')) {
    return 'https://dev-flow-ai.vercel.app/api';
  }
  // Otherwise, use the relative path
  return '/api';
};

/**
 * Fetch GitHub organizations for the authenticated user
 * @returns {Promise<Array>} - Array of GitHub organization objects
 */
export const getGitHubOrgs = async () => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/github/organizations`, {
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
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/github/repositories${orgName ? `?org=${orgName}` : ''}`, {
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
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/github/login`);
    
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
  console.log('GitHub login initiated');
  // If we're on GitHub Pages, use the absolute Vercel URL
  if (window.location.hostname.includes('github.io')) {
    console.log('On GitHub Pages, redirecting to Vercel auth endpoint');
    // Direct link to the GitHub OAuth authorization, bypassing our backend redirect
    window.location.href = 'https://dev-flow-ai.vercel.app/auth/github/login';
  } else {
    // Otherwise, use the relative path
    console.log('Local environment, using relative API path');
    window.location.href = '/api/auth/github/login';
  }
};