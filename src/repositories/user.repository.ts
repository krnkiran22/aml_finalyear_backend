import prisma from '../db';
import { Prisma, KYCStatus, DocumentType, RiskLevel } from '@prisma/client';

export class UserRepository {
  async findByWalletAddress(walletAddress: string) {
    return prisma.user.findUnique({ where: { walletAddress } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    kycStatus?: KYCStatus;
    riskLevel?: RiskLevel;
    search?: string;
  }) {
    const where: Prisma.UserWhereInput = {};

    if (params.kycStatus) where.kycStatus = params.kycStatus;
    if (params.riskLevel) where.currentRiskLevel = params.riskLevel;
    if (params.search) {
      where.OR = [
        { walletAddress: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async updateKYCStatus(
    id: string,
    status: KYCStatus,
    data?: {
      fullName?: string;
      dateOfBirth?: Date;
      documentType?: DocumentType;
      documentNumber?: string;
      rejectedReason?: string;
    },
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        kycStatus: status,
        kycVerifiedAt: status === 'VERIFIED' ? new Date() : undefined,
        kycRejectedReason: status === 'REJECTED' ? data?.rejectedReason : undefined,
        fullName: data?.fullName,
        dateOfBirth: data?.dateOfBirth,
        kycDocumentType: data?.documentType,
        kycDocumentNumber: data?.documentNumber,
      },
    });
  }

  async updateRiskScore(
    id: string,
    score: number,
    level: RiskLevel,
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        currentRiskScore: score,
        currentRiskLevel: level,
        lastScoreCalculated: new Date(),
      },
    });
  }

  async getStats() {
    const [totalUsers, verifiedUsers, pendingKYC] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: 'VERIFIED' } }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } }),
    ]);
    return { totalUsers, verifiedUsers, pendingKYC };
  }

  async findAllActive() {
    return prisma.user.findMany({
      where: { isActive: true, kycStatus: 'VERIFIED' },
      select: { id: true, walletAddress: true, countryCode: true, monthlyThreshold: true },
    });
  }
}

export const userRepository = new UserRepository();
