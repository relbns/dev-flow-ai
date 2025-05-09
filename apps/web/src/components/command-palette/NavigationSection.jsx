
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import { Folder, Building } from 'lucide-react';

const NavigationSection = ({ runCommand }) => {
  const navigate = useNavigate();
  
  return (
    <CommandGroup heading="Navigation">
      <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
        <Folder className="mr-2 h-4 w-4" />
        Dashboard
      </CommandItem>
      <CommandItem onSelect={() => runCommand(() => navigate('/projects'))}>
        <Folder className="mr-2 h-4 w-4" />
        All Projects
      </CommandItem>
      <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
        <Folder className="mr-2 h-4 w-4" />
        Settings
      </CommandItem>
      <CommandItem onSelect={() => runCommand(() => navigate('/settings/organizations'))}>
        <Building className="mr-2 h-4 w-4" />
        Organizations
      </CommandItem>
    </CommandGroup>
  );
};

export default NavigationSection;
