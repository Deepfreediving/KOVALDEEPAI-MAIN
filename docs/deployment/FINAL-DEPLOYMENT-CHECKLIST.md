# Final Deployment Checklist

## Pre-Deployment Verification ✅

### 1. Code Validation

- [ ] All backend functions use correct APIs (`userMemory` not `wixData`)
- [ ] Function naming conflicts resolved (`saveUserMemory` wrapper)
- [ ] Frontend imports updated to match backend function names
- [ ] Error handling implemented in all API endpoints
- [ ] Console logging added for debugging

### 2. Environment Configuration

- [ ] `.env.local` contains correct `WIX_SITE_URL`
- [ ] All sensitive variables properly configured
- [ ] Next.js build passes without errors
- [ ] TypeScript compilation successful

## Wix Backend Deployment 🚀

### Step 1: Upload Backend Functions

1. **Open Wix Editor** for your site
2. **Enable Dev Mode** (click `</>` icon)
3. **Go to Backend** section
4. **Upload/Update Files:**
   - `backend/userMemory.jsw`
   - `backend/memberProfile.jsw`
5. **Save all files**
6. **Publish the site**

### Step 2: Enable App Collections

1. **Go to CMS** in Wix dashboard
2. **Navigate to App Collections**
3. **Enable "User Memory" collection**
4. **Set permissions:** Read/Write for authenticated users
5. **Save settings**

### Step 3: Update Frontend Code

1. **Go to Pages** in Wix Editor
2. **Edit the page** containing your widget
3. **Update page code** to match `wix-frontend-page.js`
4. **Ensure user data extraction** is properly implemented
5. **Save and publish page**

## Widget Deployment 📱

### Step 1: Update Widget Files

1. **Upload `bot-widget.js`** to Wix Media Manager or external hosting
2. **Update widget URL** in page code if needed
3. **Ensure widget loads** on your Wix page

### Step 2: Test Widget Integration

1. **Open site in preview mode**
2. **Check widget loads** without errors
3. **Verify user data** is passed to widget
4. **Test chat functionality**

## Next.js App Deployment 🔧

### Step 1: Build and Deploy

```bash
# Build the application
npm run build

# Deploy to your hosting platform (Vercel, Netlify, etc.)
npm run deploy
```

### Step 2: Environment Variables

Set these in your hosting platform:

- `WIX_SITE_URL`: Your published Wix site URL
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_*`: Your Pinecone configuration

## Post-Deployment Testing 🧪

### 1. Basic Functionality Test

- [ ] Widget loads on Wix site
- [ ] Chat interface appears
- [ ] User authentication works
- [ ] Messages send successfully

### 2. Dive Log Testing

- [ ] Dive log form appears in sidebar
- [ ] Logs can be saved
- [ ] Logs appear in sidebar list
- [ ] Click-to-analyze works
- [ ] AI analysis returns results

### 3. Backend Integration Test

- [ ] Logs save to Wix UserMemory
- [ ] Logs appear in Wix CMS
- [ ] User profile data loads correctly
- [ ] No 500 errors in console

### 4. User Experience Test

- [ ] User nickname displays correctly (not "User • Widget")
- [ ] Profile image loads if available
- [ ] Authentication flow works smoothly
- [ ] No console errors

## Troubleshooting Quick Checks 🔍

### If Widget Doesn't Load:

1. Check browser console for errors
2. Verify widget URL is accessible
3. Check CORS settings
4. Ensure page code is correct

### If 500 Errors Occur:

1. Check Wix site logs in Dev Mode
2. Verify backend functions are published
3. Check App Collections are enabled
4. Review function syntax for errors

### If User Data Missing:

1. Verify user is logged into Wix
2. Check page code extracts user data
3. Ensure widget receives user data
4. Test with different user accounts

### If Logs Don't Save:

1. Check UserMemory API calls
2. Verify user permissions
3. Check data format being sent
4. Review backend function logs

## Success Criteria ✨

Your deployment is successful when:

1. **Widget loads** on Wix site without errors
2. **User authentication** works and displays proper nickname
3. **Dive logs save** to both local storage and Wix backend
4. **AI analysis** provides feedback on dive logs
5. **No console errors** during normal operation
6. **Data syncs** between widget and Wix CMS

## Emergency Rollback Plan 🚨

If critical issues occur:

1. **Disable widget** on Wix page temporarily
2. **Revert to previous backend** function versions
3. **Use local storage only** mode in widget
4. **Notify users** of temporary maintenance

## Support Resources 📚

- **Project Documentation:** `/docs/` folder
- **Test Scripts:** `/tests/` folder
- **Error Debugging:** `WIX-ERROR-DEBUGGING.md`
- **API Documentation:** Code comments in `/pages/api/`

## Final Notes 📝

- **Test thoroughly** in preview mode before going live
- **Monitor logs** for the first few hours after deployment
- **Have rollback plan** ready in case of issues
- **Document any issues** encountered for future reference

---

**Last Updated:** December 2024  
**Status:** Ready for deployment after following this checklist
