import mongoose from 'mongoose';

// Cache the MongoDB connection to reuse it across function invocations
let cachedConnection = null;

export const connectToDatabase = async () => {
    // If we already have a connection, reuse it
    if (cachedConnection) {
        return cachedConnection;
    }

    // Check if we have MongoDB URI
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not defined');
    }

    try {
        // Set strictQuery for compatibility
        mongoose.set('strictQuery', false);

        // Connect with timeout setting to avoid long-running connections
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
            bufferCommands: false
        });
        
        console.log('MongoDB connected successfully');
        
        // Cache the connection
        cachedConnection = connection;
        return connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};
