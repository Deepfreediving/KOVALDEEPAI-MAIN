/**
 * Extract text from image using OCR
 * Note: tesseract.js is optional and only loaded when needed
 */
export async function extractDiveText(image: File | string | Buffer): Promise<string> {
  try {
    // Dynamically import tesseract.js to avoid build issues
    const Tesseract = await import("tesseract.js");
    
    const result = await Tesseract.recognize(image, "eng", {
      logger: (m) => console.log(m), // optional progress logging
    });
    
    return result.data.text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    // Fallback when tesseract.js is not available
    return "OCR text extraction not available";
  }
}

export default extractDiveText;
