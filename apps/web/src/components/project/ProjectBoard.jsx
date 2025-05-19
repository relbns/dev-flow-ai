// src/components/project/ProjectBoard.jsx
import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import TaskColumn from '../tasks/TaskColumn';
import { AlertCircle } from 'lucide-react';

const ProjectBoard = ({ projectTasks, projectId, onTaskClick, fetchTasksForProject, toast }) => {
  // Validate inputs to prevent errors
  if (!projectId) {
    return (
      <div className="p-6 border rounded-lg bg-destructive/10 text-destructive">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Cannot display task board: Project ID is missing.</span>
        </div>
      </div>
    );
  }

  // Ensure projectTasks is properly structured
  const validProjectTasks = {
    notStarted: Array.isArray(projectTasks?.notStarted) ? projectTasks.notStarted : [],
    inProgress: Array.isArray(projectTasks?.inProgress) ? projectTasks.inProgress : [],
    completed: Array.isArray(projectTasks?.completed) ? projectTasks.completed : [],
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceColumnKey = source.droppableId;
    const destColumnKey = destination.droppableId;

    let newStatus =
      validProjectTasks[destColumnKey][0]?.status ||
      (destColumnKey === 'notStarted'
        ? 'To Do'
        : destColumnKey === 'inProgress'
        ? 'In Progress'
        : destColumnKey === 'completed'
        ? 'Done'
        : 'Backlog');

    const taskToMove = validProjectTasks[sourceColumnKey].find(
      (t) => t.id === draggableId
    );
    if (!taskToMove) {
      console.warn('Task not found during drag operation:', draggableId);
      return;
    }

    const newSourceTasks = validProjectTasks[sourceColumnKey].filter(
      (t) => t.id !== draggableId
    );
    const newDestTasks = [...validProjectTasks[destColumnKey]];
    newDestTasks.splice(destination.index, 0, {
      ...taskToMove,
      status: newStatus,
    });

    // Optimistically update UI
    const newProjectTasks = {
      ...validProjectTasks,
      [sourceColumnKey]: newSourceTasks,
      [destColumnKey]: newDestTasks,
    };

    // Ensure we have a valid task ID before making the API call
    if (!draggableId) {
      toast({
        title: 'Error updating task',
        description: 'Task ID is missing or invalid.',
        variant: 'destructive',
      });
      return;
    }

    // Update task status in database using apiClient
    apiClient.tasks.updateStatus(draggableId, { status: newStatus })
      .then(() => {
        toast({
          title: 'Task Status Updated',
          description: `"${taskToMove.title}" moved to ${newStatus}`,
        });
      })
      .catch(error => {
        console.error('Error updating task status:', error);
        toast({
          title: 'Error updating task status',
          description: error.message,
          variant: 'destructive',
        });
        // Revert optimistic update on error by refetching tasks
        if (projectId) {
          fetchTasksForProject(projectId);
        }
      });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-board grid grid-cols-1 md:grid-cols-3 gap-6">
        {['notStarted', 'inProgress', 'completed'].map((columnId) => (
          <Droppable droppableId={columnId} key={columnId}>
            {(provided, snapshot) => (
              <div
                className={cn(
                  'kanban-column bg-card p-4 rounded-lg border transition-colors',
                  snapshot.isDraggingOver && 'bg-secondary/20 border-primary/50'
                )}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <h3 className="font-medium text-sm text-muted-foreground mb-4 flex items-center justify-between">
                  <span>
                    {columnId === 'notStarted'
                      ? 'NOT STARTED'
                      : columnId === 'inProgress'
                      ? 'IN PROGRESS'
                      : 'COMPLETED'}
                  </span>
                  <span className="bg-secondary px-2 py-0.5 rounded-md">
                    {validProjectTasks[columnId].length}
                  </span>
                </h3>
                <TaskColumn 
                  tasks={validProjectTasks[columnId]} 
                  onTaskClick={onTaskClick} 
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};

export default ProjectBoard;