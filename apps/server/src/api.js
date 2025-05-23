import app from './index.js';
import serverless from 'serverless-http';

// Configure serverless handler
const serverlessHandler = serverless(app, {
  binary: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
  provider: {
    // Increase timeout to 10 seconds
    timeout: 10
  }
});

// Export the serverless handler
export default async (req, res) => {
  try {
    // Try to handle the request
    return await serverlessHandler(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    
    // If there's an error, return a 500 response
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  }
};