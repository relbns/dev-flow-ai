// Determine the base URL considering GitHub Pages deployment
const getBaseUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  
  // Handle GitHub Pages deployment scenario
  if (window.location.hostname.includes('github.io') && apiBase === '/api') {
    // We're on GitHub Pages but using relative API path, need to use absolute URL
    console.log('Detected GitHub Pages deployment, using absolute API URL');
    return 'https://dev-flow-ai.vercel.app/api';
  }
  
  return apiBase;
};