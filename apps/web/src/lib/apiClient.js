// apiClient.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return []; // Return empty array instead of throwing
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch tasks');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return []; // Return empty array on error for more graceful handling
      }
    },
    
    getDetails: async (taskId) => {
      try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return null;
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch task details');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching task details:', error);
        throw error;
      }
    },
    
    create: async (taskData) => {
      try {
        const response = await fetch(`${BASE_URL}/tasks`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(taskData),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create task');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    },
    
    updateStatus: async (taskId, statusData) => {
      try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: statusData.status }),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update task status');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating task status:', error);
        throw error;
      }
    },
    
    addComment: async (taskId, commentData) => {
      try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}/comments`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(commentData),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to add comment');
        }
        
        return await response.json();
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
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return []; // Return empty array instead of throwing
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch projects');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching projects:', error);
        return []; // Return empty array on error for more graceful handling
      }
    },
    
    getDetails: async (projectId) => {
      try {
        const response = await fetch(`${BASE_URL}/projects/${projectId}`, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return null;
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch project details');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching project details:', error);
        throw error;
      }
    },
    
    create: async (projectData) => {
      try {
        const response = await fetch(`${BASE_URL}/projects`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(projectData),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create project');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating project:', error);
        throw error;
      }
    },
    
    update: async (projectId, projectData) => {
      try {
        const response = await fetch(`${BASE_URL}/projects/${projectId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(projectData),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update project');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating project:', error);
        throw error;
      }
    },
  },
  
  // GitHub-related methods
  github: {
    getAuthUrl: async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/github/login`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to get GitHub auth URL');
        }
        
        const data = await response.json();
        return data.url;
      } catch (error) {
        console.error('Error getting GitHub auth URL:', error);
        throw error;
      }
    },
    
    getOrganizations: async () => {
      try {
        const response = await fetch(`${BASE_URL}/github/organizations`, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return []; // Return empty array for graceful handling
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch GitHub organizations');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching GitHub organizations:', error);
        return []; // Return empty array on error for graceful handling
      }
    },
    
    getRepositories: async (orgName) => {
      try {
        const response = await fetch(`${BASE_URL}/github/repositories${orgName ? `?org=${orgName}` : ''}`, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return []; // Return empty array for graceful handling
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch GitHub repositories');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        return [];
      }
    },
  },
  
  // API Key methods
  apiKeys: {
    list: async () => {
      try {
        const response = await fetch(`${BASE_URL}/api-keys`, {
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          return []; // Return empty array for graceful handling
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch API keys');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching API keys:', error);
        return [];
      }
    },
    
    generate: async (name, expiryDays) => {
      try {
        const response = await fetch(`${BASE_URL}/api-keys`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, expiryDays }),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to generate API key');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error generating API key:', error);
        throw error;
      }
    },
    
    delete: async (keyId) => {
      try {
        const response = await fetch(`${BASE_URL}/api-keys/${keyId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401) {
          console.warn('Authentication required. Redirecting to login...');
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete API key');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error deleting API key:', error);
        throw error;
      }
    },
  },
  
  // Auth methods
  auth: {
    login: async () => {
      // Redirect to GitHub login
      window.location.href = `${BASE_URL}/auth/github/login`;
    },
    
    getProfile: async () => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      try {
        const response = await fetch(`${BASE_URL}/auth/profile`, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          // Clear token if invalid
          if (response.status === 401) {
            localStorage.removeItem('jwtToken');
          }
          
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch user profile');
        }
        
        return await response.json();
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
      
      try {
        // Call logout endpoint if authenticated
        if (token) {
          try {
            await fetch(`${BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: getAuthHeaders(),
            });
          } catch (error) {
            // Ignore errors, still clear token locally
            console.warn('Error calling logout API:', error);
          }
        }
        
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
  },
};

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