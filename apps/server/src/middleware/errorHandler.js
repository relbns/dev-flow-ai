// src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
    console.error('Unhandled error:', err);

    // GitHub API rate limit error
    if (err.response && err.response.status === 403 && err.response.headers['x-ratelimit-remaining'] === '0') {
        return res.status(429).json({
            error: 'GitHub API rate limit exceeded. Please try again later.',
            reset: err.response.headers['x-ratelimit-reset']
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }

    // MongoDB validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).json({ error: 'Validation error', details: errors });
    }

    // MongoDB duplicate key error
    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(409).json({ error: 'Duplicate key error' });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
};