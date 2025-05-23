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
      
      // Check if the origin or any origin with an additional path matches
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Direct match
        if (origin === allowedOrigin) return true;
        
        // Check if origin starts with an allowed origin
        // This handles cases like 'https://yourusername.github.io/dev-flow-ai'
        // when 'https://yourusername.github.io' is in the allowed origins
        return origin.startsWith(allowedOrigin);
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS policy`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });
};