export type KYCStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
export type DocumentType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE';
export type RiskLevel = 'SAFE' | 'LOW_RISK' | 'FLAGGED' | 'HIGH_RISK';
export type TransactionStatus = 'APPROVED' | 'MONITORING' | 'HELD' | 'BLOCKED';
export type AlertType =
  | 'KYC_FAILED'
  | 'KYC_VERIFIED'
  | 'HIGH_RISK_TRANSACTION'
  | 'THRESHOLD_EXCEEDED'
  | 'BEHAVIOURAL_ANOMALY'
  | 'ACCOUNT_FLAGGED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type FATFStatus = 'LOW_RISK' | 'GREY_LIST' | 'HIGH_RISK' | 'BLACKLISTED';
export type TransactionRecommendation = 'PROCEED' | 'WARN' | 'BLOCK';

export interface UserPublic {
  id: string;
  walletAddress: string;
  fullName: string | null;
  country: string | null;
  countryCode: string | null;
  kycStatus: KYCStatus;
  currentRiskScore: number | null;
  currentRiskLevel: RiskLevel | null;
  monthlyThreshold: number | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface UserAdmin extends UserPublic {
  email: string | null;
  dateOfBirth: string | null;
  annualIncomeUSD: number | null;
  kycDocumentType: DocumentType | null;
  kycDocumentUrl: string | null;
  kycDocumentNumber: string | null;
  kycVerifiedAt: string | null;
  kycRejectedReason: string | null;
  isActive: boolean;
  lastScoreCalculated: string | null;
  updatedAt: string;
}

export interface TransactionPublic {
  id: string;
  userId: string;
  txHash: string | null;
  fromAddress: string;
  toAddress: string;
  amountETH: number;
  amountUSD: number;
  currency: string;
  compositeScore: number;
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  riskLevel: RiskLevel;
  status: TransactionStatus;
  flagReason: string | null;
  onChainLogged: boolean;
  timestamp: string;
  createdAt: string;
}

export interface RiskScoreHistoryPublic {
  id: string;
  userId: string;
  compositeScore: number;
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  riskLevel: RiskLevel;
  calculatedAt: string;
}

export interface AlertPublic {
  id: string;
  userId: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface CompositeScoreResult {
  composite: number;
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  riskLevel: RiskLevel;
}

export interface TransactionAnalysisResponse {
  transactionId: string;
  compositeScore: number;
  score1Country: number;
  score2Transaction: number;
  score3Behaviour: number;
  riskLevel: RiskLevel;
  status: TransactionStatus;
  monthlyThreshold: number;
  flagReason: string | null;
  recommendation: TransactionRecommendation;
}

export interface OCRExtractedData {
  documentType: DocumentType | null;
  fullName: string | null;
  dateOfBirth: string | null;
  documentNumber: string | null;
  country: string | null;
  expiryDate: string | null;
}

export interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingKYC: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  avgRiskScore: number;
  totalTransactions: number;
}
