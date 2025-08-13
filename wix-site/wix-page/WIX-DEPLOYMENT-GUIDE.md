# 🚀 WIX DEPLOYMENT GUIDE - KOVAL AI V4.0

## 📋 Pre-Deployment Checklist

### ✅ Required Configuration Updates

Before deploying the master file to Wix, update these configuration values:

1. **Vercel URL Configuration:**

```javascript
const SESSION_CONFIG = {
  VERCEL_URL: "https://your-actual-domain.vercel.app", // ⚠️ CHANGE THIS
  // ... rest remains the same
};
```

2. **Widget ID Configuration:**
   Update the widget discovery array if needed:

```javascript
var widgetIds = [
  "#koval-ai", // Primary widget ID
  "#KovalAiWidget", // Alternative IDs
  "#kovalAIWidget",
  "#KovalAIWidget",
  "#htmlComponent1", // Fallback IDs
  "#html1",
];
```

### 📂 Files to Deploy

**ONLY DEPLOY THIS FILE:**

- `wix-frontend-page-simplified.js` ⭐ **MASTER FILE**

**DO NOT USE:**

- Any files in the `deprecated/` folder
- Any other `wix-frontend-page-*.js` variants

## 🛠️ Deployment Steps

### Step 1: Copy Master File

1. Open `/wix-site/wix-page/wix-frontend-page-simplified.js`
2. Update the `SESSION_CONFIG.VERCEL_URL` with your actual domain
3. Copy the entire file content

### Step 2: Deploy to Wix Editor

1. Open your Wix site in the Wix Editor
2. Navigate to the page containing the Koval AI widget
3. Select the page and go to the **Code Panel** (Developer Tools)
4. Replace all existing page code with the master file content
5. Save the changes

### Step 3: Test in Preview

1. Click **Preview** in Wix Editor
2. Open browser console (F12)
3. Verify these success messages:
   - `✅ Widget found, initializing session management...`
   - `✅ Session management initialized`
   - `✅ Vercel handshake successful` (if online)
   - `🎉 Widget is ready, sending user data`

### Step 4: Publish

1. If preview testing is successful, click **Publish**
2. Test the live site with browser console open
3. Monitor for any errors or connection issues

## 🔍 Testing Scenarios

### Online Mode (Full Functionality)

- ✅ Vercel handshake completes
- ✅ Session management active
- ✅ Real-time data sync
- ✅ Session upgrades work
- ✅ Premium features accessible

### Offline Mode (Graceful Degradation)

- ✅ Widget loads without errors
- ✅ Basic functionality available
- ✅ Data buffered for later sync
- ✅ Local Wix collection saves
- ✅ Automatic retry when connection restored

### Mixed Mode (Connection Issues)

- ✅ Automatic fallback to buffering
- ✅ Connection retry mechanisms
- ✅ Buffer flush on reconnection
- ✅ No data loss

## 📊 Console Log Messages

### Success Indicators:

```
🚀 Koval AI Widget V4.0 initialization starting...
✅ Widget found, initializing session management...
👤 User data prepared: { userId: "user_123...", ... }
🤝 Performing Vercel handshake...
✅ Handshake response: { success: true, ... }
✅ Session management initialized
🎉 Widget is ready, sending user data
```

### Warning Indicators (Still Functional):

```
⚠️ Vercel handshake failed, working in offline mode
📦 No Vercel connection, buffering dive log...
ℹ️ Wix collection save failed, data logged locally
```

### Error Indicators (Need Investigation):

```
❌ No AI widget found
❌ Session initialization failed
❌ Widget initialization error
```

## 🔧 Troubleshooting

### Widget Not Found

- Check widget ID in Wix Editor
- Add correct ID to the `widgetIds` array
- Ensure widget is HTML component type

### Vercel Connection Issues

- Verify `SESSION_CONFIG.VERCEL_URL` is correct
- Check Vercel deployment status
- Confirm API endpoints are accessible

### Performance Issues

- Monitor console for slow query warnings
- Check browser network tab for failed requests
- Verify Wix Data collection setup

## 🏗️ Architecture Features Deployed

✅ **Session Management**

- Vercel handshake validation
- Session persistence across page loads
- Guest and member user support

✅ **Offline Resilience**

- Automatic data buffering
- Connection retry mechanisms
- Graceful degradation

✅ **Error Handling**

- Comprehensive logging
- Fallback mechanisms
- Never-break functionality

✅ **Data Flow**

- Parent-child component architecture
- Clean callback prop patterns
- Unified localStorage usage

---

**Deployment Version:** V4.0 Master  
**File:** `wix-frontend-page-simplified.js`  
**Status:** Production Ready ✅

**Last Updated:** Latest Session Management Architecture
