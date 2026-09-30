import IORedis from 'ioredis';

// Try real Redis first; fall back to in-memory mock for dev
let redisConnectionInstance: IORedis;

function createRedisConnection(): IORedis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const conn = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Don't crash the process on Redis errors
    lazyConnect: true,
  });

  conn.on('error', (err) => {
    if (err.message?.includes('Redis version')) {
      console.warn('⚠️ Redis version too old for BullMQ. Please upgrade to Redis 5+.');
    } else {
      console.error('Redis connection error:', err.message);
    }
  });

  conn.on('connect', () => {
    console.log('✅ Redis connected');
  });

  return conn;
}

export const redisConnection = createRedisConnection();
