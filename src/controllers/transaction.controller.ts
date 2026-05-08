import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyzeTransaction, confirmTransaction } from '../services/transaction.service';
import { transactionRepository } from '../repositories/transaction.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error';
import { getWalletRiskSnapshot } from '../services/wallet-risk.service';
import { TransactionPublic } from '../shared';

const analyzeSchema = z.object({
  toAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
  amountETH: z.number().positive(),
  amountUSD: z.number().positive(),
});

const confirmSchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid transaction hash'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  riskLevel: z.enum(['SAFE', 'LOW_RISK', 'FLAGGED', 'HIGH_RISK']).optional(),
});

function toPublicTransaction(
  tx: Awaited<ReturnType<typeof transactionRepository.findByUserId>>['transactions'][number],
): TransactionPublic {
  return {
    id: tx.id,
    userId: tx.userId,
    txHash: tx.txHash,
    fromAddress: tx.fromAddress,
    toAddress: tx.toAddress,
    amountETH: tx.amountETH,
    amountUSD: tx.amountUSD,
    currency: tx.currency,
    compositeScore: tx.compositeScore,
    score1Country: tx.score1Country,
    score2Transaction: tx.score2Transaction,
    score3Behaviour: tx.score3Behaviour,
    riskLevel: tx.riskLevel,
    status: tx.status,
    flagReason: tx.flagReason,
    onChainLogged: tx.onChainLogged,
    timestamp: tx.timestamp.toISOString(),
    createdAt: tx.createdAt.toISOString(),
  };
}

export async function analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { toAddress, amountETH, amountUSD } = analyzeSchema.parse(req.body);

    const result = await analyzeTransaction(userId, toAddress, amountETH, amountUSD);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { txHash } = confirmSchema.parse(req.body);

    await confirmTransaction(id, txHash);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { page, limit, riskLevel } = listQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    const [dbData, liveSnapshot] = await Promise.all([
      transactionRepository.findByUserId(userId, { skip: 0, take: 200 }),
      getWalletRiskSnapshot(user.walletAddress, userId),
    ]);

    const mergedMap = new Map<string, TransactionPublic>();

    for (const tx of dbData.transactions) {
      const key = tx.txHash ?? tx.id;
      mergedMap.set(key, toPublicTransaction(tx));
    }

    for (const tx of liveSnapshot.transactions) {
      const key = tx.txHash ?? tx.id;
      if (!mergedMap.has(key)) mergedMap.set(key, tx);
    }

    const merged = [...mergedMap.values()]
      .filter((tx) => !riskLevel || tx.riskLevel === riskLevel)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const pagedTransactions = merged.slice(skip, skip + limit);
    res.json({ transactions: pagedTransactions, total: merged.length, page, limit });
  } catch (err) {
    next(err);
  }
}
