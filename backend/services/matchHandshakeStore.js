const { redis } = require('../config/redis');

const HANDSHAKE_TTL_SECONDS = 6 * 60 * 60;

const getKey = (matchId) => `match:${matchId}:handshake`;

const parseFlag = (value) => value === '1' || value === 1;
const parseTimestamp = (value) => (value ? Number(value) : null);

const buildUserState = (handshake, userId) => {
  if (!userId) {
    return {
      userId: null,
      isReady: false,
      isActiveConfirmed: false,
      readyAt: null,
      activeAt: null,
    };
  }

  return {
    userId,
    isReady: parseFlag(handshake[`u:${userId}:ready`]),
    isActiveConfirmed: parseFlag(handshake[`u:${userId}:active`]),
    readyAt: parseTimestamp(handshake[`u:${userId}:readyAt`]),
    activeAt: parseTimestamp(handshake[`u:${userId}:activeAt`]),
  };
};

const buildSnapshot = (handshake, participant1UserId, participant2UserId) => {
  const participant1 = buildUserState(handshake, participant1UserId);
  const participant2 = buildUserState(handshake, participant2UserId);

  const totalReady = (participant1.isReady ? 1 : 0) + (participant2.isReady ? 1 : 0);
  const totalActiveConfirmed =
    (participant1.isActiveConfirmed ? 1 : 0) + (participant2.isActiveConfirmed ? 1 : 0);

  const status = handshake?.status || 'waiting';
  const handshakeCompleted = status === 'live';

  return {
    handshakeStatus: status,
    handshakeCompleted,
    participant1,
    participant2,
    totalReady,
    totalActiveConfirmed,
    required: 2,
    createdAt: parseTimestamp(handshake?.createdAt),
    updatedAt: parseTimestamp(handshake?.updatedAt),
  };
};

const setReadyScript = `
local key = KEYS[1]
local userId = ARGV[1]
local now = ARGV[2]
local p1 = ARGV[3]
local p2 = ARGV[4]
local ttl = tonumber(ARGV[5])

local status = redis.call('HGET', key, 'status')
if not status then status = 'waiting' end

redis.call('HSET', key, 'u:' .. userId .. ':ready', '1')
redis.call('HSET', key, 'u:' .. userId .. ':readyAt', now)

local createdAt = redis.call('HGET', key, 'createdAt')
if not createdAt then
  redis.call('HSET', key, 'createdAt', now)
end

local p1Ready = redis.call('HGET', key, 'u:' .. p1 .. ':ready')
local p2Ready = redis.call('HGET', key, 'u:' .. p2 .. ':ready')
local isP1Ready = p1Ready == '1'
local isP2Ready = p2Ready == '1'

if status ~= 'live' then
  if isP1Ready and isP2Ready then
    status = 'both_ready'
  elseif isP1Ready or isP2Ready then
    status = 'one_ready'
  else
    status = 'waiting'
  end
end

redis.call('HSET', key, 'status', status)
redis.call('HSET', key, 'updatedAt', now)
redis.call('EXPIRE', key, ttl)

return {status, isP1Ready and '1' or '0', isP2Ready and '1' or '0'}
`;

const setActiveScript = `
local key = KEYS[1]
local userId = ARGV[1]
local now = ARGV[2]
local p1 = ARGV[3]
local p2 = ARGV[4]
local ttl = tonumber(ARGV[5])

local status = redis.call('HGET', key, 'status')
if not status then status = 'waiting' end

redis.call('HSET', key, 'u:' .. userId .. ':active', '1')
redis.call('HSET', key, 'u:' .. userId .. ':activeAt', now)

local createdAt = redis.call('HGET', key, 'createdAt')
if not createdAt then
  redis.call('HSET', key, 'createdAt', now)
end

local p1Active = redis.call('HGET', key, 'u:' .. p1 .. ':active')
local p2Active = redis.call('HGET', key, 'u:' .. p2 .. ':active')
local isP1Active = p1Active == '1'
local isP2Active = p2Active == '1'

if status ~= 'live' then
  if isP1Active and isP2Active then
    status = 'live'
  end
end

redis.call('HSET', key, 'status', status)
redis.call('HSET', key, 'updatedAt', now)
redis.call('EXPIRE', key, ttl)

return {status, isP1Active and '1' or '0', isP2Active and '1' or '0'}
`;

const clearUserScript = `
local key = KEYS[1]
local userId = ARGV[1]
local now = ARGV[2]
local p1 = ARGV[3]
local p2 = ARGV[4]
local ttl = tonumber(ARGV[5])

redis.call('HSET', key, 'u:' .. userId .. ':ready', '0')
redis.call('HSET', key, 'u:' .. userId .. ':active', '0')
redis.call('HDEL', key, 'u:' .. userId .. ':readyAt')
redis.call('HDEL', key, 'u:' .. userId .. ':activeAt')

local createdAt = redis.call('HGET', key, 'createdAt')
if not createdAt then
  redis.call('HSET', key, 'createdAt', now)
end

local p1Ready = redis.call('HGET', key, 'u:' .. p1 .. ':ready')
local p2Ready = redis.call('HGET', key, 'u:' .. p2 .. ':ready')
local isP1Ready = p1Ready == '1'
local isP2Ready = p2Ready == '1'

local status = 'waiting'
if isP1Ready and isP2Ready then
  status = 'both_ready'
elseif isP1Ready or isP2Ready then
  status = 'one_ready'
end

redis.call('HSET', key, 'status', status)
redis.call('HSET', key, 'updatedAt', now)
redis.call('EXPIRE', key, ttl)

return {status, isP1Ready and '1' or '0', isP2Ready and '1' or '0'}
`;

const getHandshake = async (matchId) => {
  const data = await redis.hgetall(getKey(matchId));
  return Object.keys(data).length ? data : null;
};

const getHandshakeSnapshot = async (matchId, participant1UserId, participant2UserId) => {
  const handshake = (await getHandshake(matchId)) || {};
  return buildSnapshot(handshake, participant1UserId, participant2UserId);
};

const setReady = async (matchId, userId, participant1UserId, participant2UserId) => {
  const now = Date.now().toString();
  const key = getKey(matchId);
  const result = await redis.eval(
    setReadyScript,
    1,
    key,
    String(userId),
    now,
    String(participant1UserId || '0'),
    String(participant2UserId || '0'),
    String(HANDSHAKE_TTL_SECONDS)
  );

  return {
    status: result[0],
    participant1Ready: result[1] === '1',
    participant2Ready: result[2] === '1',
  };
};

const setActive = async (matchId, userId, participant1UserId, participant2UserId) => {
  const now = Date.now().toString();
  const key = getKey(matchId);
  const result = await redis.eval(
    setActiveScript,
    1,
    key,
    String(userId),
    now,
    String(participant1UserId || '0'),
    String(participant2UserId || '0'),
    String(HANDSHAKE_TTL_SECONDS)
  );

  return {
    status: result[0],
    participant1Active: result[1] === '1',
    participant2Active: result[2] === '1',
  };
};

const setNotReady = async (matchId, userId, participant1UserId, participant2UserId) => {
  const now = Date.now().toString();
  const key = getKey(matchId);
  const result = await redis.eval(
    clearUserScript,
    1,
    key,
    String(userId),
    now,
    String(participant1UserId || '0'),
    String(participant2UserId || '0'),
    String(HANDSHAKE_TTL_SECONDS)
  );

  return {
    status: result[0],
    participant1Ready: result[1] === '1',
    participant2Ready: result[2] === '1',
  };
};

const clearHandshake = async (matchId) => {
  await redis.del(getKey(matchId));
};

const computeHandshakeStatus = async (matchId, participant1UserId, participant2UserId) => {
  const snapshot = await getHandshakeSnapshot(matchId, participant1UserId, participant2UserId);
  return snapshot.handshakeStatus;
};

module.exports = {
  getHandshake,
  getHandshakeSnapshot,
  setReady,
  setActive,
  setNotReady,
  clearHandshake,
  computeHandshakeStatus,
};
