import { createHash } from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { transactionRepository } from '../repositories/transaction.repository';

export interface WalletLookupResult {
  walletAddress: string;
  isRegistered: boolean;
  composite: number;
  riskLevel: 'SAFE' | 'LOW_RISK' | 'FLAGGED' | 'HIGH_RISK';
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  txCount: number;
  kycStatus: string | null;
  source: 'database' | 'simulation';
}

function riskLevelFromScore(score: number): WalletLookupResult['riskLevel'] {
  if (score < 300) return 'SAFE';
  if (score < 500) return 'LOW_RISK';
  if (score < 750) return 'FLAGGED';
  return 'HIGH_RISK';
}

/**
 * Deterministically derive a risk score from a wallet address so demos always
 * show the same score for the same address without needing a registered user.
 */
function simulateScore(walletAddress: string): Pick<
  WalletLookupResult,
  'composite' | 'riskLevel' | 'score1Country' | 'score2Transaction' | 'score3Behaviour'
> {
  const hash = createHash('sha256').update(walletAddress.toLowerCase()).digest('hex');

  // Pull three independent 3-hex-digit slices → 0–4095 → scale to sub-score range
  const a = parseInt(hash.slice(0, 3), 16); // 0–4095
  const b = parseInt(hash.slice(3, 6), 16);
  const c = parseInt(hash.slice(6, 9), 16);

  const score1Country = Math.round((a / 4095) * 350);       // 0–350
  const score2Transaction = Math.round((b / 4095) * 400);   // 0–400
  const score3Behaviour = Math.round((c / 4095) * 250);     // 0–250

  const composite = Math.min(1000, score1Country + score2Transaction + score3Behaviour);
  return { composite, riskLevel: riskLevelFromScore(composite), score1Country, score2Transaction, score3Behaviour };
}

export async function lookupWalletRisk(walletAddress: string): Promise<WalletLookupResult> {
  const user = await userRepository.findByWalletAddress(walletAddress);

  if (user) {
    const txCount = await transactionRepository.countByUser(user.id);
    const composite = user.currentRiskScore ?? 0;
    return {
      walletAddress,
      isRegistered: true,
      composite,
      riskLevel: riskLevelFromScore(composite),
      score1Country: 0,
      score2Transaction: 0,
      score3Behaviour: 0,
      txCount,
      kycStatus: user.kycStatus,
      source: 'database',
    };
  }

  // Not registered — return deterministic simulated score
  const sim = simulateScore(walletAddress);
  return {
    walletAddress,
    isRegistered: false,
    ...sim,
    txCount: 0,
    kycStatus: null,
    source: 'simulation',
  };
}
