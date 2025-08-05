import handleCors from "@/utils/cors";
import { queryData } from "./pineconeInit"; // ✅ Fixed - use local file
import handleCorsOptions from '@/utils/handleCors'; // ✅ ADD if not present

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // ✅ ADD CORS handling
    await handleCors(req, res);
    
    if (req.method === 'OPTIONS') return;

    if (req.method !== "POST") {
      return res.status(405).json({ 
        success: false, 
        error: "Method Not Allowed",
        message: "Only POST requests are allowed"
      });
    }

    const { queryVector, topK = 5, filter } = req.body;

    // ✅ Enhanced validation
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Query vector is required and must be a non-empty array"
      });
    }

    if (topK < 1 || topK > 100) {
      return res.status(400).json({ 
        success: false, 
        error: "topK must be between 1 and 100"
      });
    }

    console.log(`🔍 Querying Pinecone with topK=${topK}`);

    // ✅ Use your existing pineconeInit function
    const options = { topK };
    if (filter) options.filter = filter;
    
    const response = await queryData(queryVector, options);
    const matches = response.matches || [];

    const processingTime = Date.now() - startTime;
    console.log(`✅ Query completed in ${processingTime}ms, found ${matches.length} matches`);

    return res.status(200).json({ 
      success: true, 
      matches,
      metadata: {
        processingTime,
        matchCount: matches.length,
        topK,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Error querying Pinecone:", error.message);
    
    // ✅ Better error categorization
    let statusCode = 500;
    let errorMessage = "Failed to query documents";

    if (error.message?.includes('Authentication') || error.message?.includes('API key')) {
      statusCode = 401;
      errorMessage = "Authentication failed";
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: false,
    timeout: 30000
  }
};
