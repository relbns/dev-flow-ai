// src/routes/apiKeys.js
import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    createApiKey,
    getUserApiKeys,
    revokeApiKey,
    updateApiKey
} from '../services/apiKeyService.js';

const router = express.Router();

// Apply authentication middleware to all API key routes
router.use(authenticateUser);

// Create new API key
router.post('/', async (req, res) => {
    try {
        const apiKey = await createApiKey(
            req.user._id,
            req.body.name,
            req.body.projects || [],
            req.body.scopes || ['read'],
            req.body.expiresAt || null
        );
        res.status(201).json(apiKey);
    } catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's API keys
router.get('/', async (req, res) => {
    try {
        const apiKeys = await getUserApiKeys(req.user._id);
        res.json(apiKeys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        res.status(500).json({ error: error.message });
    }
});

// Revoke API key
router.delete('/:keyId', async (req, res) => {
    try {
        const result = await revokeApiKey(req.user._id, req.params.keyId);
        res.json(result);
    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update API key
router.patch('/:keyId', async (req, res) => {
    try {
        const apiKey = await updateApiKey(req.user._id, req.params.keyId, req.body);
        res.json(apiKey);
    } catch (error) {
        console.error('Error updating API key:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;