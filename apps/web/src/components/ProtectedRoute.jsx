import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Debug log for protected route
    console.log("[ProtectedRoute] Current auth state:", { 
      isLoading: loading, 
      isAuthenticated: !!user,
      userData: user ? { username: user.username } : null,
      hasToken: !!localStorage.getItem('jwtToken')
    });
  }, [user, loading]);

  // If still loading auth state, show a loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
        <div className="ml-4 text-gray-600">Verifying authentication...</div>
      </div>
    );
  }

  // Check for token even if user state is not set
  const hasToken = !!localStorage.getItem('jwtToken');
  
  // If authenticated via either user state or token, render the children
  if (user || hasToken) {
    // If we have a token but no user state, show a temporary loading state
    // This can happen if the token is valid but the user state hasn't been set yet
    if (!user && hasToken) {
      console.log("[ProtectedRoute] Token exists but no user state yet, rendering temporary loading");
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="w-12 h-12 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
          <div className="ml-4 text-gray-600">Loading user profile...</div>
        </div>
      );
    }
    
    console.log("[ProtectedRoute] Authenticated, rendering protected content");
    return children;
  }

  // If not authenticated, redirect to home page
  console.log("[ProtectedRoute] Not authenticated, redirecting to home");
  return <Navigate to="/" />;
};

export default ProtectedRoute;