// src/routes/tasks.js
import express from 'express';
import { authenticateUser, hasProjectAccess } from '../middleware/authMiddleware.js';
import {
    createTask,
    getTaskById,
    getProjectTasks,
    updateTask,
    deleteTask,
    addTaskComment,
    deleteTaskComment,
    getUserTasks // Make sure to import or create this function
} from '../services/taskService.js';

const router = express.Router();

// Apply authentication middleware to all task routes
router.use(authenticateUser);

// Get tasks for current user (personal or organization)
// This is the new endpoint we're adding
router.get('/', async (req, res) => {
    try {
        const result = await getUserTasks(req.user._id, req.query);
        res.json(result);
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create new task
router.post('/', async (req, res) => {
    try {
        const task = await createTask(req.user._id, req.body.projectId, req.body);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific task
router.get('/:taskId', async (req, res) => {
    try {
        const task = await getTaskById(req.params.taskId, req.user._id);
        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(404).json({ error: error.message });
    }
});

// Get tasks for project
router.get('/project/:projectId', async (req, res) => {
    try {
        const result = await getProjectTasks(req.params.projectId, req.user._id, req.query);
        res.json(result);
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update task
router.patch('/:taskId', async (req, res) => {
    try {
        const task = await updateTask(req.params.taskId, req.user._id, req.body);
        res.json(task);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
    try {
        const result = await deleteTask(req.params.taskId, req.user._id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add comment to task
router.post('/:taskId/comments', async (req, res) => {
    try {
        const comment = await addTaskComment(req.params.taskId, req.user._id, req.body);
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete comment
router.delete('/:taskId/comments/:commentId', async (req, res) => {
    try {
        const result = await deleteTaskComment(
            req.params.taskId,
            req.params.commentId,
            req.user._id
        );
        res.json(result);
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;