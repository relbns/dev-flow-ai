// src/hooks/project/useProjectData.js
import { useState, useCallback, useEffect } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { apiClient } from '@/lib/apiClient';

export const useProjectData = (projectId, navigate, toast) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectTasks, setProjectTasks] = useState({
    notStarted: [],
    inProgress: [],
    completed: [],
  });

  // Helper to normalize ObjectId - MongoDB uses _id, frontend might expect id
  const normalizeId = (data) => {
    if (!data) return null;
    
    // If it's an array, map through each item
    if (Array.isArray(data)) {
      return data.map(item => normalizeId(item));
    }
    
    // If it's an object, process it
    if (typeof data === 'object') {
      const result = { ...data };
      
      // If the object has _id but no id, add id
      if (result._id && !result.id) {
        result.id = result._id;
      }
      
      // Process nested objects
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = normalizeId(result[key]);
        }
      });
      
      return result;
    }
    
    return data;
  };

  // Fetch tasks for project
  const fetchTasksForProject = useCallback(
    async (currentProjectId) => {
      if (!currentProjectId) {
        console.warn('Cannot fetch tasks: Project ID is missing or invalid');
        return;
      }
      
      try {
        // Use apiClient to fetch tasks
        const tasksData = await apiClient.tasks.list({ project_id: currentProjectId });

        if (!tasksData || !Array.isArray(tasksData)) {
          console.warn('No valid tasks data returned');
          return;
        }

        // Normalize IDs in tasks data
        const normalizedTasksData = normalizeId(tasksData);

        const newProjectTasksData = {
          notStarted: normalizedTasksData.filter(
            (task) => task.status === 'Backlog' || task.status === 'To Do'
          ),
          inProgress: normalizedTasksData.filter((task) => task.status === 'In Progress'),
          completed: normalizedTasksData.filter(
            (task) => task.status === 'Done' || task.status === 'In Review'
          ),
        };

        // Add additional props to each task for display
        Object.keys(newProjectTasksData).forEach((statusKey) => {
          newProjectTasksData[statusKey] = newProjectTasksData[statusKey].map(
            (task) => ({
              ...task,
              assignee: { name: 'Unassigned', avatar: '' },
              comments: 0,
              priority: 'medium',
              dueDate: task.updated_at || task.updatedAt
                ? formatDistanceToNow(parseISO(task.updated_at || task.updatedAt), {
                    addSuffix: true,
                  })
                : 'N/A',
            })
          );
        });
        
        setProjectTasks(newProjectTasksData);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        toast({
          title: 'Error Fetching Tasks',
          description: err.message,
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Fetch project details
  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) {
      setError('Project ID is missing or invalid.');
      setLoading(false);
      // Redirect to projects list if projectId is undefined
      navigate('/projects');
      toast({
        title: 'Invalid Project',
        description: 'The requested project could not be found. Redirecting to projects list.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use apiClient to get project details
      const projectDetailsData = await apiClient.projects.getDetails(projectId);
      console.log('Project details from API:', projectDetailsData);

      if (!projectDetailsData) {
        throw new Error('Project not found or returned empty data.');
      }

      // Normalize the project data to have both _id and id fields
      const normalizedProject = normalizeId(projectDetailsData);
      console.log('Normalized project data:', normalizedProject);

      setProject({
        ...normalizedProject,
        subtitle:
          normalizedProject.description?.substring(0, 50) + '...' || '',
        links: normalizedProject.links || [],
        members: normalizedProject.members || [
          {
            id: 'temp-lead',
            name: 'Loading Lead...',
            role: 'Project Lead',
            avatar: '',
          },
        ],
        stakeholders: normalizedProject.stakeholders || [],
        status: normalizedProject.status || 'active',
      });
      
      // Only fetch tasks if we have a valid project
      const projectIdToUse = normalizedProject.id || normalizedProject._id;
      if (projectIdToUse) {
        fetchTasksForProject(projectIdToUse);
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err.message || 'Failed to fetch project details.');
      toast({
        title: 'Error Loading Project',
        description: err.message,
        variant: 'destructive',
      });
      
      // If the project doesn't exist, redirect to the projects list
      if (err.message.includes('not found') || err.status === 404) {
        navigate('/projects');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, fetchTasksForProject, navigate]);

  // Delete project
  const handleDeleteProject = async () => {
    if (!project) {
      toast({
        title: 'Error',
        description: 'Project context is missing or invalid.',
        variant: 'destructive',
      });
      return;
    }
    
    // Use either id or _id
    const projectIdToUse = project.id || project._id;
    
    if (!projectIdToUse) {
      toast({
        title: 'Error',
        description: 'Project ID is missing.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Use apiClient to update project status to 'deleted'
      await apiClient.projects.update(projectIdToUse, { status: 'deleted' });

      toast({
        title: 'Project Deleted',
        description: `Project "${project.name}" and all its data have been deleted.`,
      });
      navigate('/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast({
        title: 'Error Deleting Project',
        description: err.message || 'Could not delete the project.',
        variant: 'destructive',
      });
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  return {
    project,
    loading,
    error,
    projectTasks,
    setProjectTasks,
    fetchProjectDetails,
    fetchTasksForProject,
    handleDeleteProject,
  };
};