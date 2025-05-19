// src/components/project/ProjectStakeholders.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Users, Plus, MoreVertical, Pencil, Trash } from 'lucide-react';

const ProjectStakeholders = ({ project, onAddStakeholder, onEditStakeholder, onRemoveStakeholder }) => {
  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Stakeholders
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAddStakeholder}
          disabled={!project}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {project?.stakeholders?.map((stakeholder) => (
          <div key={stakeholder.id} className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-sm font-medium">{stakeholder.name}</p>
              <p className="text-xs text-muted-foreground">{stakeholder.email}</p>
              {stakeholder.phone && (
                <p className="text-xs text-muted-foreground">{stakeholder.phone}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditStakeholder(stakeholder)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onRemoveStakeholder(stakeholder.id)}
                >
                  <Trash className="h-4 w-4 mr-2" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {(project?.stakeholders?.length === 0 || !project?.stakeholders) && (
          <p className="text-sm text-muted-foreground">
            No stakeholders added yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectStakeholders;