import Tesseract from 'tesseract.js';

export async function extractDiveText(image: File | string): Promise<string> {
  const result = await Tesseract.recognize(image, 'eng', {
    logger: m => console.log(m), // optional progress logging
  });
  return result.data.text;
}
