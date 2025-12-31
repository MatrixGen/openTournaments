const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { setupSocket } = require('./socket/socketHandler');

const PORT = process.env.PORT || 3000;
const instanceId = process.env.SERVER_INSTANCE_ID || `instance-${Date.now()}`;

console.log(`🚀 Starting server instance: ${instanceId}`);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://192.168.132.201:5173",
      "http://localhost:5173",
      "http://localhost:3000",
  
  'http://138.197.39.55',
  'https://open-tournaments-2wsg-f2msrdiz8-matrixgens-projects.vercel.app',
  'http://open-tournament.com',
  'https://open-tournament.com',
    ],
    methods: ["GET", "POST","PUT","PATCH"]
  },
  
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server instance ${instanceId} running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});
