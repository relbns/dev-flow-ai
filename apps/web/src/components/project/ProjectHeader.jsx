// src/components/project/ProjectHeader.jsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Folder, 
  Pencil, 
  Users, 
  Github, 
  Copy, 
  Plus, 
  ChevronDown, 
  LinkIcon, 
  UserPlus 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ProjectHeader = ({ project, onEdit, onNewTask, onNewLink, onNewStakeholder, onNewMember }) => {
  const { toast } = useToast();

  // Helper functions
  const getProjectLeader = () =>
    project?.members?.find((m) => m.role === 'Project Lead') ||
    project?.members?.[0] || { name: 'N/A', avatar: '' };
  
  const getOtherMembers = () =>
    project?.members?.filter((m) => m.role !== 'Project Lead') || [];
  
  const getStatusVariant = (status) => 'outline';

  const copyToClipboard = (text, msg) => {
    navigator.clipboard.writeText(text);
    toast({ title: msg || 'Copied!' });
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              {project?.name}
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
              onClick={onEdit}
              disabled={!project}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2">
            {project?.subtitle || project?.description}
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
          {(!project?.members || project.members.length === 0) && (
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
                  onClick={onNewTask}
                >
                  <Plus className="h-4 w-4 mr-2" /> New Task
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={onNewLink}
                >
                  <LinkIcon className="h-4 w-4 mr-2" /> New Link
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={onNewStakeholder}
                >
                  <UserPlus className="h-4 w-4 mr-2" /> New Stakeholder
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={onNewMember}
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
        {!project?.github_repo_url && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Github className="h-4 w-4" />
            <span>No repository linked.</span>
          </div>
        )}
      </div>

      {/* Project Description */}
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

      {/* Project Guidelines */}
      {project?.project_guidelines && project.project_guidelines.length > 0 && (
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

      {/* Scoped Paths/Components */}
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
                    <span className="font-medium">Path:</span> {sp.path_in_repo}
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
  );
};

export default ProjectHeader;