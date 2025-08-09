# Koval AI - Complete Deployment Guide

## 🎯 PROJECT STATUS: READY FOR DEPLOYMENT

All files have been consolidated, modernized, and tested. No syntax errors remain. This guide provides step-by-step instructions for deploying to both Wix App and Wix Page environments.

## 📁 MASTER FILES STRUCTURE

### Wix App Backend (Upload to Wix App > Public & Backend > Backend)

```
/Wix App/backend/
├── chat.jsw              # OpenAI chat integration
├── diveLogs.jsw          # Dive log management
├── memberProfile.jsw     # User profile management
├── userMemory.jsw        # User memory storage
├── wixConnection.jsw     # Wix API utilities
├── config.jsw            # Configuration constants
└── test.jsw              # Backend testing utilities
```

### Wix App Frontend

```
/Wix App/
├── wix-app-frontend.js   # Main Wix App page code
└── wix-widget-loader.js  # Widget loader for Wix App
```

### Wix Page (For Next.js/standalone deployment)

```
/wix page/
├── wix-frontend-page.js     # Main Wix Page code
├── dataset-integration.js   # Dataset helper functions
└── WIX_PAGE_CODE_BULLETPROOF.js  # Direct copy-paste version
```

### Public Files (For embedding)

```
/public/
├── bot-widget.js         # Standalone widget
├── koval-ai.html         # Standalone HTML page
└── sync-dive-logs.html   # Sync utility page
```

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Wix App Deployment

#### Step 1: Upload Backend Files

1. Go to your Wix App dashboard
2. Navigate to **Public & Backend > Backend**
3. Upload all `.jsw` files from `/Wix App/backend/`
4. Ensure files are named exactly as shown (no `http-` prefix)

#### Step 2: Configure Frontend

1. Copy contents of `/Wix App/wix-app-frontend.js`
2. Paste into your Wix App page code editor
3. Update the configuration section if needed:

```javascript
const CONFIG = {
  BACKEND_ENDPOINTS: {
    chat: "/_functions/chat",
    diveLogs: "/_functions/diveLogs",
    memberProfile: "/_functions/memberProfile",
    userMemory: "/_functions/userMemory",
    test: "/_functions/test",
  },
  // ... other config
};
```

#### Step 3: Add Widget (Optional)

1. Copy contents of `/Wix App/wix-widget-loader.js`
2. Add to your page as a Custom Element or HTML Component
3. Configure widget placement and styling

#### Step 4: Test Deployment

1. Publish your Wix App
2. Test all endpoints using the built-in diagnostic tools
3. Check browser console for any errors

### Option 2: Wix Page Deployment

#### Step 1: Set Up Next.js Backend

1. Ensure `/pages/api/semanticSearch.js` is in place
2. Deploy your Next.js app to Vercel/Netlify/your hosting
3. Update API endpoints in the frontend

#### Step 2: Configure Frontend for Wix Page

1. Copy contents of `/wix page/WIX_PAGE_CODE_BULLETPROOF.js`
2. Paste directly into Wix Page code editor
3. Update configuration:

```javascript
const CONFIG = {
  BACKEND_ENDPOINTS: {
    chat: "/api/chat", // Next.js endpoints
    diveLogs: "/api/diveLogs",
    memberProfile: "/api/memberProfile",
    userMemory: "/api/userMemory",
  },
  // ... other config
};
```

#### Step 3: Set Up Datasets (If Using)

1. Copy `/wix page/dataset-integration.js` functionality
2. Configure UserMemory dataset in Wix
3. Set up proper permissions and filtering

## 🔧 CONFIGURATION

### Environment Variables (For Next.js)

```bash
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index
WIX_API_KEY=your_wix_api_key (if needed)
```

### Backend Configuration

All backend files use the master configuration from `config.jsw`:

```javascript
export const CONFIG = {
  OPENAI_API_KEY: "your-api-key",
  PINECONE_CONFIG: {
    apiKey: "your-pinecone-key",
    indexName: "your-index-name",
  },
  DEFAULT_SETTINGS: {
    maxTokens: 1000,
    temperature: 0.7,
  },
};
```

## ✅ VERIFICATION CHECKLIST

### Pre-Deployment

- [ ] All `.jsw` files uploaded to Wix App backend
- [ ] Frontend code pasted into page editor
- [ ] Configuration updated with correct endpoints
- [ ] Environment variables set (for Next.js)
- [ ] OpenAI API key configured

### Post-Deployment Testing

- [ ] Chat functionality works
- [ ] User authentication working
- [ ] Dive logs save/load correctly
- [ ] Member profile data loads
- [ ] No console errors
- [ ] All endpoints return JSON (not HTML)

### Troubleshooting Tools

Use the built-in diagnostic functions:

```javascript
// Test backend connectivity
testBackendEndpoint("chat");
testBackendEndpoint("memberProfile");

// Test user authentication
console.log("Current user:", await getCurrentUser());

// Test API calls
const response = await callBackendEndpoint("test", "GET");
console.log("Backend test:", response);
```

## 🛠 MAINTENANCE

### Adding New Features

1. Add backend function to appropriate `.jsw` file
2. Update frontend configuration with new endpoint
3. Test thoroughly before deployment

### Updating Configuration

1. Modify `config.jsw` for backend changes
2. Update frontend CONFIG object for UI changes
3. Redeploy and test

### Monitoring

- Check Wix App logs for backend errors
- Monitor browser console for frontend errors
- Use diagnostic tools for endpoint testing

## 📞 SUPPORT

### Common Issues

1. **HTML instead of JSON responses**: Check endpoint URLs and backend file names
2. **Authentication errors**: Verify user login status and permissions
3. **CORS issues**: Ensure proper domain configuration
4. **OpenAI errors**: Check API key and quota limits

### Diagnostic Commands

```javascript
// Frontend diagnostics
window.diagnostics.testAllEndpoints();
window.diagnostics.checkUserAuth();
window.diagnostics.validateConfig();

// Backend diagnostics
import { runDiagnostics } from "backend/test";
runDiagnostics();
```

## 🎉 CONCLUSION

Your Koval AI system is now fully consolidated, modernized, and ready for deployment. All version logic has been removed, files follow Wix best practices, and comprehensive error handling is in place.

Choose your deployment option (Wix App or Wix Page) and follow the relevant steps above. The system is designed to work seamlessly in both environments with proper configuration.

Happy diving! 🤿
