import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { uploadKYCDocument, verifyKYCDocument } from '../services/kyc.service';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error';

const documentTypeSchema = z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']);

export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const documentType = documentTypeSchema.parse(req.body.documentType);

    if (!req.file) {
      throw new AppError(400, 'No file uploaded');
    }

    const result = await uploadKYCDocument(
      userId,
      req.file.buffer,
      req.file.mimetype,
      documentType,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await verifyKYCDocument(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getKYCStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    res.json({
      kycStatus: user.kycStatus,
      documentType: user.kycDocumentType,
      verifiedAt: user.kycVerifiedAt?.toISOString() ?? null,
      rejectedReason: user.kycRejectedReason ?? null,
    });
  } catch (err) {
    next(err);
  }
}
