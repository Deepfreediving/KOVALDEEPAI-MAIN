# Wix Backend Integration Update Guide

## 🚨 CRITICAL: Update Required for Complete Dive Journal Integration

Your Wix backend functions need to be updated to properly handle the dive journal data flow. Here's what needs to be done:

## 📁 **Files to Deploy to Wix Backend**

### 1. **MERGED diveLogs Function** ⭐ (Replace existing)

#### `http-diveLogs.jsw` (Comprehensive Merged Version)

- **Purpose**:
  - ✅ Handles Next.js save-dive-log.ts API calls
  - ✅ Provides advanced search capabilities
  - ✅ Supports both direct submissions and API calls
  - ✅ Includes semantic search integration
- **Action**: **Replace your existing diveLogs function** with this merged version
- **Endpoint**: `/_functions/diveLogs`

### 2. **New Supporting Functions** (Add these)

#### A. `http-getUserMemory.jsw`

- **Purpose**: Called by Next.js `read-memory.ts` API to fetch user memory from Wix
- **Action**: **Add as new function**
- **Endpoint**: `/_functions/getUserMemory`

#### B. `http-saveToUserMemory.jsw`

- **Purpose**: Called by Next.js `record-memory.ts` to save dive log analysis to Wix
- **Action**: **Add as new function**
- **Endpoint**: `/_functions/saveToUserMemory`

### 3. **Keep Existing** (No changes needed)

- ✅ Keep `http-userMemory-fixed.jsw` - Your main app functionality
- ✅ Your UserMemory collection is perfect as-is

## 🗄️ **Wix Database Collection Setup**

### Required Collection: `@deepfreediving/kovaldeepai-app/Import1`

Ensure your Wix database collection has these fields:

#### Core Fields:

- `userId` (Text) - Required
- `uniqueKey` (Text) - For deduplication
- `timestamp` (DateTime) - When entry was created
- `type` (Text) - "dive-log", "dive-log-memory", "memory", etc.
- `source` (Text) - "next-js-api", "wix-collections", etc.

#### Dive Log Fields:

- `date` (DateTime) - Dive date
- `disciplineType` (Text) - "depth", "time", "distance"
- `discipline` (Text) - "Constant Weight No Fins", etc.
- `location` (Text) - Dive location
- `targetDepth` (Number) - Target depth in meters
- `reachedDepth` (Number) - Actual depth reached
- `mouthfillDepth` (Number) - Mouthfill depth
- `issueDepth` (Number) - Depth where issues occurred
- `notes` (Rich Text) - Dive notes

#### Memory/Analysis Fields:

- `memoryContent` (Rich Text) - AI-readable content
- `logEntry` (Text) - Summary entry
- `coachingReport` (Rich Text) - AI coaching analysis
- `threadId` (Text) - OpenAI thread ID

#### Additional Fields:

- `metadata` (Object) - Additional data storage
- `sessionName` (Text) - Session grouping
- `sessionId` (Text) - Session identifier

## 🔧 **Deployment Steps**

### Step 1: Deploy Backend Functions

1. Open your Wix site editor
2. Go to **Dev Mode** → **Backend** folder
3. Copy the three new `.jsw` files:
   - `http-getUserMemory.jsw`
   - `http-saveToUserMemory.jsw`
   - `http-diveLogs.jsw`
4. **Publish** your site to activate the functions

### Step 2: Test Endpoints

After deployment, test each endpoint:

```bash
# Test getUserMemory
curl -X POST https://www.deepfreediving.com/_functions/getUserMemory \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'

# Test saveToUserMemory
curl -X POST https://www.deepfreediving.com/_functions/saveToUserMemory \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "discipline": "CNF", "reachedDepth": 30}'

# Test diveLogs
curl -X POST https://www.deepfreediving.com/_functions/diveLogs \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "diveLog": {"discipline": "CNF", "reachedDepth": 30}}'
```

### Step 3: Verify Database Collection

1. Go to **Wix Editor** → **Content Manager**
2. Check the `Import1` collection
3. Ensure all required fields exist
4. Set appropriate permissions (Members can read/write their own data)

## 🔄 **Data Flow After Update**

Once deployed, the complete data flow will be:

```
1. User submits dive journal form
   ↓
2. save-dive-log.ts saves locally & calls Wix diveLogs endpoint
   ↓
3. save-dive-log.ts calls record-memory.ts for AI analysis
   ↓
4. record-memory.ts calls Wix saveToUserMemory endpoint
   ↓
5. Chat AI calls read-memory.ts which calls Wix getUserMemory
   ↓
6. AI has complete dive history for personalized coaching
```

## ✅ **Verification Checklist**

After deployment, verify:

- [ ] All three backend functions are deployed and accessible
- [ ] Wix database collection has all required fields
- [ ] Permissions allow members to read/write their own data
- [ ] Test dive journal submission creates entries in Wix database
- [ ] Chat AI can access dive log history for coaching
- [ ] No errors in Wix backend logs

## 🚨 **Important Notes**

1. **Backup First**: Always backup your existing Wix backend functions before deploying
2. **Test on Staging**: If you have a staging environment, test there first
3. **Monitor Logs**: Check Wix backend logs for any errors after deployment
4. **Gradual Rollout**: Consider testing with a limited user group first

## 💡 **Benefits After Update**

- ✅ Complete dive journal data persistence in Wix
- ✅ AI coaching based on actual dive history
- ✅ Seamless integration between Next.js and Wix
- ✅ Automatic data synchronization
- ✅ Rich user memory for personalized coaching

The dive journal will work harmoniously with all systems once these Wix backend updates are deployed!
