import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_HOST, // ✅ MUST be full URL, not just 'us-east-1'
});

export default pc.index('koval-deep-ai');