#!/bin/bash

# 🧹 PROJECT ORGANIZATION ENFORCER
# Run this script to maintain clean project structure

echo "🧹 Checking project organization..."

PROJECT_ROOT="/Users/danielkoval/Documents/buildaiagent/Project directory/KovalDeepAI-main"
cd "$PROJECT_ROOT"

# Check for scattered MD files in root
ROOT_MDS=$(find . -maxdepth 1 -name "*.md" -type f | wc -l)
if [ "$ROOT_MDS" -gt 0 ]; then
    echo "⚠️  Found $ROOT_MDS MD files in root directory"
    echo "📁 Moving to docs/ folder..."
    find . -maxdepth 1 -name "*.md" -type f -exec mv {} docs/ \;
    echo "✅ MD files moved to docs/"
fi

# Check for scattered test files in root
ROOT_TESTS=$(find . -maxdepth 1 -name "*test*.js" -o -name "*debug*.js" -o -name "*diagnos*.js" | wc -l)
if [ "$ROOT_TESTS" -gt 0 ]; then
    echo "⚠️  Found $ROOT_TESTS test/debug files in root directory"
    echo "🧪 Moving to tests/ folder..."
    find . -maxdepth 1 \( -name "*test*.js" -o -name "*debug*.js" -o -name "*diagnos*.js" \) -exec mv {} tests/ \;
    echo "✅ Test files moved to tests/"
fi

# Check directory structure
echo ""
echo "📁 Current organization:"
echo "📚 Documentation: $(ls -1 docs/ 2>/dev/null | wc -l) files in docs/"
echo "🧪 Tests: $(ls -1 tests/ 2>/dev/null | wc -l) files in tests/"
echo "🔧 Root utilities: $(ls -1 *.jsw *.html *.sh 2>/dev/null | wc -l) essential tools only"

# Check for production safety
if [ -f "wix-site/wix-app/backend/userMemory.jsw" ]; then
    PROD_SIZE=$(wc -l < "wix-site/wix-app/backend/userMemory.jsw" 2>/dev/null || echo "0")
    if [ "$PROD_SIZE" -gt 500 ]; then
        echo "✅ Production backend safe ($PROD_SIZE lines)"
    else
        echo "⚠️  Production backend seems small ($PROD_SIZE lines)"
    fi
else
    echo "❌ Production backend file missing!"
fi

echo ""
echo "🎯 Organization Rules:"
echo "📚 All documentation → docs/ folder"
echo "🧪 All tests → tests/ folder"  
echo "🔒 Production files → NEVER modify for testing"
echo "🛠️ Root → Only essential tools (*.jsw, *.html, *.sh)"

echo ""
echo "✅ Project organization check complete!"
