// src/middleware/corsMiddleware.js
import cors from 'cors';

export const corsMiddleware = () => {
  // Default allowed origins including GitHub Pages and Vercel
  const defaultOrigins = [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://relbns.github.io', // Your specific GitHub Pages domain
    'https://dev-flow-ai.vercel.app' // Your Vercel domain
  ];
  
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : defaultOrigins;
  
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Debug logging for CORS issues
      console.log(`CORS request from origin: ${origin}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      
      // Check if the origin matches allowed origins
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Exact match
        if (origin === allowedOrigin) return true;
        
        // Allow subpaths of allowed origins
        if (origin.startsWith(allowedOrigin)) return true;
        
        // Special handling for GitHub Pages domains
        if (allowedOrigin.includes('github.io') && origin.includes('github.io')) {
          // Extract the base domain (e.g., relbns.github.io)
          const allowedBase = allowedOrigin.replace(/^https?:\/\//, '').split('/')[0];
          const originBase = origin.replace(/^https?:\/\//, '').split('/')[0];
          return allowedBase === originBase;
        }
        
        // Special handling for Vercel domains
        if (allowedOrigin.includes('vercel.app') && origin.includes('vercel.app')) {
          const allowedBase = allowedOrigin.replace(/^https?:\/\//, '').split('/')[0];
          const originBase = origin.replace(/^https?:\/\//, '').split('/')[0];
          return allowedBase === originBase;
        }
        
        return false;
      });
      
      if (isAllowed) {
        console.log(`Origin ${origin} allowed by CORS policy`);
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS policy`);
        // In production, be more permissive with GitHub Pages for now
        if (origin.includes('github.io') && process.env.NODE_ENV === 'production') {
          console.log(`Allowing GitHub Pages origin ${origin} in production mode`);
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
};