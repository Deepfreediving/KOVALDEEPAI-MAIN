# Wix Backend Error Debugging Guide

## Overview

This guide provides comprehensive troubleshooting steps for resolving 500 server errors and deployment issues with your Wix backend functions.

## Immediate Actions Required

### 1. Backend Deployment Status Check

First, verify that your backend functions are properly deployed:

1. **Open Wix Editor** for your site
2. **Go to Dev Mode** (click the `</>` icon)
3. **Navigate to Backend** section
4. **Check if files exist:**
   - `backend/userMemory.jsw`
   - `backend/memberProfile.jsw`
5. **Verify functions are published** (no yellow warning indicators)

### 2. Enable Console Logging in Backend Functions

Add comprehensive logging to your backend functions to diagnose issues:

```javascript
// In userMemory.jsw - Add at the top of each function
import { userMemory } from "@wix/user-memory-backend";

export async function saveUserMemory(key, data, userId) {
  console.log("saveUserMemory called with:", {
    key,
    userId,
    dataLength: JSON.stringify(data).length,
  });

  try {
    const result = await userMemory.set(key, data, { userId });
    console.log("saveUserMemory success:", result);
    return result;
  } catch (error) {
    console.error("saveUserMemory error:", error);
    throw error;
  }
}
```

### 3. Check Wix Site Logs

To view backend logs in Wix:

1. **In Wix Editor > Dev Mode**
2. **Go to Site Monitoring** (or Console panel)
3. **Look for error messages** when functions are called
4. **Check Browser Console** for frontend errors
5. **Use Network Tab** to see exact HTTP responses

## Common 500 Error Causes & Solutions

### Issue 1: App Collections Not Enabled

**Symptoms:** 500 errors when calling userMemory functions
**Solution:**

1. Go to **CMS** in your Wix site
2. Navigate to **App Collections**
3. **Enable "User Memory"** collection
4. Set appropriate permissions (Read/Write for authenticated users)

### Issue 2: Incorrect API Usage

**Check your backend functions use correct APIs:**

```javascript
// ❌ WRONG - Don't use wixData for User Memory
import wixData from "wix-data";

// ✅ CORRECT - Use userMemory API
import { userMemory } from "@wix/user-memory-backend";
```

### Issue 3: Permission Errors

**Verify function permissions in backend:**

```javascript
// Add this to check user authentication
export async function saveUserMemory(key, data, userId) {
  // Check if user is authenticated
  if (!userId) {
    console.error("No userId provided");
    throw new Error("User not authenticated");
  }

  console.log("Authenticated user:", userId);
  // ... rest of function
}
```

### Issue 4: Data Structure Issues

**Ensure data being saved is properly formatted:**

```javascript
// Validate data before saving
export async function saveUserMemory(key, data, userId) {
  try {
    // Ensure data is serializable
    const serializedData = JSON.parse(JSON.stringify(data));
    console.log("Data to save:", serializedData);

    const result = await userMemory.set(key, serializedData, { userId });
    return result;
  } catch (error) {
    console.error("Data serialization error:", error);
    throw error;
  }
}
```

## Step-by-Step Debugging Process

### Step 1: Verify Backend Function Deployment

1. **Re-save and publish backend functions**
2. **Check for syntax errors** in Wix code editor
3. **Ensure all imports are correct**
4. **Publish the site** after making changes

### Step 2: Test Functions Individually

Create a test page in Wix to call functions directly:

```javascript
// Test page code
import { saveUserMemory, getUserMemory } from "backend/userMemory.jsw";

$w.onReady(function () {
  // Test function call
  $w("#testButton").onClick(async () => {
    try {
      console.log("Testing saveUserMemory...");
      const result = await saveUserMemory(
        "test-key",
        { test: "data" },
        "test-user-id"
      );
      console.log("Test successful:", result);
    } catch (error) {
      console.error("Test failed:", error);
    }
  });
});
```

### Step 3: Check Widget Communication

Verify the widget is sending correct data:

```javascript
// In bot-widget.js - Add logging
window.sendMessageToWidget = function (message) {
  console.log("Sending message to widget:", message);

  // Ensure user data is included
  if (window.currentUserData) {
    message.userData = window.currentUserData;
    console.log("User data attached:", window.currentUserData);
  }

  // Send message...
};
```

### Step 4: Frontend Error Handling

Add comprehensive error handling in your frontend API calls:

```javascript
// In save-dive-log.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('API call received:', req.body);

    // Validate required data
    if (!req.body.userId) {
      console.error('Missing userId in request');
      return res.status(400).json({ error: 'User ID required' });
    }

    // Call Wix backend with detailed logging
    const wixResponse = await fetch(`${process.env.WIX_SITE_URL}/_functions/saveUserMemory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'diveLogs',
        data: req.body.diveLogs,
        userId: req.body.userId
      })
    });

    console.log('Wix response status:', wixResponse.status);

    if (!wixResponse.ok) {
      const errorText = await wixResponse.text();
      console.error('Wix backend error:', errorText);
      throw new Error(`Wix backend error: ${errorText}`);
    }

    const result = await wixResponse.json();
    console.log('Wix backend success:', result);

    res.status(200).json({ success: true, result });

  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
```

## Environment-Specific Checks

### Development Environment

- Check that `WIX_SITE_URL` is set correctly in `.env.local`
- Verify the URL points to your Wix site
- Test with preview mode enabled

### Production Environment

- Ensure Wix site is published
- Verify all backend functions are deployed
- Check that App Collections are enabled in live site

## Quick Diagnosis Commands

Use these to quickly identify issues:

### Check Backend Function Availability

```javascript
// In browser console on your Wix site
fetch("https://your-site.wixsite.com/your-site/_functions/saveUserMemory", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ test: true }),
})
  .then((r) => r.text())
  .then(console.log)
  .catch(console.error);
```

### Test User Authentication

```javascript
// In Wix page code
import wixUsers from "wix-users-backend";

console.log("Current user:", wixUsers.currentUser);
```

## Next Steps After Debugging

1. **Fix identified issues** based on console logs
2. **Re-deploy backend functions** if changes were made
3. **Test end-to-end flow** from widget to Wix backend
4. **Verify data appears** in Wix CMS App Collections
5. **Test with real user accounts** (not preview mode)

## Emergency Fallback

If backend issues persist:

1. **Implement client-side only storage** temporarily
2. **Use local storage** for dive logs
3. **Add "sync later" functionality** when backend is fixed
4. **Notify users** of temporary storage limitation

## Contact Points for Support

- **Wix Developer Support:** Use Wix DevCenter support
- **Wix Community Forum:** For development questions
- **Wix Velo Documentation:** For API reference

Remember to always test in both preview and live modes, as some APIs behave differently in each environment.
