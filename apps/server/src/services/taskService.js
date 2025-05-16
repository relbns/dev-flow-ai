// src/services/taskService.js
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { createGithubIssue } from './githubService.js';

// Create a new task
export const createTask = async (userId, projectId, taskData) => {
    try {
        // Check project access
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        });

        if (!project) {
            throw new Error('Project not found or you do not have access');
        }

        // Create task
        const task = new Task({
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            project: projectId,
            creator: userId,
            assignee: taskData.assignee || null,
            dueDate: taskData.dueDate || null,
            tags: taskData.tags || [],
            relatedPaths: taskData.relatedPaths || []
        });

        // Create GitHub issue if repo is linked and option is enabled
        if (project.githubRepo && taskData.createGithubIssue) {
            try {
                const issueData = {
                    title: taskData.title,
                    body: taskData.description || '',
                    assignees: []
                };

                // If assignee is set, try to get their GitHub username
                if (taskData.assignee) {
                    const assigneeUser = await User.findById(taskData.assignee);
                    if (assigneeUser) {
                        issueData.assignees.push(assigneeUser.username);
                    }
                }

                const issue = await createGithubIssue(
                    { _id: userId },
                    project.githubRepo.owner.login,
                    project.githubRepo.name,
                    issueData
                );

                task.githubIssueId = issue.number.toString();
            } catch (issueError) {
                console.error('Error creating GitHub issue:', issueError);
                // Continue task creation even if GitHub issue creation fails
            }
        }

        await task.save();

        return task;
    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
};

// Get task by ID
export const getTaskById = async (taskId, userId) => {
    try {
        const task = await Task.findById(taskId)
            .populate('project', 'name githubRepo')
            .populate('creator', 'username displayName avatarUrl')
            .populate('assignee', 'username displayName avatarUrl')
            .populate('comments.author', 'username displayName avatarUrl');

        if (!task) {
            throw new Error('Task not found');
        }

        // Check project access
        const project = await Project.findOne({
            _id: task.project._id,
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        });

        if (!project) {
            throw new Error('You do not have access to this task');
        }

        return task;
    } catch (error) {
        console.error('Error getting task:', error);
        throw error;
    }
};

// Get tasks for a project
export const getProjectTasks = async (projectId, userId, filters = {}) => {
    try {
        // Check project access
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        });

        if (!project) {
            throw new Error('Project not found or you do not have access');
        }

        // Build query
        const query = { project: projectId };

        // Apply filters
        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.priority) {
            query.priority = filters.priority;
        }

        if (filters.assignee) {
            query.assignee = filters.assignee === 'unassigned' ? null : filters.assignee;
        }

        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }

        // Pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const skip = (page - 1) * limit;

        // Sort options
        const sortOptions = {};
        if (filters.sortBy) {
            sortOptions[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
        } else {
            // Default sort by updatedAt
            sortOptions.updatedAt = -1;
        }

        // Execute query
        const tasks = await Task.find(query)
            .populate('creator', 'username displayName avatarUrl')
            .populate('assignee', 'username displayName avatarUrl')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalCount = await Task.countDocuments(query);

        return {
            tasks,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        };
    } catch (error) {
        console.error('Error getting project tasks:', error);
        throw error;
    }
};

// Update task
export const updateTask = async (taskId, userId, updates) => {
    try {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Check project access
        const project = await Project.findOne({
            _id: task.project,
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        });

        if (!project) {
            throw new Error('You do not have access to this task');
        }

        // Update allowed fields
        const allowedFields = [
            'title', 'description', 'status', 'priority',
            'assignee', 'dueDate', 'tags', 'relatedPaths'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                task[field] = updates[field];
            }
        }

        await task.save();

        return task;
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

// Delete task
export const deleteTask = async (taskId, userId) => {
    try {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Check project access and permissions
        const project = await Project.findOne({
            _id: task.project,
            $or: [
                { owner: userId },
                { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
            ]
        });

        if (!project) {
            throw new Error('You do not have permission to delete this task');
        }

        await Task.deleteOne({ _id: taskId });

        return { success: true };
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

// Add comment to task
export const addTaskComment = async (taskId, userId, commentData) => {
    try {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Check project access
        const project = await Project.findOne({
            _id: task.project,
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        });

        if (!project) {
            throw new Error('You do not have access to this task');
        }

        // Add comment
        task.comments.push({
            author: userId,
            content: commentData.content,
            isAiGenerated: commentData.isAiGenerated || false
        });

        await task.save();

        // Populate author info for the new comment
        const updatedTask = await Task.findById(taskId)
            .populate('comments.author', 'username displayName avatarUrl');

        return updatedTask.comments[updatedTask.comments.length - 1];
    } catch (error) {
        console.error('Error adding task comment:', error);
        throw error;
    }
};

// Delete task comment
export const deleteTaskComment = async (taskId, commentId, userId) => {
    try {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Find the comment
        const commentIndex = task.comments.findIndex(c => c._id.toString() === commentId);

        if (commentIndex === -1) {
            throw new Error('Comment not found');
        }

        // Check if user is the comment author or has admin rights
        const isAuthor = task.comments[commentIndex].author.toString() === userId;

        if (!isAuthor) {
            // Check if user is project owner or admin
            const project = await Project.findOne({
                _id: task.project,
                $or: [
                    { owner: userId },
                    { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
                ]
            });

            if (!project) {
                throw new Error('You do not have permission to delete this comment');
            }
        }

        // Remove the comment
        task.comments.splice(commentIndex, 1);
        await task.save();

        return { success: true };
    } catch (error) {
        console.error('Error deleting task comment:', error);
        throw error;
    }
};