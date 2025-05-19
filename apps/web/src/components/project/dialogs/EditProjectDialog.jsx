// src/components/project/dialogs/EditProjectDialog.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useProjectGithub } from '@/hooks/project/useProjectGithub';
import { useProjectUsers } from '@/hooks/project/useProjectUsers';

const EditProjectDialog = ({ open, onOpenChange, project, onSuccess, toast }) => {
  const [projectForm, setProjectForm] = useState({});
  const [initialProjectForm, setInitialProjectForm] = useState({});
  const [loading, setLoading] = useState(false);

  // Custom hooks for GitHub and users
  const { 
    githubOrgRepos, 
    loadingRepos, 
    repoSearchTerm, 
    repoSelectOpen,
    setRepoSearchTerm,
    setRepoSelectOpen,
    fetchOrgRepos
  } = useProjectGithub(toast);

  const {
    availableLeaders,
    loadingLeaders,
    leaderSearchTerm,
    leaderSelectOpen,
    setLeaderSearchTerm,
    setLeaderSelectOpen,
    fetchUsers
  } = useProjectUsers(toast);

  // Initialize form when dialog opens or project changes
  useEffect(() => {
    if (open && project) {
      const formData = {
        name: project.name || '',
        description: project.description || '',
        repository: project.github_repo_url || '',
        org: project.org || 'Personal',
        project_leader: project.project_leader || '',
        status: project.status || 'active',
        subtitle: project.subtitle || '',
        designUrl: '', // Not stored in the project object from the database
        client: '',    // Not stored in the project object from the database
        dueDate: '',   // Not stored in the project object from the database
      };
      setProjectForm(formData);
      setInitialProjectForm(formData);
      fetchUsers(project.org);
      if (project.org && project.org !== 'Personal') {
        fetchOrgRepos(project.org);
      }
    }
  }, [open, project, fetchUsers, fetchOrgRepos]);

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

    const payload = { };
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
    // Status field
    if (projectForm.status !== initialProjectForm.status) {
      payload.status = projectForm.status;
      hasChanges = true;
    }

    if (!hasChanges) {
      toast({
        title: 'No Changes',
        description: 'No changes were detected to save.',
      });
      onOpenChange(false);
      return;
    }

    console.log('Submitting project update payload:', payload);

    try {
      setLoading(true);
      
      // Use the apiClient instead of supabase.functions.invoke
      const updatedProject = await apiClient.projects.update(project.id, payload);

      console.log('Project updated successfully:', updatedProject);
      toast({
        title: 'Project Updated',
        description: `Project "${updatedProject.name}" has been updated.`,
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                                );
                                const repoToFetch = newRepositoryValue
                                  ? selectedRepoData?.full_name
                                  : null;
                                fetchUsers(projectForm.org, repoToFetch);
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
                      )?.display_name || 'Unknown leader'
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
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingRepos || loadingLeaders}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;