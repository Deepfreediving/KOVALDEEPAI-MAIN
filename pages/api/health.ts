import type { NextApiRequest, NextApiResponse } from 'next';
import handleCors from '@/utils/handleCors';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;

  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasPineconeKey: Boolean(process.env.PINECONE_API_KEY),
      hasWixKey: Boolean(process.env.WIX_API_KEY),
      pineconeIndex: process.env.PINECONE_INDEX || 'not set',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    endpoints: {
      // ✅ Updated for enhanced bridge APIs
      chatBridge: '/api/wix/chat-bridge',
      diveLogsBridge: '/api/wix/dive-logs-bridge', 
      userProfileBridge: '/api/wix/user-profile-bridge',
      chatDirect: '/api/openai/chat',
      pineconeQuery: '/api/pinecone/pineconequery-gpt',
      healthCheck: '/api/system/health-check',
    },
    version: 'v5.0-divelogs-fix',
    features: {
      wixIntegration: true,
      bridgeAPIs: true,
      diveLogsContext: true,
      userProfiles: true,
      embeddedMode: true
    }
  };

  return res.status(200).json(healthCheck);
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false
  }
};
