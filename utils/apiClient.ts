import axios, { AxiosInstance } from 'axios';

const wix: AxiosInstance = axios.create({
  baseURL: 'https://www.wixapis.com',
  headers: {
    Authorization: `Bearer ${process.env.WIX_API_KEY}`,
    'wix-account-id': process.env.WIX_ACCOUNT_ID,
    'wix-site-id': process.env.WIX_SITE_ID,
    'Content-Type': 'application/json',
  },
});

const openai: AxiosInstance = axios.create({
  baseURL: process.env.OPENAI_API_URL,
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

const pinecone: AxiosInstance = axios.create({
  baseURL: process.env.PINECONE_HOST,
  headers: {
    Authorization: `Bearer ${process.env.PINECONE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Checks the status of all API connections and returns their status as a Record.
 */
export async function checkAllConnections(): Promise<Record<string, string>> {
  const status: Record<string, string> = {};

  try {
    await wix.get('/v2/data/items/query');
    status.wix = '✅ OK';
  } catch {
    status.wix = '❌ Failed';
  }

  try {
    await openai.get('/models');
    status.openai = '✅ OK';
  } catch {
    status.openai = '❌ Failed';
  }

  try {
    await pinecone.get('/databases');
    status.pinecone = '✅ OK';
  } catch {
    status.pinecone = '❌ Failed';
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
