import axios, { AxiosInstance } from 'axios';

const wix: AxiosInstance = axios.create({
  baseURL: 'https://www.wixapis.com',
  headers: {
    Authorization: `Bearer ${process.env.WIX_API_KEY}`,
    'wix-account-id': process.env.WIX_ACCOUNT_ID || '',
    'wix-site-id': process.env.WIX_SITE_ID || '',
    'Content-Type': 'application/json',
  },
});

const openai: AxiosInstance = axios.create({
  baseURL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

const pinecone: AxiosInstance = axios.create({
  baseURL: process.env.PINECONE_HOST || '',
  headers: {
    Authorization: `Bearer ${process.env.PINECONE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Checks the status of all API connections and returns their status.
 */
export async function checkAllConnections(): Promise<Record<string, string>> {
  const status: Record<string, string> = {};

  // ✅ Wix API Check
  try {
    await wix.post('/v2/data/items/query', { data: {} });
    status.wix = '✅ OK';
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Unknown error';
    console.warn('⚠️ Wix connection failed:', message);
    status.wix = `❌ Failed: ${message}`;
  }

  // ✅ OpenAI API Check
  try {
    await openai.get('/models');
    status.openai = '✅ OK';
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Unknown error';
    console.warn('⚠️ OpenAI connection failed:', message);
    status.openai = `❌ Failed: ${message}`;
  }

  // ✅ Pinecone API Check
  try {
    await pinecone.get('/databases');
    status.pinecone = '✅ OK';
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Unknown error';
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
