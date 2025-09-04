// Enhanced Vision API for dive computer image analysis
import OpenAI from 'openai';
import { getAdminClient } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, imageBase64, userId } = req.body;
    
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: 'Either imageUrl or imageBase64 is required' });
    }

    console.log('🔍 Starting enhanced dive computer vision analysis...');

    // Prepare the image for OpenAI Vision
    const imageInput = imageUrl || `data:image/jpeg;base64,${imageBase64}`;

    // Enhanced prompt for dive computer analysis
    const analysisPrompt = `You are an expert freediving computer analyst. Analyze this dive computer display image and extract ALL visible data in a structured format.

EXTRACT THE FOLLOWING DATA:
1. Max Depth (in meters)
2. Dive Time (in minutes:seconds format)
3. Temperature (at max depth)
4. Date and Time of dive
5. Dive Mode (Free, Apnea, etc.)
6. Surface interval time
7. Any safety warnings or alerts
8. Battery status if visible
9. Any other numeric readings

ANALYZE THE DIVE PROFILE:
- Describe the descent/ascent pattern
- Note any safety concerns from the profile
- Identify if there are any rapid ascents
- Comment on bottom time if visible

PROVIDE COACHING INSIGHTS:
- Assess dive safety based on visible data
- Comment on depth progression appropriateness
- Note any concerning patterns
- Suggest improvements if applicable

Return your response as valid JSON with this structure:
{
  "extractedData": {
    "maxDepth": number,
    "diveTime": "MM:SS",
    "diveTimeSeconds": number,
    "temperature": number,
    "date": "YYYY-MM-DD",
    "time": "HH:MM:SS",
    "diveMode": "string",
    "surfaceInterval": "HH:MM",
    "batteryStatus": "string",
    "additionalReadings": {}
  },
  "profileAnalysis": {
    "descentPattern": "string",
    "ascentPattern": "string",
    "bottomTime": "string",
    "safetyConcerns": ["string"],
    "profileQuality": "string"
  },
  "coachingInsights": {
    "safetyAssessment": "string",
    "depthProgression": "string",
    "recommendations": ["string"],
    "overallPerformance": "string"
  },
  "confidence": "high|medium|low"
}`;

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Updated model name
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: {
                url: imageInput,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1 // Low temperature for accurate data extraction
    });

    const analysisText = response.choices[0].message.content;
    console.log('🤖 Raw Vision API response:', analysisText);

    // Try to parse as JSON, fallback to text if it fails
    let structuredData;
    try {
      structuredData = JSON.parse(analysisText);
    } catch (parseError) {
      console.log('📝 Response is not JSON, using text analysis');
      structuredData = {
        extractedData: {},
        profileAnalysis: { safetyConcerns: [] },
        coachingInsights: { recommendations: [] },
        rawAnalysis: analysisText,
        confidence: "medium"
      };
    }

    // Save analysis to database if userId provided
    if (userId) {
      try {
        const supabase = getAdminClient();
        
        // Store the vision analysis
        await supabase
          .from('user_profiles')
          .update({
            ai_insights: {
              latest_vision_analysis: structuredData,
              analyzed_at: new Date().toISOString()
            }
          })
          .eq('user_id', userId);
          
        console.log('✅ Vision analysis saved to user profile');
      } catch (dbError) {
        console.error('⚠️ Failed to save analysis to database:', dbError);
      }
    }

    return res.status(200).json({
      success: true,
      analysis: structuredData,
      processingTime: response.usage?.total_tokens ? `${response.usage.total_tokens} tokens` : 'unknown',
      model: 'gpt-4o',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Vision API error:', error);
    return res.status(500).json({
      error: 'Failed to analyze dive computer image',
      details: error.message
    });
  }
}
