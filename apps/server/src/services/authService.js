// src/services/authService.js
import axios from 'axios';
import User from '../models/User.js';

export const getGithubOAuthUrl = () => {
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;

    // Requesting necessary scopes for organization and repository access
    const scopes = [
        'user:email',
        'read:user',
        'repo',
        'read:org'
    ].join(' ');

    // Adding prompt=consent to force GitHub to show the authorization screen every time
    return `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scopes}&prompt=consent`;
};

export const exchangeCodeForToken = async (code) => {
    try {
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_CALLBACK_URL
        }, {
            headers: {
                Accept: 'application/json'
            }
        });

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in
        };
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        throw new Error('Failed to exchange GitHub code for token');
    }
};

export const getGithubUserProfile = async (accessToken) => {
    try {
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `token ${accessToken}`
            }
        });

        // Get user's email
        const emailResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
                Authorization: `token ${accessToken}`
            }
        });

        const primaryEmail = emailResponse.data.find(email => email.primary)?.email || emailResponse.data[0]?.email;

        return {
            githubId: response.data.id.toString(),
            username: response.data.login,
            displayName: response.data.name,
            email: primaryEmail,
            avatarUrl: response.data.avatar_url
        };
    } catch (error) {
        console.error('Error getting GitHub user profile:', error);
        throw new Error('Failed to get GitHub user profile');
    }
};

export const createOrUpdateUser = async (profileData, tokenData) => {
    try {
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
            // Update the existing user
            Object.assign(existingUser, userData);
            await existingUser.save();
            return existingUser;
        } else {
            // Create a new user
            const newUser = new User(userData);
            await newUser.save();
            return newUser;
        }
    } catch (error) {
        console.error('Error creating or updating user:', error);
        throw new Error('Failed to create or update user');
    }
};

export const refreshGithubToken = async (refreshToken) => {
    try {
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }, {
            headers: {
                Accept: 'application/json'
            }
        });

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token || refreshToken,
            expiresIn: response.data.expires_in
        };
    } catch (error) {
        console.error('Error refreshing GitHub token:', error);
        throw new Error('Failed to refresh GitHub token');
    }
};