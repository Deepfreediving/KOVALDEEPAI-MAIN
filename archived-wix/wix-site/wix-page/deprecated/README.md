# 🗂️ Deprecated Wix Frontend Files

**⚠️ DO NOT USE THESE FILES FOR PRODUCTION ⚠️**

This folder contains legacy and deprecated versions of Wix frontend page code that have been superseded by the master file.

## 📋 Deprecated Files

| File                          | Original Purpose              | Deprecated Date | Reason                      |
| ----------------------------- | ----------------------------- | --------------- | --------------------------- |
| `wix-frontend-page.js`        | Basic simplified version      | V4.0            | Missing session management  |
| `wix-frontend-page-fixed.js`  | Duplicate of basic version    | V4.0            | Redundant/missing features  |
| `wix-frontend-page-old.js`    | Complex legacy implementation | V4.0            | Overly complex (2364 lines) |
| `wix-frontend-page-simple.js` | Empty placeholder             | V4.0            | No content                  |

## ✅ Use Instead

**Master File:** `../wix-frontend-page-simplified.js`

This is the current production-ready file with:

- ✅ Session management
- ✅ Vercel integration
- ✅ Offline buffering
- ✅ Robust error handling
- ✅ Clean architecture

## 🗑️ Archive Policy

These files are kept for:

- Historical reference
- Code archaeology if needed
- Rollback scenarios (emergency only)

**Consider deleting after 6 months if no issues arise.**

---

**Archive Date:** V4.0 Release  
**Superseded By:** `wix-frontend-page-simplified.js`
