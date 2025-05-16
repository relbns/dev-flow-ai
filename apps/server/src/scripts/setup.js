// src/scripts/setup.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import ApiKey from '../models/ApiKey.js';

dotenv.config();

const setupDevEnvironment = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connected to MongoDB, database: ${process.env.MONGODB_URI}`);

        // Check if admin user exists
        const adminUser = await User.findOne({ username: 'admin' });

        if (!adminUser) {
            console.log('Creating admin user...');
            const newAdmin = new User({
                githubId: 'admin',
                username: 'admin',
                displayName: 'Admin User',
                email: 'admin@example.com',
                accessToken: 'fake-token',
                tokenExpiresAt: new Date(Date.now() + 3600000)
            });

            await newAdmin.save();
            console.log('Admin user created');

            // Create an API key for the admin
            const apiKey = await ApiKey.generateKey(
                newAdmin._id,
                'Development API Key',
                [],
                ['read', 'write', 'admin']
            );

            await apiKey.save();
            console.log('API key created for admin:', apiKey.key);
        } else {
            console.log('Admin user already exists');
        }

        console.log('Dev environment setup completed');
    } catch (error) {
        console.error('Error setting up dev environment:', error);
    } finally {
        await mongoose.disconnect();
    }
};

setupDevEnvironment();