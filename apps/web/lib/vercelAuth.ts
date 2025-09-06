/**
 * 🔧 VERCEL DEPLOYMENT BEST PRACTICES
 * 
 * Implements Vercel's recommended patterns for deployment protection
 * https://vercel.com/docs/security/deployment-protection
 */

import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Get the correct base URL for server-side requests
 * Following Vercel best practices for Standard Protection
 */
export function getServerRequestUrl(req: NextApiRequest): string {
  // Use the request origin (includes user's auth cookies automatically)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

/**
 * Create headers for server-side requests that bypass deployment protection
 * Following Vercel best practices
 */
export function getServerRequestHeaders(req: NextApiRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'KovalDeepAI-Server/1.0',
  };

  // Forward the user's cookies (includes auth for Standard Protection)
  if (req.headers.cookie) {
    headers.cookie = req.headers.cookie;
  }

  // Use automation bypass if available (for testing/CI)
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  return headers;
}

/**
 * Check if this is an internal server request
 */
export function isInternalServerRequest(req: NextApiRequest): boolean {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';
  
  return (
    userAgent.includes('KovalDeepAI-Server') ||
    userAgent.includes('node') ||
    userAgent.includes('Next.js') ||
    referer.includes(req.headers.host || '') ||
    !userAgent // Internal fetch calls often have no user-agent
  );
}
