// src/components/project/ProjectSidebar.jsx
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';

const ProjectSidebar = ({ project, loading }) => {
  // Sample activity data - would be replaced with real data in production
  const activityData = [
    {
      id: 1,
      user: { name: 'John Smith', initials: 'JS' },
      action: 'Updated task status',
      time: '15m',
    },
    {
      id: 2,
      user: { name: 'Jane Cooper', initials: 'JC' },
      action: 'Added a comment',
      time: '2h',
    },
    {
      id: 3,
      user: { name: 'Alex Johnson', initials: 'AJ' },
      action: 'Created a new task',
      time: '1d',
    },
  ];

  if (loading && !project) {
    return (
      <div className="bg-card rounded-lg p-4 border flex flex-col">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border flex flex-col">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activityData.map((activity) => (
          <div key={activity.id} className="text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {activity.user.initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium truncate">
                {activity.user.name}
              </span>
            </div>
            <p className="text-muted-foreground ml-8 mt-1 truncate">
              {activity.action}
            </p>
            <p className="text-xs text-muted-foreground ml-8 mt-1">
              {activity.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectSidebar;