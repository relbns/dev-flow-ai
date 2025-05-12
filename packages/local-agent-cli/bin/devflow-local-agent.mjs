#!/usr/bin/env node

// Import required modules
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

// Create a require function for the current module
const require = createRequire(import.meta.url);

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the main module
import '../index.js';