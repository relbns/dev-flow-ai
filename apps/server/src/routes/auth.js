// src/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import {
    getGithubOAuthUrl,
    exchangeCodeForToken,
    getGithubUserProfile,
    createOrUpdateUser
} from '../services/authService.js';
import {
    authenticateUser,
    refreshUserToken
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate login URL
router.get('/github/login', (req, res) => {
    try {
        console.log('GitHub login endpoint accessed');
        const githubAuthUrl = getGithubOAuthUrl();
        
        // Check if this is a browser direct request (not an API call)
        // If Accept header includes text/html, it's likely a browser request
        const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
        
        if (acceptsHtml) {
            // Direct browser redirect for clicks on login button
            console.log('Browser request detected, redirecting to GitHub');
            return res.redirect(githubAuthUrl);
        }
        
        // Otherwise return JSON for API clients
        console.log('API request detected, returning URL as JSON');
        res.json({ url: githubAuthUrl });
    } catch (error) {
        console.error('Error generating GitHub auth URL:', error);
        res.status(500).json({ error: 'Failed to generate GitHub auth URL', message: error.message });
    }
});

// Handle code exchange for token (for frontend AJAX requests)
router.get('/github-callback', async (req, res) => {
    try {
        console.log('GitHub callback API endpoint received:', req.query);
        const { code } = req.query;

        if (!code) {
            console.error('No code provided in callback');
            return res.status(400).json({ error: 'GitHub authorization code is required' });
        }

        console.log('Exchanging code for GitHub token...');
        // Exchange the code for access token
        const tokenData = await exchangeCodeForToken(code);
        
        console.log('Getting GitHub user profile...');
        // Get user profile
        const profileData = await getGithubUserProfile(tokenData.accessToken);
        
        console.log('Creating/updating user in database...');
        // Create or update user in database
        const user = await createOrUpdateUser(profileData, tokenData);
        
        // Generate JWT token
        const jwtToken = jwt.sign(
            { 
                _id: user._id,
                githubId: user.githubId,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('Returning token and user data to frontend');
        
        // Return JSON response with token and user data
        return res.json({
            token: jwtToken,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                organizations: user.organizations || []
            }
        });
    } catch (error) {
        console.error('GitHub auth callback error:', error);
        return res.status(500).json({ 
            error: 'Authentication failed', 
            message: error.message 
        });
    }
});

// GitHub callback that redirects to frontend (original OAuth flow)
router.get('/github/callback', async (req, res) => {
    try {
        console.log('GitHub callback received at:', new Date().toISOString());
        console.log('Query parameters:', req.query);
        const { code, error: oauthError } = req.query;

        // Determine frontend URL based on environment or referrer
        let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        // Check if the request came from GitHub Pages
        const referer = req.headers.referer || req.headers.referrer;
        console.log('Referer header:', referer);
        
        if (referer && referer.includes('github.io')) {
            // Extract the GitHub Pages URL from the referer
            const githubPagesMatch = referer.match(/(https:\/\/[^.]+\.github\.io\/[^\/]+)/);
            if (githubPagesMatch) {
                frontendUrl = githubPagesMatch[1];
                console.log('Detected GitHub Pages frontend:', frontendUrl);
            }
        }

        if (oauthError) {
            console.error('OAuth error from GitHub:', oauthError);
            return res.redirect(`${frontendUrl}/#/auth/callback?error=${encodeURIComponent(oauthError)}`);
        }

        if (!code) {
            console.error('No code provided in callback');
            return res.redirect(`${frontendUrl}/#/auth/callback?error=${encodeURIComponent('No authorization code received')}`);
        }

        try {
            console.log('Exchanging code for token');
            // Exchange the code for access token
            const tokenData = await exchangeCodeForToken(code);
            
            console.log('Getting user profile');
            // Get user profile
            const profileData = await getGithubUserProfile(tokenData.accessToken);
            
            console.log('Creating/updating user');
            // Create or update user in database
            const user = await createOrUpdateUser(profileData, tokenData);
            
            // Generate JWT token
            const jwtToken = jwt.sign(
                { 
                    _id: user._id,
                    githubId: user.githubId,
                    username: user.username,
                    displayName: user.displayName,
                    email: user.email,
                    avatarUrl: user.avatarUrl
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('Redirecting to frontend with token');
            
            // Redirect to frontend with token
            const redirectUrl = `${frontendUrl}/#/auth/callback?token=${encodeURIComponent(jwtToken)}`;
            console.log('Redirect URL:', redirectUrl);
            
            return res.redirect(redirectUrl);
        } catch (authError) {
            console.error('Authentication processing error:', authError);
            return res.redirect(`${frontendUrl}/#/auth/callback?error=${encodeURIComponent(authError.message)}`);
        }
    } catch (error) {
        console.error('GitHub auth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/#/auth/callback?error=${encodeURIComponent('Authentication failed')}`);
    }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        // If this is a GitHub temp token, persist the user now
        if (req.user.githubToken && !req.user._id) {
            try {
                // Create profile data from token info
                const profileData = {
                    githubId: req.user.githubId,
                    username: req.user.username,
                    displayName: req.user.displayName,
                    email: req.user.email,
                    avatarUrl: req.user.avatarUrl
                };
                
                // Create token data from token info
                const tokenData = {
                    accessToken: req.user.githubToken,
                    refreshToken: req.user.githubRefreshToken,
                    expiresIn: req.user.tokenExpiresIn
                };
                
                // Now save to database
                const user = await createOrUpdateUser(profileData, tokenData);
                
                // Send the saved user data
                return res.json({
                    user: {
                        id: user._id,
                        username: user.username,
                        displayName: user.displayName,
                        email: user.email,
                        avatarUrl: user.avatarUrl,
                        organizations: user.organizations || []
                    }
                });
            } catch (error) {
                console.error('Error persisting user after callback:', error);
                return res.status(500).json({ error: 'Failed to complete user setup' });
            }
        }
        
        // Normal user profile flow
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName,
                email: req.user.email,
                avatarUrl: req.user.avatarUrl,
                organizations: req.user.organizations || []
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Logout endpoint
router.post('/logout', authenticateUser, (req, res) => {
    // Client-side should remove the token
    res.json({ message: 'Logged out successfully' });
});

// Public route to check auth status - doesn't require auth
router.get('/status', (req, res) => {
    try {
        // Get token from headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ authenticated: false });
        }

        const token = authHeader.split(' ')[1];
        if (!token || token === 'undefined' || token === 'null') {
            return res.json({ authenticated: false });
        }

        try {
            // Verify token - just check if it's valid, don't throw on expired
            jwt.verify(token, process.env.JWT_SECRET);
            return res.json({ authenticated: true });
        } catch (jwtError) {
            // Token is invalid
            return res.json({ authenticated: false });
        }
    } catch (error) {
        console.error('Auth status check error:', error);
        res.json({ authenticated: false });
    }
});

// Refresh token endpoint
router.post('/refresh-token', refreshUserToken, (req, res) => {
    try {
        // New token is generated in the middleware
        res.json({ token: req.newToken });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

export default router;