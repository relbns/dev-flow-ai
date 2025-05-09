import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
// Assuming useToast is available and set up similarly to Project.jsx
// import { useToast } from "@/hooks/use-toast";

// Mock data
const recentProjects = [
  {
    id: '1',
    name: 'API Development',
    description: 'RESTful API for the new mobile application with authentication and data storage',
    tasks: { notStarted: 4, inProgress: 2, completed: 8 },
    members: 3,
    lastUpdated: '2 hours ago'
  },
  {
    id: '2',
    name: 'React Dashboard',
    description: 'Admin dashboard with analytics and user management',
    tasks: { notStarted: 2, inProgress: 5, completed: 3 },
    members: 4,
    lastUpdated: '5 hours ago'
  }
];

const myTasks = [
  {
    id: '1',
    title: 'Implement authentication middleware',
    description: 'Create JWT-based authentication middleware for the API',
    priority: 'high',
    dueDate: 'Today',
    comments: 3,
    assignee: { name: 'John Smith', avatar: '' },
    projectId: '1'
  },
  {
    id: '2',
    title: 'Fix responsive layout',
    description: 'Fix layout issues on mobile devices',
    priority: 'medium',
    dueDate: 'Tomorrow',
    comments: 0,
    assignee: { name: 'John Smith', avatar: '' },
    projectId: '2'
  },
  {
    id: '3',
    title: 'Setup CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment',
    priority: 'low',
    dueDate: 'Next week',
    comments: 1,
    assignee: { name: 'John Smith', avatar: '' },
    projectId: '1'
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
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
  // const { toast } = useToast(); // Uncomment if using toast

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleNewProjectSubmit = (e) => {
    e.preventDefault();
    // In a real app, handle project creation logic here
    console.log('New Project Data:', newProjectForm);
    // toast({ title: "Project Created", description: `${newProjectForm.name} has been created.` }); // Example toast
    setOpenNewProjectDialog(false);
    setNewProjectForm({
      name: '',
      subtitle: '',
      description: '',
      repository: '',
      designUrl: '',
      client: '',
      dueDate: '',
    }); // Reset form
  };

  // Stats data
  const stats = [
    { title: 'Total Tasks', value: 24, icon: <ListTodo className="h-5 w-5" />, color: 'text-primary' },
    { title: 'Completed', value: 12, icon: <CheckCircle className="h-5 w-5" />, color: 'text-status-completed' },
    { title: 'Due Today', value: 5, icon: <Clock className="h-5 w-5" />, color: 'text-priority-medium' },
    { title: 'High Priority', value: 3, icon: <AlertCircle className="h-5 w-5" />, color: 'text-priority-high' }
  ];

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
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
          {recentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
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
                {myTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                ))}
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
              <Label htmlFor="projectSubtitle">Subtitle</Label>
              <Input
                id="projectSubtitle"
                value={newProjectForm.subtitle}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Enter project subtitle"
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

            <div className="space-y-2">
              <Label htmlFor="repository">GitHub Repository URL</Label>
              <Input
                id="repository"
                value={newProjectForm.repository}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, repository: e.target.value }))}
                placeholder="Enter GitHub repository URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designUrl">Design Files URL</Label>
              <Input
                id="designUrl"
                value={newProjectForm.designUrl}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, designUrl: e.target.value }))}
                placeholder="Enter design files URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Input
                id="client"
                value={newProjectForm.client}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, client: e.target.value }))}
                placeholder="Enter client name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={newProjectForm.dueDate}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, dueDate: e.target.value }))}
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
      {/* <Toaster /> */} {/* Add if using toast notifications */}
    </div>
  );
};

export default Dashboard;
