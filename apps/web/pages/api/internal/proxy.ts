/**
 * 🔧 SIMPLIFIED VERCEL AUTH BYPASS
 * 
 * Simple solution to bypass Vercel deployment protection for internal API calls
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, method = 'GET', body = null } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Create the full URL for internal API calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://kovaldeepai-main.vercel.app';

    const fullUrl = `${baseUrl}${endpoint}`;

    console.log(`🔄 Proxying request to: ${fullUrl}`);

    // Make the request with proper headers to bypass protection
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'KovalAI-Internal-Proxy',
    };

    // Add bypass secret if available
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch {
      // If response is not JSON, return as text
      jsonData = { response: data, status: response.status };
    }

    return res.status(response.status).json({
      success: response.ok,
      status: response.status,
      data: jsonData,
      originalUrl: fullUrl
    });

  } catch (error) {
    console.error('Proxy request failed:', error);
    return res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
