# Browser Testing Guide for Koval Deep AI

## Test URL: https://www.deepfreediving.com/large-koval-deep-ai-page

## 🧪 CRITICAL TESTS TO PERFORM

### 1. **Member Data Authentication Test**

**What to check:**

- Open browser developer console (F12)
- Look for console logs showing member data received
- Verify you see real Contact ID instead of session ID

**Expected logs:**

```
✅ Using full name from profile: Daniel Koval
🔍 Member data received: {
  diveLogId: "0913c96a-0487-4b35-89a...",
  contactId: "0913c96a-0487-4b35-89a...",
  nickname: "Daniel Koval",
  firstName: "Daniel",
  lastName: "Koval",
  loginEmail: "danielkoval@hotmail.com"
}
```

**❌ BAD signs to watch for:**

```
⚠️ Using session ID as display name: session-17553021460622
nickname: "test-user-001"
```

### 2. **Dive Log Save Test**

**Steps:**

1. Click "Open Dive Journal"
2. Fill out a test dive log:
   - Date: Today
   - Discipline: FIM
   - Location: Test Pool
   - Target Depth: 80m
   - Reached Depth: 75m
   - Notes: Browser test dive
3. Click Save

**Expected console logs:**

```
💾 Starting dual save process for dive log...
📊 Generated dive entry ID: dive 001 (or dive 002, etc.)
📤 Sending to Wix HTTP function: {
  diveEntryId: "dive 001",
  memberRef: "0913c96a-0487-4b35-89a...",
  discipline: "FIM",
  reachedDepth: 75
}
✅ Dive log synced to Wix DiveLogs collection successfully
```

**❌ ERROR to watch for:**

```
❌ CRITICAL: Received session ID instead of real member data!
❌ Expected: Wix Contact Id (e.g., 0913c96a-0487-4b35-89a...)
```

### 3. **Sidebar Refresh Test**

**Steps:**

1. After saving dive log, check if it appears in sidebar immediately
2. Look for dive logs count showing "(1)" or updated number
3. Verify log appears in "Saved Dive Logs" section

**Expected behavior:**

- Log appears immediately without page refresh
- Dive entry shows as "dive 001", "dive 002", etc.
- Correct discipline and depth shown

### 4. **AI Analysis Test**

**Steps:**

1. After saving dive log, click "Analyze" button on the saved log
2. Wait for AI response in chat

**Expected response:**

- Detailed analysis of your specific dive
- References to your actual depth (75m), discipline (FIM), location
- Technical coaching feedback
- NOT just "I received your message!"

**Expected console logs:**

```
🤖 Sending dive log to OpenAI via: .../api/openai/chat
✅ AI analysis completed successfully
💬 Posting analysis result to chat...
```

### 5. **Image Upload Test**

**Steps:**

1. Create new dive log
2. Upload a dive computer image
3. Check if OCR extracts text
4. Save the log

**Expected behavior:**

- Image uploads successfully
- OCR extracts some text (even if not perfect)
- Image appears in saved log
- Wix collection receives image URL

**Expected console logs:**

```
🔍 Starting enhanced OCR for dive profile...
📄 Initial OCR result length: [some number]
✅ OCR completed. Extracted text preview: [some text]
```

### 6. **Network Tab Analysis**

**In Developer Tools → Network tab:**

**Check API calls:**

1. **POST /api/analyze/save-dive-log**
   - Status: 200
   - Response contains: `"success": true`
   - Request payload has real Contact ID

2. **POST /\_functions/diveLogs** (to Wix)
   - Status: 200
   - Contains memberRef with Contact ID

3. **POST /api/analyze/single-dive-log** (for analysis)
   - Status: 200
   - Response contains actual analysis text

## 🎯 SUCCESS CRITERIA

### ✅ PASS if you see:

- Real member name "Daniel Koval" not "test-user-001"
- Contact ID "0913c96a-0487..." not "session-17553..."
- Dive entry IDs as "dive 001", "dive 002"
- Logs appear in sidebar immediately after save
- AI provides detailed analysis, not generic responses
- Images upload and OCR attempts extraction

### ❌ FAIL if you see:

- Session IDs like "session-17553021460622"
- Generated names like "test-user-001"
- "I received your message!" from AI
- Logs don't appear in sidebar
- API errors in console
- Images don't upload

## 🔧 DEBUGGING STEPS

If tests fail:

1. **Check Console Errors:**
   - Look for red error messages
   - Note any 503/500 API responses
   - Check for CORS errors

2. **Verify Member Authentication:**
   - Refresh page and check if member data loads
   - Look for postMessage events in console
   - Verify Wix member authentication is working

3. **Test Individual Components:**
   - Try saving without analysis first
   - Test image upload separately
   - Test AI chat without dive logs

## 📊 EXPECTED FIELD MAPPING

After successful save, check Wix CMS DiveLogs collection for:

- `diveEntryId`: "dive 001"
- `memberRef`: Links to your Members/FullData record
- `discipline`: "FIM"
- `reachedDepth`: 75
- `location`: "Test Pool"
- `watchedPhoto`: Image URL (if uploaded)

## 📝 REPORT RESULTS

Please report what you see:

1. Console logs (copy/paste key messages)
2. Any error messages
3. Whether logs appear in sidebar
4. AI analysis response quality
5. Network tab status codes
6. Wix CMS data appearance

This will help identify any remaining issues that need fixing!
