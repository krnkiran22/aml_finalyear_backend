import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { userRepository } from '../repositories/user.repository';
import { alertRepository } from '../repositories/alert.repository';
import { extractDocumentData } from './ocr.service';
import { blockchainService } from './blockchain.service';
import { AppError } from '../middleware/error';
import { KYCStatus } from '../shared';
import { env } from '../config/env';

export interface UploadDocumentResult {
  documentUrl: string;
  uploadedAt: string;
}

async function uploadToCloudinary(
  fileBuffer: Buffer,
  userId: string,
  documentType: string,
): Promise<string> {
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'chainguard-kyc',
          resource_type: 'auto',
          public_id: `kyc-${userId}-${Date.now()}`,
          tags: ['kyc', documentType, userId],
        },
        (error, res) => {
          if (error) reject(new Error(`Cloudinary upload failed: ${error.message}`));
          else resolve(res as { secure_url: string });
        },
      )
      .end(fileBuffer);
  });
  return result.secure_url;
}

async function uploadToLocal(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string,
): Promise<string> {
  const ext = mimeType.includes('pdf') ? '.pdf' : mimeType.includes('png') ? '.png' : '.jpg';
  const filename = `kyc-${userId}-${Date.now()}${ext}`;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), fileBuffer);
  const port = env.PORT ?? '4000';
  return `http://localhost:${port}/uploads/${filename}`;
}

export async function uploadKYCDocument(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  documentType: string,
): Promise<UploadDocumentResult> {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const isCloudinaryConfigured =
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET;

  const documentUrl = isCloudinaryConfigured
    ? await uploadToCloudinary(fileBuffer, userId, documentType)
    : await uploadToLocal(fileBuffer, mimeType, userId);

  await userRepository.update(userId, {
    kycDocumentUrl: documentUrl,
    kycDocumentType: documentType as never,
    kycStatus: 'UNDER_REVIEW',
  });

  return {
    documentUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export interface VerifyKYCResult {
  kycStatus: KYCStatus;
  extractedData: {
    fullName: string | null;
    dateOfBirth: string | null;
    documentNumber: string | null;
    documentType: string | null;
    country: string | null;
  };
  confidence: number;
  rejectedReason?: string;
}

export async function verifyKYCDocument(userId: string): Promise<VerifyKYCResult> {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (!user.kycDocumentUrl) throw new AppError(400, 'No document uploaded yet');

  // Fetch document from Cloudinary as base64
  const response = await fetch(user.kycDocumentUrl);
  if (!response.ok) throw new AppError(500, 'Failed to fetch uploaded document for verification');

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';

  const mimeType = contentType.includes('pdf')
    ? 'application/pdf'
    : (contentType as 'image/jpeg' | 'image/png' | 'image/webp');

  const ocrResult = await extractDocumentData(base64, mimeType);

  const MIN_CONFIDENCE = 0.6;
  const isVerified = ocrResult.confidence >= MIN_CONFIDENCE && ocrResult.extractedData.documentNumber !== null;

  const kycStatus: KYCStatus = isVerified ? 'VERIFIED' : 'REJECTED';
  const rejectedReason = !isVerified
    ? ocrResult.confidence < MIN_CONFIDENCE
      ? 'Document could not be read with sufficient confidence. Please upload a clearer image.'
      : 'Could not extract required document fields. Ensure document is fully visible.'
    : undefined;

  await userRepository.updateKYCStatus(userId, kycStatus, {
    fullName: ocrResult.extractedData.fullName ?? undefined,
    dateOfBirth: ocrResult.extractedData.dateOfBirth
      ? new Date(ocrResult.extractedData.dateOfBirth)
      : undefined,
    documentType: (ocrResult.extractedData.documentType as never) ?? undefined,
    documentNumber: ocrResult.extractedData.documentNumber ?? undefined,
    rejectedReason,
  });

  if (kycStatus === 'VERIFIED') {
    await alertRepository.createForUser(
      userId,
      'KYC_VERIFIED',
      'Your identity has been successfully verified. You can now use all platform features.',
      'INFO',
    );
    // Call blockchain oracle to record verification
    try {
      await blockchainService.verifyUser(user.walletAddress);
    } catch (err) {
      console.error('Blockchain oracle call failed (non-critical):', err);
    }
  } else {
    await alertRepository.createForUser(
      userId,
      'KYC_FAILED',
      rejectedReason ?? 'KYC verification failed.',
      'WARNING',
    );
  }

  return {
    kycStatus,
    extractedData: {
      fullName: ocrResult.extractedData.fullName,
      dateOfBirth: ocrResult.extractedData.dateOfBirth,
      documentNumber: ocrResult.extractedData.documentNumber,
      documentType: ocrResult.extractedData.documentType,
      country: ocrResult.extractedData.country,
    },
    confidence: ocrResult.confidence,
    rejectedReason,
  };
}

export async function adminReviewKYC(
  userId: string,
  action: 'APPROVE' | 'REJECT',
  reason?: string,
): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const kycStatus: KYCStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

  await userRepository.updateKYCStatus(userId, kycStatus, { rejectedReason: reason });

  if (action === 'APPROVE') {
    await alertRepository.createForUser(
      userId,
      'KYC_VERIFIED',
      'Your KYC has been manually approved by our compliance team.',
      'INFO',
    );
    try {
      await blockchainService.verifyUser(user.walletAddress);
    } catch (err) {
      console.error('Blockchain oracle call failed (non-critical):', err);
    }
  } else {
    await alertRepository.createForUser(
      userId,
      'KYC_FAILED',
      reason ?? 'Your KYC submission was rejected by our compliance team.',
      'WARNING',
    );
  }
}
