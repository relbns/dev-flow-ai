// src/components/project/Project.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileDown, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProjectData } from '@/hooks/project/useProjectData';
import { copyToClipboard } from '@/lib/project-utils';
import ProjectHeader from './ProjectHeader';
import ProjectSidebar from './ProjectSidebar';
import ProjectBoard from './ProjectBoard';
import ProjectActivity from './ProjectActivity';
import ProjectGitHub from './ProjectGitHub';
import ProjectMembers from './ProjectMembers';
import ProjectStakeholders from './ProjectStakeholders';
import ProjectLinks from './ProjectLinks';
import NewTaskDialog from './dialogs/NewTaskDialog';
import EditProjectDialog from './dialogs/EditProjectDialog';
import TeamMemberDialog from './dialogs/TeamMemberDialog';
import StakeholderDialog from './dialogs/StakeholderDialog';
import LinkDialog from './dialogs/LinkDialog';
import DeleteProjectDialog from './dialogs/DeleteProjectDialog';
import { Skeleton } from '@/components/ui/skeleton';

const Project = () => {
  const { id: projectIdFromParams } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // State management
  const [activeTab, setActiveTab] = useState('board');
  const [openNewTask, setOpenNewTask] = useState(false);
  const [openStakeholder, setOpenStakeholder] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openProjectEdit, setOpenProjectEdit] = useState(false);
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [openDeleteProject, setOpenDeleteProject] = useState(false);
  
  // Dialog form states
  const [isEditingStakeholder, setIsEditingStakeholder] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', role: 'Developer', avatar: '', id: '' });
  const [stakeholderForm, setStakeholderForm] = useState({ name: '', email: '', phone: '' });
  const [linkForm, setLinkForm] = useState({ title: '', url: '', id: '' });

  // Custom hook for project data
  const {
    project,
    loading,
    error,
    projectTasks,
    fetchProjectDetails,
    fetchTasksForProject,
    handleDeleteProject,
  } = useProjectData(projectIdFromParams, navigate, toast);

  // Handle search params
  useEffect(() => {
    if (searchParams.get('action') === 'edit' && project) {
      setOpenProjectEdit(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, project]);

  // Handlers
  const exportProjectPlan = () => toast({ title: 'Export Not Implemented' });

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  // Placeholder handlers - to be implemented or passed to child components
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

  // Display states
  if (loading && !project) {
    return <ProjectSkeleton />;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }
  
  if (!project && !loading) {
    return <div className="p-6 text-center">Project not found.</div>;
  }

  return (
    <div className="p-6">
      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-stretch">
        <div className="md:col-span-2 flex flex-col">
          <ProjectHeader 
            project={project} 
            onEdit={() => setOpenProjectEdit(true)}
            onNewTask={() => setOpenNewTask(true)}
            onNewLink={() => setOpenLink(true)}
            onNewStakeholder={() => setOpenStakeholder(true)}
            onNewMember={() => {
              setMemberForm({ name: '', role: 'Developer', avatar: '' });
              setIsEditingMember(false);
              setOpenMemberDialog(true);
            }}
          />
        </div>
        
        <ProjectSidebar project={project} loading={loading} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="board" value={activeTab} onValueChange={setActiveTab} className="mb-4">
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
          <ProjectBoard 
            projectTasks={projectTasks} 
            projectId={project?.id}
            onTaskClick={handleTaskClick}
            fetchTasksForProject={fetchTasksForProject}
            toast={toast}
          />
        </TabsContent>
        
        <TabsContent value="activity">
          <ProjectActivity />
        </TabsContent>
        
        <TabsContent value="github">
          <ProjectGitHub />
        </TabsContent>
      </Tabs>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <ProjectMembers 
          project={project}
          onAddMember={() => {
            setMemberForm({ name: '', role: 'Developer', avatar: '' });
            setIsEditingMember(false);
            setOpenMemberDialog(true);
          }}
          onEditMember={handleEditMember}
          onRemoveMember={handleRemoveMember}
        />
        
        <ProjectStakeholders 
          project={project}
          onAddStakeholder={() => {
            setStakeholderForm({ name: '', email: '', phone: '' });
            setIsEditingStakeholder(false);
            setOpenStakeholder(true);
          }}
          onEditStakeholder={handleEditStakeholder}
          onRemoveStakeholder={handleRemoveStakeholder}
        />
        
        <ProjectLinks 
          project={project}
          onAddLink={() => {
            setLinkForm({ title: '', url: '', id: '' });
            setIsEditingLink(false);
            setOpenLink(true);
          }}
          onEditLink={handleEditLink}
          onRemoveLink={handleRemoveLink}
        />
      </div>

      {/* Delete project button */}
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

      {/* Dialogs */}
      <NewTaskDialog 
        open={openNewTask} 
        onOpenChange={setOpenNewTask}
        project={project}
        fetchTasksForProject={fetchTasksForProject}
        toast={toast}
      />
      
      <EditProjectDialog 
        open={openProjectEdit} 
        onOpenChange={setOpenProjectEdit}
        project={project}
        onSuccess={fetchProjectDetails}
        toast={toast}
      />
      
      <TeamMemberDialog 
        open={openMemberDialog}
        onOpenChange={setOpenMemberDialog}
        isEditing={isEditingMember}
        memberForm={memberForm}
        setMemberForm={setMemberForm}
        onSubmit={handleAddMember}
        setIsEditing={setIsEditingMember}
      />
      
      <StakeholderDialog
        open={openStakeholder}
        onOpenChange={setOpenStakeholder}
        isEditing={isEditingStakeholder}
        stakeholderForm={stakeholderForm}
        setStakeholderForm={setStakeholderForm}
        onSubmit={handleAddStakeholder}
        setIsEditing={setIsEditingStakeholder}
      />
      
      <LinkDialog
        open={openLink}
        onOpenChange={setOpenLink}
        isEditing={isEditingLink}
        linkForm={linkForm}
        setLinkForm={setLinkForm}
        onSubmit={handleAddLink}
        setIsEditing={setIsEditingLink}
      />
      
      <DeleteProjectDialog
        open={openDeleteProject}
        onOpenChange={setOpenDeleteProject}
        projectName={project?.name}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
};

// Skeleton component for loading state
const ProjectSkeleton = () => {
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
                <Skeleton className="h-7 w-7 rounded-md" /> {/* Edit button */}
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
          <Skeleton className="h-24 w-full mt-4" /> {/* Description placeholder */}
          <Skeleton className="h-20 w-full mt-4" /> {/* Guidelines placeholder */}
          <Skeleton className="h-16 w-full mt-4" /> {/* Scoped Paths placeholder */}
        </div>
        <div className="bg-card rounded-lg p-4 border space-y-3">
          <Skeleton className="h-5 w-1/3 mb-3" /> {/* Recent Activity Title */}
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
};

export default Project;