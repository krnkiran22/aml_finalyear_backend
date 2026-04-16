import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { adminReviewKYC } from '../services/kyc.service';
import { AppError } from '../middleware/error';

const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  kycStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
  riskLevel: z.enum(['SAFE', 'LOW_RISK', 'FLAGGED', 'HIGH_RISK']).optional(),
  search: z.string().optional(),
});

const txQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  riskLevel: z.enum(['SAFE', 'LOW_RISK', 'FLAGGED', 'HIGH_RISK']).optional(),
  status: z.enum(['APPROVED', 'MONITORING', 'HELD', 'BLOCKED']).optional(),
});

const kycReviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
});

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [userStats, txStats] = await Promise.all([
      userRepository.getStats(),
      transactionRepository.getStats(),
    ]);

    res.json({ ...userStats, ...txStats });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, kycStatus, riskLevel, search } = usersQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const { users, total } = await userRepository.findAll({
      skip,
      take: limit,
      kycStatus,
      riskLevel,
      search,
    });

    res.json({ users, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');

    const { transactions } = await transactionRepository.findByUserId(id, {
      skip: 0,
      take: 50,
    });

    res.json({ user, transactions });
  } catch (err) {
    next(err);
  }
}

export async function reviewKYC(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params['userId'] as string;
    const { action, reason } = kycReviewSchema.parse(req.body);

    await adminReviewKYC(userId, action, reason);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, riskLevel, status } = txQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const { transactions, total } = await transactionRepository.findAll({
      skip,
      take: limit,
      riskLevel: riskLevel ?? 'FLAGGED',
      status,
    });

    res.json({ transactions, total, page, limit });
  } catch (err) {
    next(err);
  }
}
