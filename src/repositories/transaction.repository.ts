import prisma from '../db';
import { Prisma, RiskLevel, TransactionStatus } from '@prisma/client';

export class TransactionRepository {
  async create(data: Prisma.TransactionCreateInput) {
    return prisma.transaction.create({ data });
  }

  async findById(id: string) {
    return prisma.transaction.findUnique({ where: { id } });
  }

  async updateTxHash(id: string, txHash: string) {
    return prisma.transaction.update({ where: { id }, data: { txHash } });
  }

  async markOnChainLogged(id: string) {
    return prisma.transaction.update({ where: { id }, data: { onChainLogged: true } });
  }

  async findByUserId(
    userId: string,
    params: { skip?: number; take?: number; riskLevel?: RiskLevel },
  ) {
    const where: Prisma.TransactionWhereInput = { userId };
    if (params.riskLevel) where.riskLevel = params.riskLevel;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    riskLevel?: RiskLevel;
    status?: TransactionStatus;
  }) {
    const where: Prisma.TransactionWhereInput = {};
    if (params.riskLevel) where.riskLevel = params.riskLevel;
    if (params.status) where.status = params.status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { walletAddress: true, fullName: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async getRecentByUser(userId: string, hours: number) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.transaction.findMany({
      where: { userId, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
    });
  }

  async countByUser(userId: string): Promise<number> {
    return prisma.transaction.count({ where: { userId } });
  }

  async getStats() {
    const [flaggedTransactions, blockedTransactions, totalTransactions, avgResult] =
      await Promise.all([
        prisma.transaction.count({ where: { riskLevel: 'FLAGGED' } }),
        prisma.transaction.count({ where: { riskLevel: 'HIGH_RISK' } }),
        prisma.transaction.count(),
        prisma.transaction.aggregate({ _avg: { compositeScore: true } }),
      ]);

    return {
      flaggedTransactions,
      blockedTransactions,
      totalTransactions,
      avgRiskScore: avgResult._avg.compositeScore ?? 0,
    };
  }
}

export const transactionRepository = new TransactionRepository();
