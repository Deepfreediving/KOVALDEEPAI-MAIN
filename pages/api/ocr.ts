// pages/api/ocr.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTextFromImage } from '@/utils/ocr';
import { analyzeDiveLogText } from '@/utils/analyzeDiveLog';
import handleCors from '@/utils/handleCors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    if (req.method === "OPTIONS") return;

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method Not Allowed",
        message: "Only POST requests are allowed"
      });
    }

    const imagePath = req.body?.imagePath;
    if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'imagePath must be a non-empty string'
      });
    }

    const text = await extractTextFromImage(imagePath);
    const analysis = analyzeDiveLogText(text);

    return res.status(200).json({ text, analysis });
    
  } catch (err: any) {
    console.error('❌ OCR API error:', err);
    return res.status(500).json({ 
      error: 'OCR failed',
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
    responseLimit: false
  }
};
