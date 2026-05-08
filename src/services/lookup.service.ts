import { getWalletRiskSnapshot, WalletRiskLookupResult } from './wallet-risk.service';

export type WalletLookupResult = WalletRiskLookupResult;

export async function lookupWalletRisk(
  walletAddress: string,
  requesterUserId?: string,
): Promise<WalletLookupResult> {
  const snapshot = await getWalletRiskSnapshot(walletAddress, requesterUserId);

  return {
    walletAddress: snapshot.walletAddress,
    isRegistered: snapshot.isRegistered,
    composite: snapshot.composite,
    riskLevel: snapshot.riskLevel,
    score1Country: snapshot.score1Country,
    score2Transaction: snapshot.score2Transaction,
    score3Behaviour: snapshot.score3Behaviour,
    txCount: snapshot.txCount,
    kycStatus: snapshot.kycStatus,
    source: snapshot.source,
    monthlyThreshold: snapshot.monthlyThreshold,
    thresholdSource: snapshot.thresholdSource,
    countryCode: snapshot.countryCode,
    countryName: snapshot.countryName,
    countrySource: snapshot.countrySource,
    fatfStatus: snapshot.fatfStatus,
    recentTransactions: snapshot.recentTransactions,
  };
}
