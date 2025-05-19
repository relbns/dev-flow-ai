// src/components/project/ProjectBoard.jsx
import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import TaskColumn from '../tasks/TaskColumn';

const ProjectBoard = ({ projectTasks, projectId, onTaskClick, fetchTasksForProject, toast }) => {
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
      projectTasks[destColumnKey][0]?.status ||
      (destColumnKey === 'notStarted'
        ? 'To Do'
        : destColumnKey === 'inProgress'
        ? 'In Progress'
        : destColumnKey === 'completed'
        ? 'Done'
        : 'Backlog');

    const taskToMove = projectTasks[sourceColumnKey].find(
      (t) => t.id === draggableId
    );
    if (!taskToMove) return;

    const newSourceTasks = projectTasks[sourceColumnKey].filter(
      (t) => t.id !== draggableId
    );
    const newDestTasks = [...projectTasks[destColumnKey]];
    newDestTasks.splice(destination.index, 0, {
      ...taskToMove,
      status: newStatus,
    });

    // Optimistically update UI
    const newProjectTasks = {
      ...projectTasks,
      [sourceColumnKey]: newSourceTasks,
      [destColumnKey]: newDestTasks,
    };

    // Update task status in database
    supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', draggableId)
      .then(({ error: updateError }) => {
        if (updateError) {
          toast({
            title: 'Error updating task status',
            description: updateError.message,
            variant: 'destructive',
          });
          // Revert optimistic update on error
          fetchTasksForProject(projectId);
        } else {
          toast({
            title: 'Task Status Updated',
            description: `"${taskToMove.title}" moved to ${newStatus}`,
          });
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
                    {projectTasks[columnId].length}
                  </span>
                </h3>
                <TaskColumn 
                  tasks={projectTasks[columnId]} 
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