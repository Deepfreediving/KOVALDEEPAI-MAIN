// ===== 📄 middleware.ts - CORS Configuration =====
// Fix CORS issues for Wix integration

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // Allow Wix domains
    const allowedOrigins = [
      "https://www.deepfreediving.com",
      "https://deepfreediving.com",
      "https://editor.wix.com",
      "https://manage.wix.com",
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
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token",
    );
    response.headers.set("Access-Control-Max-Age", "86400");

    // ✅ FIX: Add Cross-Origin Embedder Policy for iframe embedding
    response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

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

    // ✅ FIX: Add Cross-Origin Embedder Policy headers for iframe pages
    response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    // Additional security headers for embedded content
    response.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://*.wix.com https://*.wixsite.com https://www.deepfreediving.com https://deepfreediving.com",
    );

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/embed/:path*", "/embed", "/"],
};
