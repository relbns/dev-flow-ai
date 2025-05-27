import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import axios from 'axios';

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    await client.connect();
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Simplified profile handler for Vercel
export default async function handler(req, res) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'temp-jwt-secret');
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Check if this is a temp token from GitHub OAuth
    if (decodedToken.isTemp) {
      console.log('Processing temp token from GitHub OAuth');
      
      // Create a MongoDB client
      let client;
      try {
        client = await connectToMongoDB();
        const db = client.db();
        const usersCollection = db.collection('users');
        
        // Find existing user or create new one
        const existingUser = await usersCollection.findOne({ githubId: decodedToken.githubId });
        
        let userId;
        if (existingUser) {
          console.log('Updating existing user:', existingUser._id);
          
          // Update user with new token data
          await usersCollection.updateOne(
            { _id: existingUser._id },
            { 
              $set: {
                username: decodedToken.username,
                displayName: decodedToken.displayName,
                email: decodedToken.email,
                avatarUrl: decodedToken.avatarUrl,
                accessToken: decodedToken.githubToken,
                refreshToken: decodedToken.githubRefreshToken,
                tokenExpiresAt: new Date(Date.now() + (decodedToken.tokenExpiresIn || 28800) * 1000),
                updatedAt: new Date()
              }
            }
          );
          
          userId = existingUser._id;
        } else {
          console.log('Creating new user for GitHub ID:', decodedToken.githubId);
          
          // Create new user
          const result = await usersCollection.insertOne({
            githubId: decodedToken.githubId,
            username: decodedToken.username,
            displayName: decodedToken.displayName,
            email: decodedToken.email,
            avatarUrl: decodedToken.avatarUrl,
            accessToken: decodedToken.githubToken,
            refreshToken: decodedToken.githubRefreshToken,
            tokenExpiresAt: new Date(Date.now() + (decodedToken.tokenExpiresIn || 28800) * 1000),
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          userId = result.insertedId;
        }
        
        // Fetch or refresh GitHub organizations
        let organizations = [];
        try {
          const githubResponse = await axios.get('https://api.github.com/user/orgs', {
            headers: { Authorization: `token ${decodedToken.githubToken}` },
            timeout: 5000
          });
          
          organizations = githubResponse.data.map(org => ({
            id: org.id.toString(),
            login: org.login,
            name: org.name || org.login,
            avatarUrl: org.avatar_url
          }));
          
          // Update user with organizations
          await usersCollection.updateOne(
            { _id: userId },
            { 
              $set: {
                organizations: organizations,
                lastSync: new Date()
              }
            }
          );
        } catch (orgError) {
          console.warn('Failed to fetch GitHub organizations:', orgError.message);
        }
        
        // Generate new token with user ID
        const newToken = jwt.sign(
          { userId: userId.toString(), githubId: decodedToken.githubId },
          process.env.JWT_SECRET || 'temp-jwt-secret',
          { expiresIn: '7d' }
        );
        
        // Send user profile with new token
        return res.status(200).json({
          user: {
            id: userId.toString(),
            username: decodedToken.username,
            displayName: decodedToken.displayName,
            email: decodedToken.email,
            avatarUrl: decodedToken.avatarUrl,
            organizations: organizations
          },
          token: newToken
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        
        // Still return basic profile from token
        return res.status(200).json({
          user: {
            githubId: decodedToken.githubId,
            username: decodedToken.username,
            displayName: decodedToken.displayName,
            email: decodedToken.email,
            avatarUrl: decodedToken.avatarUrl
          }
        });
      } finally {
        if (client) {
          await client.close();
        }
      }
    } else {
      // Regular token, fetch user from database
      if (!decodedToken.userId) {
        return res.status(400).json({ error: 'Invalid token format - missing user ID' });
      }
      
      let client;
      try {
        client = await connectToMongoDB();
        const db = client.db();
        const usersCollection = db.collection('users');
        
        // Find user by ID
        const user = await usersCollection.findOne({ _id: new ObjectId(decodedToken.userId) });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user profile
        return res.status(200).json({
          user: {
            id: user._id.toString(),
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            organizations: user.organizations || []
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Database error' });
      } finally {
        if (client) {
          await client.close();
        }
      }
    }
  } catch (error) {
    console.error('Profile handler error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}