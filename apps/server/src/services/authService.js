// src/services/authService.js
import axios from 'axios';
import User from '../models/User.js';

export const getGithubOAuthUrl = () => {
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;

    if (!githubClientId) {
        console.error('GitHub Client ID is not set in environment variables');
        throw new Error('GitHub OAuth configuration is incomplete');
    }

    if (!redirectUri) {
        console.error('GitHub Callback URL is not set in environment variables');
        throw new Error('GitHub OAuth configuration is incomplete');
    }

    // Requesting necessary scopes for organization and repository access
    const scopes = [
        'user:email',
        'read:user',
        'repo',
        'read:org'
    ].join(' ');

    // Log OAuth parameters for debugging
    console.log('GitHub OAuth parameters:', {
        clientId: githubClientId,
        redirectUri: redirectUri,
        scopes: scopes
    });

    return `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scopes}&prompt=consent`;
};

export const exchangeCodeForToken = async (code) => {
    try {
        console.log('Exchanging code for GitHub token');
        
        // Verify environment variables
        if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
            console.error('GitHub OAuth credentials missing in environment');
            throw new Error('GitHub OAuth configuration is incomplete');
        }

        // Log parameters (except secret)
        console.log('Token exchange parameters:', {
            clientId: process.env.GITHUB_CLIENT_ID,
            code: code ? '[PRESENT]' : '[MISSING]',
            redirectUri: process.env.GITHUB_CALLBACK_URL
        });

        // Set a reasonable timeout
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_CALLBACK_URL
        }, {
            headers: {
                Accept: 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        console.log('GitHub token exchange response:', {
            status: response.status,
            hasToken: !!response.data.access_token,
            hasRefreshToken: !!response.data.refresh_token,
            hasError: !!response.data.error
        });

        if (response.data.error) {
            console.error('GitHub token exchange error:', response.data.error);
            throw new Error(`GitHub token exchange failed: ${response.data.error_description || response.data.error}`);
        }

        if (!response.data.access_token) {
            console.error('GitHub token exchange succeeded but no access token in response');
            throw new Error('GitHub token exchange failed: No access token returned');
        }

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in
        };
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        if (error.response) {
            console.error('GitHub API response error:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        throw new Error(`Failed to exchange GitHub code for token: ${error.message}`);
    }
};

export const getGithubUserProfile = async (accessToken) => {
    try {
        console.log('Fetching GitHub user profile');
        
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `token ${accessToken}`
            },
            timeout: 10000 // 10 second timeout
        });

        // Get user's email
        const emailResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
                Authorization: `token ${accessToken}`
            },
            timeout: 10000 // 10 second timeout
        });

        const primaryEmail = emailResponse.data.find(email => email.primary)?.email || emailResponse.data[0]?.email;

        console.log('GitHub user profile fetched successfully:', {
            userId: response.data.id,
            username: response.data.login,
            hasEmail: !!primaryEmail
        });

        return {
            githubId: response.data.id.toString(),
            username: response.data.login,
            displayName: response.data.name,
            email: primaryEmail,
            avatarUrl: response.data.avatar_url
        };
    } catch (error) {
        console.error('Error getting GitHub user profile:', error);
        if (error.response) {
            console.error('GitHub API response error:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        throw new Error(`Failed to get GitHub user profile: ${error.message}`);
    }
};

export const createOrUpdateUser = async (profileData, tokenData) => {
    try {
        console.log('Creating or updating user in database');
        
        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expiresIn || 3600 * 8));

        const userData = {
            ...profileData,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiresAt: expiresAt
        };

        // Try to find existing user
        const existingUser = await User.findOne({ githubId: profileData.githubId });

        if (existingUser) {
            console.log('Updating existing user:', existingUser._id);
            // Update the existing user
            Object.assign(existingUser, userData);
            await existingUser.save();
            return existingUser;
        } else {
            console.log('Creating new user for GitHub ID:', profileData.githubId);
            // Create a new user
            const newUser = new User(userData);
            await newUser.save();
            return newUser;
        }
    } catch (error) {
        console.error('Error creating or updating user:', error);
        throw new Error(`Failed to create or update user: ${error.message}`);
    }
};

export const refreshGithubToken = async (refreshToken) => {
    try {
        console.log('Refreshing GitHub token');
        
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }, {
            headers: {
                Accept: 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.data.error) {
            console.error('GitHub token refresh error:', response.data.error);
            throw new Error(response.data.error_description || response.data.error);
        }

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token || refreshToken,
            expiresIn: response.data.expires_in
        };
    } catch (error) {
        console.error('Error refreshing GitHub token:', error);
        if (error.response) {
            console.error('GitHub API response error:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        throw new Error(`Failed to refresh GitHub token: ${error.message}`);
    }
};