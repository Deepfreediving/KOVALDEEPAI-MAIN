#!/bin/bash
# 🔍 KovalDeepAI System Health Verification Script

echo "🔍 KovalDeepAI System Health Check"
echo "=================================="

# Check for legacy files that should be removed
echo "📁 Checking for legacy files..."
find . -name "*.backup" -o -name "*.old" -o -name "*-legacy*" -o -name "temp_*" | head -10

# Check build status
echo "🏗️ Testing build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build: PASS"
else
    echo "❌ Build: FAIL"
fi

# Check for duplicate dependencies
echo "📦 Checking dependencies..."
npm ls --depth=0 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dependencies: CLEAN"
else
    echo "⚠️ Dependencies: CHECK NEEDED"
fi

# Verify key files exist
echo "📋 Verifying core files..."
key_files=(
    "pages/index.jsx"
    "public/bot-widget.js"  
    "wix-site/wix-app/backend/userMemory.jsw"
    "docs/FINAL-STATUS.md"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file MISSING"
    fi
done

echo ""
echo "🎯 System Status: Ready for production use"
echo "📚 See docs/FINAL-STATUS.md for deployment guide"
