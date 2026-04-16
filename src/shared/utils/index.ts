import { RiskLevel, TransactionStatus, TransactionRecommendation } from '../types';
import { RISK_THRESHOLDS, STATIC_EXCHANGE_RATES_TO_USD, MONTHLY_THRESHOLD_MULTIPLIER } from '../constants';

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function convertToUSD(amount: number, currency: string): number {
  const rate = STATIC_EXCHANGE_RATES_TO_USD[currency.toUpperCase()] ?? 1;
  return amount * rate;
}

export function calculateMonthlyThreshold(annualIncomeUSD: number): number {
  return (annualIncomeUSD / 12) * MONTHLY_THRESHOLD_MULTIPLIER;
}

export function getRiskLevelFromComposite(composite: number): RiskLevel {
  if (composite >= 750) return 'HIGH_RISK';
  if (composite >= 500) return 'FLAGGED';
  if (composite >= 300) return 'LOW_RISK';
  return 'SAFE';
}

export function getTransactionStatusFromRiskLevel(riskLevel: RiskLevel): TransactionStatus {
  switch (riskLevel) {
    case 'SAFE':
      return 'APPROVED';
    case 'LOW_RISK':
      return 'MONITORING';
    case 'FLAGGED':
      return 'HELD';
    case 'HIGH_RISK':
      return 'BLOCKED';
  }
}

export function getRecommendationFromRiskLevel(riskLevel: RiskLevel): TransactionRecommendation {
  switch (riskLevel) {
    case 'SAFE':
    case 'LOW_RISK':
      return 'PROCEED';
    case 'FLAGGED':
      return 'WARN';
    case 'HIGH_RISK':
      return 'BLOCK';
  }
}

export function calculateCompositeScore(s1: number, s2: number, s3: number): number {
  return Math.round(((s1 + s2 + s3) / 3) * 10);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function getRiskThresholds() {
  return RISK_THRESHOLDS;
}
