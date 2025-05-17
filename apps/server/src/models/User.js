// src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    githubId: {
        type: String,
        required: true,
        unique: true  // This already creates a unique index
    },
    username: {
        type: String,
        required: true
    },
    email: String,
    displayName: String,
    avatarUrl: String,
    accessToken: {
        type: String,
        required: true,
        select: false // Don't return in normal queries
    },
    refreshToken: {
        type: String,
        select: false
    },
    tokenExpiresAt: Date,
    organizations: [{
        id: String,
        login: String,
        avatarUrl: String
    }],
    lastSync: Date
}, {
    timestamps: true
});

// Indexes for performance - removed githubId as it's already indexed as unique
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

export default mongoose.model('User', userSchema);