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
    if (collectionNames.includes('users')) {
      await User.createIndexes();
      console.log('User indexes created');
    }

    if (collectionNames.includes('projects')) {
      await Project.createIndexes();
      console.log('Project indexes created');
    }

    if (collectionNames.includes('tasks')) {
      await Task.createIndexes();
      console.log('Task indexes created');
    }

    if (collectionNames.includes('apikeys')) {
      await ApiKey.createIndexes();
      console.log('ApiKey indexes created');
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