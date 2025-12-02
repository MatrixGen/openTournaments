const net = require('net');
const { spawn } = require('child_process');

const host = process.env.DB_HOST_PROD || process.env.DB_HOST_DEV || 'db';
const port = process.env.DB_PORT || 3306;

// Toggle seeders ON/OFF using environment variable
const RUN_SEEDERS = process.env.RUN_SEEDERS === 'true';

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

// Helper to run shell commands
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'inherit', shell: true });

    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function startApp() {
  await waitForDB();

  console.log('🚀 Running Sequelize migrations...');
  await runCommand('npx', ['sequelize-cli', 'db:migrate']).catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

  if (RUN_SEEDERS) {
    console.log('🌱 Running seeders...');
    await runCommand('npx', ['sequelize-cli', 'db:seed:all']).catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
  } else {
    console.log('⚠️ Seeders skipped (set RUN_SEEDERS=true to enable)');
  }

  console.log('🚀 Starting backend server...');
  const server = spawn('npm', ['start'], { stdio: 'inherit', shell: true });

  server.on('close', (code) => {
    console.log(`Backend exited with code ${code}`);
    process.exit(code);
  });
}

startApp();
