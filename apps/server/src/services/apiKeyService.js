// src/services/apiKeyService.js
import ApiKey from '../models/ApiKey.js';

// Create a new API key
export const createApiKey = async (userId, name, projects = [], scopes = ['read'], expiresAt = null) => {
    try {
        const apiKey = await ApiKey.generateKey(userId, name, projects, scopes, expiresAt);
        await apiKey.save();

        return {
            id: apiKey._id,
            key: apiKey.key,
            name: apiKey.name,
            scopes: apiKey.scopes,
            projects: apiKey.projects,
            expiresAt: apiKey.expiresAt
        };
    } catch (error) {
        console.error('Error creating API key:', error);
        throw error;
    }
};

// Get API keys for a user
export const getUserApiKeys = async (userId) => {
    try {
        const apiKeys = await ApiKey.find({
            user: userId,
            status: 'active'
        }).populate('projects', 'name');

        return apiKeys.map(key => ({
            id: key._id,
            name: key.name,
            scopes: key.scopes,
            projects: key.projects,
            createdAt: key.createdAt,
            lastUsed: key.lastUsed,
            expiresAt: key.expiresAt
        }));
    } catch (error) {
        console.error('Error fetching user API keys:', error);
        throw error;
    }
};

// Revoke an API key
export const revokeApiKey = async (userId, keyId) => {
    try {
        const apiKey = await ApiKey.findOne({
            _id: keyId,
            user: userId
        });

        if (!apiKey) {
            throw new Error('API key not found');
        }

        apiKey.status = 'revoked';
        await apiKey.save();

        return { success: true };
    } catch (error) {
        console.error('Error revoking API key:', error);
        throw error;
    }
};

// Update API key (name, projects, scopes)
export const updateApiKey = async (userId, keyId, updates) => {
    try {
        const apiKey = await ApiKey.findOne({
            _id: keyId,
            user: userId,
            status: 'active'
        });

        if (!apiKey) {
            throw new Error('API key not found or inactive');
        }

        // Update fields
        if (updates.name) apiKey.name = updates.name;
        if (updates.projects) apiKey.projects = updates.projects;
        if (updates.scopes) apiKey.scopes = updates.scopes;
        if (updates.expiresAt !== undefined) apiKey.expiresAt = updates.expiresAt;

        await apiKey.save();

        return {
            id: apiKey._id,
            name: apiKey.name,
            scopes: apiKey.scopes,
            projects: apiKey.projects,
            createdAt: apiKey.createdAt,
            lastUsed: apiKey.lastUsed,
            expiresAt: apiKey.expiresAt
        };
    } catch (error) {
        console.error('Error updating API key:', error);
        throw error;
    }
};

// Validate an API key
export const validateApiKey = async (key) => {
    try {
        const apiKey = await ApiKey.findOne({
            key,
            status: 'active'
        }).populate('user').populate('projects');

        if (!apiKey) {
            return { valid: false };
        }

        // Check if expired
        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
            return { valid: false, reason: 'expired' };
        }

        // Update last used
        apiKey.lastUsed = new Date();
        await apiKey.save();

        return {
            valid: true,
            user: {
                id: apiKey.user._id,
                username: apiKey.user.username
            },
            scopes: apiKey.scopes,
            projects: apiKey.projects.map(p => ({
                id: p._id,
                name: p.name
            }))
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        throw error;
    }
};