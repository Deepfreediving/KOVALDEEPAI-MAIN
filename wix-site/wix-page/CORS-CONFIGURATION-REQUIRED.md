# 🔧 CORS Configuration Required for Wix Integration

## 🚨 Updated Error Analysis

Latest console logs show a **CORS preflight failure**:

```
Access to fetch at 'https://kovaldeepai-main.vercel.app/api/system/vercel-handshake'
from origin 'https://www.deepfreediving.com' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

**Root Cause**: The OPTIONS preflight request is failing (returning non-200 status), not just missing headers.

## ✅ Immediate Fix Required

Your `/api/system/vercel-handshake.js` endpoint needs to properly handle OPTIONS requests.

### 🎯 Exact Fix for vercel-handshake.js

Replace the beginning of your handler with this:

```javascript
export default async function handler(req, res) {
  // ✅ CRITICAL: Handle CORS for Wix Domain
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://www.deepfreediving.com"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "false");

  // ✅ CRITICAL: Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight request handled");
    return res.status(200).end();
  }

  // ✅ CRITICAL: Only allow POST requests for handshake
  if (req.method !== "POST") {
    console.log("❌ Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ... rest of your existing handshake logic
}
```

### Option 2: Add Global Middleware (Easier)

Create `/middleware.js` in your project root:

```javascript
import { NextResponse } from "next/server";

export function middleware(request) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    response.headers.set(
      "Access-Control-Allow-Origin",
      "https://www.deepfreediving.com"
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

## 🎯 Expected Result After Fix

Once CORS is configured, you should see:

- ✅ `✅ Vercel handshake successful` instead of CORS errors
- ✅ Session management working properly
- ✅ Buffer flush functionality operational
- ✅ Real-time sync between Wix and Vercel

## 🧪 Test After Implementation

1. Deploy the CORS changes to Vercel
2. Refresh your Wix page
3. Check browser console for:
   - `✅ Vercel handshake successful`
   - `✅ Session management initialized`
   - No CORS error messages

## 📋 Current Status

| Component          | Status          | Notes                     |
| ------------------ | --------------- | ------------------------- |
| Wix Frontend       | ✅ Updated      | Using correct Vercel URL  |
| Session Management | ⚠️ CORS Blocked | Needs backend CORS fix    |
| Offline Mode       | ✅ Working      | Graceful fallback active  |
| Widget Loading     | ✅ Working      | Iframe loads successfully |

---

**Priority**: 🔴 **HIGH** - Required for full V4.0 functionality  
**Impact**: Session management, premium features, real-time sync  
**Fix Time**: ~5 minutes to add CORS headers
