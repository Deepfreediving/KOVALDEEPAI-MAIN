import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🧪 Simple chat test started');
    
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // Test OpenAI directly without any internal API calls
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: "You are Koval AI, a freediving coach. Respond briefly and helpfully."
        },
        { role: "user", content: message }
      ],
    });

    const reply = response.choices[0]?.message?.content || "I'm here to help with your freediving training!";

    return res.status(200).json({
      assistantMessage: { role: "assistant", content: reply },
      metadata: {
        test: true,
        model: response.model,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Simple chat test error:', error);
    return res.status(500).json({ 
      error: "Test failed", 
      details: error.message 
    });
  }
}
