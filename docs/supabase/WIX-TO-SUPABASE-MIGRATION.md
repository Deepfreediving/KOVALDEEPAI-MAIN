# Wix to Supabase Migration Plan

## 🎯 Migration Overview

Complete migration from Wix backend to Supabase for all data operations, authentication, and storage.

## 📂 Files That Need Migration

### 1. API Routes (/pages/api/)

**PRIORITY: HIGH**

- [ ] `/api/analyze/` - All files calling Wix APIs
- [ ] `/api/auth/` - Wix authentication to Supabase Auth
- [ ] `/api/openai/` - Image upload and chat (still using Wix storage)
- [ ] `/api/system/` - Health checks and diagnostics

### 2. Components (/components/)

**PRIORITY: MEDIUM**

- [ ] `DiveJournalDisplay.jsx` - ✅ DONE (save/delete updated)
- [ ] Other components calling Wix APIs (need to audit)

### 3. Utils (/utils/)

**PRIORITY: HIGH**

- [ ] `wixApiClient.js` - Replace with Supabase client
- [ ] `wixClient.ts` - Replace with Supabase client
- [ ] `diveLogHelpers.ts` - Update to use Supabase APIs

### 4. Pages (/pages/)

**PRIORITY: MEDIUM**

- [ ] `index.jsx` - ✅ PARTIAL (API routes updated, auth logic needs update)
- [ ] `embed.jsx` - Update API routes

## 🔄 Migration Steps

### Phase 1: Core API Migration ✅ COMPLETED

1. ✅ Create `/api/supabase/` folder structure
2. ✅ `save-dive-log.js` - Save dive logs to Supabase
3. ✅ `dive-logs.js` - Get dive logs from Supabase
4. ✅ `delete-dive-log.js` - Delete dive logs from Supabase
5. ✅ `chat.js` - Chat API with Supabase context
6. ✅ `user-profile.js` - User management
7. ✅ `upload-image.js` - Image upload to Supabase Storage
8. ✅ `get-dive-logs.js` - Enhanced get with formatting

### Phase 2: Replace /api/analyze/ Endpoints

1. [ ] `analyze-dive-log.ts` - Use Supabase data
2. [ ] `get-dive-logs.ts` - Migrate to Supabase
3. [ ] `pattern-analysis.ts` - Use Supabase APIs
4. [ ] `single-dive-log.ts` - Use Supabase APIs
5. [ ] `save-dive-log.ts` - Redirect to Supabase endpoint

### Phase 3: Authentication System

1. [ ] Replace Wix Auth with Supabase Auth
2. [ ] Update session management
3. [ ] Update user profile system
4. [ ] Remove Wix authentication logic

### Phase 4: Utils and Helpers

1. [ ] Create `supabaseClient.js` - Replace wixClient
2. [ ] Update `diveLogHelpers.ts` - Use Supabase APIs
3. [ ] Remove Wix utility files

### Phase 5: Frontend Updates

1. [ ] Update all components to use Supabase auth state
2. [ ] Remove Wix-specific UI elements
3. [ ] Update error handling for Supabase

### Phase 6: Storage Migration

1. [ ] Migrate image uploads to Supabase Storage
2. [ ] Update image display URLs
3. [ ] Set up image processing pipeline

## 🚫 Files to Remove

- `utils/wixApiClient.js`
- `utils/wixClient.ts`
- Any Wix-specific API routes (when they exist)

## 🔧 Environment Variables to Update

- Remove all `WIX_*` variables from production
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for server-side operations

## 📊 Current Status

- ✅ Database schema migrated
- ✅ Storage buckets and policies created  
- ✅ Phase 1: Core Supabase API endpoints completed
- ✅ Frontend updated to use Supabase APIs
- ✅ DiveJournalDisplay component migrated
- 🔄 Testing Phase 1 migration (CURRENT)
- 🔄 Authentication system needs migration
- 🔄 Analysis APIs need migration
