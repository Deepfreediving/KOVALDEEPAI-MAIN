# 🚨 WIX APP HTML ERROR TROUBLESHOOTING GUIDE

## ❌ CURRENT ISSUE

**Error:** `"<html ng-a"... is not valid JSON`

This error means Wix is returning HTML (probably a 404 page) instead of your backend function's JSON response.

---

## 🔍 IMMEDIATE DIAGNOSTIC STEPS

### **Step 1: Add Diagnostic Code**

Copy this code to your Wix App page to debug the issue:

```javascript
$w.onReady(function () {
  // Test all possible endpoint patterns
  testEndpoints();
});

async function testEndpoints() {
  const endpoints = [
    "/chat",
    "/_functions/chat",
    "/http-functions/chat",
    "../backend/chat.jsw",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: "GET" });
      console.log(`${endpoint}: Status ${response.status}`);

      if (response.ok) {
        const text = await response.text();
        console.log(`${endpoint}: ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
}
```

### **Step 2: Check Wix App Structure**

Verify your Wix App has this exact structure:

```
Your Wix App/
├── Public & Backend/
│   └── Backend/
│       ├── chat.jsw          ✅ Must exist
│       ├── test.jsw          ✅ Must exist
│       ├── memberProfile.jsw ✅ Must exist
│       ├── userMemory.jsw    ✅ Must exist
│       └── diveLogs.jsw      ✅ Must exist
└── Pages/
    └── Your Page Code        ✅ Frontend code here
```

---

## 🔧 COMMON CAUSES & SOLUTIONS

### **Cause 1: Backend Functions Not Published**

**Solution:**

1. Open Wix Editor
2. Go to **Backend** section
3. Make sure all `.jsw` files are uploaded
4. Click **Publish** (not just Save)
5. Wait for publish to complete

### **Cause 2: Wrong File Names**

**Current files should be named exactly:**

- `chat.jsw` (not `http-chat.jsw`)
- `test.jsw` (not `http-test.jsw`)
- `memberProfile.jsw` (not `http-memberProfile.jsw`)

### **Cause 3: Wrong Function Names Inside Files**

Each file should export functions like:

```javascript
// In chat.jsw
export async function post_chat(request) { ... }
export async function get_chat(request) { ... }
export function options_chat(request) { ... }
```

### **Cause 4: Wrong Endpoint URLs**

**Try these URL patterns in order:**

1. **Pattern A** (Standard): `/_functions/chat`
2. **Pattern B** (Alternative): `/chat`
3. **Pattern C** (Wix Backend Module): Use `wix-backend` import

---

## 🔄 STEP-BY-STEP FIXING PROCESS

### **Option 1: Standard Wix Functions Pattern**

**Frontend Config:**

```javascript
BACKEND_ENDPOINTS: {
  wix: {
    chat: "/_functions/chat",
    userMemory: "/_functions/userMemory",
    diveLogs: "/_functions/diveLogs",
    userProfile: "/_functions/memberProfile",
    testConnection: "/_functions/test"
  }
}
```

**Backend Files:** Keep current names (`chat.jsw`, `test.jsw`, etc.)

### **Option 2: Wix Backend Module Pattern**

**Frontend Code:**

```javascript
import backend from "wix-backend";

// Instead of fetch, use:
const result = await backend.chat({ message: "Hello", userId: "123" });
const testResult = await backend.test();
```

**Backend Files:** Same names, same functions

### **Option 3: Full URL Pattern**

**Frontend Config:**

```javascript
BACKEND_ENDPOINTS: {
  wix: {
    chat: "https://your-wix-site.com/_functions/chat",
    // ... other endpoints with full URLs
  }
}
```

---

## 🎯 TESTING SEQUENCE

### **Test 1: Simple Backend Function**

Create the simplest possible backend function:

**File: `test.jsw`**

```javascript
import { ok } from "wix-http-functions";

export function get_test(request) {
  return ok({
    message: "Backend is working!",
    timestamp: new Date().toISOString(),
  });
}
```

**Test in console:**

```javascript
fetch("/_functions/test", { method: "GET" })
  .then((r) => r.text())
  .then(console.log);
```

### **Test 2: Check Response Type**

```javascript
fetch("/_functions/test", { method: "GET" })
  .then((response) => {
    console.log("Status:", response.status);
    console.log("Headers:", [...response.headers.entries()]);
    return response.text();
  })
  .then((text) => {
    console.log("Response type:", typeof text);
    console.log("First 200 chars:", text.substring(0, 200));
  });
```

---

## 🚨 IF STILL NOT WORKING

### **Last Resort Options:**

1. **Check Wix App Type:** Make sure you're editing a **Wix App** (not Wix Page)
2. **Try Different Method:** Use Wix Blocks instead of Wix App
3. **Alternative:** Use external API (keep Next.js fallback)
4. **Contact Support:** Wix may have specific requirements for your plan

### **Temporary Workaround:**

Force all calls to use the Next.js backend:

```javascript
BACKEND_ENDPOINTS: {
  wix: {
    // Comment out Wix endpoints temporarily
    // chat: "/_functions/chat",
  },
  nextjs: {
    chat: "https://kovaldeepai-main.vercel.app/api/openai/chat",
    pinecone: "https://kovaldeepai-main.vercel.app/api/pinecone"
  }
}
```

---

## 📋 DEBUGGING CHECKLIST

- [ ] All backend files uploaded to Wix App backend folder
- [ ] Wix App published (not just saved)
- [ ] Function names match: `get_functionName`, `post_functionName`
- [ ] File names match endpoint URLs
- [ ] Test simple function first (`test.jsw`)
- [ ] Check browser console for exact error messages
- [ ] Verify Wix App vs Wix Page (different structures)
- [ ] Try multiple endpoint URL patterns
- [ ] Test with `wix-backend` module import

**Run the diagnostic code above to get detailed debug information!**
