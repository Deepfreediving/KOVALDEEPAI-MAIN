#!/bin/bash

# ✅ V6.0 IMAGE UPLOAD FIELD MAPPING TEST
# Test the updated upload-dive-image endpoint with nickname field mapping

echo "🧪 V6.0 IMAGE UPLOAD FIELD MAPPING TEST"
echo "========================================"

PRODUCTION_API="https://kovaldeepai-main.vercel.app"
TEST_API="$PRODUCTION_API"

echo "🎯 Testing API: $TEST_API"

# Create a simple test image (1x1 PNG)
echo -n -e '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x01\x00\x00\x00\x007n\xf9$\x00\x00\x00\nIDATx\x9cb\x00\x00\x00\x02\x00\x01\xe5'"'"'\xde\xfc\x00\x00\x00\x00IEND\xaeB`\x82' > test-image.png

echo ""
echo "🔍 Testing nickname field mapping..."

# Test with nickname field (new mapping)
RESPONSE=$(curl -s -w "%{http_code}" -X POST \
  "$TEST_API/api/openai/upload-dive-image" \
  -F "image=@test-image.png" \
  -F "nickname=test-user-v6" \
  -F "diveLogId=test-$(date +%s)" \
  -o response.json)

HTTP_CODE="${RESPONSE: -3}"
echo "📡 Response status: $HTTP_CODE"

if [ "$HTTP_CODE" = "500" ]; then
  echo "❌ 500 Error - Field mapping issue still exists"
  echo "Response body:"
  cat response.json
  rm -f test-image.png response.json
  exit 1
elif [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Nickname field mapping works!"
  echo "Response preview:"
  jq -r '.success, .message' response.json 2>/dev/null || echo "Response data present"
else
  echo "⚠️ Unexpected status code: $HTTP_CODE"
  cat response.json
fi

echo ""
echo "🔄 Testing backward compatibility with userId field..."

# Test with userId field (backward compatibility)
RESPONSE2=$(curl -s -w "%{http_code}" -X POST \
  "$TEST_API/api/openai/upload-dive-image" \
  -F "image=@test-image.png" \
  -F "userId=legacy-user-v6" \
  -F "diveLogId=legacy-$(date +%s)" \
  -o response2.json)

HTTP_CODE2="${RESPONSE2: -3}"
echo "📡 Response status: $HTTP_CODE2"

if [ "$HTTP_CODE2" = "500" ]; then
  echo "❌ Backward compatibility failed"
  cat response2.json
elif [ "$HTTP_CODE2" = "200" ]; then
  echo "✅ Backward compatibility works!"
else
  echo "⚠️ Unexpected status code: $HTTP_CODE2"
fi

echo ""
echo "📊 TEST RESULTS:"
echo "================"

if [ "$HTTP_CODE" = "200" ] && [ "$HTTP_CODE2" = "200" ]; then
  echo "✅ All tests passed!"
  echo "🚀 The image upload endpoint is working correctly with the new field mapping!"
  echo "   • Accepts 'nickname' field for new requests"
  echo "   • Falls back to 'userId' field for legacy requests"
  echo "   • No more 500 errors expected for field mapping issues"
else
  echo "❌ Some tests failed. The 500 error may persist."
fi

# Cleanup
rm -f test-image.png response.json response2.json
