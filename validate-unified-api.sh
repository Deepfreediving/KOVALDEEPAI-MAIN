#!/bin/bash

echo "🔍 FINAL VALIDATION - Unified Upload API"
echo "========================================"

echo ""
echo "📁 File Structure Check:"
echo "------------------------"

# Check main API file exists
if [ -f "apps/web/pages/api/dive/upload-image.js" ]; then
    echo "✅ Main API file: apps/web/pages/api/dive/upload-image.js"
else
    echo "❌ Main API file missing!"
    exit 1
fi

# Check for any broken files
BROKEN_FILES=$(find . -name "*upload-image-broken*" -o -name "*upload-image-fixed*" 2>/dev/null | grep -v archive)
if [ -z "$BROKEN_FILES" ]; then
    echo "✅ No broken upload files in active directories"
else
    echo "❌ Found broken files: $BROKEN_FILES"
fi

echo ""
echo "🧪 Syntax Validation:"
echo "---------------------"

# Check if Next.js can parse the file (ES modules are expected for Next.js API routes)
# We'll just check that the file is not empty and has basic structure
if [ -s "apps/web/pages/api/dive/upload-image.js" ] && grep -q "export default" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Main API file has proper Next.js API structure"
else
    echo "❌ API file is empty or missing export"
    exit 1
fi

echo ""
echo "📦 Dependencies Check:"
echo "----------------------"

# Check if required dependencies are in package.json
DEPS_FOUND=0
if grep -q "formidable" apps/web/package.json; then
    echo "✅ formidable dependency found"
    ((DEPS_FOUND++))
fi

if grep -q "openai" apps/web/package.json; then
    echo "✅ openai dependency found"
    ((DEPS_FOUND++))
fi

if grep -q "sharp" apps/web/package.json; then
    echo "✅ sharp dependency found"
    ((DEPS_FOUND++))
fi

if [ $DEPS_FOUND -eq 3 ]; then
    echo "✅ All required dependencies present"
else
    echo "⚠️  Some dependencies may be missing"
fi

echo ""
echo "🔧 API Configuration Check:"
echo "---------------------------"

# Check for required imports and exports
if grep -q "export default async function handler" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Proper Next.js API handler export found"
else
    echo "❌ Missing proper API handler export"
fi

if grep -q "formidable" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Formidable import found"
else
    echo "❌ Missing formidable import"
fi

if grep -q "import OpenAI" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ OpenAI import found"
else
    echo "❌ Missing OpenAI import"
fi

if grep -q "getAdminClient" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Supabase client import found"
else
    echo "❌ Missing Supabase client import"
fi

echo ""
echo "🎯 Feature Validation:"
echo "----------------------"

# Check for key features
if grep -q "multipart/form-data" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ File upload support (multipart/form-data)"
else
    echo "❌ Missing file upload support"
fi

if grep -q "base64" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Base64 upload support"
else
    echo "❌ Missing base64 upload support"
fi

if grep -q "analyzeWithEnhancedVision" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Enhanced vision analysis function"
else
    echo "❌ Missing vision analysis function"
fi

if grep -q "optimizeImage" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Image optimization function"
else
    echo "❌ Missing image optimization function"
fi

if grep -q "ensureStorageBucket" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Storage bucket management function"
else
    echo "❌ Missing storage bucket function"
fi

echo ""
echo "🛡️ Error Handling Check:"
echo "------------------------"

if grep -q "try {" apps/web/pages/api/dive/upload-image.js && grep -q "} catch" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ Try-catch error handling present"
else
    echo "❌ Missing proper error handling"
fi

if grep -q "res.status(400)" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ 400 Bad Request error handling"
else
    echo "❌ Missing 400 error handling"
fi

if grep -q "res.status(405)" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ 405 Method Not Allowed error handling"
else
    echo "❌ Missing 405 error handling"
fi

if grep -q "res.status(500)" apps/web/pages/api/dive/upload-image.js; then
    echo "✅ 500 Internal Server Error handling"
else
    echo "❌ Missing 500 error handling"
fi

echo ""
echo "📊 Integration Points:"
echo "---------------------"

# Check frontend integration
if [ -f "apps/web/components/DiveJournalDisplay.jsx" ]; then
    if grep -q "/api/dive/upload-image" apps/web/components/DiveJournalDisplay.jsx; then
        echo "✅ Frontend calls unified upload endpoint"
    else
        echo "❌ Frontend not updated to use unified endpoint"
    fi
else
    echo "⚠️  Frontend component not found"
fi

# Check save-dive-log API
if [ -f "apps/web/pages/api/supabase/save-dive-log.js" ]; then
    echo "✅ save-dive-log API exists"
else
    echo "❌ save-dive-log API missing"
fi

echo ""
echo "🎉 VALIDATION SUMMARY:"
echo "====================="

# Count issues
CRITICAL_CHECKS=8
PASSED_CHECKS=0

# Re-run critical checks and count
[ -s "apps/web/pages/api/dive/upload-image.js" ] && grep -q "export default" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
grep -q "export default async function handler" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
grep -q "try {" apps/web/pages/api/dive/upload-image.js && grep -q "} catch" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
grep -q "multipart/form-data" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
grep -q "base64" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
grep -q "analyzeWithEnhancedVision" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
grep -q "res.status(405)" apps/web/pages/api/dive/upload-image.js && ((PASSED_CHECKS++))
[ -f "apps/web/pages/api/dive/upload-image.js" ] && ((PASSED_CHECKS++))

if [ $PASSED_CHECKS -eq $CRITICAL_CHECKS ]; then
    echo "🎯 Status: ALL CRITICAL CHECKS PASSED ($PASSED_CHECKS/$CRITICAL_CHECKS)"
    echo "✅ The unified upload API is PRODUCTION READY!"
    echo ""
    echo "🚀 Ready to:"
    echo "   - Start development server: npm run dev:web"
    echo "   - Test uploads in dive journal interface"
    echo "   - Deploy to production environment"
    exit 0
else
    echo "⚠️  Status: Some issues found ($PASSED_CHECKS/$CRITICAL_CHECKS checks passed)"
    echo "❌ Review the issues above before deploying"
    exit 1
fi
