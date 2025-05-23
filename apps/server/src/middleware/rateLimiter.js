import rateLimit from 'express-rate-limit';

const customKeyGenerator = (req) => req.ip || '127.0.0.1';

// // Custom key generator for reliable IP detection in serverless environments
// const customKeyGenerator = (req) => {
//     // First try X-Forwarded-For header (most proxies set this)
//     const xForwardedFor = req.headers['x-forwarded-for'];
//     if (xForwardedFor) {
//         // Take the first IP in case of multiple proxies
//         return xForwardedFor.split(',')[0].trim();
//     }

//     // Fallbacks if X-Forwarded-For isn't available
//     return req.headers['x-real-ip'] ||
//         req.connection?.remoteAddress ||
//         req.socket?.remoteAddress ||
//         '127.0.0.1';
// };

// Debug middleware to log IP detection info
export const ipDebugMiddleware = (req, res, next) => {
    console.log({
        path: req.originalUrl,
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'remoteAddress': req.connection?.remoteAddress || req.socket?.remoteAddress,
        'trustProxy': req.app.get('trust proxy'),
        'determinedIp': customKeyGenerator(req)
    });
    next();
};

// Create rate limiters based on environment
export const createRateLimiters = (isDevelopment = false) => {
    // GitHub API rate limiter
    const githubRateLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: isDevelopment ? 60 : 15, // 60 requests per minute in development, 15 in production
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests to GitHub endpoints, please try again after a minute',
        keyGenerator: customKeyGenerator,
        handler: (req, res, next, options) => {
            console.log(`Rate limited GitHub request to ${req.originalUrl}`);
            res.status(options.statusCode).json({
                error: options.message,
                retryAfter: Math.ceil(options.windowMs / 1000)
            });
        },
        // Skip rate limiting for certain endpoints in development
        skip: (req, res) => isDevelopment && (
            req.originalUrl.includes('/auth/profile') ||
            req.originalUrl.includes('/auth/github/login')
        )
    });

    // General API rate limiter
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isDevelopment ? 1000 : 100, // 1000 requests in development, 100 in production
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: customKeyGenerator,
        // Skip rate limiting for auth endpoints in development
        skip: (req, res) => isDevelopment && (
            req.originalUrl.includes('/auth/') ||
            req.originalUrl === '/api/health'
        )
    });

    return {
        githubRateLimiter,
        generalLimiter
    };
};

// Optionally, if you want to add Redis-based distributed rate limiting:
/*
export const createRedisRateLimiters = async (isDevelopment = false, redisUrl) => {
  import RedisStore from 'rate-limit-redis';
  import { createClient } from 'redis';

  const redisClient = createClient({
    url: redisUrl || process.env.REDIS_URL
  });
  await redisClient.connect();

  // Then create limiters with Redis store
  // ...
};
*/