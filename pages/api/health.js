import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@wix/data';
import OpenAI from 'openai';

export default async function handler(req, res) {
  const checks = {
    wixApiWorking: false,
    pineconeWorking: false,
    openAiWorking: false,
  };

  // OpenAI Check
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();
    checks.openAiWorking = true;
  } catch (e) {
    console.error("❌ OpenAI check failed:", e.message);
  }

  // Pinecone Check
  try {
    const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = client.Index(process.env.PINECONE_INDEX);
    await index.describeIndexStats();
    checks.pineconeWorking = true;
  } catch (e) {
    console.error("❌ Pinecone check failed:", e.message);
  }

  // Wix Check
  try {
    const wixClient = createClient({ auth: { apiKey: process.env.WIX_API_KEY } });
    const result = await wixClient.items.queryDataItems({ dataCollectionId: 'userMemory' }).find();
    if (result.items) checks.wixApiWorking = true;
  } catch (e) {
    console.error("❌ Wix API check failed:", e.message);
  }

  return res.status(200).json({
    status: "ok",
    message: "Health check completed",
    checks
  });
}
