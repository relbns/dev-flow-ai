import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProjectCard from '@/components/ProjectCard';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Search, Github, User, Trash2, Building, ChevronsUpDown, Check } from 'lucide-react';
import { apiClient } from '@/lib/apiClient'; // Use apiClient instead of supabase
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contextType, selectedOrganization } = useOutletContext(); // Consume context
  const { user } = useAuth(); // Use auth context

  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // This filter is for project.status, not orgs
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [githubOrgRepos, setGithubOrgRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchTerm, setRepoSearchTerm] = useState("");
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [repoSelectOpen, setRepoSelectOpen] = useState(false);
  const [leaderSelectOpen, setLeaderSelectOpen] = useState(false);

  const initialScopedPath = { name: '', path_in_repo: '', notes: '' };
  const initialNewProjectForm = useMemo(() => ({
    name: '',
    description: '',
    repository: '',
    org: contextType === 'organization' && selectedOrganization ? selectedOrganization.login : 'Personal',
    projectLeader: currentUserId || '',
    projectGuidelines: '',
    scopedPaths: [initialScopedPath],
  }), [currentUserId, contextType, selectedOrganization]);

  const [newProjectForm, setNewProjectForm] = useState(initialNewProjectForm);

  const handleScopedPathChange = (index, field, value) => {
    const updatedPaths = [...newProjectForm.scopedPaths];
    updatedPaths[index][field] = value;
    setNewProjectForm(prev => ({ ...prev, scopedPaths: updatedPaths }));
  };

  const addScopedPath = () => {
    setNewProjectForm(prev => ({
      ...prev,
      scopedPaths: [...prev.scopedPaths, { ...initialScopedPath }]
    }));
  };

  const removeScopedPath = (index) => {
    if (newProjectForm.scopedPaths.length <= 1) {
      toast({ title: "Cannot remove", description: "At least one scoped path entry is required.", variant: "destructive" });
      return;
    }
    const updatedPaths = newProjectForm.scopedPaths.filter((_, i) => i !== index);
    setNewProjectForm(prev => ({ ...prev, scopedPaths: updatedPaths }));
  };

  const resetForm = () => {
    setNewProjectForm(initialNewProjectForm);
    setRepoSearchTerm("");
    setLeaderSearchTerm("");
  };

  // Fetch current user ID on mount - Updated to use useAuth
  useEffect(() => {
    if (user) {
      setCurrentUserId(user.id);
      // Update form's default leader only if it hasn't been changed by the user yet
      setNewProjectForm(prev => ({
        ...prev,
        projectLeader: prev.projectLeader || user.id // Set default if empty
      }));
    }
  }, [user]);

  // Fetch available leaders based on context and optionally a specific repository
  const fetchUsers = useCallback(async (repoFullName = null) => {
    if (!user) {
      console.error("Cannot fetch users: User not authenticated");
      return;
    }
    
    setLoadingLeaders(true);
    setAvailableLeaders([]);

    try {
      if (contextType === 'organization' && selectedOrganization?.login) {
        // For simplicity, we'll just add the current user for now
        setAvailableLeaders([{ 
          id: user.id, 
          display_name: user.displayName || user.username || user.email || 'Current User' 
        }]);
      } else { // Personal context or no org selected
        setAvailableLeaders([{ 
          id: user.id, 
          display_name: user.displayName || user.username || user.email || 'Current User' 
        }]);
      }
    } catch (error) {
      console.error('Error fetching users for project creation:', error);
      toast({ title: "Error Fetching Users", description: error.message, variant: "destructive" });
      
      // Fallback to current user on any error
      setAvailableLeaders([{ 
        id: user.id, 
        display_name: user.displayName || user.username || user.email || 'Current User' 
      }]);
    } finally {
      setLoadingLeaders(false);
    }
  }, [toast, contextType, selectedOrganization, user]);

  // Fetch GitHub repos for the selected org (simplified)
  const fetchOrgRepos = useCallback(async (orgName) => {
    if (!orgName || orgName === 'Personal') {
      setGithubOrgRepos([]);
      return;
    }
    setLoadingRepos(true);
    try {
      // Placeholder for now - in a real app we'd fetch from GitHub
      setGithubOrgRepos([
        { id: 1, name: 'example-repo-1', html_url: 'https://github.com/org/example-repo-1' },
        { id: 2, name: 'example-repo-2', html_url: 'https://github.com/org/example-repo-2' }
      ]);
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      toast({ title: "Error Fetching GitHub Repos", description: error.message, variant: "destructive" });
      setGithubOrgRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [toast]);

  // Effect to fetch data when dialog opens
  useEffect(() => {
    if (openNewProjectDialog) {
      // Reset form state based on current context when dialog opens
      setNewProjectForm(initialNewProjectForm);
      fetchUsers();
      if (contextType === 'organization' && selectedOrganization) {
        fetchOrgRepos(selectedOrganization.login);
      } else {
        setGithubOrgRepos([]);
      }
    }
  }, [openNewProjectDialog, fetchUsers, fetchOrgRepos, contextType, selectedOrganization, initialNewProjectForm]);

  const handleNewProjectSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "Authentication Error", description: "Could not verify user.", variant: "destructive" });
      return;
    }

    // Prepare payload for creating a new project
    const payload = {
      name: newProjectForm.name,
      description: newProjectForm.description || null,
      repository: newProjectForm.repository || null,
      org: newProjectForm.org === 'Personal' ? null : newProjectForm.org,
      project_leader: newProjectForm.projectLeader || null,
      guidelines: newProjectForm.projectGuidelines.trim() ? [newProjectForm.projectGuidelines] : [],
      scopedPaths: newProjectForm.scopedPaths.filter(
        sp => (sp.name && sp.name.trim() !== '') || (sp.path_in_repo && sp.path_in_repo.trim() !== '') || (sp.notes && sp.notes.trim() !== '')
      ).map(sp => ({
         name: sp.name?.trim() || null,
         path_in_repo: sp.path_in_repo?.trim() || null,
         notes: sp.notes?.trim() || null
      })),
    };

    console.log("Submitting new project payload:", payload);

    try {
      setLoadingProjects(true);

      // Use apiClient to create project
      const newProject = await apiClient.projects.create(payload);
      
      console.log("Project created successfully:", newProject);
      toast({ title: "Project Created", description: `${newProjectForm.name} has been successfully created.` });
      setOpenNewProjectDialog(false);
      resetForm();
      fetchProjects();

    } catch (error) {
      console.error('Error creating new project:', error);
      toast({
        title: "Error Creating Project",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchProjects = useCallback(async () => {
    if (!user) {
      console.log("No user, skipping project fetch");
      setProjects([]);
      setLoadingProjects(false);
      return;
    }

    setLoadingProjects(true);
    
    // Determine the orgId to pass
    let orgIdToPass = undefined;
    if (contextType === 'organization' && selectedOrganization) {
      orgIdToPass = selectedOrganization.id;
    } else if (contextType === 'personal') {
      orgIdToPass = 'personal';
    }
    
    try {
      console.log(`Fetching projects with orgId: ${orgIdToPass}`);
      
      // Use apiClient to list projects
      const projects = await apiClient.projects.list({ 
        org_id: orgIdToPass 
      });
      
      setProjects(projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({ title: "Error Fetching Projects", description: error.message, variant: "destructive" });
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [toast, contextType, selectedOrganization, user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectDeleted = (deletedProjectId) => {
    setProjects(prevProjects => prevProjects.filter(p => p.id !== deletedProjectId));
  };

  if (loadingProjects && projects.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <Skeleton className="h-10 w-full sm:w-64" />
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-1" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-8 w-full" />
              </CardContent>
              <CardFooter className="pt-2 flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
          
          <Dialog open={openNewProjectDialog} onOpenChange={(isOpen) => {
            setOpenNewProjectDialog(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setOpenNewProjectDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="projectDescription">Description (General)</Label>
                  <Textarea
                    id="projectDescription"
                    value={newProjectForm.description}
                    onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter general project description"
                    className="min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectGuidelines">Project Guidelines</Label>
                  <Textarea
                    id="projectGuidelines"
                    value={newProjectForm.projectGuidelines}
                    onChange={(e) => setNewProjectForm(prev => ({ ...prev, projectGuidelines: e.target.value }))}
                    placeholder="Enter project-specific guidelines, conventions, tech stack notes, etc."
                    className="min-h-32"
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

                {/* Organization Field - Display Only */}
                <div className="space-y-2">
                  <Label htmlFor="projectOrg">
                    <span className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Organization
                    </span>
                  </Label>
                  <Input
                    id="projectOrg"
                    value={newProjectForm.org}
                    readOnly
                    className="bg-secondary"
                  />
                </div>

                {/* Project Leader Field - Searchable Select */}
                <div className="space-y-2">
                  <Label htmlFor="projectLeader">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Project Leader *
                    </span>
                  </Label>
                  <Popover open={leaderSelectOpen} onOpenChange={setLeaderSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={leaderSelectOpen}
                        className="w-full justify-between"
                        disabled={loadingLeaders}
                      >
                        {newProjectForm.projectLeader
                          ? availableLeaders.find(leader => leader.id === newProjectForm.projectLeader)?.display_name || "Select leader..."
                          : "Select leader..."}
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
                          <CommandEmpty>{loadingLeaders ? "Loading..." : "No leaders found."}</CommandEmpty>
                          <CommandGroup>
                            {availableLeaders
                              .filter(leader => leader.display_name.toLowerCase().includes(leaderSearchTerm.toLowerCase()))
                              .map((leader) => (
                              <CommandItem
                                key={leader.id}
                                value={leader.id}
                                onSelect={(currentValue) => {
                                  setNewProjectForm(prev => ({ ...prev, projectLeader: currentValue === newProjectForm.projectLeader ? "" : currentValue }));
                                  setLeaderSelectOpen(false);
                                  setLeaderSearchTerm("");
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${newProjectForm.projectLeader === leader.id ? "opacity-100" : "opacity-0"}`}
                                />
                                {leader.display_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* GitHub Repository Field - Conditional Searchable Select / Input */}
                <div className="space-y-2">
                  <Label htmlFor="repository">
                    <span className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub Repository
                    </span>
                  </Label>
                  {newProjectForm.org !== 'Personal' && githubOrgRepos.length > 0 ? (
                    <Popover open={repoSelectOpen} onOpenChange={setRepoSelectOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={repoSelectOpen}
                          className="w-full justify-between"
                          disabled={loadingRepos}
                        >
                          {newProjectForm.repository
                            ? githubOrgRepos.find(repo => repo.html_url === newProjectForm.repository)?.name || "Select repository..."
                            : "Select repository..."}
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
                            <CommandEmpty>{loadingRepos ? "Loading..." : "No repositories found."}</CommandEmpty>
                            <CommandGroup>
                              {githubOrgRepos
                                .filter(repo => repo.name.toLowerCase().includes(repoSearchTerm.toLowerCase()))
                                .map((repo) => (
                                <CommandItem
                                  key={repo.id}
                                  value={repo.html_url}
                                  onSelect={(currentValue) => {
                                    const selectedRepoFullName = githubOrgRepos.find(r => r.html_url === currentValue)?.full_name;
                                    setNewProjectForm(prev => ({ 
                                      ...prev, 
                                      repository: currentValue === prev.repository ? "" : currentValue,
                                    }));
                                    setRepoSelectOpen(false);
                                    setRepoSearchTerm("");
                                    if (currentValue && selectedRepoFullName) {
                                      fetchUsers(selectedRepoFullName);
                                    } else if (!currentValue) {
                                      fetchUsers();
                                    }
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${newProjectForm.repository === repo.html_url ? "opacity-100" : "opacity-0"}`}
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
                      id="repository"
                      value={newProjectForm.repository}
                      onChange={(e) => setNewProjectForm(prev => ({ ...prev, repository: e.target.value }))}
                      placeholder="Enter GitHub repository URL (e.g., https://github.com/org/repo)"
                      disabled={loadingRepos && newProjectForm.org !== 'Personal'}
                    />
                  )}
                </div>

                {/* Scoped Paths Section */}
                <div className="space-y-4 border-t border-border pt-4 mt-4">
                  <Label className="text-base font-medium">Scoped Paths / Components</Label>
                  <p className="text-xs text-muted-foreground">
                    Define specific directories within your repository relevant to this project (e.g., frontend, backend). At least one name and path is recommended.
                  </p>
                  {newProjectForm.scopedPaths.map((scopedPath, index) => (
                    <div key={index} className="p-3 border rounded-md space-y-3 bg-secondary/50 relative">
                       {newProjectForm.scopedPaths.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7"
                          onClick={() => removeScopedPath(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <div className="space-y-1">
                        <Label htmlFor={`scopedPathName-${index}`}>Component Name (Optional)</Label>
                        <Input
                          id={`scopedPathName-${index}`}
                          value={scopedPath.name}
                          onChange={(e) => handleScopedPathChange(index, 'name', e.target.value)}
                          placeholder="E.g., Frontend App, API Service"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`scopedPathPath-${index}`}>Path in Repository (Optional)</Label>
                        <Input
                          id={`scopedPathPath-${index}`}
                          value={scopedPath.path_in_repo}
                          onChange={(e) => handleScopedPathChange(index, 'path_in_repo', e.target.value)}
                          placeholder="E.g., /apps/web, /services/api"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`scopedPathNotes-${index}`}>Notes (Optional)</Label>
                        <Textarea
                          id={`scopedPathNotes-${index}`}
                          value={scopedPath.notes}
                          onChange={(e) => handleScopedPathChange(index, 'notes', e.target.value)}
                          placeholder="E.g., React, Node.js, uses TailwindCSS"
                          className="min-h-20 bg-background"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addScopedPath}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Another Scoped Path
                  </Button>
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
            (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (project.org && project.org.toLowerCase().includes(searchTerm.toLowerCase()))
          )
          .filter((project) => {
            if (filterStatus === 'all') return true;
            return project.status === filterStatus;
          })
          .map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectDeleted={handleProjectDeleted}
            />
          ))}
      </div>
    </div>
  );
};

export default Projects;