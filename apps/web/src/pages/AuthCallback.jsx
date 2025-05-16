// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const code = searchParams.get('code');

        if (error) {
          toast({
            title: 'Authentication Error',
            description: error,
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        if (!code) {
          throw new Error('No code found in URL params');
        }

        // Call the github-auth function with the action in the query params
        const { data, error: exchangeError } = await supabase.functions.invoke(
          'github-auth',
          {
            body: { code },
            query: { action: 'exchange-code' },
            method: 'POST',
          }
        );

        if (exchangeError) {
          throw new Error(exchangeError.message || 'Failed to exchange code for token');
        }

        toast({
          title: 'GitHub Connected',
          description: 'Successfully connected to GitHub',
        });
        navigate('/');
      } catch (err) {
        console.error('Error in AuthCallback:', err);
        toast({
          title: 'Auth Error',
          description: err.message || 'Something went wrong',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setProcessing(false);
      }
    };
    handleCallback();
  }, [navigate, searchParams, toast]);

  return processing ? (
    <div>
      <h1>Processing Authentication</h1>
      <p>Please wait...</p>
    </div>
  ) : null;
};

export default AuthCallback;
