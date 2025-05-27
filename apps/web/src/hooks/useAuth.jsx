import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug function to log current auth state
  const logAuthState = (message, userData) => {
    console.log(`[Auth State] ${message}`, {
      hasUser: !!userData,
      hasToken: !!localStorage.getItem('jwtToken'),
      userData: userData ? {
        id: userData.id,
        username: userData.username
      } : null
    });
  };

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('jwtToken');
      console.log("[Auth] Initial load, token exists:", !!token);
      
      if (!token || token === 'undefined' || token === 'null') {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Attempt to decode token for basic info
        let decodedUser = null;
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payloadBase64 = tokenParts[1];
            const payloadJson = atob(payloadBase64);
            const payload = JSON.parse(payloadJson);
            
            if (payload.isTemp) {
              console.log("[Auth] Using user data from token");
              decodedUser = {
                id: payload.githubId,
                username: payload.username,
                displayName: payload.displayName,
                email: payload.email,
                avatarUrl: payload.avatarUrl
              };
              
              // Set user immediately from token data
              setUser(decodedUser);
            }
          }
        } catch (decodeError) {
          console.warn("[Auth] Error decoding token:", decodeError);
        }
        
        // Fetch user profile using apiClient
        console.log("[Auth] Fetching user profile from API");
        const response = await apiClient.auth.getProfile();
        if (response && response.user) {
          console.log("[Auth] Profile fetch successful, updating user");
          setUser(response.user);
          logAuthState("Profile loaded from API", response.user);
        } else if (decodedUser) {
          console.log("[Auth] Profile fetch returned no data, keeping token data");
          // Keep the token data if API returned nothing
          setUser(decodedUser);
          logAuthState("Using decoded token data", decodedUser);
        } else {
          console.log("[Auth] No user data available, clearing token");
          // If no user data from any source, clear token
          localStorage.removeItem('jwtToken');
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Error loading user:', error);
        
        // Try to use decoded user if API fails
        let decodedUser = null;
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payloadBase64 = tokenParts[1];
            const payloadJson = atob(payloadBase64);
            const payload = JSON.parse(payloadJson);
            
            if (payload.isTemp || payload.githubId) {
              console.log("[Auth] API failed, using token data as fallback");
              decodedUser = {
                id: payload.githubId || payload.userId,
                username: payload.username,
                displayName: payload.displayName,
                email: payload.email,
                avatarUrl: payload.avatarUrl
              };
              
              // Set user from token data
              setUser(decodedUser);
              logAuthState("Using token data after API error", decodedUser);
              setError(null);
            }
          }
        } catch (decodeError) {
          console.warn("[Auth] Error decoding token after API error:", decodeError);
        }
        
        if (!decodedUser) {
          // Clear invalid token if we couldn't get user data from any source
          localStorage.removeItem('jwtToken');
          setUser(null);
          setError(error.message || 'Failed to load user profile');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Function to update user state after login (called from AuthCallback)
  const login = (userData, token) => {
    console.log("[Auth] Login called with userData:", !!userData);
    
    if (token) {
      console.log("[Auth] Storing token in localStorage");
      localStorage.setItem('jwtToken', token);
    }
    
    if (userData) {
      console.log("[Auth] Setting user state with:", userData.username);
      setUser(userData);
      logAuthState("Login completed", userData);
    } else {
      console.warn("[Auth] Login called without userData");
    }
    
    // Clear any previous errors
    setError(null);
  };

  // Function to clear user state after logout (called from Header)
  const logout = async () => {
    console.log("[Auth] Logout called");
    try {
      // Call API client logout
      await apiClient.auth.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      // Always clear local state regardless of API errors
      localStorage.removeItem('jwtToken');
      setUser(null);
      logAuthState("Logged out", null);
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