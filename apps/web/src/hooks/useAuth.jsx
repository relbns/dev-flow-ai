import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('jwtToken');
      if (!token || token === 'undefined' || token === 'null') {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile using apiClient
        const response = await apiClient.auth.getProfile();
        if (response && response.user) {
          setUser(response.user);
        } else {
          // If no user data, clear token
          localStorage.removeItem('jwtToken');
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Clear invalid token
        localStorage.removeItem('jwtToken');
        setUser(null);
        setError(error.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Function to update user state after login (called from AuthCallback)
  const login = (userData, token) => {
    if (token) {
      localStorage.setItem('jwtToken', token);
    }
    
    if (userData) {
      setUser(userData);
    }
    
    // Clear any previous errors
    setError(null);
  };

  // Function to clear user state after logout (called from Header)
  const logout = async () => {
    try {
      // Call API client logout
      await apiClient.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state regardless of API errors
      localStorage.removeItem('jwtToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};