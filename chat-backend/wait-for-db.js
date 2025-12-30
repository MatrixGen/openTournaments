const net = require("net");
const { spawn } = require("child_process");

// The host and port should be correct based on your Docker setup
const host = process.env.DB_HOST_PROD || process.env.DB_HOST_DEV || "db";
const port = process.env.DB_PORT || 5432; // 👈 Updated default port to 5432 (PostgreSQL)
const RUN_SEEDERS = true; // 👈 Get the schema name (e.g., 'platform')

function checkConnection() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.on("connect", () => {
      socket.end();

      resolve(true);
    });
    // Set a timeout to prevent indefinite waiting on a firewall block or slow connection
    socket.setTimeout(500);
    socket.on("timeout", () => reject(false));
    socket.on("error", () => reject(false));
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
    const process = spawn(command, args, { stdio: "inherit", shell: true });

    process.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args.join(" ")} exited with code ${code}`)
        );
    });
    process.on("error", (err) => {
      reject(new Error(`Failed to start command ${command}: ${err.message}`));
    });
  });
}

async function startApp() {
  await waitForDB();

  console.log("🚀 Running Sequelize migrations....");
  await runCommand("npx", ["sequelize-cli", "db:migrate"]).catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });

  console.log("🚀 Starting backend server...");
  const server = spawn("npm", ["start"], { stdio: "inherit", shell: true });

  server.on("close", (code) => {
    console.log(`Backend exited with code ${code}`);
    process.exit(code);
  });
}

startApp();
