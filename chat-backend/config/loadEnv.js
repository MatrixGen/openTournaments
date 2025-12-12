const path = require('path');
const dotenv = require('dotenv');

// Determine which env file to load
const env = process.env.NODE_ENV || 'test';
const envFile = `.env.${env}`;

// Full path to the file
const envPath = path.resolve(process.cwd(), envFile);

// Load the correct .env file
dotenv.config({ path: envPath });

console.log(`✅ Loaded environment variables from ${envFile}`);
