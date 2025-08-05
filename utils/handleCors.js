// utils/handleCors.js

/**
 * ✅ Simple, synchronous CORS handler
 */
export default function handleCors(req, res) {
  const allowedOrigins = [
    'https://www.deepfreediving.com',
    'https://kovaldeepai-main.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  const origin = req.headers.origin || '';
  const isDev = process.env.NODE_ENV === 'development';

  // ✅ Simple origin check
  const isAllowed = 
    allowedOrigins.includes(origin) ||
    (isDev && origin.includes('localhost')) ||
    (origin.includes('vercel.app') && origin.includes('kovaldeepai'));

  // ✅ Set CORS headers
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (isDev) {
    // ✅ Allow all in development
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // ✅ Safe fallback
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // ✅ Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicates request was handled
  }

  return false; // Continue with normal processing
}

/**
 * ✅ Quick CORS setup for simple cases
 */
export function quickCors(res, allowedOrigin = 'https://www.deepfreediving.com') {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * ✅ Check if origin is allowed
 */
export function isOriginAllowed(origin) {
  if (!origin) return false;
  
  const allowedOrigins = [
    'https://www.deepfreediving.com',
    'https://kovaldeepai-main.vercel.app'
  ];

  const isDev = process.env.NODE_ENV === 'development';

  return allowedOrigins.includes(origin) ||
         (isDev && origin.includes('localhost')) ||
         (origin.includes('vercel.app') && origin.includes('kovaldeepai'));
}
