// src/index.js
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { corsMiddleware } from './middleware/corsMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  // Disable contentSecurityPolicy for development
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  // Allow server to be in an iframe for development tools
  frameguard: process.env.NODE_ENV === 'production' ? { action: 'deny' } : false
}));

// Custom CORS middleware
app.use(corsMiddleware());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// More permissive rate limiting for development
// In production, these values should be lower
const isDevelopment = process.env.NODE_ENV !== 'production';

// GitHub rate limiter (much more permissive for development)
const githubRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isDevelopment ? 60 : 15, // 60 requests per minute in development, 15 in production
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests to GitHub endpoints, please try again after a minute',
    handler: (req, res, next, options) => {
        console.log(`Rate limited request to ${req.originalUrl}`);
        res.status(options.statusCode).json({
            error: options.message,
            retryAfter: Math.ceil(options.windowMs / 1000)
        });
    },
    // Skip rate limiting for certain endpoints in development
    skip: (req, res) => isDevelopment && (
        req.originalUrl.includes('/auth/profile') || // Skip profile checks
        req.originalUrl.includes('/auth/github/login') // Skip login redirects
    )
});

// Only apply GitHub rate limiter in production
if (!isDevelopment) {
    app.use('/api/github', githubRateLimiter);
}

// Much more permissive general rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // 1000 requests in development, 100 in production
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for auth endpoints in development
    skip: (req, res) => isDevelopment && (
        req.originalUrl.includes('/auth/') ||
        req.originalUrl === '/api/health'
    )
});

// Apply general rate limiter
app.use(generalLimiter);

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup API routes
app.use('/api', routes);

// Simple redirect for GitHub login when accessed directly
app.get('/auth/github/login', (req, res) => {
  res.redirect('/api/auth/github/login');
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

startServer();

export default app;