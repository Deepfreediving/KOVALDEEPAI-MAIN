import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import axios from "axios";
import handleCors from "@/utils/handleCors";
import { extractDiveText } from "@/utils/extractTextFromImage";
import { analyzeDiveLogText, generateDiveReport } from "@/utils/analyzeDiveLog";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "10mb",
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ✅ Convert file to base64 for Wix storage
function fileToBase64(file: formidable.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    try {
      const buffer = fs.readFileSync(file.filepath);
      const base64 = buffer.toString('base64');
      resolve(base64);
    } catch (error) {
      reject(error);
    }
  });
}

// ✅ Validate file with security checks
function validateFile(file: formidable.File): {
  isValid: boolean;
  error?: string;
} {
  if (!file || !file.originalFilename) {
    return { isValid: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
    };
  }

  // Check for path traversal (security)
  if (
    file.originalFilename.includes("..") ||
    file.originalFilename.includes("/")
  ) {
    return { isValid: false, error: "Invalid filename" };
  }

  return { isValid: true };
}

// ✅ Save image to Wix Media collection
async function saveImageToWix(
  diveLogId: string,
  nickname: string,
  imageBase64: string,
  filename: string,
  mimetype: string
): Promise<{ success: boolean; imageUrl?: string; wixMediaId?: string }> {
  const WIX_SITE_URL = process.env.WIX_SITE_URL || "https://www.deepfreediving.com";

  try {
    console.log(`📤 Uploading image to Wix Media collection for dive log: ${diveLogId}`);

    const response = await axios.post(
      `${WIX_SITE_URL}/_functions/uploadDiveImage`,
      {
        diveLogId,
        nickname,
        imageData: imageBase64,
        filename: filename || `dive-${diveLogId}.jpg`,
        mimetype: mimetype || 'image/jpeg',
        metadata: {
          type: 'dive_profile_image',
          uploadedAt: new Date().toISOString(),
          source: 'koval-ai-upload'
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "KovalAI/1.0",
        },
        timeout: 30000, // 30 seconds for image upload
      },
    );

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Image uploaded to Wix successfully:`, response.data);
      return {
        success: true,
        imageUrl: response.data.imageUrl,
        wixMediaId: response.data.mediaId || response.data._id
      };
    }

    throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Upload failed'}`);
  } catch (error: any) {
    console.error(`❌ Wix image upload failed:`, error.response?.data || error.message);
    return { success: false };
  }
}

// ✅ Save dive log to Wix DiveLogs collection
async function saveDiveLogToWix(
  diveLogId: string,
  nickname: string,
  diveLogData: any,
  imageUrl?: string
): Promise<{ success: boolean; recordId?: string }> {
  const WIX_SITE_URL = process.env.WIX_SITE_URL || "https://www.deepfreediving.com";

  try {
    console.log(`💾 Saving dive log to Wix DiveLogs collection for: ${diveLogId}`);

    const response = await axios.post(
      `${WIX_SITE_URL}/_functions/saveDiveLog`,
      {
        nickname,
        diveLogId,
        logEntry: JSON.stringify(diveLogData),
        diveDate: diveLogData.date ? new Date(diveLogData.date).toISOString() : new Date().toISOString(),
        diveTime: diveLogData.totalDiveTime || new Date().toLocaleTimeString(),
        watchedPhoto: imageUrl || null,
        metadata: {
          source: "koval-ai-upload",
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "KovalAI/1.0",
        },
        timeout: 15000,
      },
    );

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Dive log saved to Wix DiveLogs collection successfully`);
      return {
        success: true,
        recordId: response.data._id || response.data.recordId
      };
    }

    throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Save failed'}`);
  } catch (error: any) {
    console.error(`❌ Wix dive log save failed:`, error.response?.data || error.message);
    return { success: false };
  }
}

// ✅ Save analysis to Wix DiveAnalysis collection
async function saveAnalysisToWix(
  diveLogId: string,
  nickname: string,
  analysisData: any,
  imageUrl?: string
): Promise<{ success: boolean; recordId?: string }> {
  const WIX_SITE_URL = process.env.WIX_SITE_URL || "https://www.deepfreediving.com";

  try {
    console.log(`📊 Saving analysis to Wix DiveAnalysis collection for: ${diveLogId}`);

    const response = await axios.post(
      `${WIX_SITE_URL}/_functions/saveDiveAnalysis`,
      {
        diveLogId,
        nickname,
        imageUrl,
        ocrText: analysisData.ocr?.text || "",
        ocrSuccess: analysisData.ocr?.success || false,
        technicalAnalysis: analysisData.technical ? JSON.stringify(analysisData.technical) : null,
        visionInsights: analysisData.vision?.insights || "",
        visionModel: analysisData.vision?.model || "gpt-4-vision-preview",
        analysisTimestamp: new Date().toISOString(),
        metadata: {
          processingVersion: "v2.0",
          source: "koval-ai-analysis"
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "KovalAI/1.0",
        },
        timeout: 15000,
      },
    );

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Analysis saved to Wix successfully`);
      return {
        success: true,
        recordId: response.data._id || response.data.recordId
      };
    }

    throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Save failed'}`);
  } catch (error: any) {
    console.error(`❌ Wix analysis save failed:`, error.response?.data || error.message);
    return { success: false };
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const startTime = Date.now();

  try {
    // ✅ CORS handling
    if (await handleCors(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method Not Allowed",
        message: "Only POST requests are allowed",
      });
    }

    console.log("🚀 Processing dive image upload with Wix collections...");

    // ✅ Enhanced form parsing with security limits
    const form = formidable({
      multiples: false,
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      allowEmptyFiles: false,
      maxFieldsSize: 1024,
    });

    // ✅ Promisified form parsing
    const parsePromise = new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = await parsePromise;

    // ✅ Extract and validate diveLogId
    let diveLogId: string;
    if (fields.diveLogId) {
      const rawId = Array.isArray(fields.diveLogId)
        ? fields.diveLogId[0]
        : fields.diveLogId;
      diveLogId = (rawId as string).trim();

      if (!diveLogId || diveLogId.length === 0 || diveLogId.length > 100) {
        return res.status(400).json({
          error: "Invalid dive log ID",
          message: "Dive log ID must be 1-100 characters",
        });
      }

      // Sanitize (allow only alphanumeric, hyphens, underscores)
      if (!/^[a-zA-Z0-9\-_]+$/.test(diveLogId)) {
        return res.status(400).json({
          error: "Invalid dive log ID format",
          message: "Only letters, numbers, hyphens and underscores allowed",
        });
      }
    } else {
      return res.status(400).json({
        error: "Missing dive log ID",
        message: "diveLogId field is required",
      });
    }

    // ✅ Extract nickname (user identifier)
    let nickname: string = "";
    if (fields.nickname) {
      const rawNickname = Array.isArray(fields.nickname)
        ? fields.nickname[0]
        : fields.nickname;
      nickname = (rawNickname as string).trim();
    }

    // ✅ Backward compatibility: also check for userId field
    if (!nickname && fields.userId) {
      const rawUserId = Array.isArray(fields.userId)
        ? fields.userId[0]
        : fields.userId;
      nickname = (rawUserId as string).trim();
      console.log("⚠️ Using legacy userId field as nickname for backward compatibility");
    }

    // ✅ Extract and validate image file
    let imageFile: formidable.File;
    if (files.image) {
      imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

      const validation = validateFile(imageFile);
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Invalid file",
          message: validation.error,
        });
      }
    } else {
      return res.status(400).json({
        error: "Missing image file",
        message: "image file is required",
      });
    }

    console.log(`🔍 Processing dive image for log: ${diveLogId} (nickname: ${nickname})`);

    // ✅ STEP 1: Convert image to base64 for Wix storage
    const imageBase64 = await fileToBase64(imageFile);
    console.log(`📸 Image converted to base64 (${imageBase64.length} chars)`);

    // ✅ STEP 2: Upload image to Wix Media collection
    const wixUpload = await saveImageToWix(
      diveLogId,
      nickname,
      imageBase64,
      imageFile.originalFilename || `dive-${diveLogId}.jpg`,
      imageFile.mimetype || 'image/jpeg'
    );

    if (!wixUpload.success) {
      return res.status(500).json({
        error: "Image upload failed",
        message: "Could not save image to Wix Media collection",
      });
    }

    console.log(`✅ Image uploaded to Wix: ${wixUpload.imageUrl}`);

    // ✅ STEP 3: OCR Text Extraction
    console.log("🔍 Extracting text from dive profile...");
    const extractedText = await extractDiveText(imageFile.filepath);
    console.log("📄 OCR Result:", extractedText?.substring(0, 100) + "...");

    // ✅ STEP 4: Technical Analysis
    let analysis = null;
    let coachingReport = "";

    if (extractedText && extractedText.trim()) {
      console.log("📊 Analyzing extracted dive data...");
      analysis = analyzeDiveLogText(extractedText);
      coachingReport = generateDiveReport(analysis);
    }

    // ✅ STEP 5: AI Vision Analysis with base64 image
    console.log("🤖 Running AI vision analysis...");
    let visionAnalysis = "Vision analysis not available";
    
    try {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this freediving depth profile chart. 
                
                OCR extracted: "${extractedText || "No text detected"}"
                ${coachingReport ? `Technical analysis: ${coachingReport}` : ""}
                
                Please provide insights about:
                1. Descent/ascent curve smoothness
                2. Time spent at various depths
                3. Any concerning patterns
                4. Technical improvement suggestions
                5. Safety observations`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageFile.mimetype || 'image/jpeg'};base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      visionAnalysis = visionResponse.choices[0]?.message?.content || "No vision analysis available";
      console.log("🤖 AI Vision analysis completed successfully");
      
    } catch (visionError: any) {
      console.warn("⚠️ Vision analysis failed, but continuing with other analysis:", visionError.message);
      visionAnalysis = `Vision analysis temporarily unavailable: ${visionError.message}`;
    }

    // ✅ STEP 6: Combined Results
    const combinedAnalysis = {
      ocr: {
        text: extractedText,
        success: !!extractedText?.trim(),
      },
      technical: analysis
        ? {
            analysis,
            coaching: coachingReport,
            metrics: {
              maxDepth: Math.max(...(analysis.depthData || [])) || 0,
              avgDescentRate:
                analysis.descentRates?.length > 0
                  ? analysis.descentRates.reduce((a, b) => a + b, 0) /
                    analysis.descentRates.length
                  : 0,
              hangCount: analysis.changes?.filter((c) => c.warning).length || 0,
            },
          }
        : null,
      vision: {
        insights: visionAnalysis,
        model: "gpt-4-vision-preview",
      },
      imageUrl: wixUpload.imageUrl,
      wixMediaId: wixUpload.wixMediaId,
    };

    // ✅ STEP 7: Save analysis to Wix DiveAnalysis collection
    let analysisSave: { success: boolean; recordId?: string } = { success: false };
    try {
      analysisSave = await saveAnalysisToWix(
        diveLogId,
        nickname,
        combinedAnalysis,
        wixUpload.imageUrl
      );
      console.log(`📊 Analysis save result:`, analysisSave.success ? "✅ Success" : "❌ Failed");
    } catch (analysisError: any) {
      console.warn("⚠️ Analysis save failed, but continuing:", analysisError.message);
    }

    // ✅ STEP 8: Save dive log to Wix DiveLogs collection
    const diveLogData = {
      date: new Date().toISOString().split("T")[0], // Just the date part
      totalDiveTime: "00:00:00", // Will be extracted from OCR text if available
      maxDepth: combinedAnalysis.technical?.metrics.maxDepth || 0,
      avgDescentRate: combinedAnalysis.technical?.metrics.avgDescentRate || 0,
      hangCount: combinedAnalysis.technical?.metrics.hangCount || 0,
      safetyRecommendations: combinedAnalysis.vision?.insights || "",
      technicalAnalysis: combinedAnalysis.technical?.analysis || {},
      ocrText: combinedAnalysis.ocr?.text || "",
      location: "Ocean", // Default location
      discipline: "CWT", // Default discipline
      source: "koval-ai-upload"
    };

    let diveLogSave: { success: boolean; recordId?: string } = { success: false };
    try {
      diveLogSave = await saveDiveLogToWix(
        diveLogId,
        nickname,
        diveLogData,
        wixUpload.imageUrl
      );
      console.log(`💾 Dive log save result:`, diveLogSave.success ? "✅ Success" : "❌ Failed");
    } catch (diveLogError: any) {
      console.warn("⚠️ Dive log save failed, but continuing:", diveLogError.message);
    }

    // ✅ STEP 9: Build success response
    const successMessage = `🤖 Complete Analysis Results:
    
📄 OCR: ${extractedText ? "Successfully extracted dive data" : "No text detected"}
${coachingReport ? `📊 Technical: ${coachingReport.substring(0, 100)}...` : ""}
🤖 AI Vision: ${visionAnalysis.substring(0, 200)}${visionAnalysis.length > 200 ? "..." : ""}
📸 Image: Saved to Wix Media collection
💾 Dive Log: Saved to Wix DiveLogs collection`;

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        ...combinedAnalysis,
        analysisRecordId: analysisSave.recordId,
        diveLogRecordId: diveLogSave.recordId,
        extractedText: extractedText, // For backward compatibility
      },
      diveLogId,
      metadata: {
        processingTime: Date.now() - startTime,
        imageUploadSuccess: wixUpload.success,
        analysisRecordSaved: analysisSave.success,
        diveLogRecordSaved: diveLogSave.success,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Upload handler error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "An unexpected error occurred during upload",
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
