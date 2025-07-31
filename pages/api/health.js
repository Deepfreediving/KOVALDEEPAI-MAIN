// pages/api/health.js
import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { items } from '@wix/data';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const results = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    wixKeyLoaded: !!process.env.WIX_API_KEY,
    openAiKeyLoaded: !!process.env.OPENAI_API_KEY,
    pineconeKeyLoaded: !!process.env.PINECONE_API_KEY,
    wixApiWorking: false,
    openAiWorking: false,
    pineconeWorking: false
  };

  // --- 1️⃣ Test Wix API ---
  if (results.wixKeyLoaded) {
    try {
      const wixClient = createClient({
        modules: { items },
        auth: ApiKeyStrategy({ apiKey: process.env.WIX_API_KEY }),
      });
      // Query a small known collection (change "userMemory" to your existing one)
      const testQuery = await wixClient.items.queryDataItems({
        dataCollectionId: 'userMemory',
        paging: { limit: 1 }
      }).find();

      results.wixApiWorking = !!testQuery;
    } catch (err) {
      console.error("❌ Wix API test failed:", err.message);
    }
  }

  // --- 2️⃣ Test OpenAI API ---
  if (results.openAiKeyLoaded) {
    try {
      const testResp = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      results.openAiWorking = testResp.ok;
    } catch (err) {
      console.error("❌ OpenAI API test failed:", err.message);
    }
  }

  // --- 3️⃣ Test Pinecone API ---
  if (results.pineconeKeyLoaded) {
    try {
      const testResp = await fetch(`https://controller.${process.env.PINECONE_HOST?.replace('https://', '')}/databases`, {
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY
        }
      });
      results.pineconeWorking = testResp.ok;
    } catch (err) {
      console.error("❌ Pinecone API test failed:", err.message);
    }
  }

  return res.status(200).json({
    status: 'ok',
    message: 'Health check completed',
    checks: results
  });
}
