# 🎯 KovalDeepAI API Endpoint Guide

## 📋 **CHAT ENDPOINTS** - Clear Separation

### 🔤 **Primary Chat System**

```
/api/chat/general.ts
```

**Purpose**: Main chat endpoint for all authenticated users  
**Use When**: Default chat interactions, general coaching questions  
**Features**: Full RAG + Pinecone + Dive logs + OpenAI GPT-4  
**Frontend Usage**: ChatBox.jsx, main chat interface

---

### 🎯 **Enhanced Coaching System**

```
/api/chat/coaching.js
```

**Purpose**: Advanced coaching with Daniel Koval's methodology  
**Use When**: User requests specialized coaching, technical analysis  
**Features**: CLEAR DIVE + E.N.C.L.O.S.E. frameworks, certification-aware  
**Frontend Usage**: Coaching mode toggle, advanced diagnostics

---

### 🔐 **Admin-Only Chat**

```
/api/chat/admin.js
```

**Purpose**: Enhanced chat for admin dashboard  
**Use When**: Admin dashboard interactions only  
**Features**: Full context access, bypasses RLS, enhanced Supabase data  
**Frontend Usage**: Admin dashboard only

---

### 📋 **Dive Log Audit**

```
/api/chat/audit.js
```

**Purpose**: Detailed dive log pattern analysis  
**Use When**: User responds "yes" to audit offers in chat  
**Features**: Technical dive analysis, pattern detection, coaching recommendations  
**Frontend Usage**: Automatically triggered from chat interactions

---

## 🏊 **DIVE LOG ENDPOINTS**

### Primary Dive Management:

- `/api/supabase/save-dive-log.js` - Save new dive entries
- `/api/supabase/get-dive-logs.js` - Retrieve user's dive logs
- `/api/supabase/delete-dive-log.js` - Remove dive entries
- `/api/analyze/get-dive-logs.ts` - Used by chat for context

### Image Upload & Analysis:

- `/api/openai/upload-dive-image-simple.js` - Main image upload + AI analysis
- `/api/supabase/save-dive-image-admin.js` - Admin image management
- `/api/supabase/upload-image.js` - General image upload

---

## 🧠 **KNOWLEDGE & SEARCH ENDPOINTS**

### Pinecone Integration:

- `/api/pinecone/pineconequery-gpt.js` - Main knowledge retrieval for chat
- `/api/pinecone/query.ts` - General knowledge queries
- `/api/pinecone/get-chunks.js` - Retrieve specific knowledge chunks

### Analysis & Memory:

- `/api/analyze/pattern-analysis.ts` - Dive pattern analysis
- `/api/analyze/read-memory.ts` - User memory retrieval
- `/api/analyze/record-memory.ts` - User memory storage

---

## 🎯 **COACHING ENDPOINTS**

### Daniel Koval's Methodology:

- `/api/coach/diagnose.ts` - General diagnostic framework
- `/api/coach/enclose-diagnose.js` - E.N.C.L.O.S.E. system
- `/api/coach/eq-plan.js` - Equalization planning

---

## 🔄 **USAGE PATTERNS**

### **Default Chat Flow** (Most Common):

```javascript
// ChatBox.jsx
const response = await fetch("/api/chat/general", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    userId: userId,
    embedMode: false,
  }),
});
```

### **Coaching Mode Flow**:

```javascript
// When user requests coaching
const response = await fetch("/api/chat/coaching", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    userId: userId,
    conversationHistory: [],
  }),
});
```

### **Admin Dashboard Flow**:

```javascript
// Admin dashboard only
const response = await fetch("/api/chat/admin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: adminMessage,
    userProfile: adminProfile,
  }),
});
```

---

## ⚠️ **DEPRECATED ENDPOINTS** (Legacy Support)

### Still Functional (Redirects Planned):

- `/api/openai/chat.ts` → Use `/api/chat/general.ts`
- `/api/coach/chat.js` → Use `/api/chat/coaching.js`
- `/api/supabase/chat.js` → Use `/api/chat/admin.js`

---

## 🛠️ **DEVELOPMENT GUIDELINES**

### **When to Use Each Endpoint**:

1. **General Chat** (`/api/chat/general.ts`):
   - Default choice for 90% of chat interactions
   - User asks general questions about freediving
   - User wants coaching advice with their dive data

2. **Coaching Mode** (`/api/chat/coaching.js`):
   - User explicitly requests "coaching mode"
   - Technical diagnostic questions
   - Certification-specific guidance needed
   - Pattern analysis requests

3. **Admin Chat** (`/api/chat/admin.js`):
   - Admin dashboard only
   - Daniel Koval's personal access
   - Enhanced data context needed

4. **Audit Request** (`/api/chat/audit.js`):
   - Automatically triggered by chat system
   - Don't call directly from frontend
   - User confirms audit request with "yes"

---

## 🔧 **INTEGRATION CHECKLIST**

### ✅ **Frontend Updates Complete**:

- [x] ChatBox.jsx updated to use `/api/chat/general`
- [x] API client updated to use `/api/chat/general`
- [x] Index.jsx endpoints updated
- [x] Admin dashboard routes (if applicable)

### ✅ **Backend Updates Complete**:

- [x] New organized endpoint structure created
- [x] Cross-references updated (admin → general)
- [x] Audit trigger updated
- [x] Documentation added to each endpoint

### 🔄 **Testing Required**:

- [ ] Test general chat functionality
- [ ] Test coaching mode if implemented
- [ ] Test admin chat access
- [ ] Test audit trigger functionality
- [ ] Verify old endpoints still work (backward compatibility)

---

## 📊 **MONITORING & METRICS**

### **Track Endpoint Usage**:

- `/api/chat/general` - Should handle 90%+ of traffic
- `/api/chat/coaching` - Specialized use cases
- `/api/chat/admin` - Admin only
- `/api/chat/audit` - Triggered requests

### **Performance Expectations**:

- **General**: <2s response time
- **Coaching**: <3s response time (more analysis)
- **Admin**: <2s response time
- **Audit**: <5s response time (comprehensive analysis)

---

_Last Updated: API Consolidation Phase 1 Complete_  
_Status: Ready for Production Use_
