import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const WIX_API_KEY = process.env.WIX_API_KEY;
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID;
const WIX_SITE_ID = process.env.WIX_SITE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_HOST = process.env.PINECONE_HOST;
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;

/**
 * ✅ Helper: Safe API calls with proper error handling
 */
async function safeRequest(promise: Promise<any>) {
  try {
    const res = await promise;
    return { success: true, data: res.data };
  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    return { success: false, error: error.message };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { service, action, data } = req.body;

  // ✅ Local dev mode: Mock Wix/Pinecone to prevent CORS errors
  if (process.env.NODE_ENV === 'development' && service !== 'openai') {
    console.log(`⚠️ Mocking response for ${service} in development mode...`);
    return res.status(200).json({ success: true, data: `${service} mock response OK` });
  }

  try {
    switch (service) {
      /**
       * ✅ WIX API
       */
      case 'wix': {
        if (!WIX_API_KEY || !WIX_ACCOUNT_ID || !WIX_SITE_ID) {
          return res.status(400).json({ success: false, error: 'Missing Wix environment variables' });
        }

        const wixClient = axios.create({
          baseURL: 'https://www.wixapis.com',
          headers: {
            Authorization: WIX_API_KEY,
            'wix-account-id': WIX_ACCOUNT_ID,
            'wix-site-id': WIX_SITE_ID,
            'Content-Type': 'application/json',
          },
        });

        if (action === 'check') {
          const response = await safeRequest(
            wixClient.post('/wix-data/v2/items/query', { data: {} })
          );
          return res.status(200).json(response);
        }

        break;
      }

      /**
       * ✅ OPENAI API
       */
      case 'openai': {
        if (!OPENAI_API_KEY) {
          return res.status(400).json({ success: false, error: 'Missing OpenAI API key' });
        }

        const openaiClient = axios.create({
          baseURL: 'https://api.openai.com/v1',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (action === 'check') {
          const response = await safeRequest(
            openaiClient.post('/chat/completions', {
              model: data?.model || 'gpt-4o-mini',
              messages: data?.messages || [{ role: 'user', content: 'ping' }],
              max_tokens: 10,
            })
          );
          return res.status(200).json(response);
        }

        break;
      }

      /**
       * ✅ PINECONE API
       */
      case 'pinecone': {
        if (!PINECONE_API_KEY || !PINECONE_HOST || !PINECONE_INDEX) {
          return res.status(400).json({ success: false, error: 'Missing Pinecone environment variables' });
        }

        const pineconeClient = axios.create({
          baseURL: PINECONE_HOST,
          headers: {
            'Api-Key': PINECONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (action === 'check') {
          // ✅ Attempt to describe the Pinecone index
          const response = await safeRequest(
            pineconeClient.get(`/describe_index_stats`)
          );
          return res.status(200).json(response);
        }

        // Example: query embeddings
        if (action === 'query') {
          const response = await safeRequest(
            pineconeClient.post(`/query`, {
              namespace: data?.namespace || '',
              topK: data?.topK || 5,
              vector: data?.vector || [],
            })
          );
          return res.status(200).json(response);
        }

        break;
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid service specified' });
    }

    return res.status(400).json({ success: false, error: 'Invalid action or service' });
  } catch (error: any) {
    console.error('❌ Handler Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
