// src/routes/projects.js
import express from 'express';
import { authenticateUser, hasProjectAccess } from '../middleware/authMiddleware.js';
import {
    createProject,
    getProjectById,
    getUserProjects,
    updateProject,
    deleteProject,
    addProjectMember,
    updateProjectMember,
    syncGithubCollaborators
} from '../services/projectService.js';

const router = express.Router();

// Apply authentication middleware to all project routes
router.use(authenticateUser);

// Create new project
router.post('/', async (req, res) => {
    try {
        const project = await createProject(req.user._id, req.body);
        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's projects
router.get('/', async (req, res) => {
    try {
        const projects = await getUserProjects(req.user._id);
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific project
router.get('/:projectId', async (req, res) => {
    try {
        const project = await getProjectById(req.params.projectId, req.user._id);
        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(404).json({ error: error.message });
    }
});

// Update project
router.patch('/:projectId', async (req, res) => {
    try {
        const project = await updateProject(req.params.projectId, req.user._id, req.body);
        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete project
router.delete('/:projectId', async (req, res) => {
    try {
        const result = await deleteProject(req.params.projectId, req.user._id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add project member
router.post('/:projectId/members', async (req, res) => {
    try {
        const project = await addProjectMember(req.params.projectId, req.user._id, req.body);
        res.status(201).json(project);
    } catch (error) {
        console.error('Error adding project member:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update project member
router.patch('/:projectId/members/:memberId', async (req, res) => {
    try {
        const project = await updateProjectMember(
            req.params.projectId,
            req.user._id,
            req.params.memberId,
            req.body
        );
        res.json(project);
    } catch (error) {
        console.error('Error updating project member:', error);
        res.status(400).json({ error: error.message });
    }
});

// Sync GitHub collaborators
router.post('/:projectId/sync-collaborators', async (req, res) => {
    try {
        const result = await syncGithubCollaborators(req.params.projectId, req.user._id);
        res.json(result);
    } catch (error) {
        console.error('Error syncing collaborators:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;