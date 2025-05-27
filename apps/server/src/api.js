// src/api.js
import app from './index.js';

// Simple handler for Vercel
export default async (req, res) => {
  // The app is already configured, so just run it as middleware
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        console.error('API handler error:', err);
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
        });
        return reject(err);
      }
      resolve();
    });
  });
};