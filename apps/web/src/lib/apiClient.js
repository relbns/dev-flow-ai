// apiClient.js
import { normalizeIdFields } from './id-utils';

// Helper function to clear rate limit tracker
export const clearRateLimitTracking = () => {
  // Clear any stored rate limit information
  localStorage.removeItem('rateLimitedEndpoints');
  console.log('Rate limit tracking has been cleared');
};

// Determine the base URL considering GitHub Pages deployment
const getBaseUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  
  // Handle GitHub Pages deployment scenario
  if (window.location.hostname.includes('github.io') && apiBase === '/api') {
    // We're on GitHub Pages but using relative API path, need to use absolute URL
    console.log('Detected GitHub Pages deployment, using absolute API URL');
    return 'https://dev-flow-ai.vercel.app/api';
  }
  
  return apiBase;
};

const BASE_URL = getBaseUrl();

// Track rate limited endpoints to avoid repeated requests
// We'll store in localStorage to persist across page reloads
const getRateLimitedEndpoints = () => {
  try {
    const stored = localStorage.getItem('rateLimitedEndpoints');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to parse rate limited endpoints from localStorage');
  }
  return {};
};

const addRateLimitedEndpoint = (endpoint, retryAfter = 60) => {
  try {
    const rateLimited = getRateLimitedEndpoints();
    rateLimited[endpoint] = Date.now() + (retryAfter * 1000);
    localStorage.setItem('rateLimitedEndpoints', JSON.stringify(rateLimited));
  } catch (e) {
    console.warn('Failed to store rate limited endpoint to localStorage');
  }
};

const removeRateLimitedEndpoint = (endpoint) => {
  try {
    const rateLimited = getRateLimitedEndpoints();
    delete rateLimited[endpoint];
    localStorage.setItem('rateLimitedEndpoints', JSON.stringify(rateLimited));
  } catch (e) {
    console.warn('Failed to remove rate limited endpoint from localStorage');
  }
};

const isRateLimited = (endpoint) => {
  try {
    const rateLimited = getRateLimitedEndpoints();
    const limitUntil = rateLimited[endpoint];
    
    if (limitUntil && Date.now() < limitUntil) {
      const secondsRemaining = Math.ceil((limitUntil - Date.now()) / 1000);
      console.warn(`Endpoint ${endpoint} is rate limited for ${secondsRemaining} more seconds`);
      return true;
    }
    
    // If expired, remove the rate limit
    if (limitUntil) {
      removeRateLimitedEndpoint(endpoint);
    }
    
    return false;
  } catch (e) {
    console.warn('Failed to check rate limited status');
    return false;
  }
};

// Helper function to get JWT token or null if not present
const getAuthToken = () => {
  const token = localStorage.getItem('jwtToken');
  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }
  return token;
};

// Helper function to include auth header if token exists
const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function to handle API responses
const handleApiResponse = async (response, endpoint) => {
  // Handle rate limiting
  if (response.status === 429) {
    // Get retry-after header if available
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
    
    // Add to rate limited storage
    addRateLimitedEndpoint(endpoint, retryAfter);
    
    console.warn(`Rate limited for endpoint: ${endpoint}. Retry after ${retryAfter} seconds.`);
    
    throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
  }
  
  // Handle authentication errors
  if (response.status === 401) {
    console.warn('Authentication required. Redirecting to login...');
    return null;
  }
  
  // Special handling for 404 on tasks endpoint - just return empty array
  if (response.status === 404 && endpoint.includes('/tasks')) {
    console.warn('Tasks endpoint returned 404. Returning empty array.');
    return [];
  }
  
  // Handle other errors
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.message || error.error || `Request failed with status ${response.status}`);
    } catch (e) {
      // If error response is not JSON
      if (e instanceof SyntaxError) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      throw e;
    }
  }
  
  // Parse JSON response and normalize MongoDB _id fields
  try {
    const data = await response.json();
    return normalizeIdFields(data);
  } catch (e) {
    // Handle empty response
    if (response.status === 204) {
      return null;
    }
    throw new Error('Failed to parse response JSON');
  }
};

/**
 * API client to interact with the backend
 */
export const apiClient = {
  // Task-related methods
  tasks: {
    list: async (params = {}) => {
      let url = `${BASE_URL}/tasks`;
      
      // If project ID is provided, list tasks for that project
      if (params.project_id) {
        url = `${BASE_URL}/tasks/project/${params.project_id}`;
      }
      
      // Add query params
      const queryParams = new URLSearchParams();
      if (params.org_id) queryParams.append('org_id', params.org_id);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        return [];
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        const data = await handleApiResponse(response, url);
        return data || [];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Return empty array on error for more graceful handling
        return [];
      }
    },
    
    getDetails: async (taskId) => {
      const url = `${BASE_URL}/tasks/${taskId}`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error fetching task details:', error);
        throw error;
      }
    },
    
    create: async (taskData) => {
      const url = `${BASE_URL}/tasks`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(taskData),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    },
    
    updateStatus: async (taskId, statusData) => {
      const url = `${BASE_URL}/tasks/${taskId}`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: statusData.status }),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error updating task status:', error);
        throw error;
      }
    },
    
    addComment: async (taskId, commentData) => {
      const url = `${BASE_URL}/tasks/${taskId}/comments`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(commentData),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
      }
    },
  },
  
  // Project-related methods
  projects: {
    list: async (params = {}) => {
      let url = `${BASE_URL}/projects`;
      
      // Add query params
      const queryParams = new URLSearchParams();
      if (params.org_id) queryParams.append('org_id', params.org_id);
      if (params.limit) queryParams.append('limit', params.limit);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        return [];
      }
      
      try {
        console.log('Fetching projects from:', url);
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        const data = await handleApiResponse(response, url);
        console.log('Projects data received:', data);
        return data || [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Return empty array on error for more graceful handling
        return [];
      }
    },
    
    getDetails: async (projectId) => {
      if (!projectId) {
        console.error('No project ID provided to getDetails');
        throw new Error('Project ID is required');
      }
      
      const url = `${BASE_URL}/projects/${projectId}`;
      console.log('Fetching project details from:', url);
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 404) {
          console.error(`Project with ID ${projectId} not found`);
          throw new Error('Project not found');
        }
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error fetching project details:', error);
        throw error;
      }
    },
    
    create: async (projectData) => {
      const url = `${BASE_URL}/projects`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(projectData),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error creating project:', error);
        throw error;
      }
    },
    
    update: async (projectId, projectData) => {
      if (!projectId) {
        console.error('No project ID provided to update');
        throw new Error('Project ID is required');
      }
      
      const url = `${BASE_URL}/projects/${projectId}`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(projectData),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error updating project:', error);
        throw error;
      }
    },
  },
  
  // GitHub-related methods
  github: {
    getAuthUrl: async () => {
      const url = `${BASE_URL}/auth/github/login`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url);
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error getting GitHub auth URL:', error);
        throw error;
      }
    },
    
    getOrganizations: async () => {
      const url = `${BASE_URL}/github/organizations`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        console.warn('GitHub organizations endpoint is rate limited, returning empty array');
        return []; // Return empty array when rate limited
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        const data = await handleApiResponse(response, url);
        return data || [];
      } catch (error) {
        console.error('Error fetching GitHub organizations:', error);
        return []; // Return empty array on error for graceful handling
      }
    },
    
    getRepositories: async (orgName) => {
      const url = `${BASE_URL}/github/repositories${orgName ? `?org=${orgName}` : ''}`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        console.warn('GitHub repositories endpoint is rate limited, returning empty array');
        return []; // Return empty array when rate limited
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        const data = await handleApiResponse(response, url);
        return data || [];
      } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        return [];
      }
    },
  },
  
  // API Key methods
  apiKeys: {
    list: async () => {
      const url = `${BASE_URL}/api-keys`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        return [];
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        const data = await handleApiResponse(response, url);
        return data || [];
      } catch (error) {
        console.error('Error fetching API keys:', error);
        return [];
      }
    },
    
    generate: async (name, expiryDays) => {
      const url = `${BASE_URL}/api-keys`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, expiryDays }),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error generating API key:', error);
        throw error;
      }
    },
    
    delete: async (keyId) => {
      const url = `${BASE_URL}/api-keys/${keyId}`;
      
      // Check if this endpoint is rate limited
      if (isRateLimited(url)) {
        throw new Error('This endpoint is currently rate limited. Please try again later.');
      }
      
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error deleting API key:', error);
        throw error;
      }
    },
  },
  
  // Auth methods
  auth: {
    login: async () => {
      // Clear any rate limiting before login
      clearRateLimitTracking();
      
      // For GitHub Pages deployment, we need to use the full URL
      if (window.location.hostname.includes('github.io')) {
        window.location.href = 'https://dev-flow-ai.vercel.app/auth/github/login';
      } else {
        // In local or direct Vercel deployment, we can use the relative URL
        window.location.href = `${BASE_URL}/auth/github/login`;
      }
    },
    
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
        
        return await handleApiResponse(response, url);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
    },
    
    logout: async () => {
      const token = getAuthToken();
      if (!token) {
        // Already logged out
        return true;
      }
      
      const url = `${BASE_URL}/auth/logout`;
      
      try {
        // Call logout endpoint if authenticated
        if (token) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: getAuthHeaders(),
            });
            
            await handleApiResponse(response, url);
          } catch (error) {
            // Ignore errors, still clear token locally
            console.warn('Error calling logout API:', error);
          }
        }
        
        // Clear any rate limiting on logout
        clearRateLimitTracking();
        
        // Always clear the token
        localStorage.removeItem('jwtToken');
        return true;
      } catch (error) {
        console.error('Error logging out:', error);
        // Still remove the token
        localStorage.removeItem('jwtToken');
        return true;
      }
    },
    
    // Method to clear rate limiting tracking
    clearRateLimits: clearRateLimitTracking
  }
};

// Add a method to the window object to allow clearing rate limits from the console
window.clearRateLimits = clearRateLimitTracking;

// For backward compatibility with the supabase format
export const backwardCompatClient = {
  functions: {
    invoke: async (functionName, options = {}) => {
      console.log(`[apiClient] Invoking function "${functionName}" with options:`, options);
      
      // Map supabase function names to our API endpoints
      const functionMap = {
        'list-tasks': async () => {
          if (options.method === 'GET') {
            const tasks = await apiClient.tasks.list(options.query || {});
            return { data: tasks }; 
          }
        },
        'get-task-details': async () => {
          if (options.body && options.body.taskId) {
            return { data: await apiClient.tasks.getDetails(options.body.taskId) };
          }
        },
        'create-task': async () => {
          return { data: await apiClient.tasks.create(options.body) };
        },
        'update-task-status': async () => {
          if (options.body && options.body.task_id) {
            return { data: await apiClient.tasks.updateStatus(options.body.task_id, options.body) };
          }
        },
        'add-comment-to-task': async () => {
          if (options.body && options.body.task_id) {
            return { data: await apiClient.tasks.addComment(options.body.task_id, options.body) };
          }
        },
        'list-projects': async () => {
          if (options.method === 'POST') {
            const projects = await apiClient.projects.list(options.body || {});
            return { data: projects };
          }
        },
        'get-project-details': async () => {
          if (options.body && options.body.project_id) {
            return { data: await apiClient.projects.getDetails(options.body.project_id) };
          }
        },
        'create-project': async () => {
          return { data: await apiClient.projects.create(options.body) };
        },
        'update-project': async () => {
          if (options.body && options.body.project_id) {
            return { data: await apiClient.projects.update(options.body.project_id, options.body) };
          }
        },
        'github-auth': async () => {
          return { data: { url: await apiClient.github.getAuthUrl() } };
        },
        'list-api-keys': async () => {
          return { data: await apiClient.apiKeys.list() };
        },
        'generate-api-key': async () => {
          return { data: await apiClient.apiKeys.generate(options.body.name, options.body.expiryDays) };
        },
        'delete-api-key': async () => {
          if (options.body && options.body.keyId) {
            return { data: await apiClient.apiKeys.delete(options.body.keyId) };
          }
        },
      };
      
      try {
        if (functionMap[functionName]) {
          return await functionMap[functionName]();
        } else {
          console.warn(`Function "${functionName}" not implemented in apiClient`);
          throw new Error(`Function "${functionName}" not implemented in apiClient`);
        }
      } catch (error) {
        console.error(`Error invoking "${functionName}":`, error);
        return { error };
      }
    }
  }
};

// Export a unified client for backward compatibility with the supabase format
export const supabase = backwardCompatClient;