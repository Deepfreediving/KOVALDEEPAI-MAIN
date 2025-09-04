# 🚀 Unified Dive Image Upload API - Migration Guide

## Overview

We've consolidated **4 separate image upload endpoints** into **1 powerful unified API** that handles everything:

- ✅ File uploads (multipart/form-data)
- ✅ Base64 uploads (JSON payload)
- ✅ Enhanced Vision Analysis with coaching insights
- ✅ Automatic image optimization
- ✅ Comprehensive error handling

## 🗑️ Removed Endpoints

These endpoints have been **deleted**:

```
❌ /api/openai/upload-dive-image-simple.js
❌ /api/openai/upload-dive-image-base64.js
❌ /api/openai/upload-dive-image-vision.js
❌ /api/ai/vision-extract.js (standalone)
```

## ✅ New Unified Endpoint

**Single endpoint for everything:**

```
✅ /api/dive/upload-image
```

## 📱 Usage Examples

### 1. File Upload (Forms, Desktop)

```javascript
const formData = new FormData();
formData.append("image", imageFile);
formData.append("userId", userId);
formData.append("diveLogId", diveLogId); // optional

const response = await fetch("/api/dive/upload-image", {
  method: "POST",
  body: formData,
});
```

### 2. Base64 Upload (Mobile, Camera)

```javascript
const response = await fetch("/api/dive/upload-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    userId: userId,
    filename: "dive-computer.jpg", // optional
    diveLogId: diveLogId, // optional
  }),
});
```

## 📊 Enhanced Response Format

The new API returns much richer data:

```javascript
{
  "success": true,
  "data": {
    // Basic info
    "imageId": "123",
    "imageUrl": "https://...",
    "confidence": "high",

    // Extracted dive data
    "extractedData": {
      "maxDepth": 30,
      "diveTime": "3:45",
      "diveTimeSeconds": 225,
      "temperature": 18,
      "diveMode": "Free",
      "date": "2024-09-04",
      "batteryStatus": "Good"
    },

    // AI coaching insights
    "coachingInsights": {
      "safetyAssessment": "Good dive with safe ascent rate",
      "depthProgression": "Appropriate for intermediate level",
      "recommendations": [
        "Practice equalizing at 15m",
        "Extend safety stop to 5 minutes"
      ],
      "performanceRating": 8
    },

    // Profile analysis
    "profileAnalysis": {
      "descentPattern": "Smooth controlled descent",
      "ascentPattern": "Safe ascent rate maintained",
      "safetyConcerns": [],
      "profileQuality": "Excellent"
    },

    // Technical info
    "originalSize": 2048576,
    "optimizedSize": 512000,
    "compressionRatio": 75,
    "tokensUsed": 1234,
    "processingMethod": "unified-enhanced-vision-api"
  }
}
```

## 🔄 Migration Checklist

### ✅ Completed Automatically:

- [x] Updated `pages/index.jsx` - API constants
- [x] Updated `components/ChatBox.jsx` - Image upload
- [x] Updated `components/DiveJournalDisplay.jsx` - Image processing
- [x] Updated `utils/apiClient.ts` - Upload utility
- [x] Updated all test files in `public/` directory
- [x] Updated `tests/ENHANCED_DIVE_JOURNAL.jsx`

### 📝 Manual Updates (if needed):

If you have any custom components or external integrations, update them to use:

**Old:** `/api/openai/upload-dive-image-*`  
**New:** `/api/dive/upload-image`

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Test locally (requires dev server running)
npm run test:upload

# Test production
npm run test:upload:prod
```

Or run the test script directly:

```bash
node test-unified-upload.js
```

## 🎯 Benefits

1. **Simplified Architecture** - 1 endpoint instead of 4
2. **Enhanced Analysis** - Professional coaching insights
3. **Better Performance** - Optimized image processing
4. **Improved Maintainability** - Single codebase to maintain
5. **Richer Data** - Structured extraction with safety assessment
6. **Mobile Friendly** - Supports both file and base64 uploads

## 🚨 Breaking Changes

⚠️ **API Response Structure Changed**

The response format is enhanced but maintains backward compatibility for basic fields:

- `imageUrl` ✅ Still available
- `imageId` ✅ Still available
- `extractedText` ✅ Still available (summary format)
- `metrics` ✅ Still available
- **NEW:** `extractedData` - Structured dive data
- **NEW:** `coachingInsights` - AI coaching recommendations
- **NEW:** `profileAnalysis` - Dive profile assessment

## 🔧 Troubleshooting

### Common Issues:

1. **404 Error** - Make sure you're using `/api/dive/upload-image`
2. **Missing Dependencies** - Run `npm install` to ensure all packages are installed
3. **CORS Issues** - The unified API handles both multipart and JSON content types

### Debug Mode:

Check browser console or server logs for detailed processing information.

## 📞 Support

If you encounter any issues with the migration:

1. Check the test results: `npm run test:upload`
2. Review the console logs for detailed error messages
3. Verify the API endpoint path is correct
4. Ensure userId is provided in requests

---

**Migration Complete! 🎉**

Your app now uses a single, powerful, unified image upload API with enhanced AI analysis and coaching insights!
