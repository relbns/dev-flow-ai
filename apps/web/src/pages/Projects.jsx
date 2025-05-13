import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added SelectGroup, SelectLabel
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // For searchable selects
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // For searchable selects
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProjectCard from '@/components/ProjectCard';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Search, Github, User, Trash2, Building, ChevronsUpDown, Check } from 'lucide-react'; // Added Building, ChevronsUpDown, Check
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contextType, selectedOrganization } = useOutletContext(); // Consume context

  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // This filter is for project.status, not orgs
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [availableLeaders, setAvailableLeaders] = useState([]); // [{ id: uuid, display_name: string }]
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [githubOrgRepos, setGithubOrgRepos] = useState([]); // [{ id: number, name: string, full_name: string, html_url: string }]
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchTerm, setRepoSearchTerm] = useState(""); // For searchable repo select
  const [leaderSearchTerm, setLeaderSearchTerm] = useState(""); // For searchable leader select
  const [repoSelectOpen, setRepoSelectOpen] = useState(false); // For searchable repo select popover
  const [leaderSelectOpen, setLeaderSelectOpen] = useState(false); // For searchable leader select popover


  const initialScopedPath = { name: '', path_in_repo: '', notes: '' };
  const initialNewProjectForm = useMemo(() => ({ // Use useMemo to depend on currentUserId and selectedOrganization
    name: '',
    description: '',
    repository: '', // Store selected repo URL here
    org: contextType === 'organization' && selectedOrganization ? selectedOrganization.login : 'Personal', // Set initial org based on context
    projectLeader: currentUserId || '', // Default to current user ID
    projectGuidelines: '',
    scopedPaths: [initialScopedPath],
  }), [currentUserId, contextType, selectedOrganization]); // Dependencies for initial form state

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
    if (newProjectForm.scopedPaths.length <= 1) { // Always keep at least one form
      toast({ title: "Cannot remove", description: "At least one scoped path entry is required.", variant: "destructive" });
      return;
    }
    const updatedPaths = newProjectForm.scopedPaths.filter((_, i) => i !== index);
    setNewProjectForm(prev => ({ ...prev, scopedPaths: updatedPaths }));
  };

  const resetForm = () => {
      // Reset to initial state derived from context and user ID
      setNewProjectForm(initialNewProjectForm);
      setRepoSearchTerm("");
      setLeaderSearchTerm("");
  };

  // Fetch current user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        // Update form's default leader only if it hasn't been changed by the user yet
        setNewProjectForm(prev => ({
          ...prev,
          projectLeader: prev.projectLeader || session.user.id // Set default if empty
        }));
      }
    };
    fetchUserId();
  }, []);

  // Fetch available leaders based on context and optionally a specific repository
  const fetchUsers = useCallback(async (repoFullName = null) => { // Added repoFullName parameter
    setLoadingLeaders(true);
    setAvailableLeaders([]); // Clear previous leaders

    const { data: { session } } = await supabase.auth.getSession();
    const localCurrentUserId = session?.user?.id;

    try {
      if (contextType === 'organization' && selectedOrganization?.login) {
        // Fetch GitHub org members using GET via fetch
        const orgMembersFunctionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-org-members?orgName=${encodeURIComponent(selectedOrganization.login)}`;
        const orgMembersResponse = await fetch(orgMembersFunctionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`, // session is defined above
            'Content-Type': 'application/json'
          },
        });

        if (!orgMembersResponse.ok) {
          const errorData = await orgMembersResponse.json().catch(() => ({ error: `Failed to fetch org members: ${orgMembersResponse.statusText}` }));
          throw new Error(errorData.error || `Failed to fetch org members: ${orgMembersResponse.statusText}`);
        }
        const orgMembers = await orgMembersResponse.json();

        // if (orgMembersError) { // This block is effectively replaced by the fetch error handling above
        //   console.error("Error fetching GitHub org members:", orgMembersError);
        // toast({ title: "Error Fetching Org Members", description: orgMembersError.message, variant: "destructive" }); 
          // Fallback: set current user as only leader if org members fail
          // This fallback logic is now part of the catch block or the main error handling for orgMembersResponse.ok
          // if (localCurrentUserId) {
          //   const { data: currentUserProfile } = await supabase.from('profiles').select('id, full_name, username').eq('id', localCurrentUserId).single();
          //   setAvailableLeaders([{ id: localCurrentUserId, display_name: currentUserProfile?.full_name || currentUserProfile?.username || session?.user?.email || 'Current User' }]);
        // Extra brace and orgMembers re-declaration removed.
        
        let combinedGithubLogins = new Set();

        // Get org members' logins
        const orgMemberLogins = orgMembers?.map(member => member.login).filter(login => login) || [];
        orgMemberLogins.forEach(login => combinedGithubLogins.add(login));

        // If a repo is specified, also get its collaborators
        if (repoFullName) {
          try {
            const collaboratorsFunctionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-repo-collaborators?repoFullName=${encodeURIComponent(repoFullName)}`;
            const collaboratorsResponse = await fetch(collaboratorsFunctionUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
            });
            if (collaboratorsResponse.ok) {
              const collaborators = await collaboratorsResponse.json();
              const collaboratorLogins = collaborators?.map(collab => collab.login).filter(login => login) || [];
              collaboratorLogins.forEach(login => combinedGithubLogins.add(login));
            } else {
              const errorData = await collaboratorsResponse.json().catch(() => ({ error: `Failed to fetch repo collaborators: ${collaboratorsResponse.statusText}` }));
              console.warn(`Could not fetch collaborators for ${repoFullName}: ${errorData.error || collaboratorsResponse.statusText}`);
              // Non-fatal, proceed with org members
            }
          } catch (collabError) {
            console.warn(`Error fetching collaborators for ${repoFullName}:`, collabError);
            // Non-fatal
          }
        }
        
        const finalGithubLogins = Array.from(combinedGithubLogins);

        if (finalGithubLogins.length > 0) {
          const { data: supabaseUsers, error: mapError } = await supabase.functions.invoke(
            'get-supabase-users-by-github-logins',
            { method: 'POST', body: { github_logins: finalGithubLogins } }
          );

          if (mapError) {
            console.error("Error mapping GitHub logins to Supabase users:", mapError);
            toast({ title: "Error Mapping Users", description: mapError.message, variant: "destructive" });
            if (localCurrentUserId) {
              const { data: currentUserProfile } = await supabase.from('profiles').select('id, full_name, username').eq('id', localCurrentUserId).single();
              setAvailableLeaders([{ id: localCurrentUserId, display_name: currentUserProfile?.full_name || currentUserProfile?.username || session?.user?.email || 'Current User' }]);
            }
          } else {
            setAvailableLeaders(supabaseUsers || []);
            if ((!supabaseUsers || supabaseUsers.length === 0) && localCurrentUserId) {
              console.warn("No Supabase users found for combined logins. Setting current user as default leader.");
              const { data: currentUserProfile } = await supabase.from('profiles').select('id, full_name, username').eq('id', localCurrentUserId).single();
              setAvailableLeaders([{ id: localCurrentUserId, display_name: currentUserProfile?.full_name || currentUserProfile?.username || session?.user?.email || 'Current User' }]);
            }
          }
        } else {
           // No GitHub members or collaborators found
           console.warn("No GitHub logins found from org members or collaborators. Setting current user as default leader.");
           if (localCurrentUserId) {
             const { data: currentUserProfile } = await supabase.from('profiles').select('id, full_name, username').eq('id', localCurrentUserId).single();
             setAvailableLeaders([{ id: localCurrentUserId, display_name: currentUserProfile?.full_name || currentUserProfile?.username || session?.user?.email || 'Current User' }]);
           }
        }

      } else { // Personal context or no org selected
        if (localCurrentUserId) {
          const { data: currentUserProfile } = await supabase.from('profiles').select('id, full_name, username').eq('id', localCurrentUserId).single();
          setAvailableLeaders([{ id: localCurrentUserId, display_name: currentUserProfile?.full_name || currentUserProfile?.username || session?.user?.email || 'Current User' }]);
        }
      }
    } catch (error) {
      console.error('Error fetching users for project creation:', error);
      toast({ title: "Error Fetching Users", description: error.message, variant: "destructive" });
       if (localCurrentUserId) { // Fallback to current user on any error
         const { data: currentUserProfile } = await supabase.from('profiles').select('id, full_name, username').eq('id', localCurrentUserId).single();
         setAvailableLeaders([{ id: localCurrentUserId, display_name: currentUserProfile?.full_name || currentUserProfile?.username || session?.user?.email || 'Current User' }]);
       }
    } finally {
      setLoadingLeaders(false);
    }
  }, [toast, contextType, selectedOrganization, supabase]); // Added supabase to dependencies

  // Fetch GitHub repos for the selected org
  const fetchOrgRepos = useCallback(async (orgName) => {
    if (!orgName || orgName === 'Personal') {
      setGithubOrgRepos([]);
      return;
    }
    setLoadingRepos(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("User not authenticated or access token missing.");
      }

      const functionUrl = `${supabase.functions.getFunctionsUrl()}/list-github-org-projects?orgName=${encodeURIComponent(orgName)}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to fetch repos: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to fetch repos: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGithubOrgRepos(data || []);

    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      toast({ title: "Error Fetching GitHub Repos", description: error.message, variant: "destructive" });
      setGithubOrgRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [toast]); // Removed supabase dependency as it's stable

  // Effect to fetch data when dialog opens
  useEffect(() => {
    if (openNewProjectDialog) {
      // Reset form state based on current context when dialog opens
      setNewProjectForm(initialNewProjectForm);
      fetchUsers();
      if (contextType === 'organization' && selectedOrganization) {
        fetchOrgRepos(selectedOrganization.login);
      } else {
        setGithubOrgRepos([]); // Clear repos if personal context
      }
    }
  }, [openNewProjectDialog, fetchUsers, fetchOrgRepos, contextType, selectedOrganization, initialNewProjectForm]);


  const handleNewProjectSubmit = async (e) => {
    e.preventDefault();

    // Use currentUserId state instead of fetching session again
    if (!currentUserId) {
        toast({ title: "Authentication Error", description: "Could not verify user.", variant: "destructive" });
        return;
    }

    // Prepare payload for the create-project function
    const payload = {
      projectName: newProjectForm.name,
      description: newProjectForm.description || null,
      githubRepoURL: newProjectForm.repository || null,
      org: newProjectForm.org === 'Personal' ? null : newProjectForm.org, // Send org name or null
      project_leader: newProjectForm.projectLeader || null, // Send selected leader ID
      guidelines: newProjectForm.projectGuidelines.trim() ? [newProjectForm.projectGuidelines] : [], // Send guidelines as array
      scopedPaths: newProjectForm.scopedPaths.filter( // Filter empty paths before sending
        sp => (sp.name && sp.name.trim() !== '') || (sp.path_in_repo && sp.path_in_repo.trim() !== '') || (sp.notes && sp.notes.trim() !== '')
      ).map(sp => ({ // Ensure nulls are sent correctly if needed by function
         name: sp.name?.trim() || null,
         path_in_repo: sp.path_in_repo?.trim() || null,
         notes: sp.notes?.trim() || null
      })),
      // user_id_from_gateway is not needed here as we call directly with user's token
    };

    console.log("Submitting new project payload:", payload);

    try {
      setLoadingProjects(true); // Reuse loading state for submission indication

      const { data: newProjectDetails, error } = await supabase.functions.invoke('create-project', {
        method: 'POST',
        body: payload,
      });

      if (error) throw error;

      console.log("Project created successfully:", newProjectDetails);
      toast({ title: "Project Created", description: `${newProjectForm.name} has been successfully created.` });
      setOpenNewProjectDialog(false);
      resetForm();
      fetchProjects(); // Refresh the project list

    } catch (error) {
      console.error('Error creating new project via function:', error);
      toast({
        title: "Error Creating Project",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchProjects = useCallback(async () => { // Wrap with useCallback
    setLoadingProjects(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }

    // Determine the orgId to pass to the function
    let orgIdToPass = undefined; // Removed type annotation
    if (contextType === 'organization' && selectedOrganization) {
      // Assuming selectedOrganization has an 'id' property which is the GitHub org ID
      orgIdToPass = selectedOrganization.id;
    } else if (contextType === 'personal') {
      orgIdToPass = 'personal'; // Use the special string 'personal'
    }
    // If contextType is neither 'organization' nor 'personal', orgIdToPass remains undefined, 
    // and the function should return all projects for the user.

    try {
      console.log(`Invoking list-projects function with orgId: ${orgIdToPass}`);
      const { data, error } = await supabase.functions.invoke('list-projects', {
        method: 'POST', // Use POST to send body easily
        body: { orgId: orgIdToPass }, // Pass orgId in the body
      });

      if (error) throw error;
      // The function now returns the projects array directly
      setProjects(data || []); 
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({ title: "Error Fetching Projects", description: error.message, variant: "destructive" });
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [toast, contextType, selectedOrganization]); // Add context dependencies

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]); // fetchProjects itself now depends on contextType and selectedOrganization

  const handleProjectDeleted = (deletedProjectId) => {
    // Optimistically remove the project from the list
    setProjects(prevProjects => prevProjects.filter(p => p.id !== deletedProjectId));
    // Optionally, you can still call fetchProjects() to ensure data consistency
    // or if other users might be modifying the list. For a single user app,
    // optimistic update is often enough until next full load/refresh.
    // For now, let's rely on the optimistic update for perceived speed.
    // If backend delete failed in ProjectCard, the toast there would inform user.
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
            if (!isOpen) resetForm(); // Reset form when dialog closes
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setOpenNewProjectDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"> {/* Increased width */}
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
                                  value={repo.html_url} // Use html_url as the value
                                  onSelect={(currentValue) => {
                                    const selectedRepoFullName = githubOrgRepos.find(r => r.html_url === currentValue)?.full_name;
                                    setNewProjectForm(prev => ({ 
                                      ...prev, 
                                      repository: currentValue === prev.repository ? "" : currentValue,
                                      // Potentially clear/update leader if repo changes
                                    }));
                                    setRepoSelectOpen(false);
                                    setRepoSearchTerm("");
                                    // Trigger fetching collaborators if a repo is selected
                                    if (currentValue && selectedRepoFullName) {
                                      fetchUsers(selectedRepoFullName); // Pass repoFullName to fetchUsers
                                    } else if (!currentValue) { // If repo is deselected
                                      fetchUsers(); // Fetch users based on org context only
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
                       {newProjectForm.scopedPaths.length > 1 && ( // Show remove button only if more than one
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
                
                {/* Other fields from original form - commented out as not in DB schema */}
                {/* ... subtitle, designUrl, projectLeader, client, dueDate ... */}

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
        {projects // Keep existing filtering/mapping logic for displaying cards
          .filter((project) =>
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (project.org && project.org.toLowerCase().includes(searchTerm.toLowerCase())) // Add org search
          )
          .filter((project) => {
            if (filterStatus === 'all') return true;
            return project.status === filterStatus; // Status filter remains (assuming status field exists)
          })
          .map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectDeleted={handleProjectDeleted}
              // Pass leaders data for display on card if needed later
              // availableLeaders={availableLeaders}
            />
          ))}
      </div>
    </div>
  );
};

export default Projects;
