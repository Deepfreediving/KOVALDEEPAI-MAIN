// Example API route (pages/api/ocr.ts)
import type { NextApiRequest, NextApiResponse } from 'next';
import { extractTextFromImage } from '@/utils/ocr';
import { analyzeDiveLogText } from '@/utils/analyzeDiveLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const imagePath = req.body.imagePath;

  try {
    const text = await extractTextFromImage(imagePath);
    const analysis = analyzeDiveLogText(text);

    res.status(200).json({ text, analysis });
  } catch (err) {
    res.status(500).json({ error: 'OCR failed', details: err });
  }
}
