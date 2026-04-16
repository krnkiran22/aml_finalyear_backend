import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyzeTransaction, confirmTransaction } from '../services/transaction.service';
import { transactionRepository } from '../repositories/transaction.repository';
import { AppError } from '../middleware/error';

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

    const { transactions, total } = await transactionRepository.findByUserId(userId, {
      skip,
      take: limit,
      riskLevel,
    });

    res.json({ transactions, total, page, limit });
  } catch (err) {
    next(err);
  }
}
