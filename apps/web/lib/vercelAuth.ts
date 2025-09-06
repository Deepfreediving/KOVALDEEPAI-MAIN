/**
 * 🔧 VERCEL DEPLOYMENT CONFIGURATION 
 * 
 * Handles authentication protection bypass for API endpoints
 * while keeping the main app secure
 */

import { NextApiRequest, NextApiResponse } from 'next';

export function handleVercelAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  // Skip auth for API routes in production to prevent 401 errors
  const isApiRoute = req.url?.startsWith('/api/');
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isApiRoute && isProduction) {
    // Set headers to bypass Vercel authentication for API calls
    res.setHeader('x-vercel-protection-bypass', process.env.VERCEL_PROTECTION_BYPASS || 'api-access');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  return true;
}

export function isInternalRequest(req: NextApiRequest): boolean {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';
  
  // Allow internal requests (server-to-server)
  return (
    userAgent.includes('node') ||
    userAgent.includes('Next.js') ||
    referer.includes('vercel.app') ||
    referer.includes('localhost') ||
    !userAgent // Internal fetch calls often have no user-agent
  );
}
