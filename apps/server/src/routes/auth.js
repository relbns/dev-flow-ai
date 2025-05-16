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
    const githubAuthUrl = getGithubOAuthUrl();
    res.json({ url: githubAuthUrl });
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

        // Get the user profile information
        const profileData = await getGithubUserProfile(tokenData.accessToken);

        // Create or update user in database
        const user = await createOrUpdateUser(profileData, tokenData);

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, githubId: user.githubId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('GitHub auth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
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