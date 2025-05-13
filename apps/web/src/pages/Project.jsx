import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react'; // Added useMemo
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import TaskCard from '@/components/TaskCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Added SelectGroup, SelectLabel
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'; // For searchable selects
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'; // For searchable selects
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Plus,
  Folder,
  Github,
  Users,
  Calendar,
  Activity,
  Figma,
  Link as LinkIcon,
  FileText,
  GripVertical,
  Trash2,
  UserPlus,
  ChevronDown,
  Copy,
  Pencil,
  MoreVertical,
  Briefcase,
  Trash,
  FileDown,
  ChevronsUpDown, // Added for searchable select
  Check, // Added for searchable select
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Removed duplicate Popover import, already imported from "@/components/ui/popover"
// import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

const Project = () => {
  const { id: projectIdFromParams } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('board');
  const [openNewTask, setOpenNewTask] = useState(false);
  const [openStakeholder, setOpenStakeholder] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openProjectEdit, setOpenProjectEdit] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]); // State for leaders dropdown
  const [loadingLeaders, setLoadingLeaders] = useState(false); // Loading state for leaders
  const [leaderSearchTerm, setLeaderSearchTerm] = useState(''); // For searchable leader select
  const [leaderSelectOpen, setLeaderSelectOpen] = useState(false); // For searchable leader select popover

  // States for GitHub repos in edit form
  const [githubOrgRepos, setGithubOrgRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchTerm, setRepoSearchTerm] = useState('');
  const [repoSelectOpen, setRepoSelectOpen] = useState(false);

  const initialTaskFormState = {
    title: '',
    description: '',
    status: 'Backlog',
    scoped_path_id: '',
  };
  const [newTaskForm, setNewTaskForm] = useState(initialTaskFormState);

  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [linkForm, setLinkForm] = useState({ title: '', url: '', id: '' });
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [isEditingStakeholder, setIsEditingStakeholder] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    role: 'Developer',
    avatar: '',
    id: '',
  });
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [projectForm, setProjectForm] = useState({}); // Holds data for the edit form
  const [initialProjectForm, setInitialProjectForm] = useState({}); // Store initial state for comparison
  const [openDeleteProject, setOpenDeleteProject] = useState(false);

  // Fetch GitHub repos for the project's organization
  const fetchOrgRepos = useCallback(
    async (orgName) => {
      if (!orgName || orgName === 'Personal') {
        setGithubOrgRepos([]);
        setLoadingRepos(false); // Ensure loading is set to false
        return;
      }
      setLoadingRepos(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('User not authenticated or access token missing.');
        }

        const functionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-org-projects?orgName=${encodeURIComponent(
          orgName
        )}`;

        const response = await fetch(functionUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({
              error: `Failed to fetch repos: ${response.statusText}`,
            }));
          throw new Error(
            errorData.error || `Failed to fetch repos: ${response.statusText}`
          );
        }

        const data = await response.json();
        setGithubOrgRepos(data || []);
      } catch (error) {
        console.error(
          'Error fetching GitHub org repos for project edit:',
          error
        );
        toast({
          title: 'Error Fetching Org Repos',
          description: error.message,
          variant: 'destructive',
        });
        setGithubOrgRepos([]);
      } finally {
        setLoadingRepos(false);
      }
    },
    [toast]
  ); // supabase is stable, toast is the main dependency here

  const [projectTasks, setProjectTasks] = useState({
    notStarted: [],
    inProgress: [],
    completed: [],
  });

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

  const fetchProjectDetails = useCallback(async () => {
    if (!projectIdFromParams) {
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
        .eq('id', projectIdFromParams)
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
  }, [projectIdFromParams, toast, fetchTasksForProject]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const [searchParams, setSearchParams] = useSearchParams(); // Initialize useSearchParams

  useEffect(() => {
    if (searchParams.get('action') === 'edit' && project) {
      // Ensure project is loaded before trying to open edit
      setOpenProjectEdit(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, project, projectIdFromParams, navigate]);

  // First, define fetchUsers before any useEffect hooks that use it
  const fetchUsers = useCallback(
    async (projectOrg, repoFullName = null) => {
      setLoadingLeaders(true);
      setAvailableLeaders([]);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const localCurrentUserId = session?.user?.id;

      try {
        let combinedGithubLogins = new Set();

        if (projectOrg && projectOrg !== 'Personal') {
          // Fetch GitHub org members
          const { data: orgMembers, error: orgMembersError } =
            await supabase.functions.invoke('list-github-org-members', {
              method: 'POST',
              body: { orgName: projectOrg },
            });

          if (orgMembersError) {
            console.error(
              `Error fetching GitHub org members for ${projectOrg}:`,
              orgMembersError
            );
            toast({
              title: 'Error Fetching Org Members',
              description: orgMembersError.message,
              variant: 'destructive',
            });
            // Don't return yet, try to fetch collaborators if repoFullName is provided, or fallback to current user
          } else {
            const orgMemberLogins =
              orgMembers
                ?.map((member) => member.login)
                .filter((login) => login) || [];
            orgMemberLogins.forEach((login) => combinedGithubLogins.add(login));
          }
        }

        // If a repo is specified, also get its collaborators
        if (repoFullName) {
          try {
            // Ensure access_token is available for this call too
            if (!session?.access_token) {
              throw new Error(
                'User not authenticated or access token missing for repo collaborators fetch.'
              );
            }
            const collaboratorsFunctionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-repo-collaborators?repoFullName=${encodeURIComponent(
              repoFullName
            )}`;
            const collaboratorsResponse = await fetch(
              collaboratorsFunctionUrl,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (collaboratorsResponse.ok) {
              const collaborators = await collaboratorsResponse.json();
              const collaboratorLogins =
                collaborators
                  ?.map((collab) => collab.login)
                  .filter((login) => login) || [];
              collaboratorLogins.forEach((login) =>
                combinedGithubLogins.add(login)
              );
            } else {
              const errorData = await collaboratorsResponse
                .json()
                .catch(() => ({
                  error: `Failed to fetch repo collaborators: ${collaboratorsResponse.statusText}`,
                }));
              console.warn(
                `Could not fetch collaborators for ${repoFullName}: ${
                  errorData.error || collaboratorsResponse.statusText
                }`
              );
              toast({
                title: 'Warning',
                description: `Could not fetch collaborators for ${repoFullName}. Users list might be incomplete.`,
                variant: 'default',
              });
            }
          } catch (collabError) {
            console.warn(
              `Error fetching collaborators for ${repoFullName}:`,
              collabError
            );
            toast({
              title: 'Error Fetching Collaborators',
              description: collabError.message,
              variant: 'destructive',
            });
          }
        }

        const finalGithubLogins = Array.from(combinedGithubLogins);

        if (finalGithubLogins.length > 0) {
          const { data: supabaseUsers, error: mapError } =
            await supabase.functions.invoke(
              'get-supabase-users-by-github-logins',
              { method: 'POST', body: { github_logins: finalGithubLogins } }
            );

          if (mapError) {
            console.error(
              'Error mapping GitHub logins to Supabase users:',
              mapError
            );
            toast({
              title: 'Error Mapping Users',
              description: mapError.message,
              variant: 'destructive',
            });
            if (localCurrentUserId) {
              const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('id, full_name, username')
                .eq('id', localCurrentUserId)
                .single();
              setAvailableLeaders([
                {
                  id: localCurrentUserId,
                  display_name:
                    currentUserProfile?.full_name ||
                    currentUserProfile?.username ||
                    session?.user?.email ||
                    'Current User',
                },
              ]);
            }
          } else {
            setAvailableLeaders(supabaseUsers || []);
            if (
              (!supabaseUsers || supabaseUsers.length === 0) &&
              localCurrentUserId &&
              finalGithubLogins.length === 0
            ) {
              // Only if no logins were found at all
              console.warn(
                'No Supabase users found for combined logins. Setting current user as default leader.'
              );
              const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('id, full_name, username')
                .eq('id', localCurrentUserId)
                .single();
              setAvailableLeaders([
                {
                  id: localCurrentUserId,
                  display_name:
                    currentUserProfile?.full_name ||
                    currentUserProfile?.username ||
                    session?.user?.email ||
                    'Current User',
                },
              ]);
            }
          }
        } else {
          // No GitHub members or collaborators found from org or repo
          console.warn(
            'No GitHub logins found from org members or collaborators. Setting current user as default leader.'
          );
          if (localCurrentUserId) {
            const { data: currentUserProfile } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .eq('id', localCurrentUserId)
              .single();
            setAvailableLeaders([
              {
                id: localCurrentUserId,
                display_name:
                  currentUserProfile?.full_name ||
                  currentUserProfile?.username ||
                  session?.user?.email ||
                  'Current User',
              },
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching users for project edit:', error);
        toast({
          title: 'Error Fetching Users',
          description: error.message,
          variant: 'destructive',
        });
        if (localCurrentUserId) {
          // Fallback to current user on any error
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .eq('id', localCurrentUserId)
            .single();
          setAvailableLeaders([
            {
              id: localCurrentUserId,
              display_name:
                currentUserProfile?.full_name ||
                currentUserProfile?.username ||
                session?.user?.email ||
                'Current User',
            },
          ]);
        }
      } finally {
        setLoadingLeaders(false);
      }
    },
    [toast]
  ); // Removed project from dependencies

  useEffect(() => {
    if (openProjectEdit && project) {
      const formData = {
        name: project.name || '',
        description: project.description || '',
        repository: project.github_repo_url || '', // This is github_repo_url from DB
        org: project.org || 'Personal',
        project_leader: project.project_leader || '',
        status: project.status || 'active',
        // Keep other form fields like subtitle, designUrl, client, dueDate if they are part of projectForm's structure
        // but they are not directly from the `project` object's main fields.
        // For example, if `projectForm` is expected to have `subtitle` from a different source or as a derived value:
        subtitle: project.subtitle || '', // Assuming subtitle is part of projectForm and might be edited
        designUrl: projectForm.designUrl || '', // Retain if it's part of the form, not from `project` DB direct field
        client: projectForm.client || '',
        dueDate: projectForm.dueDate || '',
      };
      setProjectForm(formData);
      setInitialProjectForm(formData);
      fetchUsers();
      if (project.org && project.org !== 'Personal') {
        fetchOrgRepos(project.org);
      } else {
        setGithubOrgRepos([]);
        setLoadingRepos(false);
      }
    }
  }, [openProjectEdit, project, fetchUsers, fetchOrgRepos]);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceColumnKey = source.droppableId;
    const destColumnKey = destination.droppableId;

    let newStatus =
      projectTasks[destColumnKey][0]?.status ||
      (destColumnKey === 'notStarted'
        ? 'To Do'
        : destColumnKey === 'inProgress'
        ? 'In Progress'
        : destColumnKey === 'completed'
        ? 'Done'
        : 'Backlog');

    const taskToMove = projectTasks[sourceColumnKey].find(
      (t) => t.id === draggableId
    );
    if (!taskToMove) return;

    const newSourceTasks = projectTasks[sourceColumnKey].filter(
      (t) => t.id !== draggableId
    );
    const newDestTasks = [...projectTasks[destColumnKey]];
    newDestTasks.splice(destination.index, 0, {
      ...taskToMove,
      status: newStatus,
    });

    setProjectTasks((prev) => ({
      ...prev,
      [sourceColumnKey]: newSourceTasks,
      [destColumnKey]: newDestTasks,
    }));

    supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', draggableId)
      .then(({ error: updateError }) => {
        if (updateError) {
          toast({
            title: 'Error updating task status',
            description: updateError.message,
            variant: 'destructive',
          });
          setProjectTasks((prev) => {
            const revertedSourceTasks = [...prev[sourceColumnKey]];
            if (sourceColumnKey === destColumnKey) {
              revertedSourceTasks.splice(destination.index, 1);
              revertedSourceTasks.splice(source.index, 0, taskToMove);
            } else {
              revertedSourceTasks.splice(source.index, 0, taskToMove);
              const revertedDestTasks = prev[destColumnKey].filter(
                (t) => t.id !== draggableId
              );
              return {
                ...prev,
                [sourceColumnKey]: revertedSourceTasks,
                [destColumnKey]: revertedDestTasks,
              };
            }
            return { ...prev, [sourceColumnKey]: revertedSourceTasks };
          });
        } else {
          toast({
            title: 'Task Status Updated',
            description: `"${taskToMove.title}" moved to ${newStatus}`,
          });
        }
      });
  };

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleNewTask = async (e) => {
    e.preventDefault();
    if (!project || !project.id) {
      toast({
        title: 'Error',
        description: 'Project context is missing.',
        variant: 'destructive',
      });
      return;
    }
    if (!newTaskForm.title.trim()) {
      toast({
        title: 'Error',
        description: 'Task title is required.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const taskToInsert = {
        project_id: project.id,
        title: newTaskForm.title,
        description: newTaskForm.description || null,
        status: newTaskForm.status,
        scoped_path_id:
          newTaskForm.scoped_path_id === 'none-selected-value' ||
          newTaskForm.scoped_path_id === ''
            ? null
            : newTaskForm.scoped_path_id,
      };
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select()
        .single();
      if (error) throw error;
      toast({
        title: 'Task Created',
        description: `Task "${data.title}" created.`,
      });
      setOpenNewTask(false);
      setNewTaskForm(initialTaskFormState);
      fetchTasksForProject(project.id);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error Creating Task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddStakeholder = (e) => {
    e.preventDefault();
    toast({ title: 'Not Implemented' });
  };
  const handleRemoveStakeholder = (id) => {
    toast({ title: 'Not Implemented' });
  };
  const handleEditStakeholder = (stakeholder) => {
    toast({ title: 'Not Implemented' });
  };
  const handleAddLink = (e) => {
    e.preventDefault();
    toast({ title: 'Not Implemented' });
  };
  const handleRemoveLink = (id) => {
    toast({ title: 'Not Implemented' });
  };
  const handleEditLink = (link) => {
    toast({ title: 'Not Implemented' });
  };
  const copyToClipboard = (text, msg) => {
    navigator.clipboard.writeText(text);
    toast({ title: msg || 'Copied!' });
  };
  const handleEditMember = (member) => {
    toast({ title: 'Not Implemented' });
  };
  const handleRemoveMember = (id) => {
    toast({ title: 'Not Implemented' });
  };
  const handleAddMember = (e) => {
    e.preventDefault();
    toast({ title: 'Not Implemented' });
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    if (!project || !project.id) {
      toast({
        title: 'Error',
        description: 'Project context is missing.',
        variant: 'destructive',
      });
      return;
    }

    const payload = { projectId: project.id };
    let hasChanges = false;

    if (projectForm.name !== initialProjectForm.name) {
      payload.projectName = projectForm.name;
      hasChanges = true;
    }
    if (projectForm.description !== initialProjectForm.description) {
      payload.description = projectForm.description;
      hasChanges = true;
    }
    if (projectForm.repository !== initialProjectForm.repository) {
      payload.githubRepoURL = projectForm.repository;
      hasChanges = true;
    }
    if (projectForm.project_leader !== initialProjectForm.project_leader) {
      payload.project_leader = projectForm.project_leader;
      hasChanges = true;
    }
    // Org is not directly editable in this form, but it's part of the project's context.
    // If it were to be sent, it should be `project.org` or `projectForm.org` (if it was part of the form state)
    // For now, `update-project` function expects `org` if it's part of the update.
    // Let's assume `org` is fixed for an existing project for now, unless explicitly made editable.
    // If `org` needs to be sent regardless of change, add: payload.org = projectForm.org || project.org;
    // However, the requirement is to send only changed fields. `org` is not changed via this form.

    if (!hasChanges) {
      toast({
        title: 'No Changes',
        description: 'No changes were detected to save.',
      });
      setOpenProjectEdit(false);
      return;
    }

    console.log('Submitting project update payload:', payload);

    try {
      setLoading(true);
      const { data: updatedProject, error } = await supabase.functions.invoke(
        'update-project',
        {
          method: 'PATCH',
          body: payload,
        }
      );

      if (error) throw error;

      console.log('Project updated successfully:', updatedProject);
      toast({
        title: 'Project Updated',
        description: `Project "${updatedProject.name}" has been updated.`,
      });
      setOpenProjectEdit(false);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error Updating Project',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
      setOpenDeleteProject(false);
      navigate('/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast({
        title: 'Error Deleting Project',
        description: err.message || 'Could not delete the project.',
        variant: 'destructive',
      });
      setOpenDeleteProject(false);
    }
  };

  const getProjectLeader = () =>
    project?.members?.find((m) => m.role === 'Project Lead') ||
    project?.members?.[0] || { name: 'N/A', avatar: '' };
  const getOtherMembers = () =>
    project?.members?.filter((m) => m.role !== 'Project Lead') || [];
  const getStatusVariant = (status) => 'outline';
  const exportProjectPlan = () => toast({ title: 'Export Not Implemented' });

  if (loading && !project) {
    // Show skeleton only on initial load when project is null
    return (
      <div className="p-6 space-y-6">
        {/* Project Info Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-start">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-5 w-16" /> {/* Badge */}
                  <Skeleton className="h-7 w-7 rounded-md" />{' '}
                  {/* Edit button */}
                </div>
                <Skeleton className="h-5 w-3/4" /> {/* Subtitle */}
                <div className="flex items-center mt-2">
                  <Skeleton className="h-6 w-6 rounded-full mr-2" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-10 ml-2" /> {/* +N members */}
                </div>
              </div>
              <Skeleton className="h-9 w-20" /> {/* Popover button */}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Skeleton className="h-5 w-48" /> {/* GitHub link */}
            </div>
            <Skeleton className="h-24 w-full mt-4" />{' '}
            {/* Description placeholder */}
            <Skeleton className="h-20 w-full mt-4" />{' '}
            {/* Guidelines placeholder */}
            <Skeleton className="h-16 w-full mt-4" />{' '}
            {/* Scoped Paths placeholder */}
          </div>
          <div className="bg-card rounded-lg p-4 border space-y-3">
            <Skeleton className="h-5 w-1/3 mb-3" />{' '}
            {/* Recent Activity Title */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-3/4 ml-8" />
                <Skeleton className="h-3 w-1/4 ml-8" />
              </div>
            ))}
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-9 w-40" /> {/* Export button */}
        </div>

        {/* Kanban Board Skeleton */}
        <div className="kanban-board grid grid-cols-1 md:grid-cols-3 gap-6">
          {['notStarted', 'inProgress', 'completed'].map((columnId) => (
            <div
              key={columnId}
              className="kanban-column bg-card p-4 rounded-lg border space-y-3"
            >
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-8" />
              </div>
              {[1, 2].map((i) => (
                <div
                  key={`col-${columnId}-task-${i}`}
                  className="p-3 border rounded-md space-y-2 bg-background"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between mt-1">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg p-4 border space-y-3">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t flex justify-center">
          <Skeleton className="h-9 w-32" /> {/* Delete button */}
        </div>
      </div>
    );
  }

  if (error)
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!project && !loading)
    return <div className="p-6 text-center">Project not found.</div>; // Show "not found" only if not loading

  return (
    <div className="p-6">
      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-stretch">
        <div className="md:col-span-2 flex flex-col">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary" />
                    {project?.name || <Skeleton className="h-7 w-32" />}
                  </h2>
                  {project?.status && (
                    <Badge
                      variant={getStatusVariant(project.status)}
                      className="capitalize text-xs px-2 py-0.5"
                    >
                      {project.status}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setOpenProjectEdit(true)}
                    disabled={!project}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2">
                  {project?.subtitle || project?.description || (
                    <Skeleton className="h-5 w-48" />
                  )}
                </p>
                {project?.members && project.members.length > 0 && (
                  <div className="flex items-center mt-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage
                        src={getProjectLeader()?.avatar}
                        alt={getProjectLeader()?.name}
                      />
                      <AvatarFallback className="text-xs">
                        {getProjectLeader()
                          ?.name?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'N/A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {getProjectLeader()?.name || 'N/A'}
                    </span>
                    {getOtherMembers().length > 0 && (
                      <div className="flex items-center ml-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        <span>+{getOtherMembers().length}</span>
                      </div>
                    )}
                  </div>
                )}
                {(!project?.members || project.members.length === 0) &&
                  !loading && (
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1.5" /> No members assigned.
                    </div>
                  )}
              </div>
              <div className="flex">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button disabled={!project}>
                      <Plus className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="end">
                    <div className="grid gap-2">
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => setOpenNewTask(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> New Task
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => setOpenLink(true)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" /> New Link
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => setOpenStakeholder(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" /> New Stakeholder
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          setMemberForm({
                            name: '',
                            role: 'Developer',
                            avatar: '',
                          });
                          setIsEditingMember(false);
                          setOpenMemberDialog(true);
                        }}
                      >
                        <Users className="h-4 w-4 mr-2" /> Add Team Member
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-3">
              {project?.github_repo_url && (
                <div className="flex items-center gap-2 text-muted-foreground group">
                  <Github className="h-4 w-4" />
                  <a
                    href={project.github_repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors truncate max-w-[200px] md:max-w-none"
                  >
                    {project.github_repo_url.replace('https://github.com/', '')}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() =>
                      copyToClipboard(
                        project.github_repo_url,
                        'Repository URL copied to clipboard'
                      )
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {!project?.github_repo_url && !loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Github className="h-4 w-4" />
                  <span>No repository linked.</span>
                </div>
              )}
            </div>
          </div>
          {project?.description && (
            <div className="mt-4 flex-grow flex flex-col min-h-0">
              <h3 className="font-medium mb-2">Project Description</h3>
              <div className="bg-card border rounded-lg p-3 flex-grow overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            </div>
          )}
          {project?.project_guidelines &&
            project.project_guidelines.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Project Guidelines</h3>
                <div className="bg-card border rounded-lg p-3 prose prose-sm dark:prose-invert max-w-none">
                  {project.project_guidelines
                    .sort((a, b) => a.order - b.order)
                    .map((g) => (
                      <p
                        key={g.id}
                        className="text-muted-foreground whitespace-pre-wrap"
                      >
                        {g.guideline_text}
                      </p>
                    ))}
                </div>
              </div>
            )}
          {project?.scoped_paths && project.scoped_paths.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Scoped Paths / Components</h3>
              <div className="space-y-2">
                {project.scoped_paths.map((sp) => (
                  <div key={sp.id} className="bg-card border rounded-lg p-3">
                    {sp.name && (
                      <p className="text-sm font-semibold">{sp.name}</p>
                    )}
                    {sp.path_in_repo && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Path:</span>{' '}
                        {sp.path_in_repo}
                      </p>
                    )}
                    {sp.notes && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {sp.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-card rounded-lg p-4 border flex flex-col">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </h3>
          {loading && !project ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {i % 3 === 0 ? 'JS' : i % 2 === 0 ? 'JC' : 'AJ'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">
                      {i % 3 === 0
                        ? 'John Smith'
                        : i % 2 === 0
                        ? 'Jane Cooper'
                        : 'Alex Johnson'}
                    </span>
                  </div>
                  <p className="text-muted-foreground ml-8 mt-1 truncate">
                    {i % 3 === 0
                      ? 'Updated task status'
                      : i % 2 === 0
                      ? 'Added a comment'
                      : 'Created a new task'}
                  </p>
                  <p className="text-xs text-muted-foreground ml-8 mt-1">
                    {i === 1 ? '15m' : i === 2 ? '2h' : '1d'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Tabs
        defaultValue="board"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-4"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={exportProjectPlan}
            className="flex items-center gap-2"
            disabled={!project}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Export Project Plan</span>
          </Button>
        </div>
        <TabsContent value="board" className="mt-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board grid grid-cols-1 md:grid-cols-3 gap-6">
              {['notStarted', 'inProgress', 'completed'].map((columnId) => (
                <Droppable droppableId={columnId} key={columnId}>
                  {(provided, snapshot) => (
                    <div
                      className={cn(
                        'kanban-column bg-card p-4 rounded-lg border transition-colors',
                        snapshot.isDraggingOver &&
                          'bg-secondary/20 border-primary/50'
                      )}
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      <h3 className="font-medium text-sm text-muted-foreground mb-4 flex items-center justify-between">
                        <span>
                          {columnId === 'notStarted'
                            ? 'NOT STARTED'
                            : columnId === 'inProgress'
                            ? 'IN PROGRESS'
                            : 'COMPLETED'}
                        </span>
                        <span className="bg-secondary px-2 py-0.5 rounded-md">
                          {projectTasks[columnId].length}
                        </span>
                      </h3>
                      {projectTasks[columnId].map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(providedDraggable, snapshotDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              className={cn(
                                'mb-3 transition-all',
                                snapshotDraggable.isDragging &&
                                  'scale-105 rotate-1 shadow-lg z-10'
                              )}
                            >
                              <ContextMenu>
                                <ContextMenuTrigger>
                                  <TaskCard
                                    task={task}
                                    onClick={() => handleTaskClick(task.id)}
                                  />
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    onClick={() => handleTaskClick(task.id)}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Task
                                  </ContextMenuItem>
                                  <ContextMenuItem>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate Task
                                  </ContextMenuItem>
                                  <ContextMenuItem className="text-red-600">
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete Task
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </TabsContent>
        <TabsContent value="activity">
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {i % 3 === 0 ? 'JD' : i % 2 === 0 ? 'JC' : 'AJ'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">
                        {i % 3 === 0
                          ? 'John Smith'
                          : i % 2 === 0
                          ? 'Jane Cooper'
                          : 'Alex Johnson'}
                      </span>
                      <span className="text-muted-foreground">
                        {i % 4 === 0
                          ? ' created a new task '
                          : i % 3 === 0
                          ? ' completed a task '
                          : i % 2 === 0
                          ? ' commented on '
                          : ' updated the status of '}
                      </span>
                      <span className="font-medium truncate">
                        {i % 3 === 0
                          ? 'Authentication middleware'
                          : i % 2 === 0
                          ? 'Rate limiting'
                          : 'Documentation'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {i === 1
                        ? '15m'
                        : i === 2
                        ? '2h'
                        : i === 3
                        ? '1d'
                        : i === 4
                        ? '2d'
                        : '3d'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="github">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Github className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">GitHub Integration</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Connect this project to a GitHub repository to track commits,
                pull requests, and issues.
              </p>
              <Button disabled={!project}>
                <Github className="h-4 w-4 mr-2" />
                Connect to GitHub
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setMemberForm({ name: '', role: 'Developer', avatar: '' });
                setIsEditingMember(false);
                setOpenMemberDialog(true);
              }}
              disabled={!project}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {(project?.members?.length === 0 || !project?.members) && (
              <p className="text-sm text-muted-foreground">
                No team members yet.
              </p>
            )}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Stakeholders
            </h3>
          </div>
          <div className="space-y-3">
            {(project?.stakeholders?.length === 0 ||
              !project?.stakeholders) && (
              <p className="text-sm text-muted-foreground">
                No stakeholders added yet.
              </p>
            )}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Links
            </h3>
          </div>
          <div className="space-y-3">
            {(project?.links?.length === 0 || !project?.links) && (
              <p className="text-sm text-muted-foreground">
                No links added yet.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t flex justify-center">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpenDeleteProject(true)}
          className="px-8"
          disabled={!project || loading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </Button>
      </div>

      {/* Create New Task Dialog */}
      <Dialog open={openNewTask} onOpenChange={setOpenNewTask}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewTask} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Input
                id="taskTitle"
                placeholder="Enter task title"
                value={newTaskForm.title}
                onChange={(e) =>
                  setNewTaskForm((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                placeholder="Enter task description"
                className="min-h-24"
                value={newTaskForm.description}
                onChange={(e) =>
                  setNewTaskForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            {project?.scoped_paths && project.scoped_paths.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="taskScopedPath">
                  Associated Component / Scoped Path (Optional)
                </Label>
                <Select
                  value={newTaskForm.scoped_path_id}
                  onValueChange={(value) =>
                    setNewTaskForm((prev) => ({
                      ...prev,
                      scoped_path_id: value,
                    }))
                  }
                >
                  <SelectTrigger id="taskScopedPath">
                    <SelectValue placeholder="Select associated component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none-selected-value">None</SelectItem>{' '}
                    {project.scoped_paths.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name || sp.path_in_repo || 'Unnamed Scope'} (
                        {sp.path_in_repo || 'No Path'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="taskStatus">Status</Label>
              <Select
                defaultValue="Backlog"
                value={newTaskForm.status}
                onValueChange={(value) =>
                  setNewTaskForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger id="taskStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Backlog">Backlog</SelectItem>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenNewTask(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={openProjectEdit} onOpenChange={setOpenProjectEdit}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={projectForm.name || ''}
                onChange={(e) =>
                  setProjectForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectSubtitle">Subtitle</Label>
              <Input
                id="projectSubtitle"
                value={projectForm.subtitle || ''}
                onChange={(e) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    subtitle: e.target.value,
                  }))
                }
                placeholder="Enter project subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={projectForm.description || ''}
                onChange={(e) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter project description"
                className="min-h-24"
              />
            </div>

            {/* GitHub Repository Field - Conditional */}
            <div className="space-y-2">
              <Label htmlFor="projectRepositoryEdit">GitHub Repository</Label>
              {projectForm.org !== 'Personal' && githubOrgRepos.length > 0 ? (
                <Popover open={repoSelectOpen} onOpenChange={setRepoSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={repoSelectOpen}
                      className="w-full justify-between font-normal"
                      disabled={loadingRepos}
                    >
                      {projectForm.repository
                        ? githubOrgRepos.find(
                            (repo) => repo.html_url === projectForm.repository
                          )?.name || projectForm.repository
                        : 'Select repository...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search repositories..."
                        value={repoSearchTerm}
                        onValueChange={setRepoSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {loadingRepos
                            ? 'Loading...'
                            : 'No repositories found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {githubOrgRepos
                            .filter((repo) =>
                              repo.name
                                .toLowerCase()
                                .includes(repoSearchTerm.toLowerCase())
                            )
                            .map((repo) => (
                              <CommandItem
                                key={repo.id}
                                value={repo.html_url}
                                onSelect={(currentValue) => {
                                  const newRepositoryValue =
                                    projectForm.repository === currentValue
                                      ? ''
                                      : currentValue;
                                  setProjectForm((prev) => ({
                                    ...prev,
                                    repository: newRepositoryValue,
                                  }));
                                  setRepoSelectOpen(false);
                                  setRepoSearchTerm('');
                                  const selectedRepoData = githubOrgRepos.find(
                                    (r) => r.html_url === newRepositoryValue
                                  ); // Use newRepositoryValue
                                  const repoToFetch = newRepositoryValue
                                    ? selectedRepoData?.full_name
                                    : null;
                                  fetchUsers(projectForm.org, repoToFetch); // Pass projectForm.org and repoToFetch
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    projectForm.repository === repo.html_url
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                />
                                {repo.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  id="projectRepositoryEdit"
                  value={projectForm.repository || ''}
                  onChange={(e) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      repository: e.target.value,
                    }))
                  }
                  placeholder="Enter GitHub repository URL"
                  disabled={loadingRepos && projectForm.org !== 'Personal'}
                />
              )}
              {loadingRepos && (
                <p className="text-xs text-muted-foreground">
                  Loading repositories...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="designUrl">Design Files URL</Label>
              <Input
                id="designUrl"
                value={projectForm.designUrl || ''}
                onChange={(e) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    designUrl: e.target.value,
                  }))
                }
                placeholder="Enter design files URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Input
                id="client"
                value={projectForm.client || ''}
                onChange={(e) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    client: e.target.value,
                  }))
                }
                placeholder="Enter client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={projectForm.dueDate || ''}
                onChange={(e) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectOrgEdit">Organization</Label>
              <Input
                id="projectOrgEdit"
                value={projectForm.org || 'Personal'}
                disabled
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectLeaderEdit">Project Lead</Label>
              <Popover
                open={leaderSelectOpen}
                onOpenChange={setLeaderSelectOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={leaderSelectOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingLeaders}
                  >
                    {projectForm.project_leader
                      ? availableLeaders.find(
                          (leader) => leader.id === projectForm.project_leader
                        )?.display_name
                      : 'Select leader...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search leaders..."
                      value={leaderSearchTerm}
                      onValueChange={setLeaderSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loadingLeaders ? 'Loading...' : 'No leaders found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {availableLeaders
                          .filter((leader) =>
                            leader.display_name
                              .toLowerCase()
                              .includes(leaderSearchTerm.toLowerCase())
                          )
                          .map((leader) => (
                            <CommandItem
                              key={leader.id}
                              value={leader.id}
                              onSelect={(currentValue) => {
                                setProjectForm((prev) => ({
                                  ...prev,
                                  project_leader:
                                    currentValue === projectForm.project_leader
                                      ? ''
                                      : currentValue,
                                }));
                                setLeaderSelectOpen(false);
                                setLeaderSearchTerm('');
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  projectForm.project_leader === leader.id
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                }`}
                              />
                              {leader.display_name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {loadingLeaders && (
                <p className="text-xs text-muted-foreground">
                  Loading leaders...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectStatus">Status</Label>
              <Select
                value={projectForm.status || 'active'}
                onValueChange={(value) =>
                  setProjectForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger id="projectStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenProjectEdit(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || loadingRepos || loadingLeaders}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Other Dialogs (Member, Stakeholder, Link) */}
      <Dialog open={openMemberDialog} onOpenChange={setOpenMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingMember ? 'Edit Team Member' : 'Add Team Member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Name *</Label>
              <Input
                id="memberName"
                value={memberForm.name}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <Select
                value={memberForm.role || 'Developer'}
                onValueChange={(value) =>
                  setMemberForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger id="memberRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Project Lead">Project Lead</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="QA">QA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberAvatar">Avatar URL (Optional)</Label>
              <Input
                id="memberAvatar"
                value={memberForm.avatar || ''}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, avatar: e.target.value }))
                }
                placeholder="Enter avatar URL"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenMemberDialog(false);
                  setIsEditingMember(false);
                  setMemberForm({ name: '', role: 'Developer', avatar: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditingMember ? 'Update' : 'Add'} Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={openStakeholder} onOpenChange={setOpenStakeholder}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingStakeholder ? 'Edit Stakeholder' : 'Add Stakeholder'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStakeholder} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={stakeholderForm.name}
                onChange={(e) =>
                  setStakeholderForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Enter name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={stakeholderForm.email}
                onChange={(e) =>
                  setStakeholderForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={stakeholderForm.phone}
                onChange={(e) =>
                  setStakeholderForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenStakeholder(false);
                  setIsEditingStakeholder(false);
                  setStakeholderForm({ name: '', email: '', phone: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditingStakeholder ? 'Update' : 'Add'} Stakeholder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={openLink} onOpenChange={setOpenLink}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingLink ? 'Edit Link' : 'Add Link'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={linkForm.title}
                onChange={(e) =>
                  setLinkForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={linkForm.url}
                onChange={(e) =>
                  setLinkForm((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="Enter URL"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenLink(false);
                  setIsEditingLink(false);
                  setLinkForm({ title: '', url: '', id: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditingLink ? 'Update' : 'Add'} Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={openDeleteProject} onOpenChange={setOpenDeleteProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this project?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "
              {project?.name || 'this project'}" and all associated tasks,
              files, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Project;
