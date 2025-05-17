// setup.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ApiKey from '../models/ApiKey.js';

dotenv.config();

const setupDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(collection => collection.name);

    console.log('Existing collections:', collectionNames);

    // Create indexes for better query performance
    // But handle existing indexes by dropping them first if needed
    
    // Function to safely create indexes (by dropping existing ones first)
    const safeCreateIndexes = async (model, modelName) => {
      try {
        // Get existing indexes first
        const existingIndexes = await mongoose.connection.db
          .collection(model.collection.name)
          .indexes();
        
        console.log(`Existing indexes for ${modelName}:`, existingIndexes.map(idx => idx.name));
        
        // Try to create indexes - will handle duplicates automatically
        await model.createIndexes();
        console.log(`${modelName} indexes created/updated`);
      } catch (indexError) {
        console.warn(`Warning: Could not create indexes for ${modelName}:`, indexError.message);
        console.log(`${modelName} may already have compatible indexes`);
      }
    };

    if (collectionNames.includes('users')) {
      await safeCreateIndexes(User, 'User');
    }

    if (collectionNames.includes('projects')) {
      await safeCreateIndexes(Project, 'Project');
    }

    if (collectionNames.includes('tasks')) {
      await safeCreateIndexes(Task, 'Task');
    }

    if (collectionNames.includes('apikeys')) {
      await safeCreateIndexes(ApiKey, 'ApiKey');
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

setupDatabase();