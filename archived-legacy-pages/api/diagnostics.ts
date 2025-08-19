import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Check environment variables
    const envCheck = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing",
      PINECONE_API_KEY: process.env.PINECONE_API_KEY ? "✅ Set" : "❌ Missing",
      PINECONE_INDEX: process.env.PINECONE_INDEX ? "✅ Set" : "❌ Missing",
      WIX_ACCESS_TOKEN: process.env.WIX_ACCESS_TOKEN ? "✅ Set" : "❌ Missing",
    };

    // ✅ Test OpenAI connection
    let openaiTest = "❌ Failed";
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Use a more accessible model
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10,
        });
        openaiTest = response.choices[0]?.message?.content
          ? "✅ Working"
          : "⚠️ No response";
      } catch (error: any) {
        openaiTest = `❌ Error: ${error.message}`;
      }
    }

    return res.status(200).json({
      status: "API Diagnostics",
      timestamp: new Date().toISOString(),
      environment: envCheck,
      openaiTest,
      deployment: process.env.VERCEL_URL || "Local",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Diagnostics failed",
      message: error.message,
    });
  }
}
