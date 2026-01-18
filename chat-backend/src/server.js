const { createServer } = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { setupSocket } = require("./socket/socketHandler");

const PORT = process.env.PORT || 3000;
const instanceId = process.env.SERVER_INSTANCE_ID || `instance-${Date.now()}`;

// 🔐 Startup: Verify critical env vars
console.log('[Startup] PLATFORM_SECRET length:', process.env.PLATFORM_SECRET?.length || 0);
console.log('[Startup] CHAT_PLATFORM_SECRET length:', process.env.CHAT_PLATFORM_SECRET?.length || 0);
console.log('[Startup] CHAT_JWT_SECRET length:', process.env.CHAT_JWT_SECRET?.length || 0);

console.log(`🚀 Starting server instance: ${instanceId}`);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://www.open-tournament.com",
      "https://open-tournament.com",
    ],
    methods: ["GET", "POST", "PUT", "PATCH"],
  },

  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server instance ${instanceId} running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});
