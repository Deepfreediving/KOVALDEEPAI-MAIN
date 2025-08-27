// ===== 📄 middleware.ts - CORS Configuration & Security =====
// Fix CORS issues for Wix integration and enhance security

import { NextRequest, NextResponse } from "next/server";

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Security configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window
const BLOCKED_IPS = new Set<string>(); // IPs to block
const SUSPICIOUS_PATTERNS = [
  /sql/i,
  /union/i,
  /select/i,
  /drop/i,
  /delete/i,
  /insert/i,
  /update/i,
  /<script/i,
  /javascript:/i,
  /onload=/i,
  /onerror=/i
];

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.lastReset < windowStart) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(ip) || { count: 0, lastReset: now };
  
  if (current.lastReset < windowStart) {
    current.count = 1;
    current.lastReset = now;
  } else {
    current.count++;
  }
  
  rateLimitMap.set(ip, current);
  
  return current.count <= RATE_LIMIT_MAX_REQUESTS;
}

function detectSuspiciousContent(request: NextRequest): boolean {
  const url = request.url.toLowerCase();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // Check URL for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      return true;
    }
  }
  
  return false;
}

export function middleware(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  // 1. Check if IP is blocked
  if (BLOCKED_IPS.has(clientIP)) {
    return new NextResponse('Access Denied', { status: 403 });
  }
  
  // 2. Rate limiting
  if (!checkRateLimit(clientIP)) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString()
      }
    });
  }
  
  // 3. Detect suspicious content
  if (detectSuspiciousContent(request)) {
    console.warn(`Suspicious request detected from ${clientIP}: ${request.url}`);
    // Log but don't block for now - could be false positive
  }
  
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // Enhanced security headers for API routes
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Allow Wix domains
    const allowedOrigins = [
      "https://www.deepfreediving.com",
      "https://deepfreediving.com",
      "https://editor.wix.com",
      "https://manage.wix.com",
      "http://localhost:3000", // Development
      "https://localhost:3000" // Development HTTPS
    ];

    const origin = request.headers.get("origin");

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-API-Key",
    );
    response.headers.set("Access-Control-Max-Age", "86400");

    // ✅ FIX: Add Cross-Origin Embedder Policy for iframe embedding
    response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    // Add rate limit headers
    const rateLimitData = rateLimitMap.get(clientIP);
    if (rateLimitData) {
      response.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString());
      response.headers.set("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_MAX_REQUESTS - rateLimitData.count).toString());
      response.headers.set("X-RateLimit-Reset", Math.ceil((rateLimitData.lastReset + RATE_LIMIT_WINDOW) / 1000).toString());
    }

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // Handle COEP for all pages (especially /embed)
  if (
    request.nextUrl.pathname.startsWith("/embed") ||
    request.nextUrl.pathname === "/"
  ) {
    const response = NextResponse.next();

    // Enhanced security headers for web pages
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // ✅ FIX: Add Cross-Origin Embedder Policy headers for iframe pages
    response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    // Enhanced Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' blob:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'self' https://*.wix.com https://*.wixsite.com https://www.deepfreediving.com https://deepfreediving.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join("; ");

    response.headers.set("Content-Security-Policy", cspDirectives);

    return response;
  }

  // Add security headers to all other requests
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/embed/:path*", "/embed", "/"],
};
