import prisma from '../db';
import { Prisma, RiskLevel } from '@prisma/client';

export class RiskScoreRepository {
  async create(data: Prisma.RiskScoreHistoryCreateInput) {
    return prisma.riskScoreHistory.create({ data });
  }

  async findByUserId(userId: string, limit = 30) {
    return prisma.riskScoreHistory.findMany({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
      take: limit,
    });
  }

  async getLatest(userId: string) {
    return prisma.riskScoreHistory.findFirst({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async record(
    userId: string,
    scores: {
      composite: number;
      score1Country: number;
      score2Transaction: number;
      score3Behaviour: number;
      riskLevel: RiskLevel;
    },
  ) {
    return prisma.riskScoreHistory.create({
      data: {
        userId,
        compositeScore: scores.composite,
        score1Country: scores.score1Country,
        score2Transaction: scores.score2Transaction,
        score3Behaviour: scores.score3Behaviour,
        riskLevel: scores.riskLevel,
      },
    });
  }
}

export const riskScoreRepository = new RiskScoreRepository();
