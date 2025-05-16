// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiKey from '../models/ApiKey.js';
import { refreshGithubToken } from '../services/authService.js';

// Middleware to authenticate user using JWT
export const authenticateUser = async (req, res, next) => {
    try {
        // Get the token from authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if GitHub token needs refresh
        if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) < new Date()) {
            await refreshUserGithubToken(user);
        }

        // Set user on request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware to refresh user's token
export const refreshUserToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Verify the token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { ignoreExpiration: true });

        // Find the user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new token
        const newToken = jwt.sign(
            { userId: user._id, githubId: user.githubId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        req.newToken = newToken;
        next();
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};

// Helper function to refresh GitHub token
export const refreshUserGithubToken = async (user) => {
    try {
        // Get user with refresh token
        const userWithToken = await User.findById(user._id).select('+refreshToken');

        if (!userWithToken.refreshToken) {
            throw new Error('No refresh token available');
        }

        const tokenData = await refreshGithubToken(userWithToken.refreshToken);

        // Update user tokens
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expiresIn || 3600 * 8));

        userWithToken.accessToken = tokenData.accessToken;
        userWithToken.refreshToken = tokenData.refreshToken;
        userWithToken.tokenExpiresAt = expiresAt;
        await userWithToken.save();

        // Update the original user reference
        user.accessToken = tokenData.accessToken;
        user.tokenExpiresAt = expiresAt;

        return tokenData.accessToken;
    } catch (error) {
        console.error('Error refreshing GitHub token:', error);
        throw error;
    }
};

// Middleware to authenticate using API key
export const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // Find the API key in database
        const keyDoc = await ApiKey.findOne({ key: apiKey, status: 'active' }).populate('user');

        if (!keyDoc) {
            return res.status(401).json({ error: 'Invalid or expired API key' });
        }

        // Check if the key has expired
        if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'API key has expired' });
        }

        // Update last used timestamp
        keyDoc.lastUsed = new Date();
        await keyDoc.save();

        // Set user and API key info on request
        req.user = keyDoc.user;
        req.apiKey = {
            id: keyDoc._id,
            projects: keyDoc.projects,
            scopes: keyDoc.scopes
        };

        next();
    } catch (error) {
        console.error('API key authentication error:', error);
        res.status(500).json({ error: 'Failed to authenticate with API key' });
    }
};

// Middleware to check if user has access to a project
export const hasProjectAccess = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        // If authenticated with API key, check project access
        if (req.apiKey) {
            const hasAccess = req.apiKey.projects.some(id => id.toString() === projectId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'API key does not have access to this project' });
            }
        } else {
            // Check if user is a member of the project
            const project = await Project.findOne({
                _id: projectId,
                $or: [
                    { owner: req.user._id },
                    { 'members.user': req.user._id }
                ]
            });

            if (!project) {
                return res.status(403).json({ error: 'You do not have access to this project' });
            }
        }

        next();
    } catch (error) {
        console.error('Project access check error:', error);
        res.status(500).json({ error: 'Failed to verify project access' });
    }
};