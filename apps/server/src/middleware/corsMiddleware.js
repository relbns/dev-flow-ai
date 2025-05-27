// src/middleware/corsMiddleware.js
import cors from 'cors';

export const corsMiddleware = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Debug logging for CORS issues
      console.log(`CORS request from origin: ${origin}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      
      // Check if the origin or any origin with a path matches
      if (allowedOrigins.some(allowedOrigin => 
        origin === allowedOrigin || 
        origin.startsWith(allowedOrigin) ||
        // Special case for GitHub Pages
        (allowedOrigin.includes('github.io') && origin.includes('github.io'))
      )) {
        console.log(`Origin ${origin} allowed by CORS policy`);
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS policy`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });
};