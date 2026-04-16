import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const behaviouralScoreQueue = new Queue('behavioural-score', {
  connection: redisConnection,
});

export const behaviouralScoreQueueEvents = new QueueEvents('behavioural-score', {
  connection: redisConnection,
});

export { Worker };
