import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import handleCors from '@/utils/cors';

// ✅ Environment variables with validation
const WIX_API_KEY = process.env.WIX_API_KEY;
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID;
const WIX_SITE_ID = process.env.WIX_SITE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Input validation helper
function validateInput(service: string, action: string, data: any): { isValid: boolean; error?: string } {
  if (!service || typeof service !== 'string') {
    return { isValid: false, error: 'Service name is required' };
  }
  
  if (!action || typeof action !== 'string') {
    return { isValid: false, error: 'Action is required' };
  }
  
  // Service-specific validations
  if (service === 'wix' && action === 'queryData') {
    if (!data?.collectionId || typeof data.collectionId !== 'string') {
      return { isValid: false, error: 'Collection ID is required for Wix queries' };
    }
  }
  
  if (service === 'openai' && action === 'chat') {
    if (!data?.messages || !Array.isArray(data.messages)) {
      return { isValid: false, error: 'Messages array is required for OpenAI chat' };
    }
  }
  
  return { isValid: true };
}

// ✅ Safe API request wrapper with better error handling
async function safeRequest(promise: Promise<any>, serviceName: string) {
  try {
    const res = await promise;
    return { success: true, data: res.data };
  } catch (error: any) {
    console.error(`❌ ${serviceName} API Error:`, error.response?.data || error.message);
    
    // ✅ Better error categorization
    let errorMessage = 'API request failed';
    let statusCode = 500;
    
    if (error.response?.status === 401) {
      errorMessage = 'Authentication failed';
      statusCode = 401;
    } else if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded';
      statusCode = 429;
    } else if (error.response?.status === 400) {
      errorMessage = 'Invalid request data';
      statusCode = 400;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      statusCode,
      details: error.response?.data?.message || error.message
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  try {
    // ✅ CORS handling (matching your other APIs)
    if (await handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        error: 'Method Not Allowed',
        message: 'Only POST requests are allowed'
      });
    }

    const { service, action, data } = req.body;

    // ✅ Input validation
    const validation = validateInput(service, action, data);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation Error',
        message: validation.error
      });
    }

    // ✅ Development mode with better logging
    if (process.env.NODE_ENV === 'development' && service !== 'openai') {
      console.log(`⚠️ Development mode: Mocking ${service}/${action}`);
      return res.status(200).json({ 
        success: true, 
        data: { message: `${service} mock response OK`, action, timestamp: new Date().toISOString() },
        metadata: { mock: true, processingTime: Date.now() - startTime }
      });
    }

    console.log(`🚀 Processing ${service}/${action} request`);

    switch (service) {
      /**
       * ✅ WIX API - Enhanced with better auth handling
       */
      case 'wix': {
        // Token priority: dynamic token > static API key
        const authToken = data?.token 
          ? `Bearer ${data.token}`
          : WIX_API_KEY;

        if (!authToken) {
          return res.status(401).json({ 
            success: false, 
            error: 'Authentication Required',
            message: 'Missing Wix API token or API key'
          });
        }

        if (!WIX_ACCOUNT_ID || !WIX_SITE_ID) {
          return res.status(500).json({ 
            success: false, 
            error: 'Configuration Error',
            message: 'Wix account/site configuration missing'
          });
        }

        const wixClient = axios.create({
          baseURL: 'https://www.wixapis.com',
          headers: {
            Authorization: authToken,
            'wix-account-id': WIX_ACCOUNT_ID,
            'wix-site-id': WIX_SITE_ID,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        });

        if (action === 'check') {
          const response = await safeRequest(
            wixClient.get('/wix-data/v2/collections'),
            'Wix'
          );
          
          if (!response.success) {
            return res.status(response.statusCode || 500).json(response);
          }
          
          return res.status(200).json({
            success: true,
            data: { status: 'connected', collections: response.data?.collections?.length || 0 },
            metadata: { processingTime: Date.now() - startTime }
          });
        }

        if (action === 'queryData') {
          const response = await safeRequest(
            wixClient.post('/wix-data/v2/items/query', {
              collectionId: data.collectionId,
              query: data.query || {},
            }),
            'Wix'
          );
          
          if (!response.success) {
            return res.status(response.statusCode || 500).json(response);
          }
          
          return res.status(200).json({
            success: true,
            data: response.data,
            metadata: { 
              collectionId: data.collectionId,
              processingTime: Date.now() - startTime 
            }
          });
        }

        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Action',
          message: `Action '${action}' not supported for Wix service`
        });
      }

      /**
       * ✅ OPENAI API - Enhanced with model validation
       */
      case 'openai': {
        if (!OPENAI_API_KEY) {
          return res.status(500).json({ 
            success: false, 
            error: 'Configuration Error',
            message: 'OpenAI API key not configured'
          });
        }

        const openaiClient = axios.create({
          baseURL: 'https://api.openai.com/v1',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000
        });

        if (action === 'check') {
          const response = await safeRequest(
            openaiClient.post('/chat/completions', {
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5,
            }),
            'OpenAI'
          );
          
          if (!response.success) {
            return res.status(response.statusCode || 500).json(response);
          }
          
          return res.status(200).json({
            success: true,
            data: { status: 'connected', model: 'gpt-4o-mini' },
            metadata: { processingTime: Date.now() - startTime }
          });
        }

        if (action === 'chat') {
          const response = await safeRequest(
            openaiClient.post('/chat/completions', {
              model: data?.model || 'gpt-4o-mini',
              messages: data.messages,
              max_tokens: data?.maxTokens || 150,
              temperature: data?.temperature || 0.7,
            }),
            'OpenAI'
          );
          
          if (!response.success) {
            return res.status(response.statusCode || 500).json(response);
          }
          
          return res.status(200).json({
            success: true,
            data: response.data,
            metadata: { 
              model: data?.model || 'gpt-4o-mini',
              processingTime: Date.now() - startTime 
            }
          });
        }

        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Action',
          message: `Action '${action}' not supported for OpenAI service`
        });
      }

      /**
       * ✅ PINECONE - Redirects to your existing APIs
       */
      case 'pinecone': {
        return res.status(400).json({ 
          success: false, 
          error: 'Service Deprecated',
          message: 'Use /api/pinecone or /api/semanticSearch instead'
        });
      }

      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Service',
          message: `Service '${service}' is not supported. Available: wix, openai`
        });
    }

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ API Handler Error:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
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
    responseLimit: false
  }
};
