const Redis = require('ioredis');

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisUrl = process.env.REDIS_URL;

const client = redisUrl
  ? new Redis(redisUrl)
  : new Redis({
      host: redisHost || '127.0.0.1',
      port: redisPort ? Number(redisPort) : 6379,
    });

client.on('connect', () => {
  console.log('✅ Redis connected');
});

client.on('error', (error) => {
  console.error('❌ Redis error:', error);
});

const pingRedis = async () => {
  const response = await client.ping();
  return response === 'PONG';
};

let shutdownRegistered = false;
const registerShutdown = () => {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  const shutdown = async () => {
    try {
      await client.quit();
      console.log('🛑 Redis connection closed');
    } catch (error) {
      console.error('❌ Redis shutdown error:', error);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

registerShutdown();

module.exports = {
  redis: client,
  pingRedis,
};
