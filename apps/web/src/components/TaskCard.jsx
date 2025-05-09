
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const TaskCard = ({ task, onClick }) => {
  // Priority colors
  const priorityColors = {
    low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
    medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
    high: 'bg-priority-high/10 text-priority-high border-priority-high/20'
  };

  // Get initials from assignee name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  // Format priority based on available space
  const getPriorityDisplay = (priority) => {
    if (window.innerWidth < 450) {
      return priority.charAt(0).toUpperCase();
    }
    return priority;
  };

  return (
    <Card 
      className="mb-3 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 select-none"
      onClick={() => onClick && onClick(task.id)}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex justify-between items-start">
          <h3 className="font-medium truncate mr-2">{task.title}</h3>
          <Badge className={cn('font-normal text-xs whitespace-nowrap', priorityColors[task.priority])}>
            {getPriorityDisplay(task.priority)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
              <AvatarFallback className="text-xs">{getInitials(task.assignee.name)}</AvatarFallback>
            </Avatar>
            
            {task.comments > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                {task.comments}
              </div>
            )}
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate max-w-[80px]">{task.dueDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
