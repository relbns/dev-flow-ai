// src/components/AuthDebugPanel.jsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

const AuthDebugPanel = () => {
  const { user, loading, error } = useAuth();
  
  // Function to safely handle token decoding
  const decodeToken = () => {
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) return 'No token found';
      
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return 'Invalid token format';
      
      const payloadBase64 = tokenParts[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      
      return JSON.stringify(payload, null, 2);
    } catch (error) {
      return `Error decoding token: ${error.message}`;
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-md overflow-auto max-h-[80vh] z-50">
      <h3 className="text-lg font-bold mb-2">Auth Debug Panel</h3>
      
      <div className="mb-2">
        <strong>Status:</strong> {loading ? 'Loading...' : user ? 'Authenticated' : 'Not Authenticated'}
      </div>
      
      {error && (
        <div className="mb-2 text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {user && (
        <div className="mb-2">
          <strong>User:</strong>
          <pre className="text-xs bg-gray-700 p-2 rounded mt-1">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mb-2">
        <strong>Token:</strong>
        <pre className="text-xs bg-gray-700 p-2 rounded mt-1 overflow-auto">
          {decodeToken()}
        </pre>
      </div>
      
      <div className="flex space-x-2">
        <button 
          onClick={() => localStorage.removeItem('jwtToken')}
          className="bg-red-500 text-white px-2 py-1 rounded text-xs"
        >
          Clear Token
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default AuthDebugPanel;