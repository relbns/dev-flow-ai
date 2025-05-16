// src/models/ApiKey.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const apiKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    scopes: [{
        type: String,
        enum: ['read', 'write', 'admin'],
        default: ['read']
    }],
    lastUsed: Date,
    expiresAt: Date,
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Method to generate a new API key
apiKeySchema.statics.generateKey = function (userId, name, projects = [], scopes = ['read'], expiresAt = null) {
    const apiKey = crypto.randomBytes(32).toString('hex');
    return new this({
        key: apiKey,
        name,
        user: userId,
        projects,
        scopes,
        expiresAt
    });
};

// Indexes for performance
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ user: 1 });
apiKeySchema.index({ projects: 1 });
apiKeySchema.index({ status: 1 });

export default mongoose.model('ApiKey', apiKeySchema);