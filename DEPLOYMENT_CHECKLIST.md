# 🚀 Koval AI Wix Deployment Checklist

## ✅ Files Cleaned Up

### Removed Duplicates:

- ❌ `Wix App/backend/http-memberProfile-v2.jsw` (duplicate)
- ❌ `Wix App/backend/http-wixConnection-v2.jsw` (duplicate)
- ❌ `Wix App/wixConnect.jsw` (old logic, wrong endpoint)

### Final Production Files:

- ✅ `Wix App/backend/http-memberProfile.jsw` (full user profile fetching)
- ✅ `Wix App/backend/http-wixConnection.jsw` (backend health check)
- ✅ `Wix App/backend/http-test.jsw` (minimal test endpoint)
- ✅ `Wix App/config/constants.jsw` (centralized config)
- ✅ `Wix App/wix-app-frontend.js` (updated with correct endpoint)
- ✅ `Wix App/wix-widget-loader.js`
- ⚠️ `Wix App/checkUserAccess.jsw` (optional - only if using access control)

## 🎯 Next Steps

### 1. Upload Backend Files to Wix

Copy these 3 files to your Wix Blocks `backend/` folder (NOT `backend/backend/`):

```
backend/
├── http-memberProfile.jsw
├── http-wixConnection.jsw
└── http-test.jsw
```

### 2. Upload Config Files to Wix

Copy this folder structure:

```
config/
└── constants.jsw
```

### 3. Publish Your Wix Site

- Save all changes in Wix Blocks
- Click "Publish" to deploy the backend functions
- Wait for deployment to complete

### 4. Test Backend Endpoints

After publishing, test these URLs:

```bash
# Test minimal endpoint (should return 200)
curl "https://yoursite.wixsite.com/_functions/test"

# Test backend connection (should return 200)
curl "https://yoursite.wixsite.com/_functions/wixConnection"

# Test member profile (replace USER_ID)
curl "https://yoursite.wixsite.com/_functions/memberProfile?memberId=USER_ID"
```

### 5. Final Widget Test

- Load your Wix page with the embedded widget
- Verify authenticated users see their real nickname/photo (not "Guest User")
- Check browser console for any remaining errors

## 🔧 Expected Endpoints

After deployment, these should all return 200 status:

1. `/_functions/test` - Ultra-minimal test (always works)
2. `/_functions/wixConnection` - Backend health check + database test
3. `/_functions/memberProfile?memberId=ID` - Fetch user profile data

## 🐛 Troubleshooting

### If you get 500 errors:

1. Check that files are in `backend/` not `backend/backend/`
2. Verify the site is published (not just saved)
3. Check Wix Blocks console for any import errors
4. Test the minimal `/_functions/test` endpoint first

### If widget still shows "Guest User":

1. Verify backend endpoints return 200
2. Check browser console for API call failures
3. Verify the parent Wix page is passing user data correctly

## 📁 File Summary

**Essential Backend Files (3):**

- `http-memberProfile.jsw` - Fetches user profile from Members/FullData
- `http-wixConnection.jsw` - Health check + database connectivity test
- `http-test.jsw` - Minimal test endpoint for deployment verification

**Configuration (1):**

- `config/constants.jsw` - Centralized settings (collections, endpoints)

**Optional (1):**

- `checkUserAccess.jsw` - Access control (remove if not needed)

**Frontend Files (2):**

- `wix-app-frontend.js` - Wix page integration
- `wix-widget-loader.js` - Widget loader

## 🎯 Success Criteria

✅ Backend endpoints return 200 (not 500)  
✅ Widget displays real user nickname/photo for authenticated users  
✅ No "Guest User" for logged-in members  
✅ Chat functionality works end-to-end  
✅ No console errors or noisy postMessage logs

---

**Next Action:** Upload the backend files to the correct Wix Blocks `backend/` folder and publish your site.
