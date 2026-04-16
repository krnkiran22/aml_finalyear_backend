import { getRedisConnection, getBehaviouralScoreQueue } from '../config/queue';
import { userRepository } from '../repositories/user.repository';
import { riskScoreRepository } from '../repositories/risk-score.repository';
import { alertRepository } from '../repositories/alert.repository';
import { fetchWalletHistory } from '../services/behaviour.service';
import {
  calculateBehaviouralScore,
  calculateCountryRiskScore,
  calculateCompositeScore,
  getCountryBaseScore,
} from '../services/scoring.service';

interface BehaviouralScoreJobData {
  userId: string;
  walletAddress: string;
  countryCode: string;
}

export function startBehaviouralScoreWorker() {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn('Redis not configured — behavioural score worker disabled');
    return null;
  }

  const { Worker } = require('bullmq');

  const worker = new Worker(
    'behavioural-score',
    async (job: { data: BehaviouralScoreJobData }) => {
      const { userId, walletAddress, countryCode } = job.data;
      console.log(`Processing behavioural score for user ${userId}`);

      const txHistory = await fetchWalletHistory(walletAddress);
      const score3Behaviour = calculateBehaviouralScore(txHistory, walletAddress);
      const countryBaseScore = await getCountryBaseScore(countryCode);
      const score1Country = calculateCountryRiskScore(countryBaseScore, 0.85);
      const result = calculateCompositeScore(score1Country, 0, score3Behaviour);

      await userRepository.updateRiskScore(userId, result.composite, result.riskLevel);
      const latest = await riskScoreRepository.getLatest(userId);
      await riskScoreRepository.record(userId, result);

      if (latest && Math.abs(result.composite - latest.compositeScore) >= 150) {
        await alertRepository.createForUser(
          userId,
          'BEHAVIOURAL_ANOMALY',
          `Your risk score changed significantly from ${latest.compositeScore} to ${result.composite}.`,
          result.composite > latest.compositeScore ? 'WARNING' : 'INFO',
          { previousScore: latest.compositeScore, newScore: result.composite },
        );
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on('completed', (job: { id: string }) => console.log(`Score job ${job.id} done`));
  worker.on('failed', (job: { id?: string }, err: Error) =>
    console.error(`Score job ${job?.id} failed:`, err.message),
  );

  return worker;
}

export async function scheduleAllUserScoreRefresh() {
  const queue = getBehaviouralScoreQueue();
  if (!queue) return;

  const users = await userRepository.findAllActive();
  for (const user of users) {
    await queue.add(
      'refresh-score',
      { userId: user.id, walletAddress: user.walletAddress, countryCode: user.countryCode ?? 'US' },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
  }
  console.log(`Scheduled score refresh for ${users.length} users`);
}

export async function setupDailyScoreRefreshSchedule() {
  const queue = getBehaviouralScoreQueue();
  if (!queue) return;

  await queue.add('daily-refresh', {}, {
    repeat: { every: 24 * 60 * 60 * 1000 },
    removeOnComplete: 5,
  });
}
