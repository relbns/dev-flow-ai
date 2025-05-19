// src/components/project/dialogs/NewTaskDialog.jsx
import React, { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NewTaskDialog = ({ open, onOpenChange, project, fetchTasksForProject, toast }) => {
  const initialTaskFormState = {
    title: '',
    description: '',
    status: 'Backlog',
    scoped_path_id: '',
  };
  
  const [newTaskForm, setNewTaskForm] = useState(initialTaskFormState);
  const [loading, setLoading] = useState(false);

  const handleNewTask = async (e) => {
    e.preventDefault();
    if (!project || !project.id) {
      toast({
        title: 'Error',
        description: 'Project context is missing.',
        variant: 'destructive',
      });
      return;
    }
    if (!newTaskForm.title.trim()) {
      toast({
        title: 'Error',
        description: 'Task title is required.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoading(true);
      const taskToInsert = {
        project_id: project.id,
        title: newTaskForm.title,
        description: newTaskForm.description || null,
        status: newTaskForm.status,
        scoped_path_id:
          newTaskForm.scoped_path_id === 'none-selected-value' ||
          newTaskForm.scoped_path_id === ''
            ? null
            : newTaskForm.scoped_path_id,
      };
      
      // Use apiClient instead of direct supabase call
      const data = await apiClient.tasks.create(taskToInsert);
      
      toast({
        title: 'Task Created',
        description: `Task "${data.title}" created.`,
      });
      onOpenChange(false);
      setNewTaskForm(initialTaskFormState);
      fetchTasksForProject(project.id);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error Creating Task',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleNewTask} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="taskTitle">Task Title *</Label>
            <Input
              id="taskTitle"
              placeholder="Enter task title"
              value={newTaskForm.title}
              onChange={(e) =>
                setNewTaskForm((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              placeholder="Enter task description"
              className="min-h-24"
              value={newTaskForm.description}
              onChange={(e) =>
                setNewTaskForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
          {project?.scoped_paths && project.scoped_paths.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="taskScopedPath">
                Associated Component / Scoped Path (Optional)
              </Label>
              <Select
                value={newTaskForm.scoped_path_id}
                onValueChange={(value) =>
                  setNewTaskForm((prev) => ({
                    ...prev,
                    scoped_path_id: value,
                  }))
                }
              >
                <SelectTrigger id="taskScopedPath">
                  <SelectValue placeholder="Select associated component" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none-selected-value">None</SelectItem>{' '}
                  {project.scoped_paths.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name || sp.path_in_repo || 'Unnamed Scope'} (
                      {sp.path_in_repo || 'No Path'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="taskStatus">Status</Label>
            <Select
              defaultValue="Backlog"
              value={newTaskForm.status}
              onValueChange={(value) =>
                setNewTaskForm((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger id="taskStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Backlog">Backlog</SelectItem>
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setNewTaskForm(initialTaskFormState);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskDialog;