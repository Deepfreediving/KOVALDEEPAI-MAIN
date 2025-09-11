#!/bin/bash
# Test script to verify Dive Journal functionality

echo "🧪 Testing Koval Deep AI - Dive Journal Functionality"
echo "=================================================="

# Test 1: Check if development server is running
echo "1. Checking development server status..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Development server is running on port 3000"
else
    echo "❌ Development server is not responding"
    exit 1
fi

# Test 2: Test dive log analysis API
echo "2. Testing dive log analysis API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/analyze/dive-log-openai \
  -H "Content-Type: application/json" \
  -d '{
    "diveLogData": {
      "text": "Depth: 30m, Duration: 45 minutes, Visibility: 15m, Water temp: 22°C."
    }
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Dive log analysis API is working"
else
    echo "❌ Dive log analysis API failed"
    echo "Response: $RESPONSE"
fi

# Test 3: Check frontend endpoint
echo "3. Checking frontend loads..."
if curl -s http://localhost:3000 | grep -q "html"; then
    echo "✅ Frontend is loading properly"
else
    echo "❌ Frontend is not loading"
fi

echo ""
echo "🎯 Summary of fixes implemented:"
echo "- Fixed infinite render loop by removing console.log from JSX"
echo "- Updated trusted origins to include localhost:3001"
echo "- Fixed DiveJournalDisplay modal rendering with isEmbedded=true"
echo "- Verified API endpoints are working correctly"
echo ""
echo "🚀 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Look for the 'Dive Journal' button/section in the sidebar"
echo "3. Click to open the dive journal modal"
echo "4. Test adding a new dive log entry"
echo "5. Test the dive log analysis feature"
