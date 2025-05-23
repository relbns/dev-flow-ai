// This function needs to be updated in the apiClient.js file
// Add this to the auth object in the apiClient.js file
handleAuthCallback: (token) => {
  // Store the token in localStorage
  localStorage.setItem('jwtToken', token);
  
  // Clear any rate limiting before login
  clearRateLimitTracking();
  
  // Return true to indicate success
  return true;
}