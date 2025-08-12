# 🚀 WIX DEPLOYMENT STRUCTURE

## 📁 **FINAL CLEAN STRUCTURE**

```
wix-site/
├── wix-page/                          # 🏠 PRIMARY - Your main Wix website page
│   ├── backend/
│   │   ├── http-functions/            # 🔌 HTTP endpoints for your page
│   │   │   ├── http-userMemory.jsw    # ✅ User data & dive logs (DiveLogs collection)
│   │   │   ├── http-chat.jsw          # ✅ AI chat functionality
│   │   │   ├── http-diveLogs.jsw      # ✅ Dive logs management
│   │   │   └── http-getUserProfile.jsw # ✅ User profile management
│   │   └── wix-utils.jsw              # 🛠️ Shared utility functions
│   ├── wix-frontend-page.js           # 🎨 Main page frontend code
│   └── data.js                        # 📊 Page data bindings
│
└── wix-app/                           # 📦 SECONDARY - For Wix App marketplace distribution
    ├── backend/
    │   ├── userMemory.jsw             # 🔄 App version of user memory
    │   ├── chat.jsw                   # 🔄 App version of chat
    │   └── diveLogs.jsw               # 🔄 App version of dive logs
    ├── config/
    │   └── constants.jsw              # ⚙️ App configuration constants
    ├── wix-app-frontend.js            # 🎨 App frontend code
    └── wix-widget-loader.js           # 🔧 Widget loader for app integration
```

## 🎯 **WIX EDITOR DEPLOYMENT GUIDE**

### **FOR YOUR WIX PAGE (Primary Deployment):**

1. **📁 Page Backend Files:**
   - Copy all files from `wix-page/backend/` to your Wix page backend
   - Structure: `Backend → HTTP Functions → [filename].jsw`

2. **🎨 Page Frontend:**
   - Copy `wix-frontend-page.js` content to your page code
   - Copy `data.js` content to your page data bindings

3. **🗃️ Page Collections:**
   - Create collection: `DiveLogs` (page collection, not app)
   - Fields: `userId`, `diveLogId`, `logEntry`, `diveDate`, `diveTime`, `diveLogWatch`, `dataType`

### **FOR WIX APP (If distributing to marketplace):**

1. **📦 App Backend Files:**
   - Copy files from `wix-app/backend/` to your Wix app backend
   - App collections can reference page collections

2. **🎨 App Frontend:**
   - Copy `wix-app-frontend.js` to your app frontend code

## 🔗 **API ENDPOINTS (After Deployment)**

Your page will have these working endpoints:

- `https://www.deepfreediving.com/_functions/userMemory`
- `https://www.deepfreediving.com/_functions/chat`
- `https://www.deepfreediving.com/_functions/diveLogs`
- `https://www.deepfreediving.com/_functions/getUserProfile`

## ✅ **COLLECTION CONFIGURATION**

**Collection Name:** `DiveLogs` (page collection)

**Fields:**

- `userId` (Text) - User identifier
- `diveLogId` (Text) - Unique dive log ID
- `logEntry` (Text) - Compressed JSON data for AI analysis
- `diveDate` (Date) - Date of dive
- `diveTime` (Text) - Time of dive
- `diveLogWatch` (Media) - Dive watch photo (optional)
- `dataType` (Text) - Type: 'dive_log', 'chat_memory', 'user_summary'

## 🧹 **CLEANED UP (REMOVED):**

- ❌ `wix-archive-page-backend/` - Old backup files
- ❌ Test files (`test.jsw`, `test-corrected.jsw`)
- ❌ Documentation files (`docs/`)
- ❌ Duplicate widget loaders
- ❌ Unused configuration files
- ❌ Wrong collection references (fixed to use `DiveLogs`)

## 🔧 **FIXED ISSUES:**

- ✅ All backend functions now use `DiveLogs` collection
- ✅ Removed app collection references from page backend
- ✅ Fixed file structure for proper Wix page deployment
- ✅ Cleaned up duplicate and test files
- ✅ Unified configuration for page vs app

## 🚀 **DEPLOYMENT ORDER:**

1. **Create `DiveLogs` collection** in your Wix page
2. **Deploy page backend functions** from `wix-page/backend/http-functions/`
3. **Update page frontend** with `wix-frontend-page.js`
4. **Test endpoints** - should resolve 404/500 errors
5. **Verify dive log saving and AI analysis**

**Total Files:** 13 essential files (down from 31)
**Structure:** Clean, organized, deployment-ready
