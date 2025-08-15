import Tesseract from "tesseract.js";
import sharp from "sharp";

/**
 * Enhanced OCR function specifically optimized for dive computer displays
 * Handles low contrast, colored backgrounds, and dive-specific text patterns
 */
export async function extractDiveText(image: File | string): Promise<string> {
  try {
    console.log("🔍 Starting enhanced OCR for dive profile...");
    
    let imagePath: string;
    
    // Handle different input types
    if (typeof image === 'string') {
      imagePath = image;
    } else {
      // For File objects, we need the filepath (handled by formidable in API)
      imagePath = (image as any).filepath || image;
    }
    
    console.log("📸 Preprocessing image for better OCR...");
    
    // ✅ STEP 1: Image preprocessing for dive computer screens
    const preprocessedBuffer = await sharp(imagePath)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .normalize() // Auto-adjust brightness and contrast
      .sharpen() // Enhance text sharpness
      .greyscale() // Convert to grayscale for better OCR
      .threshold(128) // Convert to black/white for high contrast
      .toBuffer();
    
    console.log("🔍 Running OCR with dive-optimized settings...");
    
    // ✅ STEP 2: Enhanced OCR with multiple configurations
    const ocrOptions = {
      lang: 'eng',
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: '0123456789.:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%/\\-+ ()[]{}<>°*',
      preserve_interword_spaces: '1',
    };
    
    // Try OCR with preprocessed image
    let result = await Tesseract.recognize(preprocessedBuffer, 'eng', ocrOptions);
    let extractedText = result.data.text;
    
    console.log("📄 Initial OCR result length:", extractedText.length);
    
    // ✅ STEP 3: If initial OCR fails, try with original image
    if (!extractedText || extractedText.trim().length < 10) {
      console.log("⚠️ Preprocessed OCR yielded poor results, trying original image...");
      
      result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m: any) => console.log(`Fallback OCR: ${m.status}`),
      });
      
      extractedText = result.data.text;
    }
    
    // ✅ STEP 4: Post-process text for dive-specific patterns
    const cleanedText = postProcessDiveText(extractedText);
    
    console.log("✅ OCR completed. Extracted text preview:", cleanedText.substring(0, 200));
    
    return cleanedText;
    
  } catch (error) {
    console.error("❌ OCR extraction failed:", error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Post-process OCR text to clean up and enhance dive-specific data
 */
function postProcessDiveText(rawText: string): string {
  if (!rawText) return "";
  
  let cleanedText = rawText
    // Fix common OCR errors for numbers
    .replace(/[Oo0]/g, '0')
    .replace(/[Il1]/g, '1')
    .replace(/[Ss5]/g, '5')
    .replace(/[GG6]/g, '6')
    .replace(/[Bb8]/g, '8')
    .replace(/[Gg9]/g, '9')
    
    // Clean up depth indicators
    .replace(/(\d+)\s*[mM](?:eters?)?/g, '$1m')
    .replace(/(\d+)\s*[fF](?:eet?|t)?/g, '$1ft')
    
    // Clean up time formats
    .replace(/(\d+):(\d+):(\d+)/g, '$1:$2:$3')
    .replace(/(\d+)min/g, '$1 min')
    .replace(/(\d+)sec/g, '$1 sec')
    
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleanedText;
}

/**
 * Fallback OCR function for when enhanced OCR fails
 */
export async function extractDiveTextBasic(image: File | string): Promise<string> {
  try {
    const result = await Tesseract.recognize(image, "eng", {
      logger: (m) => console.log("Basic OCR:", m.status),
    });
    return result.data.text || "";
  } catch (error) {
    console.error("❌ Basic OCR failed:", error);
    return "";
  }
}
