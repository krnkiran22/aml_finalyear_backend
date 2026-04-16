import { Worker, Job } from 'bullmq';
import { redisConnection, behaviouralScoreQueue } from '../config/queue';
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

async function processBehaviouralScore(job: Job<BehaviouralScoreJobData>): Promise<void> {
  const { userId, walletAddress, countryCode } = job.data;

  console.log(`Processing behavioural score for user ${userId}`);

  try {
    const txHistory = await fetchWalletHistory(walletAddress);
    const score3Behaviour = calculateBehaviouralScore(txHistory, walletAddress);

    const countryBaseScore = await getCountryBaseScore(countryCode);
    const score1Country = calculateCountryRiskScore(countryBaseScore, 0.85);

    // Use neutral transactional score for background refresh
    const score2Transaction = 0;

    const result = calculateCompositeScore(score1Country, score2Transaction, score3Behaviour);

    await userRepository.updateRiskScore(userId, result.composite, result.riskLevel);
    const latest = await riskScoreRepository.getLatest(userId);

    await riskScoreRepository.record(userId, result);

    // Alert if score changed significantly (±150 points)
    if (latest && Math.abs(result.composite - latest.compositeScore) >= 150) {
      await alertRepository.createForUser(
        userId,
        'BEHAVIOURAL_ANOMALY',
        `Your risk score has changed significantly from ${latest.compositeScore} to ${result.composite}. This may be due to changes in your transaction behaviour.`,
        result.composite > latest.compositeScore ? 'WARNING' : 'INFO',
        { previousScore: latest.compositeScore, newScore: result.composite },
      );
    }

    console.log(`Behavioural score updated for user ${userId}: ${result.composite}`);
  } catch (err) {
    console.error(`Failed to process behavioural score for user ${userId}:`, err);
    throw err;
  }
}

export function startBehaviouralScoreWorker() {
  const worker = new Worker<BehaviouralScoreJobData>(
    'behavioural-score',
    processBehaviouralScore,
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`Behavioural score job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Behavioural score job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function scheduleAllUserScoreRefresh() {
  const users = await userRepository.findAllActive();

  for (const user of users) {
    await behaviouralScoreQueue.add(
      'refresh-score',
      {
        userId: user.id,
        walletAddress: user.walletAddress,
        countryCode: user.countryCode ?? 'US',
      },
      {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  console.log(`Scheduled behavioural score refresh for ${users.length} users`);
}

// Schedule a repeating job every 24 hours
export async function setupDailyScoreRefreshSchedule() {
  await behaviouralScoreQueue.add(
    'daily-refresh',
    {},
    {
      repeat: {
        every: 24 * 60 * 60 * 1000, // 24 hours in ms
      },
      removeOnComplete: 5,
    },
  );
}
