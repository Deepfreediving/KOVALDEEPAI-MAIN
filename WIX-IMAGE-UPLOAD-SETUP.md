# Wix Backend Functions for Dive Image Analysis

## Overview
This document describes the Wix backend functions needed to support dive image upload and analysis using Wix collections instead of Vercel's filesystem.

## Required Wix Collections

### 1. DiveImages Collection
**Purpose**: Store uploaded dive profile images
**Fields**:
- `_id` (Auto-generated)
- `diveLogId` (Text) - Links to dive log
- `userId` (Text) - User who uploaded
- `imageUrl` (Media) - Stored image URL
- `filename` (Text) - Original filename
- `mimetype` (Text) - Image MIME type
- `uploadedAt` (Date) - Upload timestamp
- `metadata` (JSON) - Additional metadata

### 2. DiveAnalysis Collection
**Purpose**: Store AI analysis results
**Fields**:
- `_id` (Auto-generated)
- `diveLogId` (Text) - Links to dive log
- `userId` (Text) - User who owns the analysis
- `imageUrl` (Text) - Reference to analyzed image
- `ocrText` (Rich Text) - Extracted text from OCR
- `ocrSuccess` (Boolean) - OCR extraction success
- `technicalAnalysis` (JSON) - Technical dive analysis
- `visionInsights` (Rich Text) - AI vision analysis
- `visionModel` (Text) - AI model used
- `analysisTimestamp` (Date) - Analysis completion time
- `metadata` (JSON) - Processing metadata

## Required Wix Backend Functions

### 1. uploadDiveImage.js
**Endpoint**: `/_functions/uploadDiveImage`
**Purpose**: Upload and store dive images in Wix Media

```javascript
import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';

export async function post_uploadDiveImage(request) {
  try {
    const { diveLogId, userId, imageData, filename, mimetype, metadata } = await request.body.json();
    
    if (!diveLogId || !userId || !imageData) {
      return badRequest({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');
    
    // Upload to Wix Media
    const uploadResult = await mediaManager.upload(
      `/dive-images/${filename}`,
      buffer,
      {
        "mediaOptions": {
          "mimeType": mimetype,
          "mediaType": "image"
        }
      }
    );

    // Save record to DiveImages collection
    const imageRecord = await wixData.save('DiveImages', {
      diveLogId,
      userId,
      imageUrl: uploadResult.fileUrl,
      filename,
      mimetype,
      uploadedAt: new Date(),
      metadata: metadata || {}
    });

    return ok({
      success: true,
      imageUrl: uploadResult.fileUrl,
      mediaId: imageRecord._id,
      fileId: uploadResult.fileId
    });

  } catch (error) {
    console.error('Upload error:', error);
    return serverError({ error: 'Upload failed', details: error.message });
  }
}
```

### 2. saveDiveAnalysis.js
**Endpoint**: `/_functions/saveDiveAnalysis`
**Purpose**: Save AI analysis results to DiveAnalysis collection

```javascript
import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

export async function post_saveDiveAnalysis(request) {
  try {
    const {
      diveLogId,
      userId,
      imageUrl,
      ocrText,
      ocrSuccess,
      technicalAnalysis,
      visionInsights,
      visionModel,
      analysisTimestamp,
      metadata
    } = await request.body.json();
    
    if (!diveLogId || !userId) {
      return badRequest({ error: 'Missing required fields' });
    }

    // Save analysis record
    const analysisRecord = await wixData.save('DiveAnalysis', {
      diveLogId,
      userId,
      imageUrl: imageUrl || '',
      ocrText: ocrText || '',
      ocrSuccess: ocrSuccess || false,
      technicalAnalysis: technicalAnalysis || null,
      visionInsights: visionInsights || '',
      visionModel: visionModel || 'gpt-4-vision-preview',
      analysisTimestamp: new Date(analysisTimestamp) || new Date(),
      metadata: metadata || {}
    });

    return ok({
      success: true,
      recordId: analysisRecord._id,
      analysisId: analysisRecord._id
    });

  } catch (error) {
    console.error('Analysis save error:', error);
    return serverError({ error: 'Analysis save failed', details: error.message });
  }
}
```

### 3. getDiveAnalysis.js
**Endpoint**: `/_functions/getDiveAnalysis`
**Purpose**: Retrieve analysis results for a dive log

```javascript
import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

export async function get_getDiveAnalysis(request) {
  try {
    const { diveLogId, userId } = request.query;
    
    if (!diveLogId) {
      return badRequest({ error: 'Missing diveLogId' });
    }

    // Query for analysis record
    let query = wixData.query('DiveAnalysis')
      .eq('diveLogId', diveLogId);
    
    if (userId) {
      query = query.eq('userId', userId);
    }

    const results = await query.find();

    if (results.items.length === 0) {
      return ok({ analysis: null, found: false });
    }

    const analysis = results.items[0];

    // Also get image info if available
    const imageQuery = await wixData.query('DiveImages')
      .eq('diveLogId', diveLogId)
      .find();

    const imageInfo = imageQuery.items.length > 0 ? imageQuery.items[0] : null;

    return ok({
      analysis,
      imageInfo,
      found: true
    });

  } catch (error) {
    console.error('Get analysis error:', error);
    return serverError({ error: 'Get analysis failed', details: error.message });
  }
}
```

## Implementation Steps

1. **Create Collections**: Set up DiveImages and DiveAnalysis collections in your Wix database
2. **Add Backend Functions**: Create the three backend functions above in your Wix site
3. **Set Permissions**: Configure collection permissions to allow read/write access for authenticated users
4. **Test Functions**: Test each function individually before integrating with the frontend

## Integration with Existing DiveLogs Collection

The new analysis system integrates with your existing DiveLogs collection by:
- Using the same `diveLogId` as a foreign key
- Storing `userId` for user association
- Providing rich analysis data that can be displayed alongside dive logs

## Frontend Integration

Update your frontend to:
1. Use the new `/api/openai/upload-dive-image` endpoint (already updated)
2. Display analysis results from the Wix collections
3. Handle loading states for image upload and analysis

## Benefits

✅ **Serverless Compatible**: No filesystem dependencies
✅ **Scalable**: Wix Media handles image storage and CDN
✅ **Integrated**: Uses your existing Wix infrastructure
✅ **Searchable**: Analysis data stored in queryable collections
✅ **Reliable**: Leverages Wix's robust backend services

This approach will make your image analysis feature production-ready and fully integrated with your Wix site!
