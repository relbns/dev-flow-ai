
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandGroup,
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { CheckSquare, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { tasks } from './mockData';

const TasksSection = ({ runCommand }) => {
  const navigate = useNavigate();
  
  const completeTask = (taskId) => {
    console.log(`Completing task ${taskId}`);
    // In a real app, you'd update the task status via API or state management
  };

  return (
    <>
      <CommandGroup heading="Tasks">
        {tasks.map((task) => (
          <CommandItem
            key={task.id}
            onSelect={() => runCommand(() => navigate(`/tasks/${task.id}`))}
            className="flex justify-between"
          >
            <div className="flex items-center">
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>{task.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({task.projectName})
              </span>
              {task.organization && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {task.organization.name}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {task.status !== 'completed' && (
                <CheckCircle 
                  className="h-4 w-4 text-green-500 cursor-pointer hover:text-green-700" 
                  onClick={(e) => {
                    e.stopPropagation();
                    completeTask(task.id);
                  }}
                />
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
    </>
  );
};

export default TasksSection;