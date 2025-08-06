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

## 📋 Current URLs

- **Widget**: `https://kovaldeepai-main.vercel.app/bot-widget.js?v=20250806-2`
- **Main App**: `https://kovaldeepai-main.vercel.app`
- **Embed**: `https://kovaldeepai-main.vercel.app/embed`

## 🚨 If Still Not Working

If you're still seeing issues:

1. **Hard Refresh**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. **Clear Browser Cache**: Go to browser settings and clear cache
3. **Incognito Mode**: Test in a private browsing window
4. **Update Script Tag**: Change the version number in the URL (v=20250806-3, etc.)

The cache busting should force Wix to load the latest version every time!
