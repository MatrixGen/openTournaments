const net = require('net');
const { spawn } = require('child_process');

// The host and port should be correct based on your Docker setup
const host = process.env.DB_HOST_PROD || process.env.DB_HOST_DEV || 'db';
const port = process.env.DB_PORT || 5432;
const DB_SCHEMA = process.env.DB_SCHEMA; // 👈 Get the schema name from .env

/**
 * Checks connectivity to the database host and port.
 */
function checkConnection() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    // Set a timeout and error handlers
    socket.setTimeout(500); 
    socket.on('timeout', () => reject(false));
    socket.on('error', () => reject(false));
  });
}

/**
 * Polls the database connection until successful.
 */
async function waitForDB() {
  let connected = false;
  while (!connected) {
    try {
      await checkConnection();
      connected = true;
      console.log(`✅ DB is ready at ${host}:${port}`);
    } catch {
      console.log(`⏳ Waiting for DB at ${host}:${port}...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/**
 * Helper to run shell commands and stream output.
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    // shell: true allows running 'npx' directly without resolving its path
    const process = spawn(command, args, { stdio: 'inherit', shell: true });

    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
    // Handle spawn error (e.g., command not found)
    process.on('error', (err) => {
        reject(new Error(`Failed to start command ${command}: ${err.message}`));
    });
  });
}

/**
 * Main application startup sequence.
 * 1. Waits for DB connectivity.
 * 2. Runs migrations and seeds (assuming schema is already created externally).
 * 3. Starts the server process.
 */
async function startApp() {
  await waitForDB();

  if (!DB_SCHEMA) {
      console.error("❌ DB_SCHEMA environment variable is not set! Cannot run migrations.");
      process.exit(1);
  }
  
  // ----------------------------------------------------
  // RUN MIGRATIONS
 
  
  // ----------------------------------------------------
  // RUN SEEDERS (New step for completeness)
  // ----------------------------------------------------
  console.log(`🌱 Running Sequelize seeders for schema '${DB_SCHEMA}'...`);
  await runCommand('npx', ['sequelize-cli', 'db:seed:all']).catch((err) => {
      console.error('❌ Seeding failed:', err);
      // NOTE: Failure to seed is often not critical for deployment but might be for testing/dev
      // Decide if you want to exit here or just log the error. We will exit for safety.
      process.exit(1);
  });
  
  console.log('✅ Chat-backend setup complete (Migrations & Seeding).');

  // ----------------------------------------------------
  // START SERVER
  // ----------------------------------------------------
  console.log('🚀 Starting chat-backend server...');
  const server = spawn('npm', ['start'], { stdio: 'inherit', shell: true });

  server.on('close', (code) => {
    console.log(`Chat-backend exited with code ${code}`);
    process.exit(code);
  });
}

startApp();