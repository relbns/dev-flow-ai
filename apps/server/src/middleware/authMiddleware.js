// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
            
            // Check if this is a temporary token created during GitHub callback
            if (decoded.githubToken) {
                console.log('Detected temporary token from GitHub callback');
                // Set the decoded data directly as the user
                req.user = decoded;
                return next();
            }
            
            // Regular token flow - find user in database
            try {
                const user = await User.findById(decoded.userId);
                if (!user) {
                    console.error(`User not found for ID: ${decoded.userId}`);
                    return res.status(404).json({ error: 'User not found' });
                }

                // Add user to request object
                req.user = user;
                next();
            } catch (dbError) {
                console.error('Database error fetching user:', dbError);
                return res.status(500).json({ error: 'Database error' });
            }
        } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
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
            
            // Generate new token
            // If it's a temp token, preserve the GitHub data
            if (decoded.githubToken) {
                const newToken = jwt.sign(
                    { 
                        githubId: decoded.githubId,
                        username: decoded.username,
                        displayName: decoded.displayName,
                        email: decoded.email,
                        avatarUrl: decoded.avatarUrl,
                        githubToken: decoded.githubToken,
                        githubRefreshToken: decoded.githubRefreshToken,
                        tokenExpiresIn: decoded.tokenExpiresIn
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                
                // Add new token to request
                req.newToken = newToken;
                return next();
            }
            
            // Try to find user in database
            try {
                const user = await User.findById(decoded.userId);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Generate new token for database user
                const newToken = jwt.sign(
                    { userId: user._id, githubId: user.githubId },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );

                // Add new token to request
                req.newToken = newToken;
                next();
            } catch (dbError) {
                console.error('Database error in token refresh:', dbError);
                return res.status(500).json({ error: 'Database error' });
            }
        } catch (jwtError) {
            console.error('Token refresh JWT error:', jwtError);
            return res.status(401).json({ error: 'Invalid token format' });
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};