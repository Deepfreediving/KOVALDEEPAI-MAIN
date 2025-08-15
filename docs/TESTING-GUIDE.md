# 🧪 Testing Guide - Koval Deep AI

## Organized Test Structure

All tests have been organized into logical categories for easy reuse:

### 📁 tests/integration/
**Use for: Full system testing, deployment verification**
- `final-verification-v6.js` - Complete V6.0 system verification
- `comprehensive-system-audit.js` - Full system health check
- `final-verification.js` - General system verification
- `post-deployment-verification.js` - Post-deployment checks
- `production-integration-test.js` - Production environment testing
- `emergency-vercel-bypass-test.js` - Vercel connectivity testing
- `final-integration-test.sh` - Shell script for integration testing

### 📁 tests/api/
**Use for: Backend API testing, Wix function testing**
- `test-upload-fixes.js` - Image upload functionality
- `test-production-upload.js` - Production upload testing
- `test-image-analysis.js` - AI image analysis testing
- `test-live-ai-fixed.js` - Live AI functionality
- `test-live-ai-functionality.js` - AI feature testing
- `wix-backend-diagnosis.js` - Wix backend diagnostics

### 📁 tests/frontend/
**Use for: UI testing, localStorage, frontend debugging**
- `debug-dive-logs.js` - Dive log display debugging
- `debug-storage.js` - LocalStorage debugging

### 📁 tests/ (existing)
**Legacy tests organized by component**
- Various component-specific and backend connection tests

## 🚀 Quick Test Commands

### Run Full System Verification
```bash
cd /path/to/project
node tests/integration/final-verification-v6.js
```

### Test Backend Functions
```bash
node tests/api/wix-backend-diagnosis.js
```

### Debug Frontend Issues
```bash
node tests/frontend/debug-dive-logs.js
```

### Run Integration Test Suite
```bash
./tests/integration/final-integration-test.sh
```

## 📋 Test Categories for Future Use

1. **Before Deployment**: Use `tests/integration/comprehensive-system-audit.js`
2. **After Deployment**: Use `tests/integration/post-deployment-verification.js`
3. **API Issues**: Use files in `tests/api/`
4. **Frontend Issues**: Use files in `tests/frontend/`
5. **Full Verification**: Use `tests/integration/final-verification-v6.js`

## 💡 Best Practices

- **Don't create new test files** - Reuse existing ones in organized folders
- **Update existing tests** rather than duplicating functionality
- **Use the most specific test** for the issue you're debugging
- **Run integration tests** before and after major changes

## 🔍 Test File Purposes

| Test File | Purpose | When to Use |
|-----------|---------|-------------|
| `final-verification-v6.js` | Complete system check | After deployment, major changes |
| `comprehensive-system-audit.js` | Full health audit | Periodic health checks |
| `wix-backend-diagnosis.js` | Backend API testing | Backend issues |
| `debug-dive-logs.js` | Frontend dive log issues | UI display problems |
| `test-image-analysis.js` | AI image processing | Image upload issues |

---
*Last Updated: August 14, 2025*
*Use this guide to reference existing tests instead of creating new ones*
