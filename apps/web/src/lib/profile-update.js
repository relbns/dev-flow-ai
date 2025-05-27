// Update for the apiClient.js auth.getProfile method
getProfile: async () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const url = `${BASE_URL}/auth/profile`;
  
  // Check if this endpoint is rate limited
  if (isRateLimited(url)) {
    throw new Error('Profile endpoint is rate limited. Please try again later.');
  }
  
  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    const data = await handleApiResponse(response, url);
    
    // If the response contains a new token, store it
    if (data && data.token) {
      localStorage.setItem('jwtToken', data.token);
      console.log('Updated JWT token from profile response');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}