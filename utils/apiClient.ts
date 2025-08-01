import axios from 'axios';

export interface Status {
  wix: string;
  openai: string;
  pinecone: string;
}

/**
 * ✅ Generic API request to your server-side handler
 */
async function sendRequest(service: string, action: string, data: any = {}): Promise<any> {
  try {
    const response = await axios.post('/api/apiHandler', {
      service,
      action,
      data,
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ ${service} request failed:`, error.message);
    return null;
  }
}

/**
 * ✅ Check all connections (Wix, OpenAI, Pinecone)
 */
export async function checkAllConnections(): Promise<Status> {
  const status: Status = {
    wix: '⏳ Checking...',
    openai: '⏳ Checking...',
    pinecone: '⏳ Checking...',
  };

  // Test each service through your secured backend handler
  const [wixRes, openaiRes, pineconeRes] = await Promise.all([
    sendRequest('wix', 'check', { test: true }),
    sendRequest('openai', 'check', { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }] }),
    sendRequest('pinecone', 'check', {}),
  ]);

  status.wix = wixRes?.success ? '✅ OK' : '⚠️ Failed';
  status.openai = openaiRes?.success ? '✅ OK' : '⚠️ Failed';
  status.pinecone = pineconeRes?.success ? '✅ OK' : '⚠️ Failed';

  return status;
}

const apiClient = {
  sendRequest,
  checkAllConnections,
};

export default apiClient;
