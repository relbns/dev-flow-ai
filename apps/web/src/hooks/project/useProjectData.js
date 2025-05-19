// src/hooks/project/useProjectData.js
import { useState, useCallback, useEffect } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

export const useProjectData = (projectId, navigate, toast) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectTasks, setProjectTasks] = useState({
    notStarted: [],
    inProgress: [],
    completed: [],
  });

  // Fetch tasks for project
  const fetchTasksForProject = useCallback(
    async (currentProjectId) => {
      if (!currentProjectId) return;
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', currentProjectId)
          .order('created_at', { ascending: true });

        if (tasksError) throw tasksError;

        const newProjectTasksData = {
          notStarted: tasksData.filter(
            (task) => task.status === 'Backlog' || task.status === 'To Do'
          ),
          inProgress: tasksData.filter((task) => task.status === 'In Progress'),
          completed: tasksData.filter(
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
              dueDate: task.updated_at
                ? formatDistanceToNow(parseISO(task.updated_at), {
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
      setError('Project ID is missing.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: projectDetailsData, error: projectError } = await supabase
        .from('projects')
        .select(
          '*, project_guidelines (id, guideline_text, "order"), scoped_paths (id, name, path_in_repo, notes)'
        )
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      if (projectDetailsData) {
        setProject({
          ...projectDetailsData,
          subtitle:
            projectDetailsData.description?.substring(0, 50) + '...' || '',
          links: projectDetailsData.links || [],
          members: projectDetailsData.members || [
            {
              id: 'temp-lead',
              name: 'Loading Lead...',
              role: 'Project Lead',
              avatar: '',
            },
          ],
          stakeholders: projectDetailsData.stakeholders || [],
          status: projectDetailsData.status || 'active',
        });
        fetchTasksForProject(projectDetailsData.id);
      } else {
        setError('Project not found.');
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err.message || 'Failed to fetch project details.');
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, fetchTasksForProject]);

  // Delete project
  const handleDeleteProject = async () => {
    if (!project || !project.id) {
      toast({
        title: 'Error',
        description: 'Project context is missing.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('delete-project', {
        method: 'POST',
        body: { project_id: project.id },
      });

      if (error) throw error;

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