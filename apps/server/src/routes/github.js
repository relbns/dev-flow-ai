// src/routes/github.js
import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    fetchUserOrganizations,
    fetchOrganizationRepos,
    fetchUserRepos,
    fetchRepoCollaborators,
    fetchRepoContent
} from '../services/githubService.js';

const router = express.Router();

// Apply authentication middleware to all GitHub routes
router.use(authenticateUser);

// Get user's GitHub organizations
router.get('/organizations', async (req, res) => {
    try {
        const organizations = await fetchUserOrganizations(req.user);
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching GitHub organizations:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get repositories for an organization
router.get('/organizations/:orgName/repos', async (req, res) => {
    try {
        const repos = await fetchOrganizationRepos(req.user, req.params.orgName);
        res.json(repos);
    } catch (error) {
        console.error('Error fetching organization repos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's repositories
router.get('/repos', async (req, res) => {
    try {
        const repos = await fetchUserRepos(req.user);
        res.json(repos);
    } catch (error) {
        console.error('Error fetching user repos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get repository collaborators
router.get('/repos/:owner/:repo/collaborators', async (req, res) => {
    try {
        const collaborators = await fetchRepoCollaborators(
            req.user,
            req.params.owner,
            req.params.repo
        );
        res.json(collaborators);
    } catch (error) {
        console.error('Error fetching repo collaborators:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get repository content
router.get('/repos/:owner/:repo/contents/*', async (req, res) => {
    try {
        // Extract path from the URL
        const path = req.params[0] || '';

        const content = await fetchRepoContent(
            req.user,
            req.params.owner,
            req.params.repo,
            path
        );

        res.json(content);
    } catch (error) {
        console.error('Error fetching repo content:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;