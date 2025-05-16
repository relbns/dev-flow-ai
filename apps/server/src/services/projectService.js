// src/services/projectService.js
import Project from '../models/Project.js';
import User from '../models/User.js';
import { fetchRepoCollaborators } from './githubService.js';

// Create a new project
export const createProject = async (userId, projectData) => {
    try {
        const project = new Project({
            name: projectData.name,
            description: projectData.description,
            guidelines: projectData.guidelines || '',
            githubRepo: projectData.githubRepo,
            owner: userId,
            members: [{ user: userId, role: 'owner' }]
        });

        if (projectData.scopedPaths) {
            project.scopedPaths = projectData.scopedPaths;
        }

        await project.save();

        return project;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
};

// Get project by ID
export const getProjectById = async (projectId, userId) => {
    try {
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ],
            status: { $ne: 'deleted' }
        }).populate('owner', 'username displayName avatarUrl')
            .populate('members.user', 'username displayName avatarUrl');

        if (!project) {
            throw new Error('Project not found or you do not have access');
        }

        return project;
    } catch (error) {
        console.error('Error getting project:', error);
        throw error;
    }
};

// Get user's projects
export const getUserProjects = async (userId) => {
    try {
        const projects = await Project.find({
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ],
            status: { $ne: 'deleted' }
        }).populate('owner', 'username displayName avatarUrl')
            .sort({ updatedAt: -1 });

        return projects;
    } catch (error) {
        console.error('Error getting user projects:', error);
        throw error;
    }
};

// Update project
export const updateProject = async (projectId, userId, updates) => {
    try {
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
            ],
            status: { $ne: 'deleted' }
        });

        if (!project) {
            throw new Error('Project not found or you do not have permission to update');
        }

        // Update allowed fields
        if (updates.name) project.name = updates.name;
        if (updates.description !== undefined) project.description = updates.description;
        if (updates.guidelines !== undefined) project.guidelines = updates.guidelines;
        if (updates.status) project.status = updates.status;
        if (updates.scopedPaths) project.scopedPaths = updates.scopedPaths;

        await project.save();

        return project;
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
};

// Delete project (soft delete)
export const deleteProject = async (projectId, userId) => {
    try {
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId, 'members.role': 'owner' }
            ]
        });

        if (!project) {
            throw new Error('Project not found or you do not have permission to delete');
        }

        project.status = 'deleted';
        await project.save();

        return { success: true };
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
};

// Add members to project
export const addProjectMember = async (projectId, userId, memberData) => {
    try {
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
            ]
        });

        if (!project) {
            throw new Error('Project not found or you do not have permission to add members');
        }

        // Find the user to add
        const memberUser = await User.findOne({
            $or: [
                { _id: memberData.userId },
                { username: memberData.username }
            ]
        });

        if (!memberUser) {
            throw new Error('User not found');
        }

        // Check if already a member
        const existingMember = project.members.find(
            m => m.user.toString() === memberUser._id.toString()
        );

        if (existingMember) {
            throw new Error('User is already a member of this project');
        }

        // Add the member
        project.members.push({
            user: memberUser._id,
            role: memberData.role || 'member'
        });

        await project.save();

        return project;
    } catch (error) {
        console.error('Error adding project member:', error);
        throw error;
    }
};

// Update or remove project member
export const updateProjectMember = async (projectId, userId, memberId, updates) => {
    try {
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
            ]
        });

        if (!project) {
            throw new Error('Project not found or you do not have permission to update members');
        }

        // Find the member
        const memberIndex = project.members.findIndex(
            m => m.user.toString() === memberId
        );

        if (memberIndex === -1) {
            throw new Error('Member not found in project');
        }

        // Prevent owner from being demoted by non-owners
        if (
            project.members[memberIndex].role === 'owner' &&
            !project.owner.equals(userId)
        ) {
            throw new Error('Only the project owner can change the role of another owner');
        }

        // Update or remove
        if (updates.remove) {
            // Prevent removing the owner
            if (project.members[memberIndex].role === 'owner' && project.owner.equals(memberId)) {
                throw new Error('Cannot remove the project owner');
            }

            project.members.splice(memberIndex, 1);
        } else if (updates.role) {
            project.members[memberIndex].role = updates.role;
        }

        await project.save();

        return project;
    } catch (error) {
        console.error('Error updating project member:', error);
        throw error;
    }
};

// Sync GitHub collaborators with project members
export const syncGithubCollaborators = async (projectId, userId) => {
    try {
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: userId },
                { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
            ]
        });

        if (!project || !project.githubRepo) {
            throw new Error('Project not found, you do not have permission, or no GitHub repo linked');
        }

        const user = await User.findById(userId);

        // Fetch collaborators from GitHub
        const collaborators = await fetchRepoCollaborators(
            user,
            project.githubRepo.owner.login,
            project.githubRepo.name
        );

        // For each collaborator, find user by GitHub username and add as member if not already
        let newMembersCount = 0;

        for (const collaborator of collaborators) {
            // Find user by GitHub username
            const collaboratorUser = await User.findOne({ username: collaborator.login });

            if (collaboratorUser) {
                // Check if already a member
                const existingMember = project.members.find(
                    m => m.user.toString() === collaboratorUser._id.toString()
                );

                if (!existingMember) {
                    // Determine role based on GitHub permissions
                    let role = 'member';
                    if (collaborator.permissions.admin) {
                        role = 'admin';
                    }

                    // Add as member
                    project.members.push({
                        user: collaboratorUser._id,
                        role
                    });

                    newMembersCount++;
                }
            }
        }

        if (newMembersCount > 0) {
            await project.save();
        }

        return {
            success: true,
            newMembersCount,
            totalMembers: project.members.length
        };
    } catch (error) {
        console.error('Error syncing GitHub collaborators:', error);
        throw error;
    }
};