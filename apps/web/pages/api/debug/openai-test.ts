/**
 * 🤖 OPENAI CONNECTIVITY TEST
 * 
 * Simple endpoint to test OpenAI API connectivity
 */

import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    openai: {},
    errors: []
  };

  try {
    // Check environment
    if (!process.env.OPENAI_API_KEY) {
      diagnostics.errors.push('OpenAI API key not found');
      diagnostics.openai.status = 'NO_API_KEY';
      return res.status(500).json(diagnostics);
    }

    diagnostics.openai.apiKeyPresent = true;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Simple text completion test
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: "Say 'Hello from Koval Deep AI' in exactly those words."
        }
      ],
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    diagnostics.openai = {
      status: 'SUCCESS',
      model: response.model,
      responseTime: `${duration}ms`,
      usage: response.usage,
      response: response.choices[0]?.message?.content || 'No response',
      apiKeyPresent: true
    };

    diagnostics.summary = {
      openaiWorking: true,
      overallHealth: 'HEALTHY'
    };

    res.status(200).json(diagnostics);

  } catch (error: any) {
    diagnostics.openai = {
      status: 'FAILED',
      error: error.message,
      code: error.code || 'UNKNOWN',
      apiKeyPresent: !!process.env.OPENAI_API_KEY
    };
    
    diagnostics.errors.push(`OpenAI test failed: ${error.message}`);
    
    diagnostics.summary = {
      openaiWorking: false,
      overallHealth: 'UNHEALTHY'
    };

    res.status(500).json(diagnostics);
  }
}
