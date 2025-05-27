// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
        console.log("Current URL:", window.location.href);
        
        // Extract params from URL
        const code = searchParams.get('code');
        const token = searchParams.get('token');
        const errorParam = searchParams.get('error');
        const errorMessage = searchParams.get('message') || searchParams.get('error_description');

        // Debug info for troubleshooting
        const currentDebugInfo = {
          hasCode: !!code,
          hasToken: !!token,
          hasError: !!errorParam,
          errorMessage: errorMessage || errorParam,
          url: window.location.href,
          searchParams: Object.fromEntries(searchParams.entries()),
          timestamp: new Date().toISOString()
        };
        
        console.log("Auth callback debug info:", currentDebugInfo);
        setDebugInfo(currentDebugInfo);

        // Handle errors in URL
        if (errorParam || errorMessage) {
          console.error("Error from GitHub OAuth redirect:", errorParam || errorMessage);
          setError(errorParam || errorMessage);
          toast({
            title: 'Authentication Error',
            description: errorMessage || errorParam || 'Unknown error during GitHub authentication',
            variant: 'destructive',
          });
          
          setTimeout(() => {
            navigate('/');
          }, 3000);
          
          return;
        }

        // Handle direct token (from server redirect flow)
        if (token) {
          console.log("Received token directly from server redirect");
          
          try {
            // Store the token
            localStorage.setItem('jwtToken', token);
            
            // Try to extract user data from token
            let userData = null;
            try {
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                const payloadBase64 = tokenParts[1];
                const payloadJson = atob(payloadBase64);
                const tokenPayload = JSON.parse(payloadJson);
                console.log("Token payload decoded successfully");
                
                userData = {
                  id: tokenPayload._id || tokenPayload.githubId || tokenPayload.sub,
                  username: tokenPayload.username || tokenPayload.login,
                  displayName: tokenPayload.displayName || tokenPayload.name,
                  email: tokenPayload.email,
                  avatarUrl: tokenPayload.avatarUrl || tokenPayload.avatar_url
                };
                
                console.log("Using user data from token:", userData.username);
              }
            } catch (decodeError) {
              console.warn("Failed to decode token:", decodeError);
            }
            
            if (userData && (userData.username || userData.id)) {
              console.log("Logging in user with direct token:", userData.username || userData.id);
              
              // Call the login function from useAuth
              login(userData, token);
              
              toast({
                title: 'Successfully logged in!',
                description: `Welcome, ${userData.displayName || userData.username}!`,
              });
              
              // Navigate to dashboard
              console.log("Navigating to dashboard");
              navigate('/dashboard');
              return;
            } else {
              throw new Error('No valid user data available in token');
            }
          } catch (tokenError) {
            console.error("Error processing direct token:", tokenError);
            setError(tokenError.message);
            toast({
              title: 'Authentication Error',
              description: `Failed to process login token: ${tokenError.message}`,
              variant: 'destructive',
            });
            
            setTimeout(() => {
              navigate('/');
            }, 3000);
            
            return;
          }
        }

        // Handle code exchange (fallback flow)
        if (code) {
          console.log("Received code from GitHub, exchanging for token");
          
          try {
            // Try the API endpoint for code exchange
            console.log("Exchanging code for token via API");
            
            const response = await fetch(`https://dev-flow-ai.vercel.app/api/auth/github-callback?code=${code}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              mode: 'cors',
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Token exchange failed with status ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log("Token exchange response:", { hasToken: !!data.token, hasUser: !!data.user });
            
            if (!data.token) {
              throw new Error('No token received from token exchange');
            }
            
            console.log("Successfully exchanged code for token");
            
            // Store the token
            localStorage.setItem('jwtToken', data.token);
            
            // Use user data from response or extract from token
            let userData = data.user;
            
            if (!userData) {
              try {
                const tokenParts = data.token.split('.');
                if (tokenParts.length === 3) {
                  const payloadBase64 = tokenParts[1];
                  const payloadJson = atob(payloadBase64);
                  const tokenPayload = JSON.parse(payloadJson);
                  
                  userData = {
                    id: tokenPayload._id || tokenPayload.githubId || tokenPayload.sub,
                    username: tokenPayload.username || tokenPayload.login,
                    displayName: tokenPayload.displayName || tokenPayload.name,
                    email: tokenPayload.email,
                    avatarUrl: tokenPayload.avatarUrl || tokenPayload.avatar_url
                  };
                }
              } catch (decodeError) {
                console.warn("Failed to decode token:", decodeError);
              }
            }
            
            if (userData && (userData.username || userData.id)) {
              console.log("Logging in user via code exchange:", userData.username || userData.id);
              
              // Call the login function from useAuth
              login(userData, data.token);
              
              toast({
                title: 'Successfully logged in!',
                description: `Welcome, ${userData.displayName || userData.username}!`,
              });
              
              // Navigate to dashboard
              console.log("Navigating to dashboard");
              navigate('/dashboard');
              return;
            } else {
              throw new Error('No valid user data available after token exchange');
            }
            
          } catch (tokenError) {
            console.error("Error exchanging code for token:", tokenError);
            setError(tokenError.message);
            
            // Provide specific guidance for different error types
            if (tokenError.message.includes('CORS') || tokenError.message.includes('Failed to fetch')) {
              toast({
                title: 'Authentication Error',
                description: 'Network error during authentication. Please try again.',
                variant: 'destructive',
              });
            } else if (tokenError.message.includes('redirect_uri')) {
              toast({
                title: 'Configuration Error',
                description: 'OAuth configuration issue. This should be resolved shortly.',
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Authentication Error',
                description: `Failed to complete login: ${tokenError.message}`,
                variant: 'destructive',
              });
            }
            
            setTimeout(() => {
              navigate('/');
            }, 5000);
            
            return;
          }
        }
        
        // If we don't have a code or token, something went wrong
        console.error("No authorization code or token found in URL");
        setError('No authorization code or token found in the callback URL');
        toast({
          title: 'Authentication Error',
          description: 'No authorization data found. Please try logging in again.',
          variant: 'destructive',
        });
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
        
      } catch (err) {
        console.error('Error in AuthCallback:', err);
        setError(err.message);
        
        toast({
          title: 'Authentication Error',
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
      <p className="text-gray-500 mb-4 text-center max-w-md">
        {error 
          ? 'There was a problem with GitHub authentication. Redirecting back to login...' 
          : 'Please wait while we complete your login...'}
      </p>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 max-w-md">
          <div className="font-medium mb-2">Authentication Failed</div>
          <div className="text-sm">{error}</div>
          {error.includes('redirect_uri') && (
            <div className="mt-2 text-xs text-red-600">
              <p>This is a temporary configuration issue that should be resolved shortly.</p>
              <p>The development team has been notified.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Show debug info only in development */}
      {debugInfo && import.meta.env.DEV && (
        <details className="mt-4 p-4 bg-gray-100 rounded-md max-w-md w-full">
          <summary className="cursor-pointer font-bold mb-2">Debug Info (Dev Mode)</summary>
          <pre className="text-xs font-mono bg-gray-700 text-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          <button 
            onClick={() => navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))}
            className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy Debug Info
          </button>
        </details>
      )}
      
      <div className="mt-4 text-center">
        <button 
          onClick={() => navigate('/')}
          className="text-blue-500 hover:text-blue-700 underline text-sm"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default AuthCallback;