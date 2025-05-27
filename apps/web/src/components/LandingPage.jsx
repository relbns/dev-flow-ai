// src/components/LandingPage.jsx
import React from 'react';
import DirectLoginButton from './DirectLoginButton';
import LoginDebug from './LoginDebug';

const LandingPage = () => {
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
          
          <DirectLoginButton />
          
          <p className="mt-4 text-sm text-gray-500">
            By logging in, you agree to our Terms of Service and Privacy Policy.
          </p>
          
          <LoginDebug />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;