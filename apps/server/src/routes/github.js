// src/routes/github.js
import express from 'express';
import axios from 'axios';
import { authenticateUser } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import {
  fetchUserOrganizations,
  fetchOrganizationRepos,
  fetchUserRepos,
  fetchRepoCollaborators,
  fetchRepoContent
} from '../services/githubService.js';

const router = express.Router();

// Get GitHub organizations for authenticated user
router.get('/organizations', authenticateUser, async (req, res) => {
    try {
        const organizations = await fetchUserOrganizations(req.user);
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching GitHub organizations:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub organizations' });
    }
});

// Get repositories for authenticated user or specific organization
router.get('/repositories', authenticateUser, async (req, res) => {
    try {
        const { org } = req.query;
        let repos;
        
        if (org) {
            repos = await fetchOrganizationRepos(req.user, org);
        } else {
            repos = await fetchUserRepos(req.user);
        }
        
        res.json(repos);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

// Get a specific repository
router.get('/repositories/:owner/:repo', authenticateUser, async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const content = await fetchRepoContent(req.user, owner, repo, '');
        res.json(content);
    } catch (error) {
        console.error('Error fetching repository details:', error);
        res.status(500).json({ error: 'Failed to fetch repository details' });
    }
});

// Get repository collaborators
router.get('/repositories/:owner/:repo/collaborators', authenticateUser, async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const collaborators = await fetchRepoCollaborators(req.user, owner, repo);
        res.json(collaborators);
    } catch (error) {
        console.error('Error fetching repository collaborators:', error);
        res.status(500).json({ error: 'Failed to fetch repository collaborators' });
    }
});

// Get repository contents
router.get('/repositories/:owner/:repo/contents/*', authenticateUser, async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const path = req.params[0] || '';
        const content = await fetchRepoContent(req.user, owner, repo, path);
        res.json(content);
    } catch (error) {
        console.error('Error fetching repository content:', error);
        res.status(500).json({ error: 'Failed to fetch repository content' });
    }
});

export default router;