import { KYCStatus, RiskLevel, TransactionPublic, getTransactionStatusFromRiskLevel } from '../shared';
import { userRepository } from '../repositories/user.repository';
import { countryRiskRepository } from '../repositories/country-risk.repository';
import { fetchWalletHistory, NormalizedTx } from './behaviour.service';
import {
  calculateBehaviouralScore,
  calculateCompositeScore,
  calculateCountryRiskScore,
  calculateTransactionalRiskScore,
} from './scoring.service';

const DEFAULT_COUNTRY_CODE = 'IN';
const DEFAULT_MONTHLY_THRESHOLD_USD = 4500;
const LOOKBACK_HOURS = 24;

type ContextSource = 'wallet-profile' | 'viewer-profile' | 'default';

export interface WalletRiskHistoryPoint {
  id: string;
  compositeScore: number;
  riskLevel: RiskLevel;
  calculatedAt: string;
}

export interface WalletRiskLookupResult {
  walletAddress: string;
  isRegistered: boolean;
  composite: number;
  riskLevel: RiskLevel;
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  txCount: number;
  kycStatus: KYCStatus | null;
  source: 'explorer';
  monthlyThreshold: number;
  thresholdSource: ContextSource;
  countryCode: string;
  countryName: string;
  countrySource: ContextSource;
  fatfStatus: string | null;
  recentTransactions: TransactionPublic[];
}

export interface WalletRiskSnapshot {
  composite: number;
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  riskLevel: RiskLevel;
  calculatedAt: string;
  history: WalletRiskHistoryPoint[];
  transactions: TransactionPublic[];
  monthlyThreshold: number;
  countryCode: string;
  countryName: string;
  fatfStatus: string | null;
}

interface WalletAnalysisContext {
  userId: string;
  monthlyThreshold: number;
  thresholdSource: ContextSource;
  countryCode: string;
  countryName: string;
  countrySource: ContextSource;
  fatfStatus: string | null;
  kycStatus: KYCStatus | null;
  isRegistered: boolean;
}

function getKycConfidence(status: KYCStatus | null): number {
  switch (status) {
    case 'VERIFIED':
      return 0.95;
    case 'UNDER_REVIEW':
      return 0.75;
    case 'REJECTED':
      return 0.45;
    case 'PENDING':
      return 0.6;
    default:
      return 0.7;
  }
}

function getFlagReason(
  tx: NormalizedTx,
  score1Country: number,
  score2Transaction: number,
  score3Behaviour: number,
  monthlyThreshold: number,
): string | null {
  const reasons: string[] = [];

  if (tx.amountUSD >= monthlyThreshold) reasons.push('Transaction exceeds threshold');
  if (score2Transaction >= 40) reasons.push('High transactional risk');
  if (score1Country >= 50) reasons.push('Elevated country laundering risk');
  if (score3Behaviour >= 40) reasons.push('Anomalous wallet behaviour');

  return reasons.length > 0 ? reasons.join('; ') : null;
}

function buildTransactionHistoryPoints(transactions: TransactionPublic[]): WalletRiskHistoryPoint[] {
  return transactions.slice(0, 30).map((tx) => ({
    id: tx.id,
    compositeScore: tx.compositeScore,
    riskLevel: tx.riskLevel,
    calculatedAt: tx.timestamp,
  }));
}

async function resolveWalletContext(walletAddress: string, requesterUserId?: string): Promise<WalletAnalysisContext> {
  const [walletUser, requesterUser] = await Promise.all([
    userRepository.findByWalletAddress(walletAddress),
    requesterUserId ? userRepository.findById(requesterUserId) : Promise.resolve(null),
  ]);

  const thresholdUser = walletUser?.monthlyThreshold ? walletUser : requesterUser?.monthlyThreshold ? requesterUser : null;
  const countryUser = walletUser?.countryCode ? walletUser : requesterUser?.countryCode ? requesterUser : null;
  const kycUser = walletUser ?? requesterUser ?? null;

  const thresholdSource: ContextSource = walletUser?.monthlyThreshold
    ? 'wallet-profile'
    : requesterUser?.monthlyThreshold
      ? 'viewer-profile'
      : 'default';

  const countrySource: ContextSource = walletUser?.countryCode
    ? 'wallet-profile'
    : requesterUser?.countryCode
      ? 'viewer-profile'
      : 'default';

  const monthlyThreshold = thresholdUser?.monthlyThreshold ?? DEFAULT_MONTHLY_THRESHOLD_USD;
  const countryCode = countryUser?.countryCode ?? DEFAULT_COUNTRY_CODE;
  const country = await countryRiskRepository.findByCode(countryCode);

  return {
    userId: walletUser?.id ?? requesterUser?.id ?? `wallet:${walletAddress.toLowerCase()}`,
    monthlyThreshold,
    thresholdSource,
    countryCode,
    countryName: countryUser?.country ?? country?.countryName ?? countryCode,
    countrySource,
    fatfStatus: country?.fatfStatus ?? null,
    kycStatus: kycUser?.kycStatus ?? null,
    isRegistered: Boolean(walletUser),
  };
}

function buildScoredTransactions(
  walletAddress: string,
  txHistory: NormalizedTx[],
  userId: string,
  score1Country: number,
  score3Behaviour: number,
  monthlyThreshold: number,
): TransactionPublic[] {
  const sortedAsc = [...txHistory].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const scored: TransactionPublic[] = [];

  for (let i = 0; i < sortedAsc.length; i += 1) {
    const tx = sortedAsc[i]!;
    const txTime = tx.timestamp.getTime();
    const previous24h = sortedAsc.slice(0, i).filter((prev) => txTime - prev.timestamp.getTime() <= LOOKBACK_HOURS * 60 * 60 * 1000);
    const previousCount = previous24h.length;
    const previousTotalUSD = previous24h.reduce((sum, prev) => sum + prev.amountUSD, 0);

    const score2Transaction = calculateTransactionalRiskScore(
      tx.amountUSD,
      monthlyThreshold,
      previousCount,
      previousTotalUSD,
    );
    const composite = calculateCompositeScore(score1Country, score2Transaction, score3Behaviour);
    const status = getTransactionStatusFromRiskLevel(composite.riskLevel);

    scored.push({
      id: `live-${tx.hash}`,
      userId,
      txHash: tx.hash,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amountETH: tx.amountETH,
      amountUSD: tx.amountUSD,
      currency: 'ETH',
      compositeScore: composite.composite,
      score1Country,
      score2Transaction,
      score3Behaviour,
      riskLevel: composite.riskLevel,
      status,
      flagReason: getFlagReason(tx, score1Country, score2Transaction, score3Behaviour, monthlyThreshold),
      onChainLogged: false,
      timestamp: tx.timestamp.toISOString(),
      createdAt: tx.timestamp.toISOString(),
    });
  }

  return scored.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getWalletRiskSnapshot(
  walletAddress: string,
  requesterUserId?: string,
): Promise<WalletRiskSnapshot & WalletRiskLookupResult> {
  const context = await resolveWalletContext(walletAddress, requesterUserId);
  const txHistory = await fetchWalletHistory(walletAddress);

  const country = await countryRiskRepository.findByCode(context.countryCode);
  const countryBaseScore = country?.baseScore ?? 30;
  const score1Country = calculateCountryRiskScore(countryBaseScore, getKycConfidence(context.kycStatus));
  const score3Behaviour = calculateBehaviouralScore(txHistory, walletAddress);
  const transactions = buildScoredTransactions(
    walletAddress,
    txHistory,
    context.userId,
    score1Country,
    score3Behaviour,
    context.monthlyThreshold,
  );

  const score2Transaction = transactions.length > 0
    ? Math.max(...transactions.map((tx) => tx.score2Transaction))
    : 0;
  const summary = calculateCompositeScore(score1Country, score2Transaction, score3Behaviour);
  const history = buildTransactionHistoryPoints(transactions);
  const calculatedAt = transactions[0]?.timestamp ?? new Date().toISOString();

  return {
    walletAddress,
    isRegistered: context.isRegistered,
    composite: summary.composite,
    score1Country: summary.score1Country,
    score2Transaction: summary.score2Transaction,
    score3Behaviour: summary.score3Behaviour,
    riskLevel: summary.riskLevel,
    txCount: transactions.length,
    kycStatus: context.kycStatus,
    source: 'explorer',
    monthlyThreshold: context.monthlyThreshold,
    thresholdSource: context.thresholdSource,
    countryCode: context.countryCode,
    countryName: context.countryName,
    countrySource: context.countrySource,
    fatfStatus: context.fatfStatus,
    recentTransactions: transactions.slice(0, 5),
    calculatedAt,
    history,
    transactions,
  };
}
