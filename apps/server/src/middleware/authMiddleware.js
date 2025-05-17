// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ApiKey from '../models/ApiKey.js';

// Middleware to authenticate user via JWT
export const authenticateUser = async (req, res, next) => {
    try {
        // Get token from headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        if (!token || token === 'undefined' || token === 'null') {
            return res.status(401).json({ error: 'Invalid authentication token' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Find user
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Add user to request object
            req.user = user;
            next();
        } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Middleware to authenticate API key
export const authenticateApiKey = async (req, res, next) => {
    try {
        // Get API key from headers
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // Find API key in database
        const key = await ApiKey.findOne({ key: apiKey, status: 'active' });
        if (!key) {
            return res.status(401).json({ error: 'Invalid or inactive API key' });
        }

        // Check if key is expired
        if (key.expiresAt && new Date() > key.expiresAt) {
            return res.status(401).json({ error: 'API key has expired' });
        }

        // Find user associated with the key
        const user = await User.findById(key.user);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add user and API key to request
        req.user = user;
        req.apiKey = key;
        
        // Update last used timestamp
        key.lastUsed = new Date();
        await key.save();
        
        next();
    } catch (error) {
        console.error('API key authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Middleware to check if user has access to a project
export const hasProjectAccess = async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.body.projectId;
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is the owner or a member
        const isOwner = project.ownerId && project.ownerId.toString() === req.user._id.toString();
        const isMember = project.members && project.members.some(member => 
            member.user && member.user.toString() === req.user._id.toString()
        );

        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Access denied to this project' });
        }

        // Add project to request
        req.project = project;
        next();
    } catch (error) {
        console.error('Project access check error:', error);
        res.status(500).json({ error: 'Failed to verify project access' });
    }
};

// Middleware to refresh user token
export const refreshUserToken = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        try {
            // Verify existing token
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
            
            // Find user
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Generate new token
            const newToken = jwt.sign(
                { userId: user._id, githubId: user.githubId },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Add new token to request
            req.newToken = newToken;
            next();
        } catch (jwtError) {
            console.error('Token refresh JWT error:', jwtError);
            return res.status(401).json({ error: 'Invalid token format' });
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};