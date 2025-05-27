// apiClient.js - auth section update
  // Auth methods
  auth: {
    login: async () => {
      // Clear any rate limiting before login
      clearRateLimitTracking();
      
      // Determine the correct GitHub auth URL based on environment
      let githubAuthUrl;
      
      if (window.location.hostname.includes('github.io')) {
        // GitHub Pages deployment - using hash router
        const repoName = window.location.pathname.split('/')[1]; // Get the repository name from the URL
        githubAuthUrl = 'https://dev-flow-ai.vercel.app/api/auth/github/login';
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development
        const port = window.location.port;
        githubAuthUrl = `http://localhost:${port}/api/auth/github/login`;
      } else {
        // Production Vercel deployment or other environment
        githubAuthUrl = `${window.location.origin}/api/auth/github/login`;
      }
      
      console.log('Redirecting to GitHub auth URL:', githubAuthUrl);
      window.location.href = githubAuthUrl;
    },
    
    // Get a direct GitHub OAuth URL without using the backend
    getDirectGitHubAuthUrl: () => {
      // GitHub OAuth parameters
      const clientId = 'Ov23liGyrjPcmvI0QH2n'; // Your GitHub OAuth App client ID
      
      // Determine the correct redirect URI based on environment
      let redirectUri;
      
      if (window.location.hostname.includes('github.io')) {
        // GitHub Pages deployment with HashRouter
        const repoName = window.location.pathname.split('/')[1]; // Get the repository name from the URL
        redirectUri = `${window.location.origin}/${repoName}/#/auth/callback`;
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development
        const port = window.location.port;
        redirectUri = `http://localhost:${port}/#/auth/callback`;
      } else {
        // Production Vercel deployment or other environment
        redirectUri = `${window.location.origin}/#/auth/callback`;
      }
      
      // Encode the redirect URI
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      const scopes = encodeURIComponent('user:email read:user repo read:org');
      
      // Create the GitHub OAuth URL
      return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scopes}&prompt=consent`;
    },