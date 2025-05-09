
import React, { useState } from 'react';
import TaskCard from '@/components/TaskCard';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Tasks = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Mock tasks data - in a real app, this would come from an API or state management
  const tasks = [
    {
      id: '1',
      title: 'Implement authentication middleware',
      description: 'Create JWT-based authentication middleware for the API with proper error handling and token validation.',
      status: 'inProgress',
      priority: 'high',
      dueDate: 'May 5, 2025',
      assignee: {
        name: 'John Smith',
        avatar: ''
      },
      projectName: 'API Development',
      comments: 3
    },
    {
      id: '2',
      title: 'Design dashboard UI components',
      description: 'Create reusable UI components for the main dashboard following the design system guidelines.',
      status: 'notStarted',
      priority: 'medium',
      dueDate: 'May 10, 2025',
      assignee: {
        name: 'John Smith',
        avatar: ''
      },
      projectName: 'Frontend Redesign',
      comments: 1
    },
    {
      id: '3',
      title: 'Fix responsive layout issues',
      description: 'Address responsive layout problems on mobile devices for the project overview page.',
      status: 'inProgress',
      priority: 'high',
      dueDate: 'May 3, 2025',
      assignee: {
        name: 'John Smith',
        avatar: ''
      },
      projectName: 'Frontend Redesign',
      comments: 0
    }
  ];

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  // Filter tasks based on search query and status filter
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getFilteredTasksByStatus = (status) => {
    // Now, filteredTasks already considers all filters, so just filter by the requested status for grouping
    return filteredTasks.filter(task => task.status === status);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-grow max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks..."
                className="pl-9 bg-secondary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('notStarted')}
                >
                  Not Started
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('inProgress')}
                >
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('completed')}
                >
                  Completed
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPriorityFilter('all')}
                >
                  All
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPriorityFilter('high')}
                >
                  High
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPriorityFilter('medium')}
                >
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setPriorityFilter('low')}
                >
                  Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="default" size="sm">
              Add Task
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">In Progress</h2>
            <div className="space-y-3">
              {getFilteredTasksByStatus('inProgress').map(task => (
                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
              ))}
              {getFilteredTasksByStatus('inProgress').length === 0 && (
                <p className="text-muted-foreground text-sm">No tasks in progress</p>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3">Not Started</h2>
            <div className="space-y-3">
              {getFilteredTasksByStatus('notStarted').map(task => (
                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
              ))}
              {getFilteredTasksByStatus('notStarted').length === 0 && (
                <p className="text-muted-foreground text-sm">No tasks to start</p>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3">Completed</h2>
            <div className="space-y-3">
              {getFilteredTasksByStatus('completed').map(task => (
                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
              ))}
              {getFilteredTasksByStatus('completed').length === 0 && (
                <p className="text-muted-foreground text-sm">No completed tasks</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
