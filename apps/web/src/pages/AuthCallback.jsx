// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const token = searchParams.get('token');
        const errorMessage = searchParams.get('message');

        if (error || errorMessage) {
          toast({
            title: 'Authentication Error',
            description: error || decodeURIComponent(errorMessage || 'Unknown error'),
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        if (!token) {
          throw new Error('No token found in URL params');
        }

        // Store the token first
        localStorage.setItem('jwtToken', token);
        
        // Then fetch the user profile with the token
        try {
          const response = await apiClient.auth.getProfile();
          if (response && response.user) {
            login(response.user, token);
            
            toast({
              title: 'GitHub Connected',
              description: 'Successfully connected to GitHub',
            });
            
            navigate('/dashboard');
          } else {
            throw new Error('Failed to get user profile data');
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
          toast({
            title: 'Error',
            description: 'Failed to get user profile data. Please try again.',
            variant: 'destructive',
          });
          
          // Clear token if profile fetch failed
          localStorage.removeItem('jwtToken');
          navigate('/');
        }
      } catch (err) {
        console.error('Error in AuthCallback:', err);
        toast({
          title: 'Auth Error',
          description: err.message || 'Something went wrong during authentication',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setProcessing(false);
      }
    };
    
    handleCallback();
  }, [navigate, searchParams, toast, login]);

  return processing ? (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-16 h-16 border-t-4 border-primary border-solid rounded-full animate-spin mb-4"></div>
      <h1 className="text-2xl font-bold mb-2">Completing GitHub Authentication</h1>
      <p className="text-gray-500">Please wait while we finish setting up your account...</p>
    </div>
  ) : null;
};

export default AuthCallback;