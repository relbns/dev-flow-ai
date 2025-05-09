
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Clock, MoreVertical, Users, Edit, Trash2 } from 'lucide-react';

const ProjectCard = ({ project }) => {
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
                {project.name}
              </Link>
            </CardTitle>
            {project.status && (
              <Badge variant={getStatusVariant(project.status)} className="capitalize">
                {project.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-status-notStarted/10 text-status-notStarted">
              {project.tasks.notStarted} Not Started
            </Badge>
            <Badge variant="outline" className="bg-status-inProgress/10 text-status-inProgress">
              {project.tasks.inProgress} In Progress
            </Badge>
            <Badge variant="outline" className="bg-status-completed/10 text-status-completed">
              {project.tasks.completed} Completed
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{project.members} members</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Updated {project.lastUpdated}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
