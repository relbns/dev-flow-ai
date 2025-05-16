// src/models/Project.js
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    guidelines: String,
    scopedPaths: [{
        path: String,
        description: String
    }],
    githubRepo: {
        id: String,
        name: String,
        fullName: String,
        owner: {
            id: String,
            login: String,
            type: String
        },
        private: Boolean,
        url: String
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes for performance
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ 'githubRepo.id': 1 });
projectSchema.index({ status: 1 });

export default mongoose.model('Project', projectSchema);