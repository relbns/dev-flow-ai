import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectCard from '@/components/ProjectCard';
import TaskCard from '@/components/TaskCard';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListTodo, CheckCircle, AlertCircle, Clock, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger, // Added for potential direct trigger usage if needed later
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster component

const Dashboard = () => {
  const navigate = useNavigate();
  const { contextType, selectedOrganization } = useOutletContext(); // Get context from Layout
  const [recentProjectsData, setRecentProjectsData] = useState([]);
  const [myTasksData, setMyTasksData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Total Tasks', value: 0, icon: <ListTodo className="h-5 w-5" />, color: 'text-primary' },
    { title: 'Completed', value: 0, icon: <CheckCircle className="h-5 w-5" />, color: 'text-status-completed' },
    { title: 'Due Today', value: 0, icon: <Clock className="h-5 w-5" />, color: 'text-priority-medium' },
    { title: 'High Priority', value: 0, icon: <AlertCircle className="h-5 w-5" />, color: 'text-priority-high' }
  ]);
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    repository: '',
    designUrl: '',
    client: '',
    dueDate: '',
  });
  const { toast } = useToast();

  const isToday = (someDate) => {
    if (!someDate) return false;
    const today = new Date();
    const dateToCompare = new Date(someDate);
    return dateToCompare.getDate() === today.getDate() &&
      dateToCompare.getMonth() === today.getMonth() &&
      dateToCompare.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    const fetchData = async () => {
      // Determine the org_id to use for filtering.
      // If contextType is 'organization' and an organization is selected, use its ID.
      // Otherwise, org_id will be undefined/null, and functions should fetch personal data or handle as appropriate.
      const org_id = contextType === 'organization' && selectedOrganization ? selectedOrganization.id : null;
      console.log(`Dashboard: Fetching data for context: ${contextType}, org_id: ${org_id}`);

      try {
        // Fetch recent projects, passing org_id if available
        const projectParams = { limit: 5 };
        if (org_id) {
          projectParams.org_id = org_id;
        }
        const { data: projects, error: projectsError } = await supabase.functions.invoke('list-projects', {
          method: 'POST',
          body: projectParams
        });
        if (projectsError) throw projectsError;
        setRecentProjectsData(projects || []);

        // For tasks, we'll try a different approach since we're having issues with query parameters
        // We'll use a project_id parameter for personal context
        try {
          let tasksResponse;
          if (org_id) {
            // For organization context, use org_id
            tasksResponse = await supabase.functions.invoke('list-tasks', {
              method: 'GET',
              query: { org_id: org_id.toString() }
            });
          } else {
            // For personal context
            tasksResponse = await supabase.functions.invoke('list-tasks', {
              method: 'GET',
              query: { org_id: 'personal' }
            });
          }
          
          const { data: tasks, error: tasksError } = tasksResponse;
          
          if (tasksError) throw tasksError;
          const fetchedTasks = tasks || [];
          setMyTasksData(fetchedTasks);

          // Calculate stats based on fetched tasks
          const totalTasks = fetchedTasks.length;
          // Assuming task object has a 'status' field (e.g., 'completed', 'in_progress', 'todo')
          const completedTasks = fetchedTasks.filter(task => task.status && task.status.toLowerCase() === 'completed').length;
          // Assuming task object has a 'due_date' field
          const dueTodayTasks = fetchedTasks.filter(task => isToday(task.due_date)).length;
          // Assuming task object has a 'priority' field (e.g., 'high', 'medium', 'low')
          const highPriorityTasks = fetchedTasks.filter(task => task.priority && task.priority.toLowerCase() === 'high').length;

          setDashboardStats([
            { title: 'Total Tasks', value: totalTasks, icon: <ListTodo className="h-5 w-5" />, color: 'text-primary' },
            { title: 'Completed', value: completedTasks, icon: <CheckCircle className="h-5 w-5" />, color: 'text-status-completed' },
            { title: 'Due Today', value: dueTodayTasks, icon: <Clock className="h-5 w-5" />, color: 'text-priority-medium' },
            { title: 'High Priority', value: highPriorityTasks, icon: <AlertCircle className="h-5 w-5" />, color: 'text-priority-high' }
          ]);
        } catch (tasksError) {
          console.error('Error fetching tasks:', tasksError);
          toast({ 
            title: "Error", 
            description: "Could not fetch tasks data.", 
            variant: "destructive" 
          });
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({ 
          title: "Error", 
          description: "Could not fetch dashboard data.", 
          variant: "destructive" 
        });
      }
    };

    fetchData();
  }, [contextType, selectedOrganization, toast]); // Re-fetch when context or selected org changes

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleNewProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      const projectPayload = {
        name: newProjectForm.name,
        description: newProjectForm.description,
        // Add other relevant fields from newProjectForm
      };
      // If an organization is selected, associate the new project with it
      if (contextType === 'organization' && selectedOrganization) {
        projectPayload.org_id = selectedOrganization.id;
      }

      const { data, error } = await supabase.functions.invoke('create-project', {
        method: 'POST',
        body: projectPayload
      });

      if (error) throw error;

      console.log('New Project Created:', data);
      toast({ 
        title: "Project Created", 
        description: `${newProjectForm.name} has been created.` 
      });
      setOpenNewProjectDialog(false);
      
      // Re-fetch projects to update the list, considering the current context
      const projectParams = { limit: 5 };
      if (contextType === 'organization' && selectedOrganization) {
        projectParams.org_id = selectedOrganization.id;
      }
      const { data: projects, error: projectsError } = await supabase.functions.invoke('list-projects', {
        method: 'POST',
        body: projectParams
      });
      if (projectsError) throw projectsError;
      setRecentProjectsData(projects || []);

      setNewProjectForm({
        name: '',
        subtitle: '',
        description: '',
        repository: '',
        designUrl: '',
        client: '',
        dueDate: '',
      }); // Reset form
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ 
        title: "Error", 
        description: "Could not create project.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-secondary ${stat.color}`}>
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <Button onClick={() => setOpenNewProjectDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {recentProjectsData.length > 0 ? (
            recentProjectsData.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-4">No recent projects found.</p>
          )}
        </div>

        <div className="mb-6">
          <Tabs defaultValue="assigned">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Tasks</h2>
              <TabsList>
                <TabsTrigger value="assigned">Assigned to me</TabsTrigger>
                <TabsTrigger value="created">Created by me</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="assigned" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTasksData.length > 0 ? (
                  myTasksData.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task.id)} />
                  ))
                ) : (
                  <p className="text-muted-foreground col-span-full text-center py-4">No tasks assigned to you.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="created">
              <div className="text-center py-10">
                <p className="text-muted-foreground">You haven't created any tasks yet.</p>
                <Button variant="outline" className="mt-4">Create a task</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog open={openNewProjectDialog} onOpenChange={setOpenNewProjectDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewProjectSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description"
                className="min-h-24"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenNewProjectDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster /> {/* Add Toaster component here */}
    </div>
  );
};

export default Dashboard;
