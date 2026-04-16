import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository';
import { signToken } from '../middleware/auth';
import { JWT_SIGN_MESSAGE_PREFIX } from '../shared';

const connectWalletSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
});

export async function connectWallet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { walletAddress, signature, message } = connectWalletSchema.parse(req.body);

    // Verify the message starts with our prefix
    if (!message.startsWith(JWT_SIGN_MESSAGE_PREFIX)) {
      res.status(400).json({ error: 'Invalid sign-in message format' });
      return;
    }

    // Verify signature using ethers
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      res.status(401).json({ error: 'Signature verification failed — address mismatch' });
      return;
    }

    let user = await userRepository.findByWalletAddress(walletAddress);
    const isNewUser = !user;

    if (!user) {
      user = await userRepository.create({ walletAddress });
    }

    const token = signToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
    });

    res.json({
      token,
      user: {
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
      },
      isNewUser,
    });
  } catch (err) {
    next(err);
  }
}
