const { randomUUID } = require('crypto');
const { redis } = require('../config/redis');

const releaseScript = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

const acquireLock = async (key, ttlMs) => {
  const token = randomUUID();
  const result = await redis.set(key, token, 'PX', ttlMs, 'NX');
  if (result !== 'OK') return null;
  return token;
};

const releaseLock = async (key, token) => {
  if (!token) return;
  await redis.eval(releaseScript, 1, key, token);
};

module.exports = {
  acquireLock,
  releaseLock,
};
