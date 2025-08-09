# 🔄 BACKEND MIGRATION GUIDE - Koval Deep AI

## Files to Remove (Redundant/Consolidated)

After implementing the optimization, these files can be safely removed:

### 1. **http-getUserMemory.jsw** ❌

- **Reason**: Functionality merged into `http-userMemory-optimized.jsw`
- **Replacement**: Use `GET /_functions/userMemory?userId=<id>`

### 2. **http-saveToUserMemory.jsw** ❌

- **Reason**: Functionality merged into `http-userMemory-optimized.jsw`
- **Replacement**: Use `POST /_functions/userMemory`

### 3. **http-loadMemories.jsw** ❌

- **Reason**: Functionality merged into `http-userMemory-optimized.jsw`
- **Replacement**: Use `GET /_functions/userMemory?userId=<id>&search=<query>`

### 4. **http-testConnection.jsw** ❌

- **Reason**: Functionality covered by `http-wixConnection.jsw`
- **Replacement**: Use `/_functions/wixConnection`

### 5. **http-userMemory.jsw** (Original) 📦

- **Action**: Replace with `http-userMemory-optimized.jsw`
- **Benefits**: Unified CRUD operations, better error handling, semantic search

## Files to Rename/Replace

### 1. **http-userMemory-optimized.jsw** ➜ **http-userMemory.jsw**

```bash
# In your Wix backend editor:
# 1. Delete the old http-userMemory.jsw
# 2. Rename http-userMemory-optimized.jsw to http-userMemory.jsw
```

## Updated API Endpoints

### Memory Management (Unified)

```javascript
// GET: Retrieve memories
GET /_functions/userMemory?userId=<id>&limit=50&type=dive_log&search=depth

// POST: Create memory
POST /_functions/userMemory
{
  "userId": "user123",
  "type": "dive_log",
  "memoryContent": "Great dive session...",
  "location": "Blue Hole"
}

// PUT: Update memory
PUT /_functions/userMemory?id=<memoryId>
{
  "memoryContent": "Updated content..."
}

// DELETE: Remove memory
DELETE /_functions/userMemory?id=<memoryId>
```

### Chat (Unchanged)

```javascript
POST /_functions/chat
{
  "userMessage": "How deep should I dive?",
  "userId": "user123",
  "profile": {...}
}
```

### Dive Logs (Unchanged)

```javascript
// GET/POST /_functions/diveLogs
```

### Connection Test

```javascript
// GET /_functions/wixConnection (replaces testConnection)
```

## Frontend Updates Required

### 1. **wix-frontend-page-master.js**

- ✅ Already updated to use unified endpoints
- ✅ Constants updated for deprecated endpoints

### 2. **Remove old API calls** (if any external code uses them):

```javascript
// OLD (Remove these)
/_functions/getUserMemory
/_functions/saveToUserMemory
/_functions/loadMemories
/_functions/testConnection

// NEW (Use these)
/_functions/userMemory
/_functions/wixConnection
```

## Verification Steps

### 1. **Test Memory Operations**

```javascript
// Test all CRUD operations
fetch("/_functions/userMemory?userId=test123&limit=10")
  .then((res) => res.json())
  .then((data) => console.log("GET memories:", data));

fetch("/_functions/userMemory", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "test123",
    type: "dive_log",
    memoryContent: "Test dive log",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log("POST memory:", data));
```

### 2. **Test Chat Endpoint**

```javascript
fetch("/_functions/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userMessage: "Test message",
    userId: "test123",
    profile: { nickname: "Test User" },
  }),
})
  .then((res) => res.json())
  .then((data) => console.log("Chat response:", data));
```

### 3. **Test Connection**

```javascript
fetch("/_functions/wixConnection")
  .then((res) => res.json())
  .then((data) => console.log("Connection test:", data));
```

## Expected Benefits After Migration

### 📊 **Metrics**

- **Files reduced**: 12 → 7 backend files (-42%)
- **Code duplication**: Eliminated ~60% of redundant functions
- **API endpoints**: Consolidated from 10+ to 6 core endpoints

### 🚀 **Performance**

- **Consistent error handling** across all endpoints
- **Unified CORS headers** from centralized config
- **Better caching** with consolidated queries
- **Reduced memory usage** with fewer loaded modules

### 🛠️ **Maintainability**

- **Single source of truth** for each operation
- **Centralized configuration** for easy updates
- **Consistent response formats** across API
- **Better documentation** with clear endpoint purposes

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Restoring the old individual files from backup
2. Updating frontend to use old endpoint names
3. Testing individual functions before re-consolidating

## Post-Migration Cleanup

After successful migration and testing:

1. Remove deprecated `.jsw` files
2. Update any documentation/README files
3. Clean up any remaining hardcoded endpoint references
4. Consider adding TypeScript definitions for better type safety

---

**Migration Priority**: HIGH ⚡  
**Estimated Time**: 30-60 minutes  
**Risk Level**: LOW (can be easily reverted)  
**Testing Required**: YES (all CRUD operations)
