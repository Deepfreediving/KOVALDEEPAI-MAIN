import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import handleCors from '@/utils/handleCors';
import { extractDiveText } from '@/utils/extractTextFromImage';
import { analyzeDiveLogText, generateDiveReport } from '@/utils/analyzeDiveLog';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};

const UPLOAD_DIR = path.resolve('./public/uploads');
const LOG_DIR = path.resolve('./data/diveLogs');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ✅ Safe directory initialization
function ensureDirectories() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      console.log('✅ Created uploads directory');
    }
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      console.log('✅ Created logs directory');
    }
  } catch (error) {
    console.error('❌ Failed to create directories:', error);
    throw new Error('Storage initialization failed');
  }
}

// ✅ Validate file with security checks (matching your project's validation style)
function validateFile(file: formidable.File): { isValid: boolean; error?: string } {
  if (!file || !file.originalFilename) {
    return { isValid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
    return { isValid: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }

  // Check for path traversal (security)
  if (file.originalFilename.includes('..') || file.originalFilename.includes('/')) {
    return { isValid: false, error: 'Invalid filename' };
  }

  return { isValid: true };
}

// ✅ Enhanced Wix sync matching your API patterns
async function syncToWix(diveLogId: string, imageUrl: string): Promise<boolean> {
  const WIX_SITE_URL = process.env.WIX_SITE_URL || 'https://www.deepfreediving.com';
  
  try {
    const fullImageUrl = imageUrl.startsWith('/') 
      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://koval-deep-ai.vercel.app'}${imageUrl}`
      : imageUrl;

    console.log(`🔄 Syncing to Wix: ${diveLogId}`);
    
    const response = await axios.post(
      `${WIX_SITE_URL}/_functions/updateDiveLogImage`,
      { 
        diveLogId, 
        imageUrl: fullImageUrl,
        timestamp: new Date().toISOString()
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'KovalAI/1.0'
        },
        timeout: 8000
      }
    );

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Wix sync successful`);
      return true;
    }
    
    throw new Error(`HTTP ${response.status}`);

  } catch (error: any) {
    console.warn(`⚠️ Wix sync failed:`, error.response?.data || error.message);
    return false;
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  try {
    // ✅ CORS handling (matching your other APIs)
    if (await handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests are allowed'
      });
    }

    // ✅ Initialize storage
    ensureDirectories();

    // ✅ Enhanced form parsing with security limits
    const form = formidable({ 
      multiples: false,
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      allowEmptyFiles: false,
      maxFieldsSize: 1024,
      uploadDir: UPLOAD_DIR
    });

    // ✅ Promisified form parsing for better error handling
    const parsePromise = new Promise<{fields: formidable.Fields, files: formidable.Files}>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = await parsePromise;

    // ✅ Extract and validate diveLogId (matching your other APIs)
    let diveLogId: string;
    if (fields.diveLogId) {
      const rawId = Array.isArray(fields.diveLogId) ? fields.diveLogId[0] : fields.diveLogId;
      diveLogId = (rawId as string).trim();
      
      if (!diveLogId || diveLogId.length === 0 || diveLogId.length > 100) {
        return res.status(400).json({ 
          error: 'Invalid dive log ID',
          message: 'Dive log ID must be 1-100 characters'
        });
      }
      
      // Sanitize (allow only alphanumeric, hyphens, underscores)
      if (!/^[a-zA-Z0-9\-_]+$/.test(diveLogId)) {
        return res.status(400).json({ 
          error: 'Invalid dive log ID format',
          message: 'Only letters, numbers, hyphens and underscores allowed'
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'Missing dive log ID',
        message: 'diveLogId field is required'
      });
    }

    // ✅ Extract and validate image file
    let imageFile: formidable.File;
    if (files.image) {
      imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
      
      const validation = validateFile(imageFile);
      if (!validation.isValid) {
        // Cleanup uploaded file
        try {
          if (fs.existsSync(imageFile.filepath)) {
            await fs.promises.unlink(imageFile.filepath);
          }
        } catch {}
        
        return res.status(400).json({ 
          error: 'Invalid file',
          message: validation.error
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'Missing image file',
        message: 'image file is required'
      });
    }

    console.log(`🚀 Processing image upload for dive log: ${diveLogId}`);

    // ✅ Save image with timestamp to avoid conflicts
    const fileExt = path.extname(imageFile.originalFilename || '.jpg');
    const timestamp = Date.now();
    const newFileName = `${diveLogId}-${timestamp}${fileExt}`;
    const savePath = path.join(UPLOAD_DIR, newFileName);

    try {
      await fs.promises.rename(imageFile.filepath, savePath);
      
      // Verify file was saved
      const stats = await fs.promises.stat(savePath);
      if (stats.size === 0) {
        throw new Error('Saved file is empty');
      }
      
      console.log(`✅ Image saved: ${newFileName} (${stats.size} bytes)`);
    } catch (saveError) {
      console.error('❌ Failed to save image:', saveError);
      return res.status(500).json({ 
        error: 'File save failed',
        message: 'Could not save uploaded image'
      });
    }

    const imageUrl = `/uploads/${newFileName}`;

    // ✅ Update local dive log (matching your existing pattern)
    let logUpdated = false;
    try {
      const userFolders = await fs.promises.readdir(LOG_DIR);

      for (const folder of userFolders) {
        const folderPath = path.join(LOG_DIR, folder);
        const stats = await fs.promises.stat(folderPath);
        
        if (stats.isDirectory()) {
          const logFile = path.join(folderPath, `${diveLogId}.json`);
          
          if (fs.existsSync(logFile)) {
            try {
              const logData = JSON.parse(await fs.promises.readFile(logFile, 'utf8'));
              logData.imageUrl = imageUrl;
              logData.imageUpdatedAt = new Date().toISOString();
              
              await fs.promises.writeFile(logFile, JSON.stringify(logData, null, 2));
              console.log(`✅ Updated local dive log: ${logFile}`);
              logUpdated = true;
              break;
            } catch (fileError) {
              console.warn(`⚠️ Failed to update ${logFile}:`, fileError);
            }
          }
        }
      }

      if (!logUpdated) {
        console.warn(`⚠️ No local dive log found for ID: ${diveLogId}`);
      }
    } catch (dirError) {
      console.warn('⚠️ Error scanning dive log directories:', dirError);
    }

    // ✅ Sync to Wix (non-blocking, matching your other API patterns)
    const wixSynced = await syncToWix(diveLogId, imageUrl);

    // 🔍 STEP 1: OCR Text Extraction
    console.log('🔍 Extracting text from dive profile...');
    const extractedText = await extractDiveText(imageFile.filepath);
    console.log('📄 OCR Result:', extractedText);

    // 📊 STEP 2: Technical Analysis
    let analysis = null;
    let coachingReport = '';
    
    if (extractedText && extractedText.trim()) {
      console.log('📊 Analyzing extracted dive data...');
      analysis = analyzeDiveLogText(extractedText);
      coachingReport = generateDiveReport(analysis);
    }

    // 🤖 STEP 3: AI Vision Analysis
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    const base64Image = imageBuffer.toString('base64');

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this freediving depth profile chart. 
              
              OCR extracted: "${extractedText || 'No text detected'}"
              ${coachingReport ? `Technical analysis: ${coachingReport}` : ''}
              
              Please provide insights about:
              1. Descent/ascent curve smoothness
              2. Time spent at various depths
              3. Any concerning patterns
              4. Technical improvement suggestions
              5. Safety observations`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const visionAnalysis = visionResponse.choices[0]?.message?.content || 'No vision analysis available';

    // 🎯 STEP 4: Combined Results
    const combinedAnalysis = {
      ocr: {
        text: extractedText,
        success: !!extractedText?.trim()
      },
      technical: analysis ? {
        analysis,
        coaching: coachingReport,
        metrics: {
          maxDepth: Math.max(...(analysis.depthData || [])) || 0,
          avgDescentRate: analysis.descentRates?.length > 0 
            ? analysis.descentRates.reduce((a, b) => a + b, 0) / analysis.descentRates.length 
            : 0,
          hangCount: analysis.changes?.filter(c => c.warning).length || 0
        }
      } : null,
      vision: {
        insights: visionAnalysis,
        model: 'gpt-4-vision-preview'
      }
    };

    // 💾 STEP 5: Auto-save to memory system (non-blocking)
    const wixUserIdResponse = await axios.get(`${process.env.WIX_SITE_URL || 'https://www.deepfreediving.com'}/_functions/getUserId`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KovalAI/1.0'
      },
      timeout: 8000
    });

    const userId = wixUserIdResponse.data?.userId;

    if (diveLogId && userId) {
      const wixUserIdResponse = await axios.get(`${process.env.WIX_SITE_URL || 'https://www.deepfreediving.com'}/_functions/getUserId`, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KovalAI/1.0'
        },
        timeout: 8000
      });

      const userId = wixUserIdResponse.data?.userId;

      if (!userId) {
        console.warn('⚠️ Failed to retrieve user ID from Wix');
      } else {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analyze/record-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
        log: {
          imageAnalysis: combinedAnalysis,
          diveLogId,
          analysisTimestamp: new Date().toISOString()
        },
        threadId: `user_${userId}_thread`,
        userId: userId
          })
        }).catch(err => console.warn('⚠️ Memory save failed:', err.message));
      }
    }

    // 🧹 Cleanup
    fs.unlinkSync(imageFile.filepath);

    const successMessage = `🤖 Complete Analysis Results:
    
📄 OCR: ${extractedText ? 'Successfully extracted dive data' : 'No text detected'}
${coachingReport ? `📊 Technical: ${coachingReport}` : ''}
🤖 AI Vision: ${visionAnalysis.substring(0, 200)}${visionAnalysis.length > 200 ? '...' : ''}`;

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: combinedAnalysis,
      diveLogId
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Upload handler error:', error);
    
    // ✅ Error response format matching your other APIs
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during upload',
      metadata: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
}
