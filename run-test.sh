#!/bin/bash
echo "🧪 Running comprehensive test of all fixes..."
echo ""

# Check if dev server is running
echo "1. Checking if development server is running on localhost:3001..."
if curl -s http://localhost:3001 > /dev/null; then
    echo "   ✅ Development server is running"
else
    echo "   ❌ Development server not running. Please start with 'npm run dev' first."
    exit 1
fi

echo ""
echo "2. Running comprehensive test..."
node final-test.js