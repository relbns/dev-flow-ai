
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProjectCard from '@/components/ProjectCard';
import { Plus, Search, Github, User } from 'lucide-react'; // Added User icon

// Mock data
const projects = [
  {
    id: '1',
    name: 'API Development',
    description: 'RESTful API for the new mobile application with authentication and data storage',
    tasks: { notStarted: 4, inProgress: 2, completed: 8 },
    members: 3,
    lastUpdated: '2 hours ago',
    status: 'active'
  },
  {
    id: '2',
    name: 'React Dashboard',
    description: 'Admin dashboard with analytics and user management',
    tasks: { notStarted: 2, inProgress: 5, completed: 3 },
    members: 4,
    lastUpdated: '5 hours ago',
    status: 'active'
  },
  {
    id: '3',
    name: 'Mobile App',
    description: 'Cross-platform mobile application with React Native',
    tasks: { notStarted: 6, inProgress: 3, completed: 1 },
    members: 2,
    lastUpdated: '1 day ago',
    status: 'completed'
  },
  {
    id: '4',
    name: 'Database Migration',
    description: 'Migrating from MongoDB to PostgreSQL with data transformation',
    tasks: { notStarted: 2, inProgress: 1, completed: 4 },
    members: 2,
    lastUpdated: '3 days ago',
    status: 'archived'
  }
];

const Projects = () => {
  const navigate = useNavigate();
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    repository: '',
    designUrl: '',
    client: '',
    dueDate: '',
    projectLeader: '',
  });

  const handleNewProjectSubmit = (e) => {
    e.preventDefault();
    // In a real app, handle project creation logic here
    console.log('New Project Data (Projects Page):', newProjectForm);
    // toast({ title: "Project Created", description: `${newProjectForm.name} has been created.` }); // Example toast
    setOpenNewProjectDialog(false);
    setNewProjectForm({ // Reset form
      name: '',
      subtitle: '',
      description: '',
      repository: '',
      designUrl: '',
      client: '',
      dueDate: '',
      projectLeader: '',
    });
    // Simulate redirect to the new project or update list
    // navigate('/projects/new-project-id'); 
  };
  
  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="pl-9 bg-secondary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={openNewProjectDialog} onOpenChange={setOpenNewProjectDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
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
                  <Label htmlFor="repository">
                    <span className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub Repository URL
                    </span>
                  </Label>
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
                  <Label htmlFor="projectLeader">
                     <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Project Leader
                    </span>
                  </Label>
                  <Input
                    id="projectLeader"
                    value={newProjectForm.projectLeader}
                    onChange={(e) => setNewProjectForm(prev => ({ ...prev, projectLeader: e.target.value }))}
                    placeholder="Enter project leader's name or email"
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects
          .filter((project) =>
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.description.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .filter((project) => {
            if (filterStatus === 'all') return true;
            return project.status === filterStatus;
          })
          .map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};

export default Projects;
