import prisma from '../db';
import { Prisma, AlertType, AlertSeverity } from '@prisma/client';

export class AlertRepository {
  async create(data: Prisma.AlertCreateInput) {
    return prisma.alert.create({ data });
  }

  async findByUserId(userId: string) {
    return prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.alert.findUnique({ where: { id } });
  }

  async resolve(id: string, resolvedBy: string) {
    return prisma.alert.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy },
    });
  }

  async countUnread(userId: string) {
    return prisma.alert.count({ where: { userId, resolved: false } });
  }

  async createForUser(
    userId: string,
    type: AlertType,
    message: string,
    severity: AlertSeverity,
    metadata?: Record<string, unknown>,
  ) {
    return prisma.alert.create({
      data: {
        userId,
        type,
        message,
        severity,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}

export const alertRepository = new AlertRepository();
