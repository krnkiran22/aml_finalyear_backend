import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { lookupWalletRisk } from '../services/lookup.service';

const walletSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address');

export async function lookupWallet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const walletAddress = walletSchema.parse(req.params['walletAddress']);
    const result = await lookupWalletRisk(walletAddress);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
