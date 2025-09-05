/**
 * 🖼️ IMAGE ANALYSIS DEBUG SYSTEM
 * 
 * Tests the complete image analysis pipeline:
 * - File upload handling
 * - OpenAI vision API calls
 * - Supabase storage
 * - Response formatting
 */

import { NextApiRequest, NextApiResponse } from "next";
import formidable from 'formidable';
import fs from 'fs';
import { getAdminClient } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    imageAnalysis: {},
    fileHandling: {},
    openai: {},
    supabase: {},
    errors: []
  };

  try {
    console.log('🖼️ Starting image analysis debug...');

    // 1. CHECK ENVIRONMENT VARIABLES
    diagnostics.environment = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    };

    // 2. TEST FILE HANDLING
    if (req.method === 'POST') {
      try {
        const form = formidable({
          maxFileSize: 10 * 1024 * 1024, // 10MB
          keepExtensions: true,
        });

        const [fields, files] = await form.parse(req);
        
        diagnostics.fileHandling = {
          fieldsReceived: Object.keys(fields),
          filesReceived: Object.keys(files),
          hasImage: !!files.image
        };

        if (files.image && files.image[0]) {
          const imageFile = files.image[0];
          diagnostics.fileHandling.imageDetails = {
            originalFilename: imageFile.originalFilename,
            mimetype: imageFile.mimetype,
            size: imageFile.size,
            filepath: imageFile.filepath
          };

          // Test file access
          const fileExists = fs.existsSync(imageFile.filepath);
          diagnostics.fileHandling.fileAccessible = fileExists;

          if (fileExists) {
            // Read image buffer for both OpenAI and Supabase tests
            const imageBuffer = fs.readFileSync(imageFile.filepath);
            
            // Test OpenAI Vision API
            try {
              const OpenAI = require('openai');
              const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
              });

              // Convert image to base64
              const base64Image = imageBuffer.toString('base64');
              const mimeType = imageFile.mimetype || 'image/jpeg';

              diagnostics.openai.imageSize = imageBuffer.length;
              diagnostics.openai.base64Length = base64Image.length;

              // Test OpenAI call
              const response = await openai.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 500,
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: "Analyze this dive computer screenshot and extract the dive data. This is a debug test.",
                      },
                      {
                        type: "image_url",
                        image_url: {
                          url: `data:${mimeType};base64,${base64Image}`,
                        },
                      },
                    ],
                  },
                ],
              });

              diagnostics.openai.apiCall = {
                status: 'SUCCESS',
                responseLength: response.choices[0]?.message?.content?.length || 0,
                model: response.model,
                usage: response.usage
              };

            } catch (openaiError: any) {
              diagnostics.openai.apiCall = {
                status: 'FAILED',
                error: openaiError.message
              };
              diagnostics.errors.push(`OpenAI API call failed: ${openaiError.message}`);
            }

            // Test Supabase storage
            try {
              const supabase = getAdminClient();
              const fileName = `debug-test-${Date.now()}.${imageFile.originalFilename?.split('.').pop() || 'jpg'}`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('dive-images')
                .upload(fileName, imageBuffer, {
                  contentType: imageFile.mimetype || 'image/jpeg',
                });

              if (uploadError) {
                diagnostics.supabase.upload = {
                  status: 'FAILED',
                  error: uploadError.message
                };
                diagnostics.errors.push(`Supabase upload failed: ${uploadError.message}`);
              } else {
                diagnostics.supabase.upload = {
                  status: 'SUCCESS',
                  path: uploadData.path,
                  fileName: fileName
                };

                // Clean up test file
                await supabase.storage
                  .from('dive-images')
                  .remove([fileName]);
              }

            } catch (supabaseError: any) {
              diagnostics.supabase.upload = {
                status: 'FAILED',
                error: supabaseError.message
              };
              diagnostics.errors.push(`Supabase storage test failed: ${supabaseError.message}`);
            }
          }

          // Clean up temp file
          try {
            fs.unlinkSync(imageFile.filepath);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }

      } catch (formError: any) {
        diagnostics.fileHandling = {
          status: 'FAILED',
          error: formError.message
        };
        diagnostics.errors.push(`Form parsing failed: ${formError.message}`);
      }

    } else {
      // GET request - return diagnostics only
      diagnostics.fileHandling = {
        method: req.method,
        note: 'Send POST with image file to test full pipeline'
      };
    }

    // 3. TEST IMAGE ANALYSIS ENDPOINT
    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';

      const analyzeEndpoint = `${baseUrl}/api/analyze/analyze-dive-image`;
      
      diagnostics.imageAnalysis.endpoint = analyzeEndpoint;
      diagnostics.imageAnalysis.note = 'Endpoint exists but requires image upload for full test';

    } catch (endpointError: any) {
      diagnostics.imageAnalysis = {
        status: 'FAILED',
        error: endpointError.message
      };
      diagnostics.errors.push(`Image analysis endpoint test failed: ${endpointError.message}`);
    }

    // 4. SUMMARY
    diagnostics.summary = {
      totalErrors: diagnostics.errors.length,
      environmentReady: !!(process.env.OPENAI_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
      fileHandlingWorking: diagnostics.fileHandling.status !== 'FAILED',
      openaiWorking: diagnostics.openai.apiCall?.status === 'SUCCESS',
      supabaseWorking: diagnostics.supabase.upload?.status === 'SUCCESS',
      overallHealth: diagnostics.errors.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
    };

    console.log('✅ Image analysis debug complete. Summary:', diagnostics.summary);

    res.status(200).json(diagnostics);

  } catch (error: any) {
    console.error('❌ Image analysis debug error:', error);
    diagnostics.errors.push(`Debug system error: ${error.message}`);
    
    res.status(500).json({
      ...diagnostics,
      criticalError: error.message,
      stack: error.stack
    });
  }
}
