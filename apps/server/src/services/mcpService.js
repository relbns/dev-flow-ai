// src/services/mcpService.js
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { fetchRepoContent, createGithubIssue } from './githubService.js';

// Get project context for AI agent
export const getProjectContext = async (projectId, apiKey) => {
    try {
        const project = await Project.findById(projectId)
            .populate('owner', 'username displayName')
            .populate('members.user', 'username displayName');

        if (!project) {
            throw new Error('Project not found');
        }

        // Check API key access - using the projects array from the apiKey
        const hasAccess = apiKey.projects.some(id => id.toString() === projectId);

        if (!hasAccess && !apiKey.projects.includes('*')) {
            throw new Error('API key does not have access to this project');
        }

        // Format project data for AI
        return {
            id: project._id,
            name: project.name,
            description: project.description,
            guidelines: project.guidelines,
            scopedPaths: project.scopedPaths,
            repository: project.githubRepo ? {
                name: project.githubRepo.name,
                fullName: project.githubRepo.fullName,
                owner: project.githubRepo.owner.login,
                url: project.githubRepo.url
            } : null,
            owner: {
                username: project.owner.username,
                displayName: project.owner.displayName
            },
            members: project.members.map(member => ({
                username: member.user.username,
                displayName: member.user.displayName,
                role: member.role
            })),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        };
    } catch (error) {
        console.error('Error getting project context:', error);
        throw error;
    }
};

// Get project tasks for AI agent
export const getProjectTasks = async (projectId, apiKey, filters = {}) => {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Check API key access
        const hasAccess = apiKey.projects.some(id => id.toString() === projectId);

        if (!hasAccess && !apiKey.projects.includes('*')) {
            throw new Error('API key does not have access to this project');
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
            if (filters.assignee === 'unassigned') {
                query.assignee = null;
            } else {
                // Try to find user by username
                const user = await User.findOne({ username: filters.assignee });
                if (user) {
                    query.assignee = user._id;
                }
            }
        }

        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }

        // Execute query
        const tasks = await Task.find(query)
            .populate('creator', 'username displayName')
            .populate('assignee', 'username displayName')
            .populate('comments.author', 'username displayName')
            .sort({ updatedAt: -1 });

        // Format tasks for AI
        return tasks.map(task => ({
            id: task._id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            creator: task.creator ? {
                username: task.creator.username,
                displayName: task.creator.displayName
            } : null,
            assignee: task.assignee ? {
                username: task.assignee.username,
                displayName: task.assignee.displayName
            } : null,
            dueDate: task.dueDate,
            tags: task.tags,
            relatedPaths: task.relatedPaths,
            githubIssueId: task.githubIssueId,
            comments: task.comments.map(comment => ({
                id: comment._id,
                content: comment.content,
                author: comment.author ? {
                    username: comment.author.username,
                    displayName: comment.author.displayName
                } : null,
                isAiGenerated: comment.isAiGenerated,
                createdAt: comment.createdAt
            })),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    } catch (error) {
        console.error('Error getting project tasks for AI:', error);
        throw error;
    }
};

// Get repository file content for AI agent
export const getRepoFileContent = async (projectId, apiKey, path) => {
    try {
        const project = await Project.findById(projectId);

        if (!project || !project.githubRepo) {
            throw new Error('Project not found or no GitHub repo linked');
        }

        // Check API key access
        const hasAccess = apiKey.projects.some(id => id.toString() === projectId);

        if (!hasAccess && !apiKey.projects.includes('*')) {
            throw new Error('API key does not have access to this project');
        }

        // Check path against scoped paths if defined
        if (project.scopedPaths && project.scopedPaths.length > 0) {
            const isAllowed = project.scopedPaths.some(scopedPath => {
                return path.startsWith(scopedPath.path);
            });

            if (!isAllowed) {
                throw new Error('Path is not within the project\'s scoped paths');
            }
        }

        // Find a user who can access the repo
        const user = await User.findById(project.owner);

        // Fetch file content
        const content = await fetchRepoContent(
            user,
            project.githubRepo.owner.login,
            project.githubRepo.name,
            path
        );

        return content;
    } catch (error) {
        console.error('Error getting repo file content for AI:', error);
        throw error;
    }
};

// Create a task from AI agent
export const createTaskFromAi = async (projectId, apiKey, taskData) => {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Check API key access and write permission
        const hasAccess = apiKey.projects.some(id => id.toString() === projectId);
        const hasWriteAccess = apiKey.scopes.includes('write') || apiKey.scopes.includes('admin');

        if ((!hasAccess && !apiKey.projects.includes('*')) || !hasWriteAccess) {
            throw new Error('API key does not have write access to this project');
        }

        // Find assignee if specified by username
        let assigneeId = null;
        let assignee = null;
        if (taskData.assignee) {
            assignee = await User.findOne({ username: taskData.assignee });
            if (assignee) {
                assigneeId = assignee._id;
            }
        }

        // Get user from apiKey
        const user = await User.findById(apiKey.user);
        if (!user) {
            throw new Error('API key user not found');
        }

        // Create task
        const task = new Task({
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            project: projectId,
            creator: user._id, // API key user is the creator
            assignee: assigneeId,
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
                    assignees: assigneeId ? [assignee.username] : []
                };

                const issue = await createGithubIssue(
                    user,
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

        return {
            id: task._id,
            title: task.title,
            status: task.status,
            githubIssueId: task.githubIssueId
        };
    } catch (error) {
        console.error('Error creating task from AI:', error);
        throw error;
    }
};

// Add comment from AI agent
export const addCommentFromAi = async (projectId, taskId, apiKey, commentData) => {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Check API key access and write permission
        const hasAccess = apiKey.projects.some(id => id.toString() === projectId);
        const hasWriteAccess = apiKey.scopes.includes('write') || apiKey.scopes.includes('admin');

        if ((!hasAccess && !apiKey.projects.includes('*')) || !hasWriteAccess) {
            throw new Error('API key does not have write access to this project');
        }

        // Find task
        const task = await Task.findOne({
            _id: taskId,
            project: projectId
        });

        if (!task) {
            throw new Error('Task not found or does not belong to the project');
        }

        // Get user from apiKey
        const user = await User.findById(apiKey.user);
        if (!user) {
            throw new Error('API key user not found');
        }

        // Add comment
        task.comments.push({
            author: user._id,
            content: commentData.content,
            isAiGenerated: true
        });

        await task.save();

        return {
            success: true,
            commentId: task.comments[task.comments.length - 1]._id
        };
    } catch (error) {
        console.error('Error adding comment from AI:', error);
        throw error;
    }
};

// Update task from AI agent
export const updateTaskFromAi = async (projectId, taskId, apiKey, updates) => {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Check API key access and write permission
        const hasAccess = apiKey.projects.some(id => id.toString() === projectId);
        const hasWriteAccess = apiKey.scopes.includes('write') || apiKey.scopes.includes('admin');

        if ((!hasAccess && !apiKey.projects.includes('*')) || !hasWriteAccess) {
            throw new Error('API key does not have write access to this project');
        }

        // Find task
        const task = await Task.findOne({
            _id: taskId,
            project: projectId
        });

        if (!task) {
            throw new Error('Task not found or does not belong to the project');
        }

        // Update allowed fields
        const allowedFields = [
            'title', 'description', 'status', 'priority',
            'dueDate', 'tags', 'relatedPaths'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                task[field] = updates[field];
            }
        }

        // Handle assignee by username
        if (updates.assignee !== undefined) {
            if (updates.assignee === null) {
                task.assignee = null;
            } else {
                const assignee = await User.findOne({ username: updates.assignee });
                if (assignee) {
                    task.assignee = assignee._id;
                }
            }
        }

        await task.save();

        return {
            success: true,
            id: task._id,
            title: task.title,
            status: task.status
        };
    } catch (error) {
        console.error('Error updating task from AI:', error);
        throw error;
    }
};