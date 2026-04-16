import { RiskLevel, CompositeScoreResult } from '../shared';
import { countryRiskRepository } from '../repositories/country-risk.repository';

// Score 1: Country & Identity Risk (0–100)
export function calculateCountryRiskScore(
  countryBaseScore: number,
  kycConfidence: number,
): number {
  const kycPenalty = (1 - kycConfidence) * 15;
  return Math.min(100, countryBaseScore + kycPenalty);
}

// Score 2: Transactional Risk (0–100)
export function calculateTransactionalRiskScore(
  transactionAmountUSD: number,
  monthlyThreshold: number,
  recentTxCount: number,
  recentTxTotalUSD: number,
): number {
  let score = 0;

  // Factor 1: Single transaction vs threshold
  const ratio = transactionAmountUSD / monthlyThreshold;
  if (ratio >= 2.0) score += 60;
  else if (ratio >= 1.0) score += 40;
  else if (ratio >= 0.5) score += 20;

  // Factor 2: Velocity
  if (recentTxCount >= 10) score += 25;
  else if (recentTxCount >= 5) score += 15;
  else if (recentTxCount >= 3) score += 5;

  // Factor 3: Daily total vs threshold
  const dailyRatio = recentTxTotalUSD / monthlyThreshold;
  if (dailyRatio >= 1.0) score += 15;
  else if (dailyRatio >= 0.5) score += 8;

  return Math.min(100, score);
}

interface TxHistoryItem {
  amountUSD: number;
  timestamp: Date;
  toAddress: string;
  fromAddress: string;
  isFlagged?: boolean;
}

// Score 3: Behavioural Analysis (0–100)
export function calculateBehaviouralScore(
  txHistory: TxHistoryItem[],
  walletAddress: string,
): number {
  let score = 0;

  if (txHistory.length === 0) {
    // New wallet with no history — moderate risk
    return 30;
  }

  // Factor 1: Wallet age
  const walletAgeDays = getWalletAgeDays(txHistory);
  if (walletAgeDays < 30) score += 25;
  else if (walletAgeDays < 90) score += 15;
  else if (walletAgeDays < 365) score += 5;

  // Factor 2: Unique counterparties
  const uniqueWallets = getUniqueCounterparties(txHistory, walletAddress);
  if (uniqueWallets > 100) score += 20;
  else if (uniqueWallets > 50) score += 10;

  // Factor 3: Large transaction frequency
  const largeTxCount = txHistory.filter((tx) => tx.amountUSD > 10000).length;
  if (largeTxCount > 10) score += 20;
  else if (largeTxCount > 5) score += 10;

  // Factor 4: Round number pattern
  const roundNumberRatio = getRoundNumberRatio(txHistory);
  if (roundNumberRatio > 0.7) score += 15;

  // Factor 5: Off-hours transactions (midnight–5am UTC as proxy)
  const offHoursRatio = getOffHoursRatio(txHistory);
  if (offHoursRatio > 0.5) score += 10;
  else if (offHoursRatio > 0.3) score += 5;

  // Factor 6: Previous flagged transactions
  const previousFlags = txHistory.filter((tx) => tx.isFlagged).length;
  score += Math.min(10, previousFlags * 3);

  return Math.min(100, score);
}

function getWalletAgeDays(txHistory: TxHistoryItem[]): number {
  if (txHistory.length === 0) return 0;
  const oldest = txHistory.reduce((min, tx) =>
    tx.timestamp < min.timestamp ? tx : min,
  );
  return Math.floor(
    (Date.now() - new Date(oldest.timestamp).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getUniqueCounterparties(
  txHistory: TxHistoryItem[],
  walletAddress: string,
): number {
  const counterparties = new Set<string>();
  for (const tx of txHistory) {
    if (tx.toAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      counterparties.add(tx.toAddress.toLowerCase());
    }
    if (tx.fromAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      counterparties.add(tx.fromAddress.toLowerCase());
    }
  }
  return counterparties.size;
}

function getRoundNumberRatio(txHistory: TxHistoryItem[]): number {
  if (txHistory.length === 0) return 0;
  const roundNumbers = txHistory.filter((tx) => {
    const amount = tx.amountUSD;
    return amount > 0 && amount % 100 === 0;
  });
  return roundNumbers.length / txHistory.length;
}

function getOffHoursRatio(txHistory: TxHistoryItem[]): number {
  if (txHistory.length === 0) return 0;
  const offHours = txHistory.filter((tx) => {
    const hour = new Date(tx.timestamp).getUTCHours();
    return hour >= 0 && hour < 5;
  });
  return offHours.length / txHistory.length;
}

// Composite score (0–1000)
export function calculateCompositeScore(
  score1: number,
  score2: number,
  score3: number,
): CompositeScoreResult {
  const composite = Math.round(((score1 + score2 + score3) / 3) * 10);

  let riskLevel: RiskLevel;
  if (composite >= 750) riskLevel = 'HIGH_RISK';
  else if (composite >= 500) riskLevel = 'FLAGGED';
  else if (composite >= 300) riskLevel = 'LOW_RISK';
  else riskLevel = 'SAFE';

  return { composite, score1Country: score1, score2Transaction: score2, score3Behaviour: score3, riskLevel };
}

export async function getCountryBaseScore(countryCode: string): Promise<number> {
  const country = await countryRiskRepository.findByCode(countryCode);
  if (!country) return 30; // Default moderate score for unknown countries
  return country.baseScore;
}
