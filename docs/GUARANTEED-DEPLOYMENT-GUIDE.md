# 🚀 KOVAL AI - GUARANTEED DEPLOYMENT GUIDE

## 🎯 GOAL: Get the widget visible on your live site in 5 minutes

### 📋 QUICK CHECKLIST

- [ ] HTML element exists in Wix editor
- [ ] Code deployed and published
- [ ] Page refreshed
- [ ] Widget visible and interactive

---

## 🔧 STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Widget Element in Wix Editor

1. Open your Wix page in the editor
2. **Add an HTML element** (if not already present)
3. **Set the element ID to**: `koval-ai`
   - Click the element → Settings → ID → Enter: `koval-ai`
4. **Make sure element is visible** (not hidden)
5. **Set appropriate size** (recommend: width 100%, height 600px minimum)

### Step 2: Deploy the Code

**Choose ONE of these options:**

#### 🥇 OPTION A: Full Featured Version (Recommended)

Copy the entire content from: `/wix-site/wix-page/wix-frontend-page-simplified.js`

#### 🥈 OPTION B: Minimal Guaranteed Version (If issues)

Copy the entire content from: `/wix-site/wix-page/wix-minimal-guaranteed.js`

**Deploy Steps:**

1. Go to Wix Editor → Code Section (</> icon)
2. **Delete all existing code** related to Koval AI
3. **Paste the new code** (from Option A or B above)
4. **Save the code**
5. **Publish the page**

### Step 3: Verify Deployment

1. Wait 2-3 minutes for changes to propagate
2. Open the live page: https://www.deepfreediving.com/large-koval-deep-ai-page
3. **Hard refresh** the page (Ctrl+F5 or Cmd+Shift+R)
4. **Open browser console** (F12 → Console tab)
5. Look for these success messages:
   ```
   ✅ Found widget element: #koval-ai
   ✅ WIDGET CREATED SUCCESSFULLY!
   🎉 Koval AI should now be visible on your page
   ```

### Step 4: Troubleshoot (if needed)

If widget still not visible, run in browser console:

```javascript
checkWidget();
```

This will show exactly what's wrong.

---

## 🚨 EMERGENCY FALLBACK

If nothing works, add this **minimal code** to your Wix page:

```javascript
$w.onReady(function () {
  var widget = $w("#koval-ai");
  if (widget) {
    widget.html =
      '<iframe src="https://kovaldeepai-main.vercel.app/embed" style="width:100%;height:600px;border:none;"></iframe>';
    console.log("✅ Emergency widget loaded");
  }
});
```

---

## ✅ SUCCESS INDICATORS

**Widget is working when you see:**

- 🖼️ Koval AI chat interface visible on page
- 💬 Can type messages and get responses
- 🔄 "Loading" or "Initializing" messages briefly appear
- 📱 Interface is responsive and interactive

**In browser console:**

- ✅ Widget creation success messages
- 🚀 Initialization logs
- No ❌ error messages

---

## 🔍 DIAGNOSTIC TOOLS

### Browser Console Commands:

- `checkWidget()` - Check widget status
- `runDiagnostic()` - Full diagnostic (if diagnostic script loaded)
- `testCORSConnection()` - Test backend connectivity

### Files for Reference:

- **Main Code**: `/wix-site/wix-page/wix-frontend-page-simplified.js`
- **Minimal Code**: `/wix-site/wix-page/wix-minimal-guaranteed.js`
- **Diagnostic**: `/wix-site/debug/wix-widget-diagnostic.js`
- **This Guide**: `/docs/WIDGET-DIAGNOSTIC-REPORT.md`

---

## 🆘 IF STILL NOT WORKING

**Share this information:**

1. **Browser console output** from the live page
2. **Wix element ID** you're using (if not `koval-ai`)
3. **Which code version** you deployed (Option A or B)
4. **Any error messages** you see

**Quick Test Links:**

- ✅ Backend: https://kovaldeepai-main.vercel.app
- ✅ Embed: https://kovaldeepai-main.vercel.app/embed
- ✅ Your page: https://www.deepfreediving.com/large-koval-deep-ai-page

The widget **will work** - it's just a matter of getting the configuration right! 🎯

---

_Last updated: ${new Date().toISOString()}_
