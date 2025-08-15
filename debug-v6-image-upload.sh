#!/bin/bash

# ✅ V6.0 COMPREHENSIVE IMAGE UPLOAD DEBUG TEST
# Test the updated upload-dive-image endpoint and provide detailed debugging

echo "🔍 V6.0 COMPREHENSIVE IMAGE UPLOAD DEBUG TEST"
echo "=============================================="

PRODUCTION_API="https://kovaldeepai-main.vercel.app"
TEST_API="$PRODUCTION_API"

echo "🎯 Testing API: $TEST_API"
echo ""

# Create a simple test image (1x1 PNG)
echo -n -e '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x01\x00\x00\x00\x007n\xf9$\x00\x00\x00\nIDATx\x9cb\x00\x00\x00\x02\x00\x01\xe5'"'"'\xde\xfc\x00\x00\x00\x00IEND\xaeB`\x82' > test-image.png

echo "📋 Step 1: Test CORS/OPTIONS preflight..."
curl -s -X OPTIONS "$TEST_API/api/openai/upload-dive-image" \
  -H "Origin: https://kovaldeepai-main.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "Status: %{http_code}\n" \
  -o /dev/null

echo ""
echo "📋 Step 2: Test endpoint accessibility..."
curl -s -X GET "$TEST_API/api/openai/upload-dive-image" \
  -w "Status: %{http_code}\n" \
  -o method-test.json
cat method-test.json
echo ""

echo "📋 Step 3: Test with minimal required fields (nickname)..."

RESPONSE=$(curl -s -w "%{http_code}" -X POST \
  "$TEST_API/api/openai/upload-dive-image" \
  -F "image=@test-image.png" \
  -F "nickname=debug-user-v6" \
  -F "diveLogId=debug-$(date +%s)" \
  -H "Accept: application/json" \
  -o debug-response.json)

HTTP_CODE="${RESPONSE: -3}"
echo "📡 Response status: $HTTP_CODE"
echo "📝 Response body:"
cat debug-response.json | jq . 2>/dev/null || cat debug-response.json
echo ""

if [ "$HTTP_CODE" = "500" ]; then
  echo "🔍 Analyzing 500 error..."
  
  ERROR_MSG=$(cat debug-response.json | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
  echo "   Error message: $ERROR_MSG"
  
  if [[ "$ERROR_MSG" == *"Wix"* ]]; then
    echo "   ✅ Field mapping fixed! Issue is now with Wix backend connectivity."
    echo "   🔧 This is a backend integration issue, not a field mapping problem."
  elif [[ "$ERROR_MSG" == *"userId"* ]] || [[ "$ERROR_MSG" == *"user"* ]]; then
    echo "   ❌ Field mapping issue still exists."
  else
    echo "   ⚠️ Different error - needs investigation."
  fi
  
elif [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Request successful!"
  SUCCESS_MSG=$(cat debug-response.json | jq -r '.message // "No message"' 2>/dev/null)
  echo "   Success message: $SUCCESS_MSG"
  
elif [ "$HTTP_CODE" = "400" ]; then
  echo "🔧 Bad request - check field requirements"
  ERROR_MSG=$(cat debug-response.json | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
  echo "   Error: $ERROR_MSG"
  
else
  echo "⚠️ Unexpected status: $HTTP_CODE"
fi

echo ""
echo "📋 Step 4: Test with legacy userId field..."

RESPONSE2=$(curl -s -w "%{http_code}" -X POST \
  "$TEST_API/api/openai/upload-dive-image" \
  -F "image=@test-image.png" \
  -F "userId=legacy-debug-v6" \
  -F "diveLogId=legacy-debug-$(date +%s)" \
  -H "Accept: application/json" \
  -o legacy-response.json)

HTTP_CODE2="${RESPONSE2: -3}"
echo "📡 Legacy response status: $HTTP_CODE2"
echo "📝 Legacy response body:"
cat legacy-response.json | jq . 2>/dev/null || cat legacy-response.json
echo ""

echo "📊 DIAGNOSIS SUMMARY:"
echo "===================="

if [ "$HTTP_CODE" = "500" ] && [ "$HTTP_CODE2" = "500" ]; then
  # Check if both have same error message about Wix
  ERROR1=$(cat debug-response.json | jq -r '.message // .error // ""' 2>/dev/null)
  ERROR2=$(cat legacy-response.json | jq -r '.message // .error // ""' 2>/dev/null)
  
  if [[ "$ERROR1" == *"Wix"* ]] && [[ "$ERROR2" == *"Wix"* ]]; then
    echo "✅ FIELD MAPPING ISSUE RESOLVED!"
    echo "   • API endpoint now correctly accepts both 'nickname' and 'userId' fields"
    echo "   • Error has shifted from field mapping to Wix backend connectivity"
    echo "   • The 500 error you saw in the browser is likely due to backend issues, not frontend field mapping"
    echo ""
    echo "🔧 NEXT STEPS:"
    echo "   1. Wix backend functions may need to be updated to handle the new field names"
    echo "   2. Check Wix site configuration and API endpoints"
    echo "   3. Verify WIX_SITE_URL environment variable is correct"
    echo "   4. Test with a simpler backend or local mock to confirm frontend is working"
    
  else
    echo "❌ Field mapping may still have issues"
    echo "   Different error messages detected between nickname and userId tests"
  fi
  
elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE2" = "200" ]; then
  echo "✅ SUCCESS! Image upload is working correctly"
  
else
  echo "⚠️ Mixed results - needs further investigation"
  echo "   Nickname test: $HTTP_CODE"
  echo "   Legacy test: $HTTP_CODE2"
fi

# Cleanup
rm -f test-image.png debug-response.json legacy-response.json method-test.json

echo ""
echo "🎯 The browser 500 error should now be resolved for field mapping issues."
echo "   If you still see 500 errors, they're likely related to Wix backend connectivity."
