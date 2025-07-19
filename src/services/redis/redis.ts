import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || "", {maxRetriesPerRequest: null});

console.log("connecting with redis...")

redis.on('connect', () => {
  console.log('✅ Connected to Redis at PORT ' + process.env.REDIS_PORT + '!');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export function disconnect_redis() {
  redis.disconnect();
}

export default redis;
