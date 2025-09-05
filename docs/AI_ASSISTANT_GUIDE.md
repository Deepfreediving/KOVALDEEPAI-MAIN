# AI Assistant Guide - KovalDeepAI Project

## 🎯 PROJECT OVERVIEW

**KovalDeepAI** is a sophisticated diving/freediving education platform built with Next.js 14, featuring:

- **Hybrid Architecture**: Pages Router + App Router (coexisting seamlessly)
- **AI Integration**: OpenAI GPT-4, Pinecone vector DB, Supabase backend
- **Core Features**: Dive logs, coaching, safety protocols, equipment tracking
- **Tech Stack**: Next.js 14, TypeScript, React, Tailwind CSS, Prisma

---

## 🏗️ DIRECTORY ARCHITECTURE

### Root Structure

```
/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/
├── apps/web/                    # Main Next.js application
├── packages/core/              # Shared utilities and types
├── components/                 # Shared React components
├── data/                      # Training data and logs
├── docs/                      # Documentation (YOU ARE HERE)
├── tests/                     # All test files and scripts
├── archive/                   # Deprecated/legacy code
├── supabase/                  # Database schemas and migrations
└── scripts/                   # Build and deployment scripts
```

### Critical Paths

- **Main App**: `/apps/web/` (all development happens here)
- **Pages Router**: `/apps/web/pages/` (legacy + API routes)
- **App Router**: `/apps/web/app/` (modern features)
- **Components**: `/apps/web/components/` + `/components/` (shared)
- **API Endpoints**: `/apps/web/pages/api/`
- **Tests**: `/tests/` (consolidated from root)

---

## 🚨 CRITICAL RULES & CONSTRAINTS

### File Management Rules

1. **NO ROOT CLUTTER**: Never create files in project root except configs
2. **TEST CONSOLIDATION**: All tests must go in `/tests/` directory
3. **NO DUPLICATES**: Check for existing files before creating new ones
4. **SURGICAL EDITS**: Make minimal, targeted changes - no major refactors
5. **VALIDATE CHANGES**: Always run build after modifications

### Architecture Rules

1. **RESPECT DUAL ROUTING**: Pages Router and App Router must coexist
2. **NO MIGRATION PRESSURE**: Don't force Pages → App Router migrations
3. **MODULAR ORGANIZATION**: Keep related files grouped logically
4. **TYPESCRIPT STRICT**: Maintain type safety across all files
5. **COMPONENT PURITY**: Follow React best practices for state/effects

### Code Quality Rules

1. **IMPORTS**: Use absolute paths, proper Next.js imports
2. **HOOKS**: No conditional hook calls, proper dependency arrays
3. **IMAGES**: Use Next.js `<Image>` component, not `<img>`
4. **SERIALIZATION**: Ensure all props are serializable
5. **ERROR HANDLING**: Implement proper try/catch and fallbacks

---

## 🔧 DEVELOPMENT WORKFLOW

### Before Making Changes

1. **Audit Current State**: Use `semantic_search` and `read_file` to understand context
2. **Check Dependencies**: Verify imports and component relationships
3. **Test Current Build**: Run `npm run build` to establish baseline
4. **Plan Surgical Changes**: Identify minimal changes needed

### While Making Changes

1. **One File at a Time**: Complete each file before moving to next
2. **Validate Immediately**: Check for errors after each edit
3. **Maintain Structure**: Respect existing patterns and conventions
4. **Document Reasoning**: Explain why changes are needed

### After Making Changes

1. **Build Verification**: Always run `npm run build`
2. **Error Resolution**: Fix any new TypeScript/build errors
3. **Integration Testing**: Verify components work together
4. **Documentation Updates**: Update relevant docs if needed

---

## 📋 COMMON TASKS & SOLUTIONS

### Build Error Resolution

```bash
# Standard build check
cd /Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/apps/web
npm run build

# TypeScript type checking
npx tsc --noEmit

# Linting
npm run lint
```

### Component Debugging

1. Check for conditional hook usage
2. Verify all imports are correct
3. Ensure props are serializable
4. Check for proper Next.js patterns

### API Integration Issues

1. Verify environment variables are set
2. Check Supabase/Pinecone/OpenAI connections
3. Validate API route implementations
4. Test authentication flows

---

## 🛠️ TECHNICAL SPECIFICATIONS

### Next.js Configuration

- **Version**: 14.x with App Router support
- **TypeScript**: Strict mode enabled
- **ESLint**: Custom rules for project standards
- **Build Target**: Production-ready optimizations

### Database & External Services

- **Supabase**: Primary database and auth
- **Pinecone**: Vector database for AI features
- **OpenAI**: GPT-4 integration for chat/analysis
- **Vercel**: Deployment platform

### Component Standards

- **React**: Functional components with hooks
- **Styling**: Tailwind CSS with custom utilities
- **State Management**: React hooks + context where needed
- **Type Safety**: Full TypeScript coverage

---

## 📚 REFERENCE DOCUMENTATION

### Official Docs (PRIORITY READING)

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Framework-Specific Guides

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Pages Router](https://nextjs.org/docs/pages)
- [React Hooks](https://react.dev/reference/react)
- [Supabase Docs](https://supabase.com/docs)

---

## 🎯 CURRENT PROJECT STATUS

### Recently Completed ✅

- Root directory cleanup (moved tests to `/tests/`)
- React hook fixes in `ChatBox.jsx`
- Next.js Image component implementations
- Build configuration optimizations
- TypeScript error resolutions

### Active Issues 🔄

- Build errors related to `<Html>` imports
- useContext null reference errors
- NextRouter mounting issues
- Component serialization problems

### Next Priorities 📋

1. Fix remaining build errors
2. Resolve TypeScript issues in App Router
3. Validate API integrations
4. Complete component purity audit
5. Documentation updates

---

## 💡 AI ASSISTANT BEST PRACTICES

### Research First

- Use `semantic_search` to understand codebase context
- Read related files with `read_file` before making changes
- Check existing patterns with `grep_search`
- Verify current state with `list_dir`

### Surgical Editing

- Use `replace_string_in_file` for precise changes
- Use `insert_edit_into_file` for additions
- Always include sufficient context in edits
- Validate changes immediately

### Error Handling

- Run `npm run build` after each significant change
- Use `get_errors` to check for TypeScript issues
- Fix errors in logical sequence
- Don't create new errors while fixing existing ones

### Documentation

- Update relevant docs when making architectural changes
- Explain reasoning for complex modifications
- Reference official documentation for best practices
- Maintain clear commit-like descriptions

---

## 🚀 QUICK START COMMANDS

### Development Server

```bash
cd apps/web
npm run dev
```

### Build & Deploy

```bash
cd apps/web
npm run build
npm start
```

### Testing

```bash
cd tests
npm test
```

### Type Checking

```bash
cd apps/web
npx tsc --noEmit
```

---

## 📞 EMERGENCY PROCEDURES

### If Build Completely Breaks

1. Check recent changes with `git diff`
2. Revert last change if possible
3. Focus on one error at a time
4. Use `semantic_search` to find related issues
5. Consult this guide and official docs

### If Components Stop Rendering

1. Check for conditional hook usage
2. Verify all imports are present
3. Check for serialization issues
4. Validate props and state structure

### If APIs Stop Working

1. Verify environment variables
2. Check Supabase connection
3. Validate API route implementations
4. Test authentication flows

---

## 🔍 DEBUGGING TOOLKIT

### Essential VS Code Extensions

- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Next.js snippets

### Browser DevTools

- React Developer Tools
- Redux DevTools (if applicable)
- Network tab for API debugging
- Console for runtime errors

### Command Line Tools

- `npm run build` - Production build check
- `npx tsc --noEmit` - Type checking
- `npm run lint` - Code quality check
- `git diff` - Recent changes review

---

## 📋 CHANGE LOG TEMPLATE

When making significant changes, document them like this:

```markdown
### [Date] - [Change Type]

**Files Modified**:

- `/path/to/file.tsx`
- `/path/to/other.ts`

**Changes Made**:

- Fixed React hook conditional usage
- Added proper TypeScript types
- Optimized component rendering

**Reasoning**:

- Resolved build errors
- Improved type safety
- Enhanced performance

**Validation**:

- ✅ Build passes
- ✅ TypeScript checks
- ✅ Component renders correctly
```

---

## 🎖️ SUCCESS METRICS

### Technical Health

- ✅ Clean `npm run build` with no errors
- ✅ All TypeScript checks pass
- ✅ Components render without warnings
- ✅ APIs respond correctly

### Code Quality

- ✅ No conditional hook usage
- ✅ Proper component serialization
- ✅ Clean import statements
- ✅ Consistent file organization

### User Experience

- ✅ Fast page loads
- ✅ Smooth interactions
- ✅ No runtime errors
- ✅ Responsive design works

---

_This guide is your bible. Follow it religiously, and the project will remain healthy and maintainable. When in doubt, refer back to this document and official React/Next.js documentation._

**Last Updated**: [Current Date]
**Version**: 1.0
**Maintainer**: AI Assistant + Human Developer
