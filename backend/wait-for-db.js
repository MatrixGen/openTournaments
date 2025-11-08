const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

const host = process.env.DB_HOST_PROD || process.env.DB_HOST_DEV || 'db';
const port = process.env.DB_PORT || 3306;

// Path to your backend folder inside the container
const backendPath = path.resolve(__dirname); // assuming wait-for-db.js is in backend/

function checkConnection() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
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

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      cwd: backendPath,
      shell: true,
    });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`))));
    proc.on('error', (err) => reject(err));
  });
}

waitForDB()
  .then(async () => {
    try {
      console.log('🛠 Running migrations...');
      await runCommand('npx', ['sequelize-cli', 'db:migrate']);
      console.log('✅ Migrations completed');

      console.log('🛠 Running seeders...');
      await runCommand('npx', ['sequelize-cli', 'db:seed:all']);
      console.log('✅ Seeders completed');

      console.log('🚀 Starting backend server...');
      const server = spawn('npm', ['start'], { stdio: 'inherit', cwd: backendPath, shell: true });

      server.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        process.exit(code);
      });

      server.on('error', (err) => {
        console.error('Failed to start backend server:', err);
        process.exit(1);
      });
    } catch (err) {
      console.error('❌ Error during migration/seed/start:', err);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });
