// scripts/test-ocr.ts
import { extractTextFromImage } from '@/utils/ocr';
import fs from 'fs';
import path from 'path';

const runOCR = async () => {
  const imagePath = path.join(process.cwd(), 'public', 'test-dive-log.png');
  const base64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  const dataUrl = `data:image/png;base64,${base64}`;

  const text = await extractTextFromImage(dataUrl);
  console.log('\n📄 OCR Output:\n', text);
};

runOCR();
