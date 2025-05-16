// src/routes/mcp.js
import express from 'express';
import { authenticateApiKey } from '../middleware/authMiddleware.js';
import {
    getProjectContext,
    getProjectTasks,
    getRepoFileContent,
    createTaskFromAi,
    addCommentFromAi,
    updateTaskFromAi
} from '../services/mcpService.js';

const router = express.Router();

// Apply API key authentication middleware to all MCP routes
router.use(authenticateApiKey);

// Get project context
router.get('/projects/:projectId/context', async (req, res) => {
    try {
        const context = await getProjectContext(req.params.projectId, req.apiKey);
        res.json(context);
    } catch (error) {
        console.error('Error fetching project context:', error);
        res.status(404).json({ error: error.message });
    }
});

// Get project tasks
router.get('/projects/:projectId/tasks', async (req, res) => {
    try {
        const tasks = await getProjectTasks(req.params.projectId, req.apiKey, req.query);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(404).json({ error: error.message });
    }
});

// Get file content
router.get('/projects/:projectId/files/*', async (req, res) => {
    try {
        // Extract path from the URL
        const path = req.params[0] || '';

        const content = await getRepoFileContent(req.params.projectId, req.apiKey, path);
        res.json(content);
    } catch (error) {
        console.error('Error fetching file content:', error);
        res.status(404).json({ error: error.message });
    }
});

// Create task
router.post('/projects/:projectId/tasks', async (req, res) => {
    try {
        const task = await createTaskFromAi(req.params.projectId, req.apiKey, req.body);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update task
router.patch('/projects/:projectId/tasks/:taskId', async (req, res) => {
    try {
        const result = await updateTaskFromAi(
            req.params.projectId,
            req.params.taskId,
            req.apiKey,
            req.body
        );
        res.json(result);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add comment to task
router.post('/projects/:projectId/tasks/:taskId/comments', async (req, res) => {
    try {
        const result = await addCommentFromAi(
            req.params.projectId,
            req.params.taskId,
            req.apiKey,
            req.body
        );
        res.status(201).json(result);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;