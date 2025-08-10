# 🚀 DEPLOYMENT INSTRUCTIONS - FIX USER AUTHENTICATION

## 🔥 CRITICAL: Deploy Backend to Wix Editor

The "👤 User • Widget" issue is because the Wix backend functions are NOT deployed. Here's how to fix it:

### Step 1: Deploy userMemory.jsw to Wix

1. **Open Wix Editor** for your site
2. **Go to Backend** (from side panel or Dev Tools)
3. **Create new file**: `userMemory.jsw`
4. **Copy the ENTIRE content** from:
   ```
   /wix-site/wix-app/backend/userMemory.jsw
   ```
5. **Paste into Wix Editor**
6. **SAVE the file**
7. **PUBLISH your site** (this is crucial!)

### Step 2: Deploy memberProfile.jsw to Wix

1. **Create new file**: `memberProfile.jsw`
2. **Copy the ENTIRE content** from:
   ```
   /wix-site/wix-app/backend/memberProfile.jsw
   ```
3. **Paste into Wix Editor**
4. **SAVE the file**
5. **PUBLISH your site**

### Step 3: Update Frontend Code in Wix

1. **Go to your Wix page** with the AI widget
2. **Open Code Editor** for the page
3. **Replace the page code** with content from:
   ```
   /wix-site/wix-app/wix-app-frontend.js
   ```
4. **SAVE and PUBLISH**

### Step 4: Enable Wix App Collections (IMPORTANT!)

According to Wix documentation, you need to:

1. **Go to CMS** in Wix Editor
2. **Click Your Collections**
3. **Click Manage**
4. **Click More Actions**
5. **Select Advanced Settings**
6. **Enable Wix App Collections toggle**
7. **Save settings**

This enables the UserMemory dataset `@deepfreediving/kovaldeepai-app/Import1`

### Step 5: Test the Integration

After deployment, test with:

```bash
node tests/test-wix-usermemory-backend.js
```

You should see:

- ✅ Wix backend response: 200 (not 500)
- ✅ User profile loaded with real nickname
- ✅ Dive logs save to UserMemory dataset
- ✅ Repeater displays dive logs

## 🎯 Expected Results After Deployment:

1. **User Display**: Shows real nickname from Members/FullData (not "User • Widget")
2. **Dive Logs**: Save to Wix UserMemory dataset successfully
3. **Repeater**: Displays dive logs with proper user filtering
4. **AI Analysis**: Works with full user context and dive history

## 🚨 If Still Having Issues:

1. **Check Wix Console**: Look for JavaScript errors
2. **Verify Member Login**: Ensure user is logged into Wix site
3. **Check Dataset Permissions**: Verify UserMemory dataset permissions
4. **Test Backend Functions**: Test functions directly in Wix Editor

The system is production-ready once all backend functions are deployed and published!

## 📞 Troubleshooting Commands:

```bash
# Test backend deployment
node tests/test-wix-usermemory-backend.js

# Test user profile extraction
node tests/test-member-profile.js

# Test full integration
node tests/test-usermemory-dataset-integration.js
```
