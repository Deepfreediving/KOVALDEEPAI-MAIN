import handleCors from '@/utils/handleCors';

/**
 * ✅ Simple, synchronous CORS handler
 */
export async function handler(req, res) {
  if (handleCors(req, res)) return;
  
  try {
    // Test simple query
    const response = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/pinecone/queryDocuments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'freediving safety',
        topK: 3
      })
    });

    const result = await response.json();
    
    return res.status(200).json({
      success: response.ok,
      pineconeStatus: response.ok ? 'connected' : 'failed',
      data: result
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      pineconeStatus: 'error',
      error: error.message
    });
  }
}

/**
 * ✅ Simple, synchronous CORS handler
 */
function handleCors(req, res) {
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
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
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

// ✅ Quick CORS setup for simple cases
function quickCors(res, allowedOrigin = 'https://www.deepfreediving.com') {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ✅ Check if origin is allowed
function isOriginAllowed(origin) {
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

// ✅ Single export section
export default handleCors;
export { quickCors, isOriginAllowed };
