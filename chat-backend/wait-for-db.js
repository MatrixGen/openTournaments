const net = require('net');
const { spawn } = require('child_process');

// The host and port should be correct based on your Docker setup
const host = process.env.DB_HOST_PROD || process.env.DB_HOST_DEV || 'db';
const port = process.env.DB_PORT || 5432;
const DB_SCHEMA = process.env.DB_SCHEMA; // 👈 Get the schema name from .env

function checkConnection() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    // Set a timeout to prevent indefinite waiting on a firewall block or slow connection
    socket.setTimeout(500); 
    socket.on('timeout', () => reject(false));
    socket.on('error', () => reject(false));
  });
}

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

// Helper to run shell commands
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    // The shell: true option is generally used for compatibility with certain commands
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

async function startApp() {
  await waitForDB();

  if (!DB_SCHEMA) {
      console.error("❌ DB_SCHEMA environment variable is not set! Cannot run migrations.");
      process.exit(1);
  }

  // ----------------------------------------------------
  // CRITICAL STEP: CREATE SCHEMA IF IT DOES NOT EXIST
  // ----------------------------------------------------
  console.log(`🛠️ Ensuring schema '${DB_SCHEMA}' exists...`);
  // SQL command to create the schema if it doesn't exist
  const createSchemaSql = `CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}";`;

  // Use the Sequelize CLI's db:query command to execute the raw SQL
  await runCommand('npx', [
    'sequelize-cli', 
    'db:query', 
    `"${createSchemaSql}"` // Ensure the SQL is passed as a single quoted argument
  ]).catch((err) => {
    console.error(`❌ Failed to create schema '${DB_SCHEMA}':`, err);
    process.exit(1);
  });
  
  // ----------------------------------------------------
  // RUN MIGRATIONS
  // ----------------------------------------------------
  console.log(`🚀 Running Sequelize migrations for schema '${DB_SCHEMA}'...`);
  await runCommand('npx', ['sequelize-cli', 'db:migrate']).catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

  console.log('✅ Chat-backend migrations complete.');

  console.log('🚀 Starting chat-backend server...');
  const server = spawn('npm', ['start'], { stdio: 'inherit', shell: true });

  server.on('close', (code) => {
    console.log(`Chat-backend exited with code ${code}`);
    process.exit(code);
  });
}

startApp();