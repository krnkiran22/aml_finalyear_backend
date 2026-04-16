import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error';
import { convertToUSD, calculateMonthlyThreshold } from '../shared';

const incomeSchema = z.object({
  annualIncome: z.number().positive('Annual income must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').toUpperCase(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
});

export async function submitIncome(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { annualIncome, currency, country, countryCode } = incomeSchema.parse(req.body);

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    const annualIncomeUSD = convertToUSD(annualIncome, currency);
    const monthlyThreshold = calculateMonthlyThreshold(annualIncomeUSD);

    await userRepository.update(userId, {
      annualIncomeUSD,
      monthlyThreshold,
      ...(country ? { country } : {}),
      ...(countryCode ? { countryCode } : {}),
    });

    res.json({
      annualIncomeUSD,
      monthlyThreshold,
      thresholdCurrency: 'USD',
    });
  } catch (err) {
    next(err);
  }
}
