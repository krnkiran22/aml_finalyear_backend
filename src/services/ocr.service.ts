import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { OCRExtractedData } from '../shared';

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export interface OCRResult {
  extractedData: OCRExtractedData;
  confidence: number;
  rawResponse: string;
}

function mockOCRResult(): OCRResult {
  return {
    extractedData: {
      documentType: 'PASSPORT',
      fullName: 'Demo User',
      dateOfBirth: '1995-01-01',
      documentNumber: 'DEMO' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      country: 'IN',
      expiryDate: '2030-01-01',
    },
    confidence: 0.95,
    rawResponse: '{"mock":true}',
  };
}

export async function extractDocumentData(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf',
): Promise<OCRResult> {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set — using mock OCR result for dev/testing');
    return mockOCRResult();
  }

  const client = getClient();

  const prompt = `Analyse this identity document image and extract the following information:
- Document type (must be one of: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE)
- Full name
- Date of birth (ISO format: YYYY-MM-DD)
- Document number
- Country of issue (ISO 3166-1 alpha-2 code)
- Expiry date (ISO format: YYYY-MM-DD, if applicable)

Return ONLY a valid JSON object in this exact structure:
{
  "documentType": "AADHAAR" | "PAN" | "PASSPORT" | "DRIVING_LICENSE" | null,
  "fullName": "string" | null,
  "dateOfBirth": "YYYY-MM-DD" | null,
  "documentNumber": "string" | null,
  "country": "XX" | null,
  "expiryDate": "YYYY-MM-DD" | null,
  "confidence": 0.0-1.0
}

If a field cannot be clearly read, return null for that field. The confidence field (0–1) should reflect how clearly you could read the document overall.`;

  const mediaType = mimeType === 'application/pdf' ? 'image/jpeg' : mimeType;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OCR response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as OCRExtractedData & { confidence: number };

    return {
      extractedData: {
        documentType: parsed.documentType,
        fullName: parsed.fullName,
        dateOfBirth: parsed.dateOfBirth,
        documentNumber: parsed.documentNumber,
        country: parsed.country,
        expiryDate: parsed.expiryDate,
      },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      rawResponse: rawText,
    };
  } catch (parseError) {
    console.error('Failed to parse OCR response:', rawText);
    throw new Error('Failed to parse document data from OCR service');
  }
}
