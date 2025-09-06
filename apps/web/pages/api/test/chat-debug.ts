import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;
    
    // Test the working OpenAI endpoint
    const testResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'https://kovaldeepai-main.vercel.app'}/api/openai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || "What are the 4 rules of direct supervision?",
        userId: "test-user"
      })
    });

    if (!testResponse.ok) {
      throw new Error(`Chat test failed: ${testResponse.status}`);
    }

    const data = await testResponse.json();
    
    return res.status(200).json({
      success: true,
      originalMessage: message || "What are the 4 rules of direct supervision?",
      responseLength: data.assistantMessage?.content?.length || 0,
      fullResponse: data.assistantMessage?.content || "No content",
      metadata: data.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
