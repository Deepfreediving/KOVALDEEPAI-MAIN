# 🚀 Wix Integration Instructions - Cache Fix

## ⚠️ Wix Caching Issue - SOLVED

The issue you're experiencing is that Wix caches the JavaScript files. Here's how to fix it:

## 🔧 Step 1: Update Your Wix Script Import

In your Wix site, **change the script import** to include a cache-busting parameter:

### OLD (cached):

```html
<script src="https://kovaldeepai-main.vercel.app/bot-widget.js"></script>
```

### NEW (cache-busted):

```html
<script src="https://kovaldeepai-main.vercel.app/bot-widget.js?v=20250806-2"></script>
```

## 🔧 Step 2: Alternative - Force Reload in Wix

If you can't edit the HTML directly, try these methods:

### Method A: Clear Wix Cache

1. Go to your Wix Editor
2. Click "Preview" and then "Refresh"
3. Or try opening in an incognito window

### Method B: Use Dynamic Import

Replace the static script tag with this dynamic import in your Wix code:

```javascript
const timestamp = Date.now();
const script = document.createElement("script");
script.src = `https://kovaldeepai-main.vercel.app/bot-widget.js?v=${timestamp}`;
document.head.appendChild(script);
```

## ✅ Latest Changes Deployed

The latest deployment includes:

- ✅ Fixed AI chat API endpoint (`/api/chat-embed`)
- ✅ Enhanced dive journal UI with tabbed interface
- ✅ Cache busting for iframe content
- ✅ Better error handling
- ✅ Widget version 2.4 with automatic cache busting

## 🧪 Test the Fix

After updating the import URL:

1. **Check the Console**: You should see `"✅ Koval AI Widget v2.4 loaded safely - Cache: [timestamp]"`
2. **Test Chat**: Try sending a message - it should get proper AI responses
3. **Check Dive Journal**: The new tabbed interface should be visible

## � **Widget Frame Details - Based on Console Logs**

From your console output, I can see:

### ✅ **What's Working:**

```
✅ Koval AI Widget v2.4 loaded safely - Cache: 1754507647230
✅ Koval AI iframe loaded with theme: light
📤 Widget sent: USER_AUTH
📤 Widget sent: THEME_CHANGE
```

### 🚨 **What's Failing:**

```
❌ Response not OK: 404 (multiple attempts)
❌ Failed to send initial data to widget
❌ Widget setup failed: TypeError: e.onMessage is not a function
```

### 📋 **Widget Frame URL Being Called:**

Your widget is loading this iframe:

```
https://kovaldeepai-main.vercel.app/embed?theme=light&userId=b8544ec9-4a3e-4ad3-a5cb-20e121031c69&v=[timestamp]
```

## 🔧 **Fixes for Current Issues:**

### **Issue 1: Backend 404 Errors**

The Wix frontend is trying to reach non-existent endpoints:

```
❌ GET https://www.deepfreediving.com/unknown 404 (Not Found)
```

**Fix:** Update your Wix frontend code to use the backup API only:

```javascript
// In your Wix frontend code, replace any backend calls with:
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/chat-embed";

// Remove or comment out Wix backend API calls that return 404
```

### **Issue 2: Widget Communication Error**

```
❌ Widget setup failed: TypeError: e.onMessage is not a function
```

**Fix:** The widget expects a specific message handler. Update your Wix code:

```javascript
// After loading the widget, ensure proper message handling:
const widget = document.querySelector("koval-ai");
if (widget) {
  // Add message listener for widget communication
  window.addEventListener("message", (event) => {
    if (event.data?.type === "userQuery") {
      // Handle chat queries here using the backup API
      handleChatQuery(event.data.query);
    }
  });
}
```

### **Issue 3: User Data Loading Errors**

The console shows problems with user data loading. **Fix:** Simplify user authentication:

```javascript
// In your Wix code, use simpler user detection:
async function getUserData() {
  try {
    const currentUser = await wixUsers.currentUser;
    return {
      userId: currentUser.id || "guest-" + Date.now(),
      userName: currentUser.displayName || "Guest User",
      userEmail: currentUser.loginEmail || "",
      isGuest: !currentUser.loggedIn,
    };
  } catch (error) {
    console.log("Using guest user");
    return {
      userId: "guest-" + Date.now(),
      userName: "Guest User",
      isGuest: true,
    };
  }
}
```

## 📋 Current URLs

- **Widget**: `https://kovaldeepai-main.vercel.app/bot-widget.js?v=20250806-2`
- **Main App**: `https://kovaldeepai-main.vercel.app`
- **Embed**: `https://kovaldeepai-main.vercel.app/embed`
- **Working API**: `https://kovaldeepai-main.vercel.app/api/chat-embed`

## 🚨 If Still Not Working

If you're still seeing issues:

1. **Hard Refresh**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. **Clear Browser Cache**: Go to browser settings and clear cache
3. **Incognito Mode**: Test in a private browsing window
4. **Update Script Tag**: Change the version number in the URL (v=20250806-3, etc.)
5. **Check Network Tab**: Look for any remaining 404 errors in browser dev tools

## 🎯 **Priority Fix**

The main issue is your Wix frontend code is trying to call endpoints that don't exist. Focus on:

1. **Remove all 404-causing API calls** in your Wix code
2. **Use only the backup API**: `https://kovaldeepai-main.vercel.app/api/chat-embed`
3. **Simplify user authentication** to avoid the TypeError

The widget iframe itself is working perfectly - it's the Wix-side code that needs these fixes!

## 🔧 **Wix Blocks Specific Fix**

I can see from your screenshot that you're using Wix Blocks. Here's how to fix it:

### **Step 1: Update the Server URL in Wix Blocks**

In your Wix Blocks interface, change the **Server URL** from:

```
https://kovaldeepai-main.vercel.app/bot-widget.js
```

To (with cache-busting parameter):

```
https://kovaldeepai-main.vercel.app/bot-widget.js?v=20250806-4
```

### **Step 2: Click "Update" Button**

Make sure to click the blue **"Update"** button after changing the URL.

### **🚨 IMPORTANT: If Still Loading Old Version After Update**

If you're still seeing the old light theme app after updating the URL, Wix Blocks has aggressive caching. Try these steps **in order**:

#### **Method 1: Force New Version**

Change the version parameter to a completely new timestamp:

```
https://kovaldeepai-main.vercel.app/bot-widget.js?v=FRESH-20250806-926AM
```

#### **Method 2: Clear Wix Blocks Cache**

1. **Save and Exit** the Wix Blocks editor
2. **Wait 2-3 minutes** for Wix to clear internal cache
3. **Re-open** Wix Blocks editor
4. **Verify** the Server URL still shows the new version
5. **Test** the widget again

#### **Method 3: Browser Hard Reset**

1. **Close all browser tabs** related to Wix
2. **Clear browser cache** completely (Chrome: Settings → Privacy → Clear browsing data)
3. **Open new incognito/private window**
4. **Log back into Wix Blocks**
5. **Check the widget** functionality

#### **Method 4: Widget Recreation** (Last Resort)

If the above doesn't work:

1. **Delete** the current widget element in Wix Blocks
2. **Add a new** Custom Element
3. **Set Server URL** to: `https://kovaldeepai-main.vercel.app/bot-widget.js?v=REBUILD-20250806`
4. **Set Tag name** to: `koval-ai`

### **Step 3: Check for Layers/Overlays**

If the widget still isn't working after updating:

1. **Check Element Layers**: In your Wix editor, make sure no other elements are overlapping the widget
2. **Z-Index Issues**: The widget might be behind other elements
3. **Container Size**: Ensure the widget container has proper dimensions (minimum 600px height)

### **Step 4: Verify the Correct Embed URL**

After updating, the widget should load this iframe:

```
https://kovaldeepai-main.vercel.app/embed?theme=light&userId=[user-id]&v=[timestamp]
```

### **Step 5: Test in Different Modes**

- **Preview Mode**: Test the widget in Wix preview
- **Published Site**: Test on your live site
- **Different Browsers**: Try Chrome, Firefox, Safari

### **Common Wix Blocks Issues & Solutions:**

#### **Issue A: Widget Not Visible**

- **Cause**: Element might be behind other layers
- **Fix**: In Wix editor, right-click the widget → "Arrange" → "Bring to Front"

#### **Issue B: Widget Shows But Doesn't Respond**

- **Cause**: Script URL is cached or incorrect
- **Fix**: Update Server URL with new version parameter: `?v=20250806-4`

#### **Issue C: Console Errors Still Appear**

- **Cause**: Old cached JavaScript still running
- **Fix**:
  1. Clear browser cache completely
  2. Try incognito/private browsing mode
  3. Update version parameter again

#### **Issue D: Widget Container Too Small**

- **Cause**: Default container might be too small
- **Fix**: In Wix editor, resize the widget element to at least 400px wide × 600px tall

### **Testing Checklist:**

✅ Updated Server URL with cache parameter  
✅ Clicked "Update" button in Wix Blocks  
✅ Widget is on top layer (not behind other elements)  
✅ Widget container is large enough (400×600 minimum)  
✅ Tested in preview mode  
✅ Checked browser console for new timestamp  
✅ Tested actual chat functionality
