// src/index.js
import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { corsMiddleware } from './middleware/corsMiddleware.js';
import { connectToDatabase } from './utils/mongodb.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRateLimiters, ipDebugMiddleware } from './middleware/rateLimiter.js';

// get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// More permissive rate limiting for development
// In production, these values should be lower
const isDevelopment = process.env.NODE_ENV !== 'production';
app.set('trust proxy', true);

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

// Add IP debug middleware in development
if (isDevelopment) {
  app.use(ipDebugMiddleware);
}

// Create rate limiters
const { githubRateLimiter, generalLimiter } = createRateLimiters(isDevelopment);

// Only apply GitHub rate limiter in production
if (!isDevelopment) {
  app.use('/api/github', githubRateLimiter);
}

// Apply general rate limiter
app.use(generalLimiter);

// Add basic health check endpoint that doesn't require DB connection
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lazy-connect to DB only when API endpoints are hit
app.use('/api', async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed', message: error.message });
  }
});

// Setup API routes
app.use('/api', routes);

// Simple redirect for GitHub login when accessed directly
app.get('/auth/github/login', (req, res) => {
  res.redirect('/api/auth/github/login');
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB and start server in development
// In production on Vercel, we don't need to call listen()
const startServer = async () => {
  try {
    // Only try to pre-connect to database in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        await connectToDatabase();
        console.log('Connected to MongoDB');
      } catch (err) {
        console.warn('Warning: Could not connect to MongoDB:', err.message);
        console.warn('Server will still start, but API calls may fail');
      }
      
      // Start the server in development mode
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
      });
    } else {
      console.log('Running in production mode (serverless)');
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;