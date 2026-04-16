import { userRepository } from '../repositories/user.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { riskScoreRepository } from '../repositories/risk-score.repository';
import { alertRepository } from '../repositories/alert.repository';
import { fetchWalletHistory } from './behaviour.service';
import {
  calculateCountryRiskScore,
  calculateTransactionalRiskScore,
  calculateBehaviouralScore,
  calculateCompositeScore,
  getCountryBaseScore,
} from './scoring.service';
import { blockchainService } from './blockchain.service';
import { AppError } from '../middleware/error';
import {
  TransactionAnalysisResponse,
  getTransactionStatusFromRiskLevel,
  getRecommendationFromRiskLevel,
} from '../shared';

export async function analyzeTransaction(
  userId: string,
  toAddress: string,
  amountETH: number,
  amountUSD: number,
): Promise<TransactionAnalysisResponse> {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (user.kycStatus !== 'VERIFIED') throw new AppError(403, 'KYC verification required before transacting');
  if (!user.monthlyThreshold) throw new AppError(400, 'Income not declared yet');

  const countryCode = user.countryCode ?? 'US';
  const kycConfidence = 0.85; // Use stored confidence if you add it to User model

  // Score 1: Country Risk
  const countryBaseScore = await getCountryBaseScore(countryCode);
  const score1Country = calculateCountryRiskScore(countryBaseScore, kycConfidence);

  // Score 2: Transactional Risk
  const recentTxs = await transactionRepository.getRecentByUser(userId, 24);
  const recentTxCount = recentTxs.length;
  const recentTxTotalUSD = recentTxs.reduce((sum, tx) => sum + tx.amountUSD, 0);
  const score2Transaction = calculateTransactionalRiskScore(
    amountUSD,
    user.monthlyThreshold,
    recentTxCount,
    recentTxTotalUSD,
  );

  // Score 3: Behavioural Risk
  const txHistory = await fetchWalletHistory(user.walletAddress);
  const score3Behaviour = calculateBehaviouralScore(txHistory, user.walletAddress);

  // Composite
  const result = calculateCompositeScore(score1Country, score2Transaction, score3Behaviour);
  const status = getTransactionStatusFromRiskLevel(result.riskLevel);
  const recommendation = getRecommendationFromRiskLevel(result.riskLevel);

  // Determine flag reason
  let flagReason: string | null = null;
  if (result.riskLevel === 'FLAGGED' || result.riskLevel === 'HIGH_RISK') {
    const reasons: string[] = [];
    if (score1Country >= 50) reasons.push('High country risk');
    if (score2Transaction >= 40) reasons.push('Transaction exceeds income threshold');
    if (score3Behaviour >= 40) reasons.push('Anomalous transaction patterns detected');
    flagReason = reasons.join('; ');
  }

  // Save transaction
  const transaction = await transactionRepository.create({
    user: { connect: { id: userId } },
    fromAddress: user.walletAddress,
    toAddress,
    amountETH,
    amountUSD,
    compositeScore: result.composite,
    score1Country,
    score2Transaction,
    score3Behaviour,
    riskLevel: result.riskLevel,
    status,
    flagReason,
    timestamp: new Date(),
  });

  // Update user risk score
  await userRepository.updateRiskScore(userId, result.composite, result.riskLevel);
  await riskScoreRepository.record(userId, result);

  // Create alerts for flagged/blocked
  if (result.riskLevel === 'FLAGGED') {
    await alertRepository.createForUser(
      userId,
      'HIGH_RISK_TRANSACTION',
      `Transaction of $${amountUSD.toFixed(2)} has been held for review. Risk score: ${result.composite}/1000.`,
      'WARNING',
      { transactionId: transaction.id, compositeScore: result.composite },
    );
  } else if (result.riskLevel === 'HIGH_RISK') {
    await alertRepository.createForUser(
      userId,
      'ACCOUNT_FLAGGED',
      `Transaction of $${amountUSD.toFixed(2)} has been blocked. Risk score: ${result.composite}/1000. Reason: ${flagReason}`,
      'CRITICAL',
      { transactionId: transaction.id, compositeScore: result.composite },
    );
    // Log on-chain for flagged/blocked
    try {
      await blockchainService.logFlaggedTransaction(
        user.walletAddress,
        transaction.id,
        result.composite,
        result.riskLevel,
      );
      await transactionRepository.markOnChainLogged(transaction.id);
    } catch (err) {
      console.error('Blockchain log failed (non-critical):', err);
    }
  }

  return {
    transactionId: transaction.id,
    compositeScore: result.composite,
    score1Country,
    score2Transaction,
    score3Behaviour,
    riskLevel: result.riskLevel,
    status,
    monthlyThreshold: user.monthlyThreshold,
    flagReason,
    recommendation,
  };
}

export async function confirmTransaction(transactionId: string, txHash: string): Promise<void> {
  const transaction = await transactionRepository.findById(transactionId);
  if (!transaction) throw new AppError(404, 'Transaction not found');
  await transactionRepository.updateTxHash(transactionId, txHash);
}
