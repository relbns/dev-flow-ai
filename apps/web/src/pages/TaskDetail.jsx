import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
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
// import { Separator } from '@/components/ui/separator'; // Not used in current V1 display
import { 
  ArrowLeft, 
  Calendar, 
  MessageSquare, 
  Edit, 
  Trash2, 
  Github,
  Send,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { format, parseISO, formatDistanceToNow } from 'date-fns'; // For date formatting

const TaskDetail = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // State for current user
  
  // Placeholder for comment input
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef(null); // Ref for scrolling

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Define fetchTaskDetails outside useEffect, wrapped in useCallback
  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) {
      setError("Task ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: taskError } = await supabase
        .from('tasks')
        .select('*, projects(name), scoped_paths(name, path_in_repo), task_comments:task_comments_with_user_info(id, user_id, author_display_name, comment_text, created_at, user_profile_data)')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      if (data) {
        const sortedComments = data.task_comments?.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ) || [];

        setTaskData({
          ...data,
          task_comments: sortedComments,
          priority: data.priority || 'medium',
          assignee: data.assignee || { id: 'unassigned', name: 'Unassigned', avatar: '' },
          creator: data.creator || { id: 'unknown', name: 'Unknown Creator', avatar: '' },
          activity: data.activity || [],
          github: data.github || { commits: [], pullRequest: null },
          dueDate: data.due_date || data.updated_at, 
          createdAt: data.created_at,
          projectName: data.projects?.name || 'N/A',
          scopedPathName: data.scoped_paths?.name || null,
          scopedPathRepoPath: data.scoped_paths?.path_in_repo || null,
        });
      } else {
        setError("Task not found.");
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
      setError(err.message || "Failed to fetch task details.");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [taskId, toast]); // Dependencies for useCallback

  useEffect(() => {
    // In React StrictMode (development), this useEffect might run twice.
    // This is intentional to help detect side effects.
    // The second call in development should not cause issues if the fetch function is idempotent
    // and state updates are handled correctly.
    // See: https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development
    fetchTaskDetails();
  }, [fetchTaskDetails]); // useEffect now depends on the memoized fetchTaskDetails

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    };
    fetchCurrentUser();
  }, []);
  
  const priorityColors = {
    low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
    medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
    high: 'bg-priority-high/10 text-priority-high border-priority-high/20'
  };
  
  const statusOptions = [
    // Values should match what's in the database for tasks.status
    { value: 'Backlog', label: 'Backlog' },
    { value: 'To Do', label: 'To Do' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Done', label: 'Done' }
  ];
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const formatTimestamp = (timestampString) => {
    if (!timestampString) return 'N/A';
    try {
      return format(parseISO(timestampString), 'MMM d, h:mm a');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleStatusChange = async (newStatus) => {
    if (!taskData) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskData.id);
      if (error) throw error;
      setTaskData(prev => ({ ...prev, status: newStatus, updated_at: new Date().toISOString() }));
      toast({ title: "Status Updated", description: `Task status changed to ${newStatus}` });
    } catch (err) {
      console.error("Error updating task status:", err);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };
  
  const handleAddComment = async () => { // Made function async
    if (!newComment.trim()) return;
    
    if (!taskData || !taskData.id) {
      toast({ title: "Error", description: "Task context is missing.", variant: "destructive" });
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession(); // Added error handling for getSession
    if (sessionError || !session?.user) {
      toast({ title: "Error", description: "You must be logged in to comment.", variant: "destructive" });
      return;
    }

    try {
      const commentToInsert = {
        task_id: taskData.id,
        comment_text: newComment,
        user_id: session.user.id,
        author_display_name: session.user.email || session.user.id, // Fallback to user.id if email is null
      };

      const { data: savedComment, error } = await supabase
        .from('task_comments')
        .insert(commentToInsert)
        .select()
        .single();
      
      if (error) throw error;

      // Construct a complete comment object for optimistic update
      const newCommentForUI = {
        ...savedComment,
        user_profile_data: session.user.user_metadata // Add user metadata for immediate display
      };

      setTaskData(prev => ({
        ...prev,
        // Ensure task_comments is an array before spreading
        task_comments: [...(prev.task_comments || []), newCommentForUI] 
      }));
      
      setNewComment('');
      toast({title: "Comment Added", description: "Your comment has been posted."});
      // No need to call fetchTaskDetails() anymore for this specific case
      // Scroll to bottom after optimistic update
      // Need to wait for the DOM to update after setTaskData
      setTimeout(scrollToBottom, 0); 

    } catch (err) {
      console.error("Error adding comment:", err);
      toast({title: "Error", description: "Failed to add comment: " + err.message, variant: "destructive"});
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-4" /> {/* Back button */}
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Task Details Skeleton */}
              <div className="flex-1">
                <Skeleton className="h-8 w-3/4 mb-4" /> {/* Title */}
                
                <div className="bg-card border rounded-lg p-6 mb-6 space-y-4">
                  <Skeleton className="h-6 w-1/4 mb-3" /> {/* Description heading */}
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 mt-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-card border rounded-lg p-6 mb-6 space-y-3"> {/* GitHub Skeleton */}
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
                
                <div className="bg-card border rounded-lg p-6 space-y-3"> {/* Comments Skeleton */}
                  <Skeleton className="h-6 w-1/4 mb-2" />
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                  <div className="flex gap-3 items-start mt-4">
                    <Skeleton className="h-8 w-8 rounded-full mt-1" />
                    <Skeleton className="h-20 w-full" /> {/* Textarea placeholder */}
                  </div>
                </div>
              </div>
              
              {/* Activity Log Skeleton */}
              <div className="md:w-80 lg:w-96">
                <div className="bg-card border rounded-lg p-4 sticky top-6 space-y-3">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  {[1,2,3].map(i => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  if (!taskData) {
    return <div className="p-6 text-center">Task not found.</div>;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            className="mb-4"
            onClick={() => navigate(taskData.project_id ? `/projects/${taskData.project_id}` : '/projects')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project {taskData.projectName && `(${taskData.projectName})`}
          </Button>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Task Details */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-semibold">{taskData.title || "Untitled Task"}</h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => toast({title: "Edit Task", description: "Not implemented yet."})}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive" onClick={() => toast({title: "Delete Task", description: "Not implemented yet.", variant: "destructive"})}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-card border rounded-lg p-6 mb-6">
                {taskData.description && (
                  <div className="mb-6">
                    <h2 className="font-medium mb-3">Description</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">{taskData.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                    <Select value={taskData.status} onValueChange={handleStatusChange}>
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
                    <Badge className={cn('font-normal', priorityColors[taskData.priority] || priorityColors.medium)}>
                      {taskData.priority ? (taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1)) : 'Medium'}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Assignee</h3>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={taskData.assignee?.avatar} />
                        <AvatarFallback>{getInitials(taskData.assignee?.name || 'U')}</AvatarFallback>
                      </Avatar>
                      <span>{taskData.assignee?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(taskData.dueDate)}</span>
                    </div>
                  </div>
                  
                  {taskData.scopedPathName && (
                     <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Component / Scope</h3>
                        <p className="text-sm">
                            {taskData.scopedPathName}
                            {taskData.scopedPathRepoPath && <span className="text-xs text-muted-foreground ml-1">({taskData.scopedPathRepoPath})</span>}
                        </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created On</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(taskData.createdAt)}</span>
                    </div>
                  </div>
                   <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDistanceToNow(parseISO(taskData.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* GitHub Integration - Placeholder */}
              <div className="bg-card border rounded-lg p-6 mb-6">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium flex items-center gap-2">
                        <Github className="h-5 w-5" />
                        GitHub Integration
                    </h2>
                    {/* <Button variant="outline" size="sm">View on GitHub</Button> */}
                 </div>
                 <p className="text-sm text-muted-foreground">GitHub integration details (commits, PRs) will be shown here later.</p>
              </div>
              
              {/* Comments - Placeholder */}
              <div className="bg-card border rounded-lg p-6">
                <h2 className="font-medium flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({taskData.task_comments?.length || 0})
                </h2>
                {taskData.task_comments && taskData.task_comments.length > 0 ? (
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-2">
                    {taskData.task_comments.map((comment, index) => {
                      const userProfile = comment.user_profile_data; // This is raw_user_meta_data from auth.users
                      const commenterAvatar = userProfile?.avatar_url;
                      const nameFromProfile = userProfile?.full_name || userProfile?.name; // User's actual name from GitHub
                      const emailFromProfile = userProfile?.email;

                      let finalAttributionText;
                      let nameForAvatarInitials = 'U';

                      if (nameFromProfile) { // We have GitHub profile name
                        nameForAvatarInitials = nameFromProfile;
                        if (comment.author_display_name && comment.author_display_name !== nameFromProfile && comment.author_display_name !== emailFromProfile) {
                          // author_display_name is likely an AI agent name
                          finalAttributionText = `${comment.author_display_name} (on behalf of ${nameFromProfile})`;
                        } else {
                          // Comment by user directly, or AI posted without a distinct agent name
                          finalAttributionText = nameFromProfile;
                        }
                      } else if (comment.author_display_name) {
                        // No GitHub profile name, but author_display_name exists (could be AI agent or user's email)
                        finalAttributionText = comment.author_display_name;
                        nameForAvatarInitials = comment.author_display_name;
                      } else {
                        finalAttributionText = 'Anonymous';
                      }

                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 mt-1">
                            {commenterAvatar ? <AvatarImage src={commenterAvatar} alt={nameForAvatarInitials} /> : null}
                            <AvatarFallback>{getInitials(nameForAvatarInitials)}</AvatarFallback>
                          </Avatar>
                          <div className="bg-secondary/50 p-3 rounded-lg flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold" title={finalAttributionText}>
                                {finalAttributionText} {/* Removed ellipsis */}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={commentsEndRef} /> {/* Invisible element to scroll to */}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">No comments yet. Be the first to comment!</p>
                )}
                <div className="flex gap-3 items-start"> {/* Added items-start for alignment */}
                  <Avatar className="h-8 w-8 mt-1"> {/* Added mt-1 for better alignment with textarea */}
                    {currentUser?.user_metadata?.avatar_url ? (
                      <AvatarImage src={currentUser.user_metadata.avatar_url} alt={currentUser.user_metadata.full_name || currentUser.email} />
                    ) : null}
                    <AvatarFallback>{getInitials(currentUser?.user_metadata?.full_name || currentUser?.email || 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Textarea 
                      placeholder="Add a comment..." 
                      className="min-h-24 pr-10"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button 
                      size="icon" 
                      className="absolute bottom-3 right-3 h-7 w-7"
                      onClick={handleAddComment}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Activity Log - Placeholder */}
            <div className="md:w-80 lg:w-96">
              <div className="bg-card border rounded-lg p-4 sticky top-6">
                <h2 className="font-medium mb-4">Activity</h2>
                <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
                  {taskData.activity && taskData.activity.length > 0 ? (
                     <p className="text-sm text-muted-foreground">Activity log will be shown here.</p>
                    // Map over actual activity items when available
                  ) : (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Toaster is now globally available in Layout.jsx, remove from here */}
    </div>
  );
};

export default TaskDetail;
