// src/routes/index.js
import express from 'express';
import authRoutes from './auth.js';
import projectRoutes from './projects.js';
import taskRoutes from './tasks.js';
import githubRoutes from './github.js';
import apiKeyRoutes from './apiKeys.js';
import mcpRoutes from './mcp.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/github', githubRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/mcp', mcpRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

export default router;