# 🤿 Koval Deep AI - Development Guide

## 🎯 AI Assistant Operating Charter

### Core Rules - NEVER VIOLATE THESE:

1. **NO DUPLICATE FILES** - Edit existing files, never create `Component2.jsx` or similar
2. **MODULAR ARCHITECTURE** - Keep components focused, reusable, and properly separated
3. **PRESERVE INTEGRATIONS** - Never break existing Pinecone/OpenAI/Supabase connections
4. **SURGICAL FIXES ONLY** - No major migrations, focus on targeted improvements
5. **RESPECT ROUTER COEXISTENCE** - Both Pages Router and App Router must work together
6. **FOLLOW REACT BEST PRACTICES** - Pure components, proper state management, correct hook usage
7. **MAINTAIN THREAD MEMORY** - Use threadId for chat continuity across sessions

### Project Status:

- **Main App**: `/pages/` directory (working APIs, Pinecone, OpenAI integrations)
- **Modern Features**: `/app/` directory (dive-logs, modern UI)
- **Hybrid Approach**: Both routers coexist, DO NOT migrate everything to App Router
- **Test Organization**: All tests consolidated in `/tests/` directory

---

## 📚 Core Documentation References

### React & Next.js

- **React Official Docs**: https://react.dev/learn
- **React Reference**: https://react.dev/reference/react
- **Next.js App Router**: https://nextjs.org/docs/app
- **Next.js Pages Router**: https://nextjs.org/docs/pages
- **Next.js Image Optimization**: https://nextjs.org/docs/app/api-reference/components/image
- **Server Components**: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- **Client Components**: https://nextjs.org/docs/app/building-your-application/rendering/client-components

### Database & Backend

- **Supabase JavaScript SDK**: https://supabase.com/docs/reference/javascript
- **Supabase Auth**: https://supabase.com/docs/reference/javascript/auth
- **Supabase Database**: https://supabase.com/docs/reference/javascript/select
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

### AI & Vector Search

- **OpenAI API Reference**: https://platform.openai.com/docs/api-reference
- **OpenAI Assistants API**: https://platform.openai.com/docs/assistants/overview
- **Pinecone JavaScript SDK**: https://docs.pinecone.io/reference/javascript-sdk
- **Pinecone Vector Operations**: https://docs.pinecone.io/reference/query

### TypeScript & Tooling

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Next.js TypeScript**: https://nextjs.org/docs/app/building-your-application/configuring/typescript

---

## 🏗️ Project Structure Map

```
KovalDeepAI-main/
├── apps/web/                     # Main Next.js application
│   ├── pages/                    # 🔥 MAIN APP - DO NOT DELETE
│   │   ├── api/                  # Backend API routes
│   │   │   ├── chat.ts          # OpenAI chat integration
│   │   │   ├── pinecone/        # Vector search endpoints
│   │   │   ├── save-dive-log.ts # Dive log persistence
│   │   │   └── debug/           # Debug utilities
│   │   ├── index.jsx            # Homepage with chat interface
│   │   ├── dashboard.js         # User dashboard
│   │   ├── auth/                # Authentication pages
│   │   └── _app.js             # Pages Router root
│   │
│   ├── app/                     # 🚀 MODERN FEATURES
│   │   ├── dive-logs/          # Dive log management (App Router)
│   │   ├── components/         # App Router specific components
│   │   ├── layout.tsx          # App Router root layout
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # 🧱 SHARED UI COMPONENTS
│   │   ├── ChatBox.jsx         # Main chat interface
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   └── DiveJournalForm.jsx # Dive entry form
│   │
│   ├── lib/                    # 🔧 UTILITIES & CONFIGS
│   │   ├── supabase.ts        # Supabase client configuration
│   │   ├── openai.ts          # OpenAI client setup
│   │   └── pinecone.ts        # Pinecone client setup
│   │
│   ├── utils/                  # 🛠️ HELPER FUNCTIONS
│   │   ├── apiClient.ts       # API communication layer
│   │   └── handleCors.ts      # CORS middleware
│   │
│   └── styles/                # 🎨 STYLING
│       └── globals.css        # Application styles
│
├── tests/                     # 🧪 ALL TESTS (consolidated)
│   ├── api/                   # API endpoint tests
│   ├── integration/           # Integration tests
│   ├── unit/                  # Unit tests
│   └── system/               # System tests
│
└── docs/                     # 📖 DOCUMENTATION
    └── (various audit files)
```

---

## 🎨 Component Architecture Rules

### React Component Patterns

```jsx
// ✅ GOOD - Pure component with proper props
function DiveLogCard({ dive, onEdit, onDelete }) {
  return (
    <div className="dive-card">
      <h3>{dive.location}</h3>
      <p>Depth: {dive.depth}m</p>
      <button onClick={() => onEdit(dive.id)}>Edit</button>
    </div>
  );
}

// ❌ BAD - Mutating props, side effects during render
function DiveLogCard({ dive }) {
  dive.formatted = formatDate(dive.date); // Mutation!
  useEffect(() => {
    /* side effect */
  }); // Should be in parent
  return <div>{dive.location}</div>;
}
```

### App Router vs Pages Router Usage

```jsx
// App Router - Use for NEW features
// app/dive-logs/page.tsx
'use client' // Only when using hooks/state

export default function DiveLogsPage() {
  const [logs, setLogs] = useState([])
  // Client component logic
}

// Pages Router - Keep for EXISTING features
// pages/dashboard.js
export default function Dashboard({ user }) {
  // Traditional Next.js page
}
```

### State Management Patterns

```jsx
// ✅ GOOD - Immutable state updates
const addDiveLog = (newLog) => {
  setDiveLogs((prev) => [...prev, newLog]); // Create new array
};

const updateDiveLog = (id, updates) => {
  setDiveLogs((prev) =>
    prev.map(
      (log) => (log.id === id ? { ...log, ...updates } : log) // Spread operator
    )
  );
};

// ❌ BAD - Direct mutations
const addDiveLog = (newLog) => {
  diveLogs.push(newLog); // Mutating existing array!
  setDiveLogs(diveLogs);
};
```

---

## 🔌 Integration Patterns

### Supabase Best Practices

```javascript
// ✅ GOOD - Proper error handling and RLS
const { data, error } = await supabase
  .from("dive_logs")
  .select("*")
  .eq("user_id", userId); // RLS will enforce this anyway

if (error) {
  console.error("Supabase error:", error);
  return { success: false, error: error.message };
}

// ❌ BAD - No error handling, bypassing RLS
const data = await supabase.from("dive_logs").select("*"); // Missing user filter!
```

### OpenAI Integration Pattern

```javascript
// ✅ GOOD - Structured with proper error handling
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a freediving coach..." },
    { role: "user", content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

// ❌ BAD - No error handling, wrong structure
const response = await openai.complete(userMessage); // Wrong API!
```

### Pinecone Vector Search Pattern

```javascript
// ✅ GOOD - Proper embedding and search
const embedding = await openai.embeddings.create({
  model: "text-embedding-ada-002",
  input: query,
});

const results = await index.query({
  vector: embedding.data[0].embedding,
  topK: 5,
  includeMetadata: true,
});

// ❌ BAD - Missing embedding step
const results = await index.query({
  vector: query, // Raw text won't work!
  topK: 5,
});
```

---

## 🚨 Critical Don'ts

### File Management

- ❌ Never create `Component2.jsx`, `api-old.ts`, or similar duplicates
- ❌ Never delete the `/pages/` directory or its contents
- ❌ Never move working API routes without careful migration
- ❌ Never break existing Pinecone/OpenAI integrations

### Architecture

- ❌ Don't mix Server and Client components incorrectly
- ❌ Don't use hooks in Server Components
- ❌ Don't mutate state directly
- ❌ Don't put side effects in render functions

### Security

- ❌ Never bypass Supabase Row-Level Security
- ❌ Never hardcode API keys or sensitive data
- ❌ Never expose admin endpoints without proper auth

---

## ✅ Quick Validation Checklist

Before any change, verify:

- [ ] Does this follow React best practices? (pure components, immutable state)
- [ ] Am I editing existing files instead of creating duplicates?
- [ ] Do Pages Router and App Router still coexist properly?
- [ ] Are all integrations (Supabase/OpenAI/Pinecone) still working?
- [ ] Is this a surgical fix or am I attempting a major migration?
- [ ] Are client components marked with `'use client'`?
- [ ] Are server components free of hooks and browser APIs?

---

## 🔧 Common Fix Patterns

### Build Errors

```bash
# Html import error → Check for incorrect Document imports
# useContext error → Verify client/server component boundaries
# Type errors → Check component prop types and API responses
```

### State Management Issues

```jsx
// Replace mutations with immutable updates
// Use proper dependency arrays in useEffect
// Keep effects focused and add cleanup functions
```

### Performance Issues

```jsx
// Memoize expensive calculations with useMemo
// Use React.memo for pure components
// Optimize re-renders with useCallback
```

---

## 📞 Communication Protocol

When working with this project:

1. **Read this guide first** - Every time, every session
2. **Reference official docs** - Use the links provided above
3. **Follow the file structure** - Respect the organization
4. **Ask before major changes** - Confirm architectural decisions
5. **Test incrementally** - Small changes, frequent validation

---

_This guide serves as the single source of truth for development practices on the Koval Deep AI project. Follow it exactly for consistent, high-quality results._
