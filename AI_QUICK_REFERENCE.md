# 🎯 AI Assistant Quick Reference Card

## 📋 Pre-Flight Checklist (Read Every Session)

### 1. Core Documents ✅

- [ ] Read `DEV_GUIDE.md` - Technical rules and patterns
- [ ] Read `ARCHITECTURE_GUIDE.md` - Strategic principles and goals
- [ ] Understand current project phase and priorities

### 2. Project Status Check ✅

- [ ] Pages Router (`/pages/`) = Main app, working integrations
- [ ] App Router (`/app/`) = Modern features, enhanced UX
- [ ] Both routers must coexist - NO full migrations
- [ ] All tests organized in `/tests/` directory

### 3. Technology Stack ✅

- [ ] **Frontend**: Next.js 14 (hybrid routing), React 18, TypeScript, Tailwind CSS
- [ ] **Backend**: Supabase (auth + database), Next.js API routes
- [ ] **AI**: OpenAI GPT-4, Pinecone vector search, thread-based conversations
- [ ] **Deployment**: Vercel, standalone output mode

---

## 🚨 Critical Rules (NEVER VIOLATE)

### File Management 🗂️

- ❌ **NO DUPLICATES**: Never create `Component2.jsx`, `api-old.ts`, or similar
- ❌ **NO DELETIONS**: Never delete `/pages/` directory or working integrations
- ✅ **EDIT IN PLACE**: Modify existing files, maintain file structure

### Architecture 🏗️

- ❌ **NO MAJOR MIGRATIONS**: Surgical fixes only, preserve what works
- ❌ **NO ROUTER CONFLICTS**: Respect Pages/App Router boundaries
- ✅ **HYBRID COEXISTENCE**: Both routers working together seamlessly

### React Best Practices ⚛️

- ❌ **NO MUTATIONS**: Always use immutable state updates
- ❌ **NO HOOKS IN SERVER COMPONENTS**: Keep client/server boundaries clear
- ✅ **PURE COMPONENTS**: Same input = same output, no side effects

---

## 🎯 Quick Decision Matrix

| Situation                | Action           | Router Choice            | Pattern              |
| ------------------------ | ---------------- | ------------------------ | -------------------- |
| **Fix existing feature** | Edit in place    | Keep current router      | Surgical improvement |
| **Add to dashboard**     | Enhance existing | Pages Router             | Established patterns |
| **New dive log feature** | Add to dive-logs | App Router               | Modern UX patterns   |
| **API endpoint**         | Extend existing  | Pages Router (`/api/`)   | Proven stability     |
| **UI component**         | Shared component | Both (in `/components/`) | Reusable design      |

---

## 📚 Essential Links (Reference These)

### React & Next.js

- [React Official Docs](https://react.dev/learn) - Component patterns
- [Next.js App Router](https://nextjs.org/docs/app) - Modern features
- [Next.js Pages Router](https://nextjs.org/docs/pages) - Established patterns

### Integrations

- [Supabase JS SDK](https://supabase.com/docs/reference/javascript) - Database/auth
- [OpenAI API](https://platform.openai.com/docs/api-reference) - AI features
- [Pinecone JS SDK](https://docs.pinecone.io/reference/javascript-sdk) - Vector search

---

## 🔧 Common Fix Patterns

### Build Errors

```bash
# Html import error → Check Document import locations
# useContext error → Verify client/server component boundaries
# TypeScript error → Check prop types and API responses
```

### State Issues

```jsx
// ✅ GOOD: Immutable updates
setItems((prev) => [...prev, newItem]);
setUser((prev) => ({ ...prev, name: "New Name" }));

// ❌ BAD: Direct mutations
items.push(newItem);
user.name = "New Name";
```

### Router Issues

```tsx
// App Router - Server Component (default)
export default function Page() {
  // No hooks here
}

// App Router - Client Component
("use client");
export default function InteractiveComponent() {
  const [state, setState] = useState(); // ✅ OK here
}

// Pages Router - Traditional
export default function PageComponent() {
  const [state, setState] = useState(); // ✅ Always OK
}
```

---

## ✅ Quality Gates (Before Any Change)

### Code Quality ✅

- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript compiles without errors
- [ ] ESLint rules pass (`npm run lint`)

### Architecture Compliance ✅

- [ ] Follows established patterns from guides
- [ ] Maintains router coexistence
- [ ] Preserves existing integrations
- [ ] Uses immutable state updates

### User Impact ✅

- [ ] Feature works as expected
- [ ] Performance not degraded
- [ ] No regression in existing functionality
- [ ] Accessibility maintained

---

## 🎯 Communication Protocol

### Before Making Changes

1. **Understand the goal** - What specific problem are we solving?
2. **Check the guides** - Does this follow our established patterns?
3. **Identify scope** - Is this a surgical fix or major change?
4. **Confirm approach** - Ask if unsure about architectural decisions

### When Stuck

1. **Reference documentation links** - Official docs over guessing
2. **Follow established patterns** - Look at similar existing code
3. **Ask specific questions** - "Should this be App Router or Pages Router?"
4. **Test incrementally** - Small changes, frequent validation

### After Changes

1. **Run quality gates** - Build, test, lint
2. **Test the feature** - Verify it works as intended
3. **Check for regressions** - Ensure nothing else broke
4. **Document if needed** - Update guides for future reference

---

## 🏆 Success Indicators

You're doing great when:

- ✅ Build passes consistently
- ✅ Both routers work together harmoniously
- ✅ New features integrate smoothly with existing ones
- ✅ Code follows React best practices
- ✅ Users can accomplish their freediving goals
- ✅ The platform feels cohesive and professional

---

## 🚀 Project Mission Reminder

**"Build a platform that freediving instructors trust and students love"**

Every change should make the platform:

- More trustworthy and reliable
- Better for learning and teaching freediving
- Safer and more accessible
- More effective for dive training and logging

---

_Keep this card open during development. Reference it frequently. Follow it exactly._
