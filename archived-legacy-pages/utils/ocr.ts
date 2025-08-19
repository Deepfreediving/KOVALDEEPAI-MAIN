// utils/ocr.ts
import Tesseract from "tesseract.js";

export async function extractTextFromImage(imagePath: string): Promise<string> {
  const {
    data: { text },
  } = await Tesseract.recognize(imagePath, "eng", {
    logger: (m) => console.log(m),
  });
  return text;
}
