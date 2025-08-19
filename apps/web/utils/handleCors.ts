import { NextApiRequest, NextApiResponse } from "next";

/**
 * Handle CORS for API routes
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @returns true if it's an OPTIONS request (should exit early), false otherwise
 */
export default function handleCors(req: NextApiRequest, res: NextApiResponse): boolean {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Exit early for OPTIONS
  }

  return false; // Continue processing
}
