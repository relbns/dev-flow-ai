// src/services/githubService.js
import axios from 'axios';
import User from '../models/User.js';
import { refreshGithubToken } from './authService.js';

// Function to refresh a user's GitHub token
const refreshUserGithubToken = async (user) => {
    try {
        // Fetch user with token info
        const userWithToken = await User.findById(user._id).select('+accessToken +refreshToken');
        if (!userWithToken || !userWithToken.refreshToken) {
            throw new Error('User or refresh token not found');
        }

        // Refresh the token
        const tokenData = await refreshGithubToken(userWithToken.refreshToken);
        
        // Update the user with new token information
        userWithToken.accessToken = tokenData.accessToken;
        userWithToken.refreshToken = tokenData.refreshToken;
        
        // Calculate new expiration time
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expiresIn || 3600 * 8));
        userWithToken.tokenExpiresAt = expiresAt;
        
        await userWithToken.save();
        
        return tokenData.accessToken;
    } catch (error) {
        console.error('Failed to refresh GitHub token:', error);
        throw new Error('GitHub authentication expired. Please login again.');
    }
};

// Create configured GitHub API client
const createGithubClient = (accessToken) => {
    return axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });
};

// Fetch user's GitHub organizations
export const fetchUserOrganizations = async (user) => {
    try {
        // Ensure we have a valid user object with access token
        const userWithToken = await User.findById(user._id).select('+accessToken');
        if (!userWithToken || !userWithToken.accessToken) {
            throw new Error('User or access token not found');
        }

        // Create GitHub client
        const github = createGithubClient(userWithToken.accessToken);

        // Fetch organizations
        const response = await github.get('/user/orgs');

        // Map the response to our format
        const organizations = response.data.map(org => ({
            id: org.id.toString(),
            login: org.login,
            avatarUrl: org.avatar_url
        }));

        // Update user with organizations
        userWithToken.organizations = organizations;
        userWithToken.lastSync = new Date();
        await userWithToken.save();

        return organizations;
    } catch (error) {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            try {
                const newToken = await refreshUserGithubToken(user);
                // Retry with new token
                const github = createGithubClient(newToken);
                const response = await github.get('/user/orgs');

                const organizations = response.data.map(org => ({
                    id: org.id.toString(),
                    login: org.login,
                    avatarUrl: org.avatar_url
                }));

                // Update user with organizations
                user.organizations = organizations;
                user.lastSync = new Date();
                await user.save();

                return organizations;
            } catch (refreshError) {
                console.error('Error refreshing token for organizations fetch:', refreshError);
                throw refreshError;
            }
        }

        console.error('Error fetching GitHub organizations:', error);
        throw error;
    }
};

// Fetch repositories for an organization
export const fetchOrganizationRepos = async (user, orgName) => {
    try {
        // Ensure we have a valid user object with access token
        const userWithToken = await User.findById(user._id).select('+accessToken');
        if (!userWithToken || !userWithToken.accessToken) {
            throw new Error('User or access token not found');
        }

        // Create GitHub client
        const github = createGithubClient(userWithToken.accessToken);

        // Fetch repositories
        const response = await github.get(`/orgs/${orgName}/repos`, {
            params: {
                per_page: 100,
                sort: 'updated',
                direction: 'desc'
            }
        });

        // Map the response to our format
        return response.data.map(repo => ({
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            owner: {
                id: repo.owner.id.toString(),
                login: repo.owner.login,
                type: repo.owner.type
            },
            private: repo.private,
            url: repo.html_url,
            description: repo.description
        }));
    } catch (error) {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            try {
                const newToken = await refreshUserGithubToken(user);
                // Retry with new token
                const github = createGithubClient(newToken);
                const response = await github.get(`/orgs/${orgName}/repos`, {
                    params: {
                        per_page: 100,
                        sort: 'updated',
                        direction: 'desc'
                    }
                });

                return response.data.map(repo => ({
                    id: repo.id.toString(),
                    name: repo.name,
                    fullName: repo.full_name,
                    owner: {
                        id: repo.owner.id.toString(),
                        login: repo.owner.login,
                        type: repo.owner.type
                    },
                    private: repo.private,
                    url: repo.html_url,
                    description: repo.description
                }));
            } catch (refreshError) {
                console.error('Error refreshing token for repository fetch:', refreshError);
                throw refreshError;
            }
        }

        console.error(`Error fetching repositories for organization ${orgName}:`, error);
        throw error;
    }
};

// Fetch user's repositories
export const fetchUserRepos = async (user) => {
    try {
        // Ensure we have a valid user object with access token
        const userWithToken = await User.findById(user._id).select('+accessToken');
        if (!userWithToken || !userWithToken.accessToken) {
            throw new Error('User or access token not found');
        }

        // Create GitHub client
        const github = createGithubClient(userWithToken.accessToken);

        // Fetch repositories
        const response = await github.get('/user/repos', {
            params: {
                per_page: 100,
                sort: 'updated',
                direction: 'desc',
                affiliation: 'owner,collaborator'
            }
        });

        // Map the response to our format
        return response.data.map(repo => ({
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            owner: {
                id: repo.owner.id.toString(),
                login: repo.owner.login,
                type: repo.owner.type
            },
            private: repo.private,
            url: repo.html_url,
            description: repo.description
        }));
    } catch (error) {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            try {
                const newToken = await refreshUserGithubToken(user);
                // Retry with new token
                const github = createGithubClient(newToken);
                const response = await github.get('/user/repos', {
                    params: {
                        per_page: 100,
                        sort: 'updated',
                        direction: 'desc',
                        affiliation: 'owner,collaborator'
                    }
                });

                return response.data.map(repo => ({
                    id: repo.id.toString(),
                    name: repo.name,
                    fullName: repo.full_name,
                    owner: {
                        id: repo.owner.id.toString(),
                        login: repo.owner.login,
                        type: repo.owner.type
                    },
                    private: repo.private,
                    url: repo.html_url,
                    description: repo.description
                }));
            } catch (refreshError) {
                console.error('Error refreshing token for repository fetch:', refreshError);
                throw refreshError;
            }
        }

        console.error('Error fetching user repositories:', error);
        throw error;
    }
};

// Fetch repository collaborators
export const fetchRepoCollaborators = async (user, repoOwner, repoName) => {
    try {
        // Ensure we have a valid user object with access token
        const userWithToken = await User.findById(user._id).select('+accessToken');
        if (!userWithToken || !userWithToken.accessToken) {
            throw new Error('User or access token not found');
        }

        // Create GitHub client
        const github = createGithubClient(userWithToken.accessToken);

        // Fetch collaborators
        const response = await github.get(`/repos/${repoOwner}/${repoName}/collaborators`, {
            params: {
                per_page: 100
            }
        });

        // Map the response to our format
        return response.data.map(collaborator => ({
            id: collaborator.id.toString(),
            login: collaborator.login,
            avatarUrl: collaborator.avatar_url,
            permissions: collaborator.permissions,
            role: collaborator.role_name
        }));
    } catch (error) {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            try {
                const newToken = await refreshUserGithubToken(user);
                // Retry with new token
                const github = createGithubClient(newToken);
                const response = await github.get(`/repos/${repoOwner}/${repoName}/collaborators`, {
                    params: {
                        per_page: 100
                    }
                });

                return response.data.map(collaborator => ({
                    id: collaborator.id.toString(),
                    login: collaborator.login,
                    avatarUrl: collaborator.avatar_url,
                    permissions: collaborator.permissions,
                    role: collaborator.role_name
                }));
            } catch (refreshError) {
                console.error('Error refreshing token for collaborators fetch:', refreshError);
                throw refreshError;
            }
        }

        console.error(`Error fetching collaborators for ${repoOwner}/${repoName}:`, error);
        throw error;
    }
};

// Fetch repository content
export const fetchRepoContent = async (user, repoOwner, repoName, path = '') => {
    try {
        // Ensure we have a valid user object with access token
        const userWithToken = await User.findById(user._id).select('+accessToken');
        if (!userWithToken || !userWithToken.accessToken) {
            throw new Error('User or access token not found');
        }

        // Create GitHub client
        const github = createGithubClient(userWithToken.accessToken);

        // Fetch repository content
        const response = await github.get(`/repos/${repoOwner}/${repoName}/contents/${path}`, {
            params: {
                ref: 'main' // Default to main branch
            }
        });

        // Return the content
        return Array.isArray(response.data)
            ? response.data.map(item => ({
                name: item.name,
                path: item.path,
                type: item.type,
                size: item.size,
                url: item.html_url,
                downloadUrl: item.download_url
            }))
            : {
                name: response.data.name,
                path: response.data.path,
                type: response.data.type,
                size: response.data.size,
                url: response.data.html_url,
                content: response.data.content ? Buffer.from(response.data.content, 'base64').toString() : null,
                encoding: response.data.encoding
            };
    } catch (error) {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            try {
                const newToken = await refreshUserGithubToken(user);
                // Retry with new token
                const github = createGithubClient(newToken);
                const response = await github.get(`/repos/${repoOwner}/${repoName}/contents/${path}`, {
                    params: {
                        ref: 'main' // Default to main branch
                    }
                });

                return Array.isArray(response.data)
                    ? response.data.map(item => ({
                        name: item.name,
                        path: item.path,
                        type: item.type,
                        size: item.size,
                        url: item.html_url,
                        downloadUrl: item.download_url
                    }))
                    : {
                        name: response.data.name,
                        path: response.data.path,
                        type: response.data.type,
                        size: response.data.size,
                        url: response.data.html_url,
                        content: response.data.content ? Buffer.from(response.data.content, 'base64').toString() : null,
                        encoding: response.data.encoding
                    };
            } catch (refreshError) {
                console.error('Error refreshing token for content fetch:', refreshError);
                throw refreshError;
            }
        }

        console.error(`Error fetching content for ${repoOwner}/${repoName}/${path}:`, error);
        throw error;
    }
};

// Create GitHub issue
export const createGithubIssue = async (user, repoOwner, repoName, issueData) => {
    try {
        // Ensure we have a valid user object with access token
        const userWithToken = await User.findById(user._id).select('+accessToken');
        if (!userWithToken || !userWithToken.accessToken) {
            throw new Error('User or access token not found');
        }

        // Create GitHub client
        const github = createGithubClient(userWithToken.accessToken);

        // Create issue
        const response = await github.post(`/repos/${repoOwner}/${repoName}/issues`, {
            title: issueData.title,
            body: issueData.body,
            assignees: issueData.assignees || [],
            labels: issueData.labels || []
        });

        return {
            id: response.data.id.toString(),
            number: response.data.number,
            title: response.data.title,
            state: response.data.state,
            url: response.data.html_url,
            createdAt: response.data.created_at
        };
    } catch (error) {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            try {
                const newToken = await refreshUserGithubToken(user);
                // Retry with new token
                const github = createGithubClient(newToken);
                const response = await github.post(`/repos/${repoOwner}/${repoName}/issues`, {
                    title: issueData.title,
                    body: issueData.body,
                    assignees: issueData.assignees || [],
                    labels: issueData.labels || []
                });

                return {
                    id: response.data.id.toString(),
                    number: response.data.number,
                    title: response.data.title,
                    state: response.data.state,
                    url: response.data.html_url,
                    createdAt: response.data.created_at
                };
            } catch (refreshError) {
                console.error('Error refreshing token for issue creation:', refreshError);
                throw refreshError;
            }
        }

        console.error(`Error creating issue for ${repoOwner}/${repoName}:`, error);
        throw error;
    }
};