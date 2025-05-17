import React, { useState, useEffect } from 'react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/apiClient'; // Use apiClient instead of supabase
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const Tasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth(); // Use auth context
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTasks = async () => {
      if (!user) {
        console.log("No authenticated user, skipping task fetch");
        setAllTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use apiClient to fetch tasks
        const tasks = await apiClient.tasks.list();

        // Format tasks for display
        const formattedTasks = (tasks || []).map(task => ({
          ...task,
          projectName: task.project?.name || 'N/A',
          assignee: { name: task.assignee?.displayName || 'Unassigned', avatar: task.assignee?.avatarUrl || '' }, 
          comments: task.comments?.length || 0, 
          priority: task.priority || 'medium',
          dueDate: task.dueDate ? formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true }) : 
                  (task.updated_at ? formatDistanceToNow(parseISO(task.updated_at), { addSuffix: true }) : 'N/A')
        }));
        
        setAllTasks(formattedTasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        toast({ title: "Error Fetching Tasks", description: "Could not fetch tasks at this time.", variant: "destructive" });
        setAllTasks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserTasks();
  }, [toast, navigate, user]); // Added user as dependency

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const filteredTasks = allTasks.filter(task => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (task.title?.toLowerCase().includes(searchLower)) ||
      (task.description && task.description.toLowerCase().includes(searchLower)) ||
      (task.projectName && task.projectName.toLowerCase().includes(searchLower));
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
        if (statusFilter === 'notStarted') {
            matchesStatus = task.status === 'Backlog' || task.status === 'To Do';
        } else if (statusFilter === 'inProgress') {
            matchesStatus = task.status === 'In Progress';
        } else if (statusFilter === 'completed') {
            matchesStatus = task.status === 'Done' || task.status === 'In Review';
        } 
    }
    return matchesSearch && matchesStatus;
  });

  const getTasksByGroup = (group) => {
    if (group === 'inProgress') {
      return filteredTasks.filter(task => task.status === 'In Progress');
    }
    if (group === 'notStarted') {
      return filteredTasks.filter(task => task.status === 'Backlog' || task.status === 'To Do');
    }
    if (group === 'completed') {
      return filteredTasks.filter(task => task.status === 'Done' || task.status === 'In Review');
    }
    return [];
  };
  
  const taskGroups = [
    { title: 'In Progress', statusKey: 'inProgress', tasks: getTasksByGroup('inProgress') },
    { title: 'Not Started', statusKey: 'notStarted', tasks: getTasksByGroup('notStarted') },
    { title: 'Completed', statusKey: 'completed', tasks: getTasksByGroup('completed') },
  ];


  if (loading) {
    return <div className="p-6 text-center">Loading tasks...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-xl font-semibold">My Tasks</h1>
          <div className="flex-grow max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks by title, description, project..."
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
                  <span>Filter by Status</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusFilter('all')}>All Tasks</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusFilter('notStarted')}>Not Started</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusFilter('inProgress')}>In Progress</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setStatusFilter('completed')}>Completed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="default" size="sm" disabled title="Create tasks from within a specific project.">
              Add Task
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-auto">
        {filteredTasks.length === 0 && !loading && (
          <p className="text-muted-foreground text-center py-10">
            No tasks match your current filters. Try adjusting search or status filters.
          </p>
        )}
        {allTasks.length > 0 && filteredTasks.length > 0 && (
          <div className="space-y-8">
            {taskGroups.map(group => (
              group.tasks.length > 0 && (
                <div key={group.statusKey}>
                  <h2 className="text-lg font-semibold mb-3">{group.title} ({group.tasks.length})</h2>
                  <div className="space-y-3">
                    {group.tasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task.id)} />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
         {allTasks.length === 0 && !loading && (
          <p className="text-muted-foreground text-center py-10">You have no tasks yet.</p>
        )}
      </div>
    </div>
  );
};

export default Tasks;