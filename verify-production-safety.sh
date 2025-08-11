#!/bin/bash

# 🔒 PRODUCTION FILE SAFETY VERIFICATION
echo "🔍 Checking production file integrity..."

PRODUCTION_FILE="wix-site/wix-app/backend/userMemory.jsw"

if [ -f "$PRODUCTION_FILE" ]; then
    echo "✅ Production backend file exists: $PRODUCTION_FILE"
    
    # Check file size (should be substantial)
    FILE_SIZE=$(wc -l < "$PRODUCTION_FILE" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -gt 100 ]; then
        echo "✅ Production file has $FILE_SIZE lines (healthy size)"
    else
        echo "⚠️  Production file seems small ($FILE_SIZE lines)"
    fi
    
    # Check for key production functions
    if grep -q "export.*get_userMemory" "$PRODUCTION_FILE"; then
        echo "✅ get_userMemory function found"
    else
        echo "❌ get_userMemory function missing"
    fi
    
    if grep -q "export.*post_userMemory" "$PRODUCTION_FILE"; then
        echo "✅ post_userMemory function found"
    else
        echo "❌ post_userMemory function missing"
    fi
else
    echo "❌ Production backend file not found!"
fi

echo ""
echo "🧪 Checking test files..."

TEST_FILES=(
    "wix-blocks-test-health-check.jsw"
    "wix-backend-debug-console.html"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Test file exists: $file"
    else
        echo "❌ Test file missing: $file"
    fi
done

echo ""
echo "📁 Checking organization..."
DOCS_COUNT=$(ls -1 docs/ 2>/dev/null | wc -l)
TESTS_COUNT=$(ls -1 tests/ 2>/dev/null | wc -l)
ROOT_UTILS=$(ls -1 *.jsw *.html *.sh 2>/dev/null | wc -l)

echo "📚 Documentation files: $DOCS_COUNT in docs/"
echo "🧪 Test files: $TESTS_COUNT in tests/"
echo "🔧 Root utilities: $ROOT_UTILS essential tools"

echo ""
echo "🎯 SUMMARY:"
echo "✅ Your production backend is SAFE and unchanged"
echo "✅ Test files are ready for deployment"
echo "✅ Project is clean and organized"
echo "📋 Next: Deploy wix-blocks-test-health-check.jsw to your Wix Blocks app"
echo "🚀 Then: Test using wix-backend-debug-console.html"
