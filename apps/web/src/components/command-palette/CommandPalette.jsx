
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty
} from '@/components/ui/command';

import NavigationSection from './NavigationSection';
import ProjectsSection from './ProjectsSection';
import TasksSection from './TasksSection';
import AiIntegrationSection from './AiIntegrationSection';
import { useCommandPalette } from './useCommandPalette';

const CommandPalette = () => {
  const navigate = useNavigate();
  const { open, setOpen, apiEndpoint, runCommand } = useCommandPalette();

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <AiIntegrationSection 
          apiEndpoint={apiEndpoint}
          runCommand={runCommand}
        />
        
        <ProjectsSection 
          runCommand={runCommand}
        />
        
        <TasksSection 
          runCommand={runCommand}
        />
        
        <NavigationSection 
          runCommand={runCommand}
        />
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
