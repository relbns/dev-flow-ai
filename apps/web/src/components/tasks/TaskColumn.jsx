// src/components/tasks/TaskColumn.jsx
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import TaskCard from '@/components/TaskCard';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Pencil, Copy, Trash } from 'lucide-react';

const TaskColumn = ({ tasks, onTaskClick }) => {
  return (
    <>
      {tasks.map((task, index) => (
        <Draggable key={task.id} draggableId={task.id} index={index}>
          {(providedDraggable, snapshotDraggable) => (
            <div
              ref={providedDraggable.innerRef}
              {...providedDraggable.draggableProps}
              {...providedDraggable.dragHandleProps}
              className={cn(
                'mb-3 transition-all',
                snapshotDraggable.isDragging && 'scale-105 rotate-1 shadow-lg z-10'
              )}
            >
              <ContextMenu>
                <ContextMenuTrigger>
                  <TaskCard task={task} onClick={() => onTaskClick(task.id)} />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onTaskClick(task.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Task
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Task
                  </ContextMenuItem>
                  <ContextMenuItem className="text-red-600">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Task
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          )}
        </Draggable>
      ))}
    </>
  );
};

export default TaskColumn;