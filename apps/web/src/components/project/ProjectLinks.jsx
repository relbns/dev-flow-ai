// src/components/project/ProjectLinks.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LinkIcon, Plus, MoreVertical, Pencil, Trash, ExternalLink } from 'lucide-react';

const ProjectLinks = ({ project, onAddLink, onEditLink, onRemoveLink }) => {
  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Links
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAddLink}
          disabled={!project}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {project?.links?.map((link) => (
          <div key={link.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-2 overflow-hidden">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-primary transition-colors truncate flex items-center gap-1"
              >
                {link.title || link.url}
                <ExternalLink className="h-3 w-3 inline opacity-70" />
              </a>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditLink(link)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onRemoveLink(link.id)}
                >
                  <Trash className="h-4 w-4 mr-2" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {(project?.links?.length === 0 || !project?.links) && (
          <p className="text-sm text-muted-foreground">
            No links added yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectLinks;