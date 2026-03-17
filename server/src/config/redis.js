const Redis = require('ioredis');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => console.error('❌ Redis error:', err));

    await redisClient.ping();
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    // Don't exit — app can run without Redis (degraded mode)
  }
};

const getRedis = () => redisClient;

module.exports = connectRedis;
module.exports.getRedis = getRedis;