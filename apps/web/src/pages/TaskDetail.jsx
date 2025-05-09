
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  MessageSquare, 
  Edit, 
  Trash2, 
  Github,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data
const task = {
  id: '1',
  title: 'Implement authentication middleware',
  description: 'Create JWT-based authentication middleware for the API with proper error handling and token validation. Should include refresh token functionality and user role verification.',
  status: 'inProgress',
  priority: 'high',
  dueDate: '2025-05-05',
  createdAt: '2025-04-25',
  projectId: '1',
  projectName: 'API Development',
  assignee: {
    id: '1',
    name: 'John Smith',
    avatar: ''
  },
  creator: {
    id: '2',
    name: 'Jane Cooper',
    avatar: ''
  },
  comments: [
    {
      id: '1',
      author: {
        id: '2',
        name: 'Jane Cooper',
        avatar: ''
      },
      content: 'I think we should use refresh tokens as well for better security.',
      timestamp: '2025-04-27 14:32'
    },
    {
      id: '2',
      author: {
        id: '1',
        name: 'John Smith',
        avatar: ''
      },
      content: "Good point. I'll add that to the implementation. I'm thinking of using a Redis store for blacklisted tokens.",
      timestamp: '2025-04-27 15:45'
    },
    {
      id: '3',
      author: {
        id: '3',
        name: 'Alex Johnson',
        avatar: ''
      },
      content: "Don't forget to add rate limiting to the auth endpoints!",
      timestamp: '2025-04-29 09:20'
    }
  ],
  activity: [
    { 
      id: '1', 
      type: 'created',
      user: { id: '2', name: 'Jane Cooper' },
      timestamp: '2025-04-25 10:15' 
    },
    { 
      id: '2', 
      type: 'updated',
      field: 'status',
      oldValue: 'notStarted',
      newValue: 'inProgress',
      user: { id: '1', name: 'John Smith' },
      timestamp: '2025-04-26 14:32' 
    },
    { 
      id: '3', 
      type: 'comment',
      user: { id: '2', name: 'Jane Cooper' },
      timestamp: '2025-04-27 14:32' 
    },
    { 
      id: '4', 
      type: 'updated',
      field: 'priority',
      oldValue: 'medium',
      newValue: 'high',
      user: { id: '2', name: 'Jane Cooper' },
      timestamp: '2025-04-28 09:10' 
    }
  ],
  github: {
    commits: [
      {
        id: 'abc123',
        message: 'Initial auth middleware setup',
        author: 'johnsmith',
        timestamp: '2025-04-26 16:45',
        url: 'https://github.com/username/repo/commit/abc123'
      },
      {
        id: 'def456',
        message: 'Add JWT validation logic',
        author: 'johnsmith',
        timestamp: '2025-04-28 11:30',
        url: 'https://github.com/username/repo/commit/def456'
      }
    ],
    pullRequest: {
      id: '42',
      title: 'Feature: Authentication Middleware',
      status: 'open',
      url: 'https://github.com/username/repo/pull/42'
    }
  }
};

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // In a real app, we would fetch the task data based on the ID
  const taskData = task;
  
  // Priority colors
  const priorityColors = {
    low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
    medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
    high: 'bg-priority-high/10 text-priority-high border-priority-high/20'
  };
  
  // Status options
  const statusOptions = [
    { value: 'notStarted', label: 'Not Started' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Format timestamp
  const formatTimestamp = (timestampString) => {
    const date = new Date(timestampString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get initials from name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            className="mb-4"
            onClick={() => navigate(`/projects/${taskData.projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Task Details */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-semibold">{taskData.title}</h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-card border rounded-lg p-6 mb-6">
                <div className="mb-6">
                  <h2 className="font-medium mb-3">Description</h2>
                  <p className="text-muted-foreground">{taskData.description}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                    <Select defaultValue={taskData.status}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Priority</h3>
                    <Badge className={cn('font-normal', priorityColors[taskData.priority])}>
                      {taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1)}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Assignee</h3>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={taskData.assignee.avatar} />
                        <AvatarFallback>{getInitials(taskData.assignee.name)}</AvatarFallback>
                      </Avatar>
                      <span>{taskData.assignee.name}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(taskData.dueDate)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created By</h3>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={taskData.creator.avatar} />
                        <AvatarFallback>{getInitials(taskData.creator.name)}</AvatarFallback>
                      </Avatar>
                      <span>{taskData.creator.name}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created On</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(taskData.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* GitHub Integration */}
              <div className="bg-card border rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    GitHub Integration
                  </h2>
                  <Button variant="outline" size="sm">View on GitHub</Button>
                </div>
                
                {taskData.github.pullRequest && (
                  <div className="mb-4 pb-4 border-b">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Pull Request</h3>
                    <div className="bg-secondary/50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <a 
                          href={taskData.github.pullRequest.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          #{taskData.github.pullRequest.id} {taskData.github.pullRequest.title}
                        </a>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {taskData.github.pullRequest.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Commits</h3>
                <div className="space-y-2">
                  {taskData.github.commits.map(commit => (
                    <div key={commit.id} className="bg-secondary/50 p-3 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <a 
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium text-sm"
                          >
                            {commit.message}
                          </a>
                          <div className="text-xs text-muted-foreground mt-1">
                            by {commit.author} on {formatTimestamp(commit.timestamp)}
                          </div>
                        </div>
                        <div className="text-xs font-code text-muted-foreground">
                          {commit.id.substring(0, 7)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Comments */}
              <div className="bg-card border rounded-lg p-6">
                <h2 className="font-medium flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({taskData.comments.length})
                </h2>
                
                <div className="space-y-4 mb-4">
                  {taskData.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-secondary p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{comment.author.name}</span>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(comment.timestamp)}</span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Textarea 
                      placeholder="Add a comment..." 
                      className="min-h-24 pr-10"
                    />
                    <Button 
                      size="icon" 
                      className="absolute bottom-3 right-3 h-7 w-7"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Activity Log */}
            <div className="md:w-80 lg:w-96">
              <div className="bg-card border rounded-lg p-4 sticky top-6">
                <h2 className="font-medium mb-4">Activity</h2>
                <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
                  {taskData.activity.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{getInitials(item.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute top-5 bottom-0 left-3.5 w-px bg-border" />
                      </div>
                      <div className="pb-3">
                        <div className="text-sm">
                          <span className="font-medium">{item.user.name}</span>
                          {item.type === 'created' && ' created this task'}
                          {item.type === 'updated' && (
                            <>
                              {' updated '}
                              <span className="font-medium">{item.field}</span>
                              {' from '}
                              <span className="font-medium">{item.oldValue}</span>
                              {' to '}
                              <span className="font-medium">{item.newValue}</span>
                            </>
                          )}
                          {item.type === 'comment' && ' commented on this task'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
