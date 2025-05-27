// src/components/SimpleLoginButton.jsx
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import LoginDebug from '@/components/LoginDebug';

const SimpleLoginButton = () => {
  const { toast } = useToast();

  const handleLogin = () => {
    // GitHub OAuth parameters
    const clientId = 'Ov23liGyrjPcmvI0QH2n'; // Your GitHub OAuth client ID
    
    // Determine the correct redirect URI based on environment
    let redirectUri;
    
    if (window.location.hostname.includes('github.io')) {
      // GitHub Pages deployment with HashRouter
      // When using HashRouter, we need to direct GitHub to redirect back to the root URL
      // and we'll handle the callback via the hash route
      const repoName = window.location.pathname.split('/')[1]; // Get the repository name from the URL
      redirectUri = `${window.location.origin}/${repoName}/#/auth/callback`;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Local development with HashRouter
      const port = window.location.port;
      redirectUri = `http://localhost:${port}/#/auth/callback`;
    } else {
      // Production Vercel deployment or other environment with HashRouter
      redirectUri = `${window.location.origin}/#/auth/callback`;
    }
    
    // Encode the redirect URI
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const scopes = encodeURIComponent('user:email read:user repo read:org');
    
    // Create the GitHub OAuth URL
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scopes}&prompt=consent`;
    
    // Log debugging information
    console.log("Redirecting to GitHub OAuth:", githubAuthUrl);
    console.log("Redirect URI:", redirectUri);
    
    // Store debugging information in localStorage
    localStorage.setItem('githubAuthDebug', JSON.stringify({
      timestamp: new Date().toISOString(),
      authUrl: githubAuthUrl,
      redirectUri,
      clientId,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      isGitHubPages: window.location.hostname.includes('github.io')
    }));
    
    try {
      // Attempt to redirect
      window.location.href = githubAuthUrl;
    } catch (error) {
      // Show error toast if redirect fails
      console.error("Failed to redirect to GitHub:", error);
      toast({
        title: 'Error',
        description: 'Failed to initiate GitHub login. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleLogin}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center"
      >
        <span className="mr-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </span>
        Sign in with GitHub
      </button>
      
      {/* Add the LoginDebug component */}
      <LoginDebug />
    </div>
  );
};

export default SimpleLoginButton;