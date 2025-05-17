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
        const githubAuthUrl = getGithubOAuthUrl();
        
        // Check if this is a browser direct request (not an API call)
        // If Accept header includes text/html, it's likely a browser request
        const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
        
        if (acceptsHtml) {
            // Direct browser redirect for clicks on login button
            return res.redirect(githubAuthUrl);
        }
        
        // Otherwise return JSON for API clients
        res.json({ url: githubAuthUrl });
    } catch (error) {
        console.error('Error generating GitHub auth URL:', error);
        res.status(500).json({ error: 'Failed to generate GitHub auth URL' });
    }
});

// Handle GitHub callback
router.get('/github/callback', async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({ error: 'GitHub authorization code is required' });
        }

        // Exchange the code for access token
        const tokenData = await exchangeCodeForToken(code);
        if (!tokenData || !tokenData.accessToken) {
            throw new Error('Failed to obtain GitHub access token');
        }

        // Get the user profile information
        const profileData = await getGithubUserProfile(tokenData.accessToken);
        if (!profileData || !profileData.githubId) {
            throw new Error('Failed to obtain GitHub user profile');
        }

        // Create or update user in database
        const user = await createOrUpdateUser(profileData, tokenData);
        if (!user) {
            throw new Error('Failed to create or update user');
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, githubId: user.githubId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`;
        console.log('Redirecting to:', redirectUrl);
        
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('GitHub auth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        // req.user should be available from the authenticateUser middleware
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