// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback initiated");
        console.log("Current location:", location);
        console.log("Current URL:", window.location.href);
        
        // Extract params from URL
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const token = searchParams.get('token');
        const errorMessage = searchParams.get('message') || searchParams.get('error_description');

        // Retrieve any stored debug info
        let authDebugInfo = null;
        try {
          const storedDebug = localStorage.getItem('githubAuthDebug');
          if (storedDebug) {
            authDebugInfo = JSON.parse(storedDebug);
          }
        } catch (e) {
          console.warn('Failed to parse stored auth debug info:', e);
        }
        
        // Debug info for troubleshooting
        const currentDebugInfo = {
          hasCode: !!code,
          hasToken: !!token,
          hasError: !!error,
          errorMessage: errorMessage || error,
          url: window.location.href,
          locationPathname: location.pathname,
          locationSearch: location.search,
          locationHash: location.hash,
          tokenStart: token ? token.substring(0, 10) + '...' : null,
          searchParams: Object.fromEntries(searchParams.entries()),
          authDebugInfo,
          timestamp: new Date().toISOString()
        };
        
        console.log("Auth callback debug info:", currentDebugInfo);
        setDebugInfo(currentDebugInfo);

        // Handle errors in URL
        if (error || errorMessage) {
          console.error("Error from GitHub OAuth redirect:", error || errorMessage);
          setError(error || errorMessage);
          toast({
            title: 'Authentication Error',
            description: errorMessage || error || 'Unknown error during GitHub authentication',
            variant: 'destructive',
          });
          
          setTimeout(() => {
            navigate('/');
          }, 3000);
          
          return;
        }

        // If we have a code but no token, we need to exchange the code for a token
        if (code && !token) {
          console.log("Received code from GitHub, exchanging for token");
          
          try {
            // Determine the token exchange endpoint based on environment
            let tokenEndpoint;
            
            if (window.location.hostname.includes('github.io')) {
              // GitHub Pages deployment
              tokenEndpoint = 'https://dev-flow-ai.vercel.app/api/auth/github-callback';
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              // Local development
              const port = window.location.port;
              tokenEndpoint = `http://localhost:${port}/api/auth/github-callback`;
            } else {
              // Production Vercel deployment or other environment
              tokenEndpoint = `${window.location.origin}/api/auth/github-callback`;
            }
            
            console.log("Exchanging code for token at:", tokenEndpoint);
            
            // Exchange code for token
            const response = await fetch(`${tokenEndpoint}?code=${code}`);
            
            if (!response.ok) {
              throw new Error(`Token exchange failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.token) {
              throw new Error('No token received from token exchange');
            }
            
            console.log("Successfully exchanged code for token");
            
            // Store token and proceed with login
            localStorage.setItem('jwtToken', data.token);
            
            // If user data is included in the response, use it
            if (data.user) {
              login(data.user, data.token);
              toast({
                title: 'GitHub Connected',
                description: 'Successfully connected to GitHub',
              });
              navigate('/dashboard');
              return;
            }
            
            // Otherwise, fetch user profile with the new token
            const profileResponse = await apiClient.auth.getProfile();
            
            if (profileResponse && profileResponse.user) {
              login(profileResponse.user, data.token);
              toast({
                title: 'GitHub Connected',
                description: 'Successfully connected to GitHub',
              });
              navigate('/dashboard');
              return;
            } else {
              throw new Error('Failed to get user profile after token exchange');
            }
          } catch (tokenError) {
            console.error("Error exchanging code for token:", tokenError);
            setError(tokenError.message);
            toast({
              title: 'Authentication Error',
              description: `Error exchanging code for token: ${tokenError.message}`,
              variant: 'destructive',
            });
            
            setTimeout(() => {
              navigate('/');
            }, 3000);
            
            return;
          }
        }

        // If we already have a token in the URL
        if (token) {
          console.log("Token received directly in URL, storing in localStorage");
          // Store token in localStorage
          localStorage.setItem('jwtToken', token);
          
          // Try to decode token to see if it has user info
          let tokenPayload = null;
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payloadBase64 = tokenParts[1];
              const payloadJson = atob(payloadBase64);
              tokenPayload = JSON.parse(payloadJson);
              console.log("Token decoded successfully:", tokenPayload.username || tokenPayload.sub);
            }
          } catch (decodeError) {
            console.error("Failed to decode token:", decodeError);
          }
          
          // If token has user info embedded, create user directly
          if (tokenPayload && (tokenPayload.isTemp || tokenPayload.githubId || tokenPayload.sub)) {
            console.log("Using embedded user data from token");
            
            const userData = {
              id: tokenPayload.githubId || tokenPayload.sub || tokenPayload.userId,
              username: tokenPayload.username || tokenPayload.login || tokenPayload.name,
              displayName: tokenPayload.displayName || tokenPayload.name,
              email: tokenPayload.email,
              avatarUrl: tokenPayload.avatarUrl || tokenPayload.avatar_url
            };
            
            // Login with the token and user data
            login(userData, token);
            
            toast({
              title: 'GitHub Connected',
              description: 'Successfully connected to GitHub',
            });
            
            // Try to fetch profile in background to get complete user data
            try {
              console.log("Fetching complete profile from API");
              const response = await apiClient.auth.getProfile();
              
              if (response && response.user) {
                console.log("Profile fetched successfully, updating user data");
                // Update login with complete user data
                login(response.user, response.token || token);
              }
            } catch (profileError) {
              console.warn("Background profile fetch failed, continuing with token data:", profileError);
              // Continue with token data, don't show error
            }
            
            // Navigate to dashboard even if profile fetch fails
            navigate('/dashboard');
            return;
          }
          
          // Fallback to standard profile fetch if token doesn't have embedded data
          console.log("Fetching user profile from API");
          try {
            const response = await apiClient.auth.getProfile();
            
            if (response && response.user) {
              console.log("Profile fetched successfully");
              login(response.user, response.token || token);
              
              toast({
                title: 'GitHub Connected',
                description: 'Successfully connected to GitHub',
              });
              
              navigate('/dashboard');
              return;
            } else {
              console.error("Profile response missing user data");
              throw new Error('Failed to get user profile data');
            }
          } catch (profileError) {
            console.error("Profile fetch error:", profileError);
            setError(profileError.message);
            
            if (tokenPayload) {
              console.log("Using fallback user data from token");
              // If we have token data but profile fetch failed, use token data as fallback
              const userData = {
                id: tokenPayload.githubId || tokenPayload.sub || tokenPayload.userId,
                username: tokenPayload.username || tokenPayload.login || tokenPayload.name,
                displayName: tokenPayload.displayName || tokenPayload.name,
                email: tokenPayload.email,
                avatarUrl: tokenPayload.avatarUrl || tokenPayload.avatar_url
              };
              
              login(userData, token);
              
              toast({
                title: 'GitHub Connected (Limited)',
                description: 'Connected with limited data. Some features may be unavailable.',
              });
              
              navigate('/dashboard');
              return;
            } else {
              toast({
                title: 'Error',
                description: 'Failed to get user profile data. Please try again.',
                variant: 'destructive',
              });
              
              // Clear token if profile fetch failed and no fallback
              localStorage.removeItem('jwtToken');
              
              setTimeout(() => {
                navigate('/');
              }, 3000);
              
              return;
            }
          }
        }
        
        // If we don't have a code or token, something went wrong
        console.error("No code or token found in URL");
        setError('No authorization code or token found in the callback URL');
        toast({
          title: 'Authentication Error',
          description: 'No authorization code or token found in the callback URL',
          variant: 'destructive',
        });
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
        
      } catch (err) {
        console.error('Error in AuthCallback:', err);
        setError(err.message);
        
        toast({
          title: 'Auth Error',
          description: err.message || 'Something went wrong during authentication',
          variant: 'destructive',
        });
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } finally {
        setProcessing(false);
      }
    };
    
    handleCallback();
  }, [navigate, searchParams, location, toast, login]);

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="w-16 h-16 border-t-4 border-primary border-solid rounded-full animate-spin mb-4"></div>
      <h1 className="text-2xl font-bold mb-2">
        {error ? 'Authentication Error' : 'Completing GitHub Authentication'}
      </h1>
      <p className="text-gray-500 mb-4 text-center">
        {error 
          ? 'There was a problem with GitHub authentication. Redirecting back to login...' 
          : 'Please wait while we finish setting up your account...'}
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 max-w-md text-center">
          {error}
        </div>
      )}
      
      {debugInfo && (
        <div className="mt-2 p-4 bg-gray-100 rounded-md max-w-md w-full overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Debug Info:</h3>
            <button 
              onClick={() => navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Copy Debug Info
            </button>
          </div>
          <pre className="text-xs font-mono bg-gray-700 text-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          
          <div className="mt-4">
            <button 
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
            >
              Return to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;