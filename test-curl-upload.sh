#!/bin/bash

echo "🧪 Testing UNIFIED Upload API with curl..."
echo "==========================================="

# Test 1: Base64 Upload
echo ""
echo "📝 Test 1: Base64 Upload"
echo "------------------------"

# Sample base64 image (1x1 pixel transparent PNG)
BASE64_IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHIff6RWgAAAABJRU5ErkJggg=="

curl -X POST http://localhost:3000/api/dive/upload-image \
  -H "Content-Type: application/json" \
  -d "{
    \"imageData\": \"$BASE64_IMAGE\",
    \"userId\": \"test-user-123\",
    \"diveLogId\": \"test-dive-456\",
    \"filename\": \"test-curl-upload.png\"
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "🔍 Test 2: Error Handling (Missing userId)"
echo "------------------------------------------"

curl -X POST http://localhost:3000/api/dive/upload-image \
  -H "Content-Type: application/json" \
  -d "{
    \"imageData\": \"$BASE64_IMAGE\",
    \"filename\": \"test-missing-userid.png\"
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "🔍 Test 3: Error Handling (Invalid Method)"
echo "------------------------------------------"

curl -X GET http://localhost:3000/api/dive/upload-image \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Curl tests completed!"
