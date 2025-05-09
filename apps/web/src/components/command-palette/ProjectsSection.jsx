
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandGroup,
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { projects } from './mockData';

const ProjectsSection = ({ runCommand }) => {
  const navigate = useNavigate();
  
  return (
    <>
      <CommandGroup heading="Projects">
        {projects.map((project) => (
          <CommandItem
            key={project.id}
            onSelect={() => runCommand(() => navigate(`/projects/${project.id}`))}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {project.name}
            {project.organization && (
              <Badge variant="outline" className="ml-2 text-xs">
                {project.organization.name}
              </Badge>
            )}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
    </>
  );
};

export default ProjectsSection;
