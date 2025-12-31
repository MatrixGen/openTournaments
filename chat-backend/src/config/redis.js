const Redis = require('ioredis');

// Use the Redis service name from Docker Compose
const redisHost = process.env.REDIS_HOST || '127.0.0.1'; // matches service name in docker-compose
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy(times) {
    console.log(`Redis retry attempt #${times}`);
    return Math.min(times * 50, 2000); // reconnect after 50ms, capped at 2s
  },
});

redisClient.on('connect', () => console.log('🔌 Redis client connected'));
redisClient.on('ready', () => console.log('✅ Redis client ready'));
redisClient.on('error', (err) => console.error('❌ Redis connection error:', err));
redisClient.on('close', () => console.log('🔒 Redis connection closed'));

module.exports = { redisClient };
