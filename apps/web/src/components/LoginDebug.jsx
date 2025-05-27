// src/components/LoginDebug.jsx
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

const LoginDebug = () => {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState({
    hostname: window.location.hostname,
    isGitHubPages: window.location.hostname.includes('github.io'),
    baseApiUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    currentUrl: window.location.href,
    envMode: import.meta.env.MODE,
    envProd: import.meta.env.PROD,
    envDev: import.meta.env.DEV,
    hasToken: !!localStorage.getItem('jwtToken')
  });
  
  const [showDebug, setShowDebug] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Function to test server connection
  const testServerConnection = async () => {
    try {
      // Determine which URL to test based on the environment
      let healthUrl;
      
      if (window.location.hostname.includes('github.io')) {
        // GitHub Pages deployment
        healthUrl = 'https://dev-flow-ai.vercel.app/api/health';
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development
        const port = window.location.port;
        healthUrl = `http://localhost:${port}/api/health`;
      } else {
        // Production Vercel deployment or other environment
        healthUrl = `${window.location.origin}/api/health`;
      }
      
      console.log('Testing server connection at:', healthUrl);
      
      const response = await fetch(healthUrl);
      let data;
      
      try {
        data = await response.json();
      } catch (e) {
        data = { message: 'Server responded but did not return JSON' };
      }
      
      setTestResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      if (response.ok) {
        toast({
          title: 'Server connection successful',
          description: `Server responded with status ${response.status}`,
        });
      } else {
        toast({
          title: 'Server connection failed',
          description: `Server responded with status ${response.status}: ${response.statusText}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing server connection:', error);
      
      setTestResult({
        success: false,
        error: error.message
      });
      
      toast({
        title: 'Server connection failed',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  };
  
  // Function to get GitHub auth URL and redirect
  const triggerGitHubLogin = () => {
    try {
      const directAuthUrl = apiClient.auth.getDirectGitHubAuthUrl();
      console.log('Direct GitHub auth URL:', directAuthUrl);
      
      // Store debugging info in localStorage before redirecting
      localStorage.setItem('githubAuthDebug', JSON.stringify({
        timestamp: new Date().toISOString(),
        authUrl: directAuthUrl,
        origin: window.location.origin,
        hostname: window.location.hostname
      }));
      
      // Redirect to GitHub auth
      window.location.href = directAuthUrl;
    } catch (error) {
      console.error('Error triggering GitHub login:', error);
      
      toast({
        title: 'GitHub Login Error',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  };
  
  // Function to clear all local storage data
  const clearAllStorage = () => {
    try {
      localStorage.clear();
      setDebugInfo({
        ...debugInfo,
        hasToken: false
      });
      
      toast({
        title: 'Storage cleared',
        description: 'All local storage data has been cleared.',
      });
    } catch (error) {
      console.error('Error clearing storage:', error);
      
      toast({
        title: 'Error',
        description: `Failed to clear storage: ${error.message}`,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="mt-4 text-sm">
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="text-blue-500 hover:underline mb-2"
      >
        {showDebug ? 'Hide Debug Info' : 'Show Login Debug Info'}
      </button>
      
      {showDebug && (
        <div className="p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold mb-2">Login Debug Information</h3>
          <pre className="text-xs bg-gray-700 text-white p-2 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={testServerConnection}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
            >
              Test Server Connection
            </button>
            
            <button 
              onClick={triggerGitHubLogin}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
            >
              Direct GitHub Login
            </button>
            
            <button 
              onClick={clearAllStorage}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              Clear All Storage
            </button>
          </div>
          
          {testResult && (
            <div className="mt-2">
              <h4 className="font-semibold">Test Result:</h4>
              <pre className={`text-xs p-2 rounded overflow-auto ${testResult.success ? 'bg-green-700' : 'bg-red-700'} text-white`}>
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4 text-xs">
            <h4 className="font-semibold">Login Process Debugging Tips:</h4>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Check that the server health endpoint responds successfully</li>
              <li>Verify that the correct GitHub client ID is being used</li>
              <li>Ensure the callback URL matches what's registered in your GitHub OAuth app</li>
              <li>After login attempts, check browser console for errors</li>
              <li>Clear storage if you encounter persistent authentication issues</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginDebug;