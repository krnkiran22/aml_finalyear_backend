import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error';
import { getWalletRiskSnapshot } from '../services/wallet-risk.service';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    res.json({
      id: user.id,
      walletAddress: user.walletAddress,
      fullName: user.fullName,
      country: user.country,
      countryCode: user.countryCode,
      kycStatus: user.kycStatus,
      currentRiskScore: user.currentRiskScore,
      currentRiskLevel: user.currentRiskLevel,
      monthlyThreshold: user.monthlyThreshold,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getRiskScore(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    const snapshot = await getWalletRiskSnapshot(user.walletAddress, userId);

    res.json({
      composite: snapshot.composite,
      score1Country: snapshot.score1Country,
      score2Transaction: snapshot.score2Transaction,
      score3Behaviour: snapshot.score3Behaviour,
      riskLevel: snapshot.riskLevel,
      calculatedAt: snapshot.calculatedAt,
      history: snapshot.history,
    });
  } catch (err) {
    next(err);
  }
}
