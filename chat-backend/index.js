// index.js - Main entrypoint
// Loads environment variables and starts the server

require('dotenv').config(); // Load .env variables

// Start the server
// server.js handles HTTP server, Socket.IO, Redis, and app listening
require('./src/server');
