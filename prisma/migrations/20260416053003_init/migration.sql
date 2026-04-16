-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'LOW_RISK', 'FLAGGED', 'HIGH_RISK');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('APPROVED', 'MONITORING', 'HELD', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('KYC_FAILED', 'KYC_VERIFIED', 'HIGH_RISK_TRANSACTION', 'THRESHOLD_EXCEEDED', 'BEHAVIOURAL_ANOMALY', 'ACCOUNT_FLAGGED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FATFStatus" AS ENUM ('LOW_RISK', 'GREY_LIST', 'HIGH_RISK', 'BLACKLISTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "country" TEXT,
    "countryCode" TEXT,
    "annualIncomeUSD" DOUBLE PRECISION,
    "monthlyThreshold" DOUBLE PRECISION,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycDocumentType" "DocumentType",
    "kycDocumentUrl" TEXT,
    "kycDocumentNumber" TEXT,
    "kycVerifiedAt" TIMESTAMP(3),
    "kycRejectedReason" TEXT,
    "currentRiskScore" DOUBLE PRECISION,
    "currentRiskLevel" "RiskLevel",
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScoreCalculated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txHash" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amountETH" DOUBLE PRECISION NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETH',
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "score1Country" DOUBLE PRECISION NOT NULL,
    "score2Transaction" DOUBLE PRECISION NOT NULL,
    "score3Behaviour" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "flagReason" TEXT,
    "onChainLogged" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScoreHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "score1Country" DOUBLE PRECISION NOT NULL,
    "score2Transaction" DOUBLE PRECISION NOT NULL,
    "score3Behaviour" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryRisk" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "baseScore" DOUBLE PRECISION NOT NULL,
    "fatfStatus" "FATFStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountryRisk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_riskLevel_idx" ON "Transaction"("riskLevel");

-- CreateIndex
CREATE INDEX "RiskScoreHistory_userId_idx" ON "RiskScoreHistory"("userId");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_resolved_idx" ON "Alert"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "CountryRisk_countryCode_key" ON "CountryRisk"("countryCode");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScoreHistory" ADD CONSTRAINT "RiskScoreHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
