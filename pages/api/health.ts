import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasPineconeKey: Boolean(process.env.PINECONE_API_KEY),
      pineconeIndex: process.env.PINECONE_INDEX || 'not set',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    endpoints: {
      chatEmbed: '/api/chat-embed',
      pineconeQuery: '/api/pinecone/pineconequery-gpt',
    }
  };

  return res.status(200).json(healthCheck);
}
