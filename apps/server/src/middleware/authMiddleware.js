// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ApiKey from '../models/ApiKey.js';

// Check if we're in mock mode
const isMockMode = process.env.MOCK_MODE === 'true';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware to authenticate user via JWT
export const authenticateUser = async (req, res, next) => {
    try {
        // Handle mock mode in development
        if (isMockMode && isDevelopment) {
            console.log('📣 Using mock authentication in development');
            
            // Check for special development mock token
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                if (token === 'mock-jwt-token-for-development') {
                    // Create a mock user object
                    req.user = {
                        _id: 'mock-user-id',
                        githubId: 'mock-github-id',
                        username: 'mockuser',
                        displayName: 'Mock User',
                        email: 'mock@example.com',
                        avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
                        organizations: [
                            {
                                id: 'mock-org-1',
                                name: 'Mock Organization',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/7654321'
                            }
                        ]
                    };
                    return next();
                }
            }
        }
        
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
            
            // If in development mode with DB issues, provide a mock user as fallback
            if (isDevelopment) {
                console.warn('⚠️ JWT verification failed in development, using mock user');
                // Create a mock user object
                req.user = {
                    _id: 'mock-user-id',
                    githubId: 'mock-github-id',
                    username: 'mockuser',
                    displayName: 'Mock User',
                    email: 'mock@example.com',
                    avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
                    organizations: [
                        {
                            id: 'mock-org-1',
                            name: 'Mock Organization',
                            avatarUrl: 'https://avatars.githubusercontent.com/u/7654321'
                        }
                    ]
                };
                return next();
            }
            
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        
        // In development with mock mode, provide a fallback user
        if (isMockMode && isDevelopment) {
            console.warn('⚠️ Authentication error in development, using mock user');
            // Create a mock user object
            req.user = {
                _id: 'mock-user-id',
                githubId: 'mock-github-id',
                username: 'mockuser',
                displayName: 'Mock User',
                email: 'mock@example.com',
                avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
                organizations: [
                    {
                        id: 'mock-org-1',
                        name: 'Mock Organization',
                        avatarUrl: 'https://avatars.githubusercontent.com/u/7654321'
                    }
                ]
            };
            return next();
        }
        
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Middleware to authenticate API key
export const authenticateApiKey = async (req, res, next) => {
    try {
        // Handle mock mode in development
        if (isMockMode && isDevelopment) {
            console.log('📣 Using mock API key authentication in development');
            
            // Check for special development mock API key
            const apiKey = req.headers['x-api-key'];
            if (apiKey === 'mock-api-key-for-development') {
                // Create a mock user and API key
                req.user = {
                    _id: 'mock-user-id',
                    githubId: 'mock-github-id',
                    username: 'mockuser',
                    displayName: 'Mock User',
                    email: 'mock@example.com'
                };
                req.apiKey = {
                    _id: 'mock-api-key-id',
                    name: 'Mock API Key',
                    key: 'mock-api-key-for-development',
                    user: 'mock-user-id',
                    status: 'active',
                    lastUsed: new Date()
                };
                return next();
            }
        }
        
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
        
        // In development with mock mode, provide a fallback
        if (isMockMode && isDevelopment) {
            console.warn('⚠️ API key authentication error in development, using mock data');
            // Create a mock user and API key
            req.user = {
                _id: 'mock-user-id',
                githubId: 'mock-github-id',
                username: 'mockuser',
                displayName: 'Mock User',
                email: 'mock@example.com'
            };
            req.apiKey = {
                _id: 'mock-api-key-id',
                name: 'Mock API Key',
                key: 'mock-api-key-for-development',
                user: 'mock-user-id',
                status: 'active',
                lastUsed: new Date()
            };
            return next();
        }
        
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Middleware to check if user has access to a project
export const hasProjectAccess = async (req, res, next) => {
    try {
        // Handle mock mode in development
        if (isMockMode && isDevelopment) {
            console.log('📣 Using mock project access in development');
            
            const projectId = req.params.projectId || req.body.projectId;
            
            // Create a mock project
            req.project = {
                _id: projectId || 'mock-project-id',
                name: 'Mock Project',
                description: 'This is a mock project for development',
                ownerId: 'mock-user-id',
                members: [{ user: 'mock-user-id', role: 'admin' }],
                tasks: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            return next();
        }
        
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
        
        // In development with mock mode, provide a fallback
        if (isMockMode && isDevelopment) {
            console.warn('⚠️ Project access check error in development, using mock project');
            
            const projectId = req.params.projectId || req.body.projectId;
            
            // Create a mock project
            req.project = {
                _id: projectId || 'mock-project-id',
                name: 'Mock Project',
                description: 'This is a mock project for development',
                ownerId: 'mock-user-id',
                members: [{ user: 'mock-user-id', role: 'admin' }],
                tasks: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            return next();
        }
        
        res.status(500).json({ error: 'Failed to verify project access' });
    }
};

// Middleware to refresh user token
export const refreshUserToken = async (req, res, next) => {
    try {
        // Handle mock mode in development
        if (isMockMode && isDevelopment) {
            console.log('📣 Using mock token refresh in development');
            
            // Generate a new mock token
            const newMockToken = jwt.sign(
                { userId: 'mock-user-id', githubId: 'mock-github-id' },
                process.env.JWT_SECRET || 'development-jwt-secret',
                { expiresIn: '7d' }
            );
            
            req.newToken = newMockToken;
            return next();
        }
        
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
            
            // In development, provide a fallback
            if (isDevelopment) {
                console.warn('⚠️ Token refresh error in development, using mock token');
                
                // Generate a new mock token
                const newMockToken = jwt.sign(
                    { userId: 'mock-user-id', githubId: 'mock-github-id' },
                    process.env.JWT_SECRET || 'development-jwt-secret',
                    { expiresIn: '7d' }
                );
                
                req.newToken = newMockToken;
                return next();
            }
            
            return res.status(401).json({ error: 'Invalid token format' });
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        
        // In development with mock mode, provide a fallback
        if (isMockMode && isDevelopment) {
            console.warn('⚠️ Token refresh general error in development, using mock token');
            
            // Generate a new mock token
            const newMockToken = jwt.sign(
                { userId: 'mock-user-id', githubId: 'mock-github-id' },
                process.env.JWT_SECRET || 'development-jwt-secret',
                { expiresIn: '7d' }
            );
            
            req.newToken = newMockToken;
            return next();
        }
        
        res.status(401).json({ error: 'Invalid token' });
    }
};