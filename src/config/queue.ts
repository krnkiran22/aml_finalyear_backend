import { env } from './env';

// Redis and BullMQ are optional — only initialised if REDIS_URL is set.
// Without Redis the server runs fine; only background score refresh is disabled.

let redisConnection: import('ioredis').default | null = null;
let behaviouralScoreQueue: import('bullmq').Queue | null = null;

export function getRedisConnection() {
  if (!env.REDIS_URL) return null;
  if (!redisConnection) {
    const IORedis = require('ioredis');
    redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redisConnection;
}

export function getBehaviouralScoreQueue() {
  if (!env.REDIS_URL) return null;
  if (!behaviouralScoreQueue) {
    const { Queue } = require('bullmq');
    behaviouralScoreQueue = new Queue('behavioural-score', {
      connection: getRedisConnection()!,
    });
  }
  return behaviouralScoreQueue;
}

export { };
