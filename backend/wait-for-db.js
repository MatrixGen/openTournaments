const net = require('net');
const { spawn } = require('child_process');

const host = process.env.DB_HOST_PROD || process.env.DB_HOST_DEV || 'db';
const port = process.env.DB_PORT || 3306;

function checkConnection() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => {
      reject(false);
    });
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

async function runMigrations() {
  return new Promise((resolve, reject) => {
    console.log('🛠 Running Sequelize migrations...');
    const migrate = spawn('npx', ['sequelize-cli', 'db:migrate'], { stdio: 'inherit', shell: true });

    migrate.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Migrations completed successfully');
        resolve();
      } else {
        reject(new Error(`Migrations failed with code ${code}`));
      }
    });

    migrate.on('error', (err) => {
      reject(err);
    });
  });
}

async function startServer() {
  await waitForDB();
  
  try {
    await runMigrations();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }

  console.log('🚀 Starting backend server...');
  const server = spawn('npm', ['start'], { stdio: 'inherit', shell: true });

  server.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  });

  server.on('error', (err) => {
    console.error('Failed to start backend server:', err);
    process.exit(1);
  });
}

startServer();
