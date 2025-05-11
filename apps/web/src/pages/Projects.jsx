import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProjectCard from '@/components/ProjectCard';
import { Skeleton } from "@/components/ui/skeleton"; 
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"; 
import { Plus, Search, Github, User, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // Using @ alias
import { useToast } from "@/hooks/use-toast";

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const initialScopedPath = { name: '', path_in_repo: '', notes: '' };
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    repository: '',
    designUrl: '', // Not in DB
    client: '', // Not in DB
    dueDate: '', // Not in DB
    projectLeader: '', // Not in DB
    projectGuidelines: '',
    scopedPaths: [initialScopedPath], // Initialize with one empty scoped path
  });

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
    setNewProjectForm({
      name: '',
      subtitle: '',
      description: '',
      repository: '',
      designUrl: '',
      client: '',
      dueDate: '',
      projectLeader: '',
      projectGuidelines: '',
      scopedPaths: [{ ...initialScopedPath }],
    });
  };

  const handleNewProjectSubmit = async (e) => {
    e.preventDefault();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a project.",
        variant: "destructive",
      });
      return;
    }
    const userId = session.user.id;

    try {
      setLoadingProjects(true);
      // 1. Insert into 'projects' table
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: newProjectForm.name,
          github_repo_url: newProjectForm.repository,
          description: newProjectForm.description,
        })
        .select()
        .single();

      if (projectError) throw projectError;
      const newProjectId = projectData.id;

      // 2. Insert into 'project_guidelines' table
      if (newProjectForm.projectGuidelines.trim() !== "") {
        const { error: guidelineError } = await supabase
          .from('project_guidelines')
          .insert({
            project_id: newProjectId,
            guideline_text: newProjectForm.projectGuidelines,
            order: 1
          });
        if (guidelineError) console.error("Error saving project guidelines:", guidelineError); // Log but don't fail
      }

      // 3. Insert into 'scoped_paths' table
      const validScopedPaths = newProjectForm.scopedPaths.filter(
        sp => sp.name.trim() !== '' || sp.path_in_repo.trim() !== '' || (sp.notes && sp.notes.trim() !== '')
      );

      if (validScopedPaths.length > 0) {
        const scopedPathsToInsert = validScopedPaths.map(sp => ({
          project_id: newProjectId,
          name: sp.name.trim() === '' ? null : sp.name.trim(), // Save null if name is empty
          path_in_repo: sp.path_in_repo.trim() === '' ? null : sp.path_in_repo.trim(),
          notes: sp.notes.trim() === '' ? null : sp.notes.trim(), // Save null if notes are empty
        }));
        const { error: scopedPathsError } = await supabase
          .from('scoped_paths')
          .insert(scopedPathsToInsert);
        if (scopedPathsError) console.error("Error saving scoped paths:", scopedPathsError); // Log but don't fail
      }
      
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

  const fetchProjects = useCallback(async () => { // Wrap with useCallback
    setLoadingProjects(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({ title: "Error Fetching Projects", description: error.message, variant: "destructive" });
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [toast]); // Add toast as a dependency for fetchProjects

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]); 

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
        {projects
          .filter((project) =>
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
          )
          .filter((project) => {
            if (filterStatus === 'all') return true;
            // Assuming project status will be added to DB later, for now this filter won't do much
            return project.status === filterStatus; 
          })
          .map((project) => (
          <ProjectCard key={project.id} project={project} onProjectDeleted={handleProjectDeleted} />
        ))}
      </div>
    </div>
  );
};

export default Projects;
