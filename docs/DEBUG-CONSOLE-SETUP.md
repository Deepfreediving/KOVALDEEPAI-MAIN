# 🚀 HOW TO MAKE THE DEBUG CONSOLE WORK

## 📋 STEP-BY-STEP SETUP

### Step 1: Deploy Test Backend to Wix Blocks (REQUIRED FIRST)

1. **Open your Wix Blocks App editor** (as shown in your screenshot)
2. **Go to Backend section** in the left sidebar
3. **Create new backend file**:
   - Click "+ Add" in Backend section
   - Name it `test-health-check.jsw` (NOT userMemory.jsw!)
4. **Copy the test code**:
   - Copy ALL content from `/wix-blocks-test-health-check.jsw`
   - Paste into the new backend file
5. **Save and Publish** your Wix Blocks app

### Step 2: Get Your App URLs

Your Wix app will have endpoints like:

```
https://your-site-name.wixsite.com/_functions/healthCheck
https://your-site-name.wixsite.com/_functions/testUser
https://your-site-name.wixsite.com/_functions/debugAllFunctions
```

### Step 3: Configure Debug Console

1. **Open the debug console**: `wix-backend-debug-console.html` in browser
2. **Enter your base URL** (without the function name):
   ```
   https://your-site-name.wixsite.com/_functions
   ```
3. **Click "🏥 Health Check"** - should return JSON with status "healthy"

## 🔍 TROUBLESHOOTING

### If Health Check Fails:

1. **Check backend deployment**: Is test file published in Wix?
2. **Check URL format**: Should end with `_functions` (no trailing slash)
3. **Check CORS**: Wix should allow cross-origin requests
4. **Check console**: Open browser dev tools for error messages

### URL Examples:

```bash
# Correct format:
https://mysite.wixsite.com/_functions

# Wrong formats:
https://mysite.wixsite.com/_functions/
https://mysite.wixsite.com/
```

## 🧪 ALTERNATIVE: DIRECT TESTING

If debug console doesn't work immediately, test directly in browser:

### Test in Browser Console:

1. **Go to your Wix site** in browser
2. **Open Developer Tools** (F12)
3. **Run in console**:

```javascript
// Test health check
fetch("https://your-site.wixsite.com/_functions/healthCheck")
  .then((r) => r.json())
  .then((data) => console.log("Health:", data))
  .catch((err) => console.error("Error:", err));
```

### Expected Success Response:

```json
{
  "timestamp": "2025-08-10T23:02:00.000Z",
  "status": "healthy",
  "backend": "wix-blocks-app",
  "testUserId": "2ac69a3d-1838-4a13-b118-4712b45d1b41",
  "functions": {
    "healthCheck": "working",
    "wixData": "available",
    "authentication": "available"
  },
  "message": "Backend test functions are working!"
}
```

## ⚠️ IMPORTANT NOTES

1. **Never test with production userMemory.jsw** - only use separate test files
2. **Deploy test backend first** - debug console won't work without it
3. **Check Wix permissions** - app needs data access permissions
4. **Use correct URL format** - must include `_functions` path

## 🎯 NEXT STEPS

1. ✅ Deploy test backend to Wix Blocks app
2. ✅ Get your app URL from Wix dashboard
3. ✅ Test health check endpoint
4. ✅ If working, test main app functionality

Let me know if you need help with any of these steps!
