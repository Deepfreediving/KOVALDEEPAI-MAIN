// ===== 📄 middleware.ts - Enhanced Next.js Middleware =====
// Following Next.js best practices for middleware, CORS, and security

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Create response that can be modified
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Handle authentication for protected routes
  if (request.nextUrl.pathname.startsWith('/dive-logs') || 
      request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/admin')) {
    
    // Create Supabase client for middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is updated, update the cookies for the request and response
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the cookies for the request and response
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Allow Wix domains and development
    const allowedOrigins = [
      "https://www.deepfreediving.com",
      "https://deepfreediving.com",
      "https://editor.wix.com",
      "https://manage.wix.com",
      "http://localhost:3000", // Development
      "http://127.0.0.1:3000", // Development
    ];

    const origin = request.headers.get("origin");

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Cookie",
    );
    response.headers.set("Access-Control-Max-Age", "86400");

    // Security headers for API routes
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Cross-Origin headers for iframe embedding
    response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // Handle headers for embedded content and iframe pages
  if (
    request.nextUrl.pathname.startsWith("/embed") ||
    request.nextUrl.pathname === "/"
  ) {
    // Cross-Origin headers for iframe embedding
    response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    // Content Security Policy for embedded content
    response.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://*.wix.com https://*.wixsite.com https://www.deepfreediving.com https://deepfreediving.com",
    );

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*", 
    "/embed/:path*", 
    "/embed", 
    "/",
    "/dive-logs/:path*",
    "/dashboard/:path*", 
    "/admin/:path*"
  ],
};
