import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TaskCard from '@/components/TaskCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

// Mock data
const projectData = {
  id: '1',
  name: 'API Development',
  status: 'active', // Added status here
  subtitle: 'RESTful API for the new mobile application',
  description: 'RESTful API for the new mobile application with authentication and data storage. This API will provide all the necessary endpoints for user management, data storage, and retrieval. It will include JWT-based authentication, rate limiting, and thorough documentation.',
  repository: 'https://github.com/username/api-project',
  designUrl: 'https://figma.com/file/abc123/API-Design',
  client: 'Acme Inc.',
  dueDate: '2025-07-01',
  links: [
    { id: '1', title: 'Project Requirements', url: 'https://drive.google.com/file1' },
    { id: '2', title: 'API Documentation', url: 'https://drive.google.com/file2' }
  ],
  members: [
    { id: '1', name: 'John Smith', role: 'Project Lead', avatar: '' },
    { id: '2', name: 'Jane Cooper', role: 'Developer', avatar: '' },
    { id: '3', name: 'Alex Johnson', role: 'Developer', avatar: '' },
  ],
  stakeholders: [
    { id: '1', name: 'Sarah Miller', email: 'sarah@example.com', phone: '555-123-4567' },
    { id: '2', name: 'Robert Chen', email: 'robert@example.com', phone: '555-987-6543' }
  ],
  tasks: {
    notStarted: [
      {
        id: '4',
        title: 'Documentation',
        description: 'Create API documentation with Swagger',
        priority: 'medium',
        dueDate: '3 days',
        comments: 0,
        assignee: { name: 'Jane Cooper', avatar: '' }
      },
      {
        id: '5',
        title: 'Test Coverage',
        description: 'Increase test coverage to 80%',
        priority: 'low',
        dueDate: 'Next week',
        comments: 1,
        assignee: { name: 'Alex Johnson', avatar: '' }
      }
    ],
    inProgress: [
      {
        id: '1',
        title: 'Implement authentication middleware',
        description: 'Create JWT-based authentication middleware for the API',
        priority: 'high',
        dueDate: 'Today',
        comments: 3,
        assignee: { name: 'John Smith', avatar: '' }
      },
      {
        id: '2',
        title: 'Rate limiting',
        description: 'Add rate limiting to prevent abuse',
        priority: 'medium',
        dueDate: 'Tomorrow',
        comments: 2,
        assignee: { name: 'Jane Cooper', avatar: '' }
      }
    ],
    completed: [
      {
        id: '3',
        title: 'Project setup',
        description: 'Initialize project and set up folder structure',
        priority: 'high',
        dueDate: 'Yesterday',
        comments: 5,
        assignee: { name: 'John Smith', avatar: '' }
      }
    ]
  }
};

const Project = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('board');
  const [openNewTask, setOpenNewTask] = useState(false);
  const [openStakeholder, setOpenStakeholder] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openProjectEdit, setOpenProjectEdit] = useState(false);
  const [stakeholderForm, setStakeholderForm] = useState({ name: '', email: '', phone: '' });
  const [linkForm, setLinkForm] = useState({ title: '', url: '', id: '' });
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [isEditingStakeholder, setIsEditingStakeholder] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', role: '', avatar: '', id: '' });
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [projectForm, setProjectForm] = useState({});
  const [openDeleteProject, setOpenDeleteProject] = useState(false);
  const { toast } = useToast();
  
  // In a real app, we would fetch the project data based on the ID
  const [project, setProject] = useState(projectData);

  // Set project form data when edit modal opens
  useEffect(() => {
    if (openProjectEdit) {
      setProjectForm({
        name: project.name,
        subtitle: project.subtitle,
        description: project.description,
        repository: project.repository,
        designUrl: project.designUrl,
        projectLead: project.members.find(m => m.role === 'Project Lead')?.id || '',
        client: project.client || '',
        dueDate: project.dueDate || '',
        status: project.status || 'active' // Add status to form
      });
    }
  }, [openProjectEdit, project]);

  // State for managing drag and drop
  const [projectTasks, setProjectTasks] = useState(project.tasks);
  
  const handleDragEnd = (result) => {
    const { source, destination } = result;
    
    // Dropped outside a valid droppable area
    if (!destination) return;
    
    // No change in position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Get the task that was dragged
    const sourceColumn = source.droppableId;
    const destColumn = destination.droppableId;
    const taskToMove = [...projectTasks[sourceColumn]][source.index];
    
    // Make a copy of the task lists
    const newTasks = { ...projectTasks };
    
    // Remove task from source column
    newTasks[sourceColumn] = [...projectTasks[sourceColumn]];
    newTasks[sourceColumn].splice(source.index, 1);
    
    // Add task to destination column
    newTasks[destColumn] = [...projectTasks[destColumn]];
    newTasks[destColumn].splice(destination.index, 0, taskToMove);
    
    // Update state
    setProjectTasks(newTasks);
    
    // Show a toast notification for the status change
    if (sourceColumn !== destColumn) {
      const statusNames = {
        notStarted: "Not Started",
        inProgress: "In Progress",
        completed: "Completed"
      };
      
      toast({
        title: "Task Status Updated",
        description: `"${taskToMove.title}" moved to ${statusNames[destColumn]}`,
      });
    }
  };
  
  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}?projectId=${id}`);
  };

  const handleNewTask = (e) => {
    e.preventDefault();
    // In a real app, we would create the task here
    setOpenNewTask(false);
    
    toast({
      title: "Task Created",
      description: "New task has been created successfully",
    });
  };

  const handleAddStakeholder = (e) => {
    e.preventDefault();
    
    if (!stakeholderForm.name.trim()) return;
    
    if (isEditingStakeholder) {
      setProject(prev => ({
        ...prev,
        stakeholders: prev.stakeholders.map(s => 
          s.id === stakeholderForm.id ? { ...stakeholderForm } : s
        )
      }));
      
      toast({
        title: "Stakeholder Updated",
        description: `${stakeholderForm.name} has been updated`,
      });
      
      setIsEditingStakeholder(false);
    } else {
      const newStakeholder = {
        id: Date.now().toString(),
        ...stakeholderForm
      };
      
      setProject(prev => ({
        ...prev,
        stakeholders: [...prev.stakeholders, newStakeholder]
      }));
      
      toast({
        title: "Stakeholder Added",
        description: `${stakeholderForm.name} has been added as a stakeholder`,
      });
    }
    
    setStakeholderForm({ name: '', email: '', phone: '', id: '' });
    setOpenStakeholder(false);
  };

  const handleRemoveStakeholder = (id) => {
    setProject(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter(s => s.id !== id)
    }));
    
    toast({
      title: "Stakeholder Removed",
      description: "Stakeholder has been removed successfully",
    });
  };
  
  const handleEditStakeholder = (stakeholder) => {
    setStakeholderForm({ ...stakeholder });
    setIsEditingStakeholder(true);
    setOpenStakeholder(true);
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;
    
    if (isEditingLink) {
      setProject(prev => ({
        ...prev,
        links: prev.links.map(link => 
          link.id === linkForm.id ? { ...linkForm } : link
        )
      }));
      
      toast({
        title: "Link Updated",
        description: `"${linkForm.title}" has been updated`,
      });
      
      setIsEditingLink(false);
    } else {
      const newLink = {
        id: Date.now().toString(),
        title: linkForm.title,
        url: linkForm.url
      };
      
      setProject(prev => ({
        ...prev,
        links: [...prev.links, newLink]
      }));
      
      toast({
        title: "Link Added",
        description: `"${linkForm.title}" has been added`,
      });
    }
    
    setLinkForm({ title: '', url: '', id: '' });
    setOpenLink(false);
  };

  const handleRemoveLink = (id) => {
    setProject(prev => ({
      ...prev,
      links: prev.links.filter(link => link.id !== id)
    }));
    
    toast({
      title: "Link Removed",
      description: "Link has been removed successfully",
    });
  };
  
  const handleEditLink = (link) => {
    setLinkForm({ ...link });
    setIsEditingLink(true);
    setOpenLink(true);
  };
  
  const copyToClipboard = (text, toastMessage = "URL copied to clipboard") => {
    navigator.clipboard.writeText(text);
    
    toast({
      title: "Copied!",
      description: toastMessage,
    });
  };
  
  const handleEditMember = (member) => {
    setMemberForm({ ...member });
    setIsEditingMember(true);
    setOpenMemberDialog(true);
  };
  
  const handleRemoveMember = (id) => {
    setProject(prev => ({
      ...prev,
      members: prev.members.filter(member => member.id !== id)
    }));
    
    toast({
      title: "Team Member Removed",
      description: "Team member has been removed successfully",
    });
  };
  
  const handleAddMember = (e) => {
    e.preventDefault();
    
    if (!memberForm.name.trim()) return;
    
    if (isEditingMember) {
      setProject(prev => ({
        ...prev,
        members: prev.members.map(m => 
          m.id === memberForm.id ? { ...memberForm } : m
        )
      }));
      
      toast({
        title: "Team Member Updated",
        description: `${memberForm.name} has been updated`,
      });
      
      setIsEditingMember(false);
    } else {
      const newMember = {
        id: Date.now().toString(),
        ...memberForm
      };
      
      setProject(prev => ({
        ...prev,
        members: [...prev.members, newMember]
      }));
      
      toast({
        title: "Team Member Added",
        description: `${memberForm.name} has been added as a team member`,
      });
    }
    
    setMemberForm({ name: '', role: '', avatar: '', id: '' });
    setOpenMemberDialog(false);
  };
  
  const handleEditProject = (e) => {
    e.preventDefault();
    
    setProject(prev => ({
      ...prev,
      name: projectForm.name,
      subtitle: projectForm.subtitle,
      description: projectForm.description,
      repository: projectForm.repository,
      designUrl: projectForm.designUrl,
      client: projectForm.client,
      dueDate: projectForm.dueDate,
      status: projectForm.status, // Save status
      // Update project lead
      members: prev.members.map(member => {
        if (member.id === projectForm.projectLead) {
          return { ...member, role: 'Project Lead' };
        } else if (member.role === 'Project Lead') {
          return { ...member, role: 'Developer' };
        }
        return member;
      })
    }));
    
    toast({
      title: "Project Updated",
      description: "Project information has been updated successfully",
    });
    
    setOpenProjectEdit(false);
  };
  
  const handleDeleteProject = () => {
    // In a real app, we would delete the project here
    setOpenDeleteProject(false);
    navigate('/projects');
    
    toast({
      title: "Project Deleted",
      description: "The project has been permanently deleted",
    });
  };
  
  const getProjectLeader = () => {
    return project.members.find(m => m.role === 'Project Lead') || project.members[0];
  };
  
  const getOtherMembers = () => {
    return project.members.filter(m => m.role !== 'Project Lead');
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const exportProjectPlan = () => {
    // Prepare the Markdown content
    let md = `# ${project.name}\n\n`;
    
    if (project.subtitle) {
      md += `## ${project.subtitle}\n\n`;
    }
    
    if (project.description) {
      md += `${project.description}\n\n`;
    }
    
    // Add tasks section
    md += `## Tasks\n\n`;
    
    // Function to format tasks from a column
    const formatTasks = (tasks, status) => {
      let result = '';
      tasks.forEach(task => {
        result += `### ${task.title}\n`;
        result += `- **Status**: ${status}\n`;
        result += `- **Priority**: ${task.priority}\n`;
        result += `- **Assignee**: ${task.assignee.name}\n\n`;
        result += `${task.description}\n\n`;
      });
      return result;
    };
    
    // Add tasks by status
    md += `### Not Started\n\n`;
    md += formatTasks(projectTasks.notStarted, 'Not Started');
    
    md += `### In Progress\n\n`;
    md += formatTasks(projectTasks.inProgress, 'In Progress');
    
    md += `### Completed\n\n`;
    md += formatTasks(projectTasks.completed, 'Completed');
    
    // Create a Blob and download link
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name}-plan.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Project Plan Exported",
      description: "The project plan has been exported as a markdown file.",
    });
  };
  
  return (
    <div className="p-6">
      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-stretch">
        <div className="md:col-span-2 flex flex-col"> {/* Added flex flex-col */}
          <div> {/* Wrapper for non-growing content */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary" />
                  {project.name}
                </h2>
                {project.status && (
                  <Badge variant={getStatusVariant(project.status)} className="capitalize text-xs px-2 py-0.5">
                    {project.status}
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => setOpenProjectEdit(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2">{project.subtitle}</p>
              
              {/* Project leader */}
              <div className="flex items-center mt-2">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={getProjectLeader().avatar} alt={getProjectLeader().name} />
                  <AvatarFallback className="text-xs">{getProjectLeader().name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{getProjectLeader().name}</span>
                {getOtherMembers().length > 0 && (
                  <div className="flex items-center ml-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    <span>+{getOtherMembers().length}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex">
              <Popover>
                <PopoverTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="grid gap-2">
                    <Button variant="ghost" className="justify-start" onClick={() => setOpenNewTask(true)}>
                      <Plus className="h-4 w-4 mr-2" /> New Task
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => setOpenLink(true)}>
                      <LinkIcon className="h-4 w-4 mr-2" /> New Link
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => setOpenStakeholder(true)}>
                      <UserPlus className="h-4 w-4 mr-2" /> New Stakeholder
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => {
                      setMemberForm({ name: '', role: 'Developer', avatar: '' });
                      setIsEditingMember(false);
                      setOpenMemberDialog(true);
                    }}>
                      <Users className="h-4 w-4 mr-2" /> Add Team Member
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground group">
              <Github className="h-4 w-4" />
              <a 
                href={project.repository} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors truncate max-w-[200px] md:max-w-none"
              >
                GitHub Repository
              </a>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={() => copyToClipboard(project.repository, "Repository URL copied to clipboard")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            
            {project.designUrl && (
              <div className="flex items-center gap-2 text-muted-foreground group">
                <Figma className="h-4 w-4" />
                <a 
                  href={project.designUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors truncate max-w-[200px] md:max-w-none"
                >
                  Design Files
                </a>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => copyToClipboard(project.designUrl, "Design URL copied to clipboard")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {project.client && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>{project.client}</span>
              </div>
            )}
            
            {project.dueDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          </div> {/* End of wrapper for non-growing content */}

          {/* Project Description */}
          <div className="mt-4 flex-grow flex flex-col min-h-0"> {/* Added flex-grow flex flex-col min-h-0 */}
            <h3 className="font-medium mb-2">Project Description</h3>
            <div className="bg-card border rounded-lg p-3 flex-grow overflow-y-auto"> {/* Added flex-grow, removed max-h-32 */}
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border flex flex-col"> {/* Added flex flex-col */}
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </h3>
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
                    {i % 3 === 0 ? 'John Smith' : i % 2 === 0 ? 'Jane Cooper' : 'Alex Johnson'}
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
        </div>
      </div>
      
      {/* Project Content Tabs */}
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
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Export Project Plan</span>
          </Button>
        </div>
        
        <TabsContent value="board" className="mt-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Not Started Column */}
              <Droppable droppableId="notStarted">
                {(provided, snapshot) => (
                  <div 
                    className={cn(
                      "kanban-column bg-card p-4 rounded-lg border transition-colors",
                      snapshot.isDraggingOver && "bg-secondary/20 border-primary/50"
                    )}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3 className="font-medium text-sm text-muted-foreground mb-4 flex items-center justify-between">
                      <span>NOT STARTED</span>
                      <span className="bg-secondary px-2 py-0.5 rounded-md">
                        {projectTasks.notStarted.length}
                      </span>
                    </h3>
                    
                    {projectTasks.notStarted.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-3 transition-all",
                              snapshot.isDragging && "scale-105 rotate-1 shadow-lg z-10"
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
                                <ContextMenuItem onClick={() => handleTaskClick(task.id)}>
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
              
              {/* In Progress Column */}
              <Droppable droppableId="inProgress">
                {(provided, snapshot) => (
                  <div 
                    className={cn(
                      "kanban-column bg-card p-4 rounded-lg border transition-colors",
                      snapshot.isDraggingOver && "bg-secondary/20 border-primary/50"
                    )}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3 className="font-medium text-sm text-muted-foreground mb-4 flex items-center justify-between">
                      <span>IN PROGRESS</span>
                      <span className="bg-secondary px-2 py-0.5 rounded-md">
                        {projectTasks.inProgress.length}
                      </span>
                    </h3>
                    
                    {projectTasks.inProgress.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-3 transition-all",
                              snapshot.isDragging && "scale-105 rotate-1 shadow-lg z-10"
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
                                <ContextMenuItem onClick={() => handleTaskClick(task.id)}>
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
              
              {/* Completed Column */}
              <Droppable droppableId="completed">
                {(provided, snapshot) => (
                  <div 
                    className={cn(
                      "kanban-column bg-card p-4 rounded-lg border transition-colors",
                      snapshot.isDraggingOver && "bg-secondary/20 border-primary/50"
                    )}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3 className="font-medium text-sm text-muted-foreground mb-4 flex items-center justify-between">
                      <span>COMPLETED</span>
                      <span className="bg-secondary px-2 py-0.5 rounded-md">
                        {projectTasks.completed.length}
                      </span>
                    </h3>
                    
                    {projectTasks.completed.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-3 transition-all",
                              snapshot.isDragging && "scale-105 rotate-1 shadow-lg z-10"
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
                                <ContextMenuItem onClick={() => handleTaskClick(task.id)}>
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
                        {i % 3 === 0 ? 'John Smith' : i % 2 === 0 ? 'Jane Cooper' : 'Alex Johnson'}
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
                        {i % 3 === 0 ? 'Authentication middleware' : i % 2 === 0 ? 'Rate limiting' : 'Documentation'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {i === 1 ? '15m' : i === 2 ? '2h' : i === 3 ? '1d' : i === 4 ? '2d' : '3d'}
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
                Connect this project to a GitHub repository to track commits, pull requests, and issues.
              </p>
              <Button>
                <Github className="h-4 w-4 mr-2" />
                Connect to GitHub
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom sections: Team Members, Stakeholders, Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Team Members Section */}
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
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {project.members.map(member => (
              <div key={member.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
                <div className="hidden md:flex md:items-center md:space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={() => handleEditMember(member)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7" 
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40" align="end">
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center"
                        onClick={() => handleEditMember(member)}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Stakeholders Section */}
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Stakeholders
            </h3>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setStakeholderForm({ name: '', email: '', phone: '' });
                setIsEditingStakeholder(false);
                setOpenStakeholder(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {project.stakeholders.map(stakeholder => (
              <div key={stakeholder.id} className="flex items-center justify-between group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{stakeholder.name}</p>
                  {stakeholder.email && (
                    <p className="text-xs text-muted-foreground truncate">{stakeholder.email}</p>
                  )}
                  {stakeholder.phone && (
                    <p className="text-xs text-muted-foreground truncate">{stakeholder.phone}</p>
                  )}
                </div>
                <div className="hidden md:flex md:items-center md:space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={() => handleEditStakeholder(stakeholder)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7" 
                    onClick={() => handleRemoveStakeholder(stakeholder.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40" align="end">
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          copyToClipboard(stakeholder.email || stakeholder.phone || stakeholder.name);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center"
                        onClick={() => {
                          e.preventDefault();
                          handleEditStakeholder(stakeholder);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveStakeholder(stakeholder.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {project.stakeholders.length === 0 && (
              <p className="text-sm text-muted-foreground">No stakeholders added yet.</p>
            )}
          </div>
        </div>
        
        {/* Links Section */}
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Links
            </h3>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setLinkForm({ title: '', url: '', id: '' });
                setIsEditingLink(false);
                setOpenLink(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {project.links.map(link => (
              <div key={link.id} className="flex items-center justify-between group">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors flex-1 min-w-0"
                >
                  <LinkIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{link.title}</span>
                </a>
                <div className="hidden md:flex md:items-center md:space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7" 
                    onClick={(e) => {
                      e.preventDefault();
                      copyToClipboard(link.url, `Link "${link.title}" copied to clipboard`);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditLink(link);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveLink(link.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40" align="end">
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          copyToClipboard(link.url, `Link "${link.title}" copied to clipboard`);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditLink(link);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveLink(link.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {project.links.length === 0 && (
              <p className="text-sm text-muted-foreground">No links added yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Project Button */}
      <div className="mt-8 pt-6 border-t flex justify-center">
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => setOpenDeleteProject(true)}
          className="px-8"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </Button>
      </div>

      {/* New Task Modal */}
      <Dialog open={openNewTask} onOpenChange={setOpenNewTask}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewTask} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input id="title" placeholder="Enter task title" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Enter task description" 
                className="min-h-24" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="notStarted">
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notStarted">Not Started</SelectItem>
                    <SelectItem value="inProgress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select defaultValue="medium">
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select>
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.members.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenNewTask(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Project Modal */}
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
                onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectSubtitle">Subtitle</Label>
              <Input 
                id="projectSubtitle" 
                value={projectForm.subtitle || ''}
                onChange={(e) => setProjectForm(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Enter project subtitle" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea 
                id="projectDescription" 
                value={projectForm.description || ''}
                onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description" 
                className="min-h-24" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repository">GitHub Repository URL</Label>
              <Input 
                id="repository" 
                value={projectForm.repository || ''}
                onChange={(e) => setProjectForm(prev => ({ ...prev, repository: e.target.value }))}
                placeholder="Enter GitHub repository URL" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="designUrl">Design Files URL</Label>
              <Input 
                id="designUrl" 
                value={projectForm.designUrl || ''}
                onChange={(e) => setProjectForm(prev => ({ ...prev, designUrl: e.target.value }))}
                placeholder="Enter design files URL" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Input 
                id="client" 
                value={projectForm.client || ''}
                onChange={(e) => setProjectForm(prev => ({ ...prev, client: e.target.value }))}
                placeholder="Enter client name" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input 
                id="dueDate" 
                type="date"
                value={projectForm.dueDate || ''}
                onChange={(e) => setProjectForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectLead">Project Lead</Label>
              <Select 
                value={projectForm.projectLead || ''} 
                onValueChange={(value) => setProjectForm(prev => ({ ...prev, projectLead: value }))}
              >
                <SelectTrigger id="projectLead">
                  <SelectValue placeholder="Select project lead" />
                </SelectTrigger>
                <SelectContent>
                  {project.members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectStatus">Status</Label>
              <Select
                value={projectForm.status || 'active'}
                onValueChange={(value) => setProjectForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="projectStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  {/* Add other statuses if needed */}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenProjectEdit(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Team Member Dialog */}
      <Dialog open={openMemberDialog} onOpenChange={setOpenMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Name *</Label>
              <Input 
                id="memberName" 
                value={memberForm.name}
                onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter name" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <Select 
                value={memberForm.role || 'Developer'} 
                onValueChange={(value) => setMemberForm(prev => ({ ...prev, role: value }))}
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
                onChange={(e) => setMemberForm(prev => ({ ...prev, avatar: e.target.value }))}
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
              <Button type="submit">{isEditingMember ? 'Update' : 'Add'} Member</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Stakeholder Dialog */}
      <Dialog open={openStakeholder} onOpenChange={setOpenStakeholder}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingStakeholder ? 'Edit Stakeholder' : 'Add Stakeholder'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStakeholder} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input 
                id="name" 
                value={stakeholderForm.name}
                onChange={(e) => setStakeholderForm(prev => ({ ...prev, name: e.target.value }))}
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
                onChange={(e) => setStakeholderForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={stakeholderForm.phone}
                onChange={(e) => setStakeholderForm(prev => ({ ...prev, phone: e.target.value }))}
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
              <Button type="submit">{isEditingStakeholder ? 'Update' : 'Add'} Stakeholder</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Link Dialog */}
      <Dialog open={openLink} onOpenChange={setOpenLink}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingLink ? 'Edit Link' : 'Add Link'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                value={linkForm.title}
                onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter title" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input 
                id="url" 
                value={linkForm.url}
                onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
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
              <Button type="submit">{isEditingLink ? 'Update' : 'Add'} Link</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Project Confirmation */}
      <AlertDialog open={openDeleteProject} onOpenChange={setOpenDeleteProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{project.name}" and all associated tasks, files, and data. 
              This action cannot be undone.
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
      
      <Toaster />
    </div>
  );
};

export default Project;
