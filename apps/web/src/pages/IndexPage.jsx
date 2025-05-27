import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DirectLoginButton from '@/components/DirectLoginButton';
import SimpleLoginButton from '@/components/SimpleLoginButton';
import { useToast } from '@/hooks/use-toast';

const IndexPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Debug log for index page
    console.log("[IndexPage] Auth state:", { 
      isLoading: loading, 
      isAuthenticated: !!user,
      hasToken: !!localStorage.getItem('jwtToken')
    });
    
    // If authenticated, redirect to dashboard
    if (user && !loading) {
      console.log("[IndexPage] User is authenticated, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // If still loading, show a loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  // Check token even if user state is not set yet
  const hasToken = !!localStorage.getItem('jwtToken');
  if (hasToken) {
    console.log("[IndexPage] Token exists but user state not set yet, showing loading");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
        <div className="ml-4">Loading user profile...</div>
      </div>
    );
  }

  // If not authenticated, show landing page
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to DevFlow AI</h1>
      <p className="text-xl mb-8 max-w-3xl">
        An integrated workflow solution for development teams. Manage projects, 
        track tasks, and collaborate seamlessly with GitHub integration.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SimpleLoginButton />
        <DirectLoginButton />
      </div>
      
      <div className="text-sm text-gray-500 mb-8">
        <button 
          onClick={() => {
            localStorage.clear();
            toast({
              title: 'Storage cleared',
              description: 'Local storage has been cleared.',
            });
            window.location.reload();
          }}
          className="text-blue-500 hover:underline"
        >
          Clear all storage
        </button>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-3">GitHub Integration</h3>
          <p>Connect your GitHub repositories, create tasks from issues, and track progress directly.</p>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-3">Task Management</h3>
          <p>Organize tasks, track progress, and collaborate with your team in a streamlined interface.</p>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-3">AI Assistance</h3>
          <p>Leverage AI to help with code reviews, writing documentation, and more.</p>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;