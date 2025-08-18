// Simple image upload and text extraction for dive logs
import formidable from 'formidable';
import OpenAI from 'openai';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 Starting image upload and analysis...');

    // Parse the multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [, files] = await form.parse(req);
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(imageFile.mimetype)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` 
      });
    }

    console.log('📝 Image file details:', {
      name: imageFile.originalFilename,
      type: imageFile.mimetype,
      size: imageFile.size
    });

    // Read the image file
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    const base64Image = imageBuffer.toString('base64');

    console.log('🤖 Analyzing image with OpenAI Vision...');

    // Use OpenAI Vision to extract text and analyze the dive profile
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this dive computer profile image. Extract all readable text and data, including:
- Dive time/duration
- Maximum depth
- Temperature readings
- Any numerical data visible
- Surface intervals
- Dive profile information

Also describe what you see in the dive profile graph/chart. Return the extracted text and analysis in a clear format.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageFile.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const analysis = response.choices[0].message.content;
    
    console.log('✅ OpenAI Vision analysis complete');

    // Clean up temp file
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp file:', cleanupError);
    }

    const result = {
      success: true,
      data: {
        extractedText: analysis,
        imageAnalysis: analysis,
        fileName: imageFile.originalFilename,
        fileSize: imageFile.size,
        mimeType: imageFile.mimetype,
        processedAt: new Date().toISOString()
      },
      message: 'Image analyzed successfully'
    };

    console.log('📊 Image analysis result ready');
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Image upload/analysis error:', error);
    return res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
}
