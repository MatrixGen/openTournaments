// wait-for-db.js
const net = require('net');
const { exec } = require('child_process');

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

waitForDB().then(() => {
  console.log('🚀 Starting backend server...');
  exec('npm start', (err, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (err) process.exit(err.code);
  });
});
