// src/components/LandingPage.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      // User needs to login via header
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">DevFlow AI</h1>
          <p className="text-gray-600 text-center mb-6">
            AI-Powered Developer Workflow Management
          </p>
          
          <p className="text-gray-700 mb-6 text-center">
            Streamline your development workflow with GitHub integration and AI-assisted task management.
          </p>
          
          <Button 
            onClick={handleGetStarted}
            size="lg" 
            className="w-full"
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </Button>
          
          {!user && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              Click "Login with GitHub" in the header to get started.
            </p>
          )}
          
          <p className="mt-4 text-sm text-gray-500 text-center">
            By using DevFlow AI, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;