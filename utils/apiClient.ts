import axios, { AxiosInstance } from 'axios';

// ✅ Log missing environment variables early
console.log('🔎 Checking required environment variables...');

if (!process.env.WIX_API_KEY) console.warn('⚠️ WIX_API_KEY is not set');
if (!process.env.WIX_ACCOUNT_ID) console.warn('⚠️ WIX_ACCOUNT_ID is not set');
if (!process.env.WIX_SITE_ID) console.warn('⚠️ WIX_SITE_ID is not set');
if (!process.env.OPENAI_API_KEY) console.warn('⚠️ OPENAI_API_KEY is not set');
if (!process.env.PINECONE_API_KEY) console.warn('⚠️ PINECONE_API_KEY is not set');
if (!process.env.PINECONE_HOST) console.warn('⚠️ PINECONE_HOST is not set');

// ✅ Wix API Client
const wix: AxiosInstance = axios.create({
  baseURL: 'https://www.wixapis.com',
  headers: {
    Authorization: `Bearer ${process.env.WIX_API_KEY || ''}`,
    'wix-account-id': process.env.WIX_ACCOUNT_ID || '',
    'wix-site-id': process.env.WIX_SITE_ID || '',
    'Content-Type': 'application/json',
  },
});

// ✅ OpenAI API Client
const openai: AxiosInstance = axios.create({
  baseURL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});

// ✅ Pinecone API Client
const pinecone: AxiosInstance = axios.create({
  baseURL: process.env.PINECONE_HOST || 'https://controller.${process.env.PINECONE_ENVIRONMENT}.pinecone.io',
  headers: {
    Authorization: `Bearer ${process.env.PINECONE_API_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});

/**
 * ✅ Checks the status of all API connections and returns their results.
 */
export async function checkAllConnections(): Promise<Record<string, string>> {
  const status: Record<string, string> = {};

  // ✅ Wix API Check
  try {
    await wix.post('/v2/data/items/query', { data: {} });
    status.wix = '✅ OK';
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Unknown error';
    console.warn('⚠️ Wix connection failed:', message);
    status.wix = `❌ Failed: ${message}`;
  }

  // ✅ OpenAI API Check
  try {
    await openai.get('/models');
    status.openai = '✅ OK';
  } catch (err: any) {
    const message = err?.response?.data?.error?.message || err?.message || 'Unknown error';
    console.warn('⚠️ OpenAI connection failed:', message);
    status.openai = `❌ Failed: ${message}`;
  }

  // ✅ Pinecone API Check
  try {
    await pinecone.get('/databases');
    status.pinecone = '✅ OK';
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Unknown error';
    console.warn('⚠️ Pinecone connection failed:', message);
    status.pinecone = `❌ Failed: ${message}`;
  }

  return status;
}

const apiClient = {
  wix,
  openai,
  pinecone,
  checkAllConnections,
};

export default apiClient;
