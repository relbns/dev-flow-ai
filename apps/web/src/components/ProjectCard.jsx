
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Clock, MoreVertical, Users, Edit, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; // Import useToast

const ProjectCard = ({ project }) => {
  const { toast } = useToast(); // Initialize toast

  const handleEdit = () => {
    toast({ title: "Edit Project", description: "This feature is not yet implemented." });
    // Later, this would navigate to an edit page or open an edit dialog.
    // e.g., navigate(`/projects/${project.id}/edit`);
  };

  const handleDelete = () => {
    toast({ title: "Delete Project", description: "This feature is not yet implemented.", variant: "destructive" });
    // Later, this would open a confirmation dialog and then call Supabase to delete.
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
            <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Project</span>
            </DropdownMenuItem>
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
          {/* project.members is not in Supabase data yet */}
          {/* <Users className="h-4 w-4" />
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
