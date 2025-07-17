import bcrypt from 'bcrypt';

// Middleware for validating API keys
const API_KEY_HASH = process.env.API_KEY_HASH; // Pre-hashed API key in env

export default async function middleware(req) {
  const apiKey = req.headers.get('x-api-key'); // Get API key from headers

  if (!apiKey || !(await bcrypt.compare(apiKey, API_KEY_HASH))) {
    return new Response('Forbidden', { status: 403 }); // If invalid, return 403 Forbidden
  }

  console.log('API key validated');
  return new Response('Success', { status: 200 });
}

export const config = {
  matcher: ['/api/:path*'], // Apply this middleware to all API routes
};
