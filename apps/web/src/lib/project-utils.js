// src/lib/project-utils.js

/**
 * Gets the project leader from the members array
 * @param {Array} members - The project members array
 * @returns {Object} - The project leader object or a default
 */
export const getProjectLeader = (members) => {
  if (!members || !Array.isArray(members) || members.length === 0) {
    return { name: 'N/A', avatar: '' };
  }
  return members.find((m) => m.role === 'Project Lead') || members[0];
};

/**
 * Gets other members excluding the project lead
 * @param {Array} members - The project members array
 * @returns {Array} - Array of members excluding the project lead
 */
export const getOtherMembers = (members) => {
  if (!members || !Array.isArray(members)) {
    return [];
  }
  return members.filter((m) => m.role !== 'Project Lead') || [];
};

/**
 * Gets variant based on project status
 * @param {string} status - The project status
 * @returns {string} - The variant for the badge
 */
export const getStatusVariant = (status) => {
  switch (status) {
    case 'active':
      return 'outline';
    case 'completed':
      return 'success';
    case 'archived':
      return 'secondary';
    default:
      return 'outline';
  }
};

/**
 * Copy text to clipboard with a toast notification
 * @param {string} text - Text to copy
 * @param {string} message - Toast message
 * @param {Function} toast - Toast function
 */
export const copyToClipboard = (text, message, toast) => {
  navigator.clipboard.writeText(text);
  toast({ title: message || 'Copied!' });
};

/**
 * Format a task for display in the board
 * @param {Object} task - The raw task data
 * @returns {Object} - Formatted task with display properties
 */
export const formatTaskForDisplay = (task) => {
  return {
    ...task,
    assignee: task.assignee || { name: 'Unassigned', avatar: '' },
    comments: task.comments || 0,
    priority: task.priority || 'medium',
    dueDate: task.dueDate || 'N/A',
  };
};

/**
 * Group tasks by status for the Kanban board
 * @param {Array} tasks - Array of tasks
 * @returns {Object} - Tasks organized by status columns
 */
export const groupTasksByStatus = (tasks) => {
  if (!tasks || !Array.isArray(tasks)) {
    return {
      notStarted: [],
      inProgress: [],
      completed: [],
    };
  }

  return {
    notStarted: tasks
      .filter((task) => task.status === 'Backlog' || task.status === 'To Do')
      .map(formatTaskForDisplay),
    inProgress: tasks
      .filter((task) => task.status === 'In Progress')
      .map(formatTaskForDisplay),
    completed: tasks
      .filter((task) => task.status === 'Done' || task.status === 'In Review')
      .map(formatTaskForDisplay),
  };
};