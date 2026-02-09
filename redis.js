// src/config/redis.js
const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('❌ Redis error:', err.message));

// Helper methods
redis.cacheGet = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

redis.cacheSet = async (key, data, ttlSeconds = 300) => {
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
};

redis.cacheDel = async (key) => {
  await redis.del(key);
};

redis.cacheInvalidatePattern = async (pattern) => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

module.exports = redis;
