import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  try {
    // Test environment
    const env = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL || 'NOT SET'
    };

    // Test OpenAI basic connectivity
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        max_tokens: 50,
        messages: [{ role: "user", content: "Say hello in one word." }],
      });

      return res.status(200).json({
        status: 'SUCCESS',
        environment: env,
        openaiTest: {
          success: true,
          response: response.choices[0]?.message?.content,
          model: response.model
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(200).json({
        status: 'OPENAI_NOT_CONFIGURED',
        environment: env,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      status: 'ERROR',
      error: error.message,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
}
