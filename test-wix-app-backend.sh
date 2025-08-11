#!/bin/bash

echo "🔥 WIX APP BACKEND CONNECTION TEST"
echo "=================================="
echo ""

# Test 1: Health Check
echo "🏥 Testing Health Check..."
curl -X GET \
  "https://www.deepfreediving.com/_functions/test" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Wix-App-ID: @deepfreediving/kovaldeepai-app" \
  --connect-timeout 10 \
  --max-time 30

echo ""
echo ""

# Test 2: User Memory Check
echo "👤 Testing User Memory..."
curl -X GET \
  "https://www.deepfreediving.com/_functions/userMemory?userId=test-user-123" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Wix-App-ID: @deepfreediving/kovaldeepai-app" \
  --connect-timeout 10 \
  --max-time 30

echo ""
echo ""

# Test 3: Save Test Data
echo "💾 Testing User Memory Save..."
curl -X POST \
  "https://www.deepfreediving.com/_functions/userMemory" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Wix-App-ID: @deepfreediving/kovaldeepai-app" \
  -d '{
    "userId": "test-user-123",
    "diveLogData": {
      "date": "2025-08-10",
      "discipline": "Test Dive",
      "location": "Test Pool",
      "targetDepth": 10,
      "reachedDepth": 9,
      "notes": "Test dive from curl script"
    }
  }' \
  --connect-timeout 10 \
  --max-time 30

echo ""
echo ""
echo "✅ Tests completed!"
echo "Check the output above for success/error responses."
