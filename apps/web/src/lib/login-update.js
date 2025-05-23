    login: async () => {
      // Clear any rate limiting before login
      clearRateLimitTracking();
      
      // For GitHub Pages deployment, we need to use the full URL
      if (window.location.hostname.includes('github.io')) {
        window.location.href = 'https://dev-flow-ai.vercel.app/auth/github/login';
      } else {
        // In local or direct Vercel deployment, we can use the relative URL
        window.location.href = `${BASE_URL}/auth/github/login`;
      }
    },