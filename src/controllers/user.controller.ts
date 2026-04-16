import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository';
import { riskScoreRepository } from '../repositories/risk-score.repository';
import { AppError } from '../middleware/error';

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

    const history = await riskScoreRepository.findByUserId(userId, 30);
    const latest = history[0];

    if (!latest) {
      res.json({
        composite: 0,
        score1Country: 0,
        score2Transaction: 0,
        score3Behaviour: 0,
        riskLevel: 'SAFE',
        calculatedAt: null,
        history: [],
      });
      return;
    }

    res.json({
      composite: latest.compositeScore,
      score1Country: latest.score1Country,
      score2Transaction: latest.score2Transaction,
      score3Behaviour: latest.score3Behaviour,
      riskLevel: latest.riskLevel,
      calculatedAt: latest.calculatedAt.toISOString(),
      history: history.map((h) => ({
        id: h.id,
        compositeScore: h.compositeScore,
        riskLevel: h.riskLevel,
        calculatedAt: h.calculatedAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
}
