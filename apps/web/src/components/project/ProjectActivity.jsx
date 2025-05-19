// src/components/project/ProjectActivity.jsx
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity } from 'lucide-react';

const ProjectActivity = () => {
  // Sample activity data - would be replaced with real data in production
  const activityItems = [
    {
      id: 1,
      user: { name: 'John Smith', initials: 'JS' },
      action: 'created a new task',
      item: 'Authentication middleware',
      time: '15m',
    },
    {
      id: 2,
      user: { name: 'Jane Cooper', initials: 'JC' },
      action: 'commented on',
      item: 'Rate limiting',
      time: '2h',
    },
    {
      id: 3,
      user: { name: 'Alex Johnson', initials: 'AJ' },
      action: 'updated the status of',
      item: 'Documentation',
      time: '1d',
    },
    {
      id: 4,
      user: { name: 'John Smith', initials: 'JS' },
      action: 'completed a task',
      item: 'User onboarding',
      time: '2d',
    },
    {
      id: 5,
      user: { name: 'Jane Cooper', initials: 'JC' },
      action: 'added a new team member',
      item: 'Sarah Parker',
      time: '3d',
    },
  ];

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activityItems.map((item) => (
          <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {item.user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm truncate">
                <span className="font-medium">{item.user.name}</span>
                <span className="text-muted-foreground"> {item.action} </span>
                <span className="font-medium truncate">{item.item}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectActivity;