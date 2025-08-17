# 🔥 WIX INTEGRATION INSTRUCTIONS - CRITICAL

## ⚠️ IMPORTANT: Choose ONE Integration Method Only

**You are currently running BOTH methods which causes conflicts and the "em initialization" error.**

### 🎯 RECOMMENDED: Use New Iframe Method (Current)

1. **In your Wix page code**, use ONLY the `wix-frontend-CLEAN.js` content
2. **Remove/disable** any `bot-widget.js` script from the Wix HTML component
3. **Remove** any `<koval-ai></koval-ai>` custom elements

Your current wix-frontend-CLEAN.js is correct and working.

### 🚫 Do NOT use both methods together

❌ **Don't do this:**
```html
<!-- DON'T have both -->
<script src="https://kovaldeepai-main.vercel.app/bot-widget.js"></script>
<koval-ai></koval-ai>
<!-- AND wix-frontend-CLEAN.js -->
```

✅ **Do this instead:**
```javascript
// ONLY use wix-frontend-CLEAN.js content in your Wix page code
// (the content you already have is correct)
```

### 🔧 Current Error Fix Applied

1. ✅ Removed all debug/hotfix scripts from Next.js that were interfering with React
2. ✅ Fixed invalid `X-Frame-Options: ALLOWALL` headers (not a valid value)
3. ✅ Kept CSP `frame-ancestors` for proper iframe embedding

### 🚀 Next Steps

1. **Deploy the updated app** (fixes applied)
2. **In Wix**, ensure you're only using the iframe method (wix-frontend-CLEAN.js)
3. **Remove bot-widget.js** from Wix HTML components
4. **Test**: The iframe should load without the "em initialization" error

### 🐛 If Still Getting Errors

1. Check browser console for any remaining `bot-widget.js` references
2. Clear Wix cache/publish again
3. Test standalone embed URL: `https://kovaldeepai-main.vercel.app/embed`
4. If standalone works but iframe doesn't, check Wix sandbox permissions

### 📞 Debug Commands

In browser console on Wix page:
```javascript
// Check what's loaded
window.runDiagnostics && window.runDiagnostics();

// Check for conflicts
console.log('Bot widget loaded:', !!window.KovalAILoaded);
console.log('Frontend script loaded:', !!window.KOVAL_WIDGET_INITIALIZED);
```

**Both should not be true at the same time.**
