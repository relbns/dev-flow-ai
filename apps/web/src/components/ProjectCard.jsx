
import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'; // Added DropdownMenuSeparator
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog'; // Import AlertDialog components
import { Clock, MoreVertical, Users, Edit, Trash2, AlertCircle, ExternalLink, Eye, User } from 'lucide-react'; // Added User
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; 
import { supabase } from '@/lib/supabaseClient'; // Using @ alias

const ProjectCard = ({ project, onProjectDeleted }) => { 
  const { toast } = useToast(); 
  const navigate = useNavigate(); 

  const handleOpenProject = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleGoToRepository = () => {
    if (project.github_repo_url) {
      window.open(project.github_repo_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({ title: "No Repository URL", description: "This project does not have a GitHub repository URL set.", variant: "destructive" });
    }
  };

  const handleEdit = () => {
    // You mentioned edit is implemented as a popup on the project page.
    // So, clicking edit here might also navigate to the project page, perhaps with a query param?
    // Or, if the project page itself has the edit functionality directly, this button might be redundant
    // if "Open Project" takes you there. For now, let's keep the toast.
    // toast({ title: "Edit Project", description: "Edit functionality is available on the project detail page." });
    navigate(`/projects/${project.id}?action=edit`); 
  };

  const handleDelete = async () => {
    // Confirmation is handled by AlertDialog trigger, actual delete logic here
    try {
      const { error } = await supabase.functions.invoke('delete-project', {
        method: 'POST',
        body: { project_id: project.id },
      });

      if (error) throw error;

      toast({ title: "Project Deleted", description: `Project "${project.name}" and all its data have been deleted.` });
      if (onProjectDeleted) {
        onProjectDeleted(project.id); // Notify parent to refresh list
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      toast({ title: "Error Deleting Project", description: err.message || "Could not delete the project.", variant: "destructive" });
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'default'; // Or a specific color like 'green' if you have it
      case 'completed':
        return 'secondary'; // Or 'blue'
      case 'archived':
        return 'outline'; // Or 'gray'
      default:
        return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-lg">
              <Link to={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                {project.name || "Unnamed Project"}
              </Link>
            </CardTitle>
            {/* project.status is not in Supabase data yet, hide for now or add to schema later */}
            {/* {project.status && (
              <Badge variant={getStatusVariant(project.status)} className="capitalize">
                {project.status}
              </Badge>
            )} */}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description || "No description available."}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onClick={handleOpenProject}>
              <Eye className="mr-2 h-4 w-4" />
              <span>Open Project</span>
            </DropdownMenuItem>
            {project.github_repo_url && (
              <DropdownMenuItem className="cursor-pointer" onClick={handleGoToRepository}>
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Go to Repository</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                  {/* onSelect preventDefault to stop DropdownMenu from closing before AlertDialog opens */}
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project 
                    <span className="font-semibold"> {project.name}</span> and all its associated data (tasks, guidelines, scoped paths, comments).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Yes, delete project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pb-2">
        {/* Task counts are not available from the 'projects' table directly. */}
        {/* This section can be re-enabled if/when task aggregation is added to project data. */}
        {project.tasks ? (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-status-notStarted/10 text-status-notStarted">
                {project.tasks.notStarted || 0} Not Started
              </Badge>
              <Badge variant="outline" className="bg-status-inProgress/10 text-status-inProgress">
                {project.tasks.inProgress || 0} In Progress
              </Badge>
              <Badge variant="outline" className="bg-status-completed/10 text-status-completed">
                {project.tasks.completed || 0} Completed
              </Badge>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" /> Task counts not available yet.
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Display Leader User ID */}
          {project.leader_user_id && (
            <div className="flex items-center gap-1" title={`Leader User ID: ${project.leader_user_id}`}>
              <User className="h-4 w-4" />
              <span className="truncate max-w-[100px]">Leader: {project.leader_user_id.substring(0, 8)}...</span> 
            </div>
          )}
          {/* project.members is not in Supabase data yet */}
          {/* <Users className="h-4 w-4 ml-4" /> 
          <span>{project.members || 'N/A'} members</span> */}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            Updated {project.updated_at ? formatDistanceToNow(parseISO(project.updated_at), { addSuffix: true }) : 'N/A'}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
