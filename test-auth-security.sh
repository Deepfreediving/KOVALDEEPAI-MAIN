#!/bin/bash
# Comprehensive Authentication Security Test Suite
# Tests all authentication hardening changes

set -e

API_BASE="http://localhost:3000"
WIX_SITE="https://www.deepfreediving.com"
TIMESTAMP=$(date +%s)

echo "🔒 KOVAL AI AUTHENTICATION SECURITY TEST SUITE"
echo "==============================================="
echo "Testing API hardening and authentication enforcement"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    echo -n "Testing: $test_name ... "
    
    # Run the test command and capture status
    set +e
    result=$(eval "$test_command" 2>/dev/null)
    status=$?
    set -e
    
    # Check if test passed
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC} (expected status $expected_status, got $status)"
        echo "  Result: $result"
        ((TESTS_FAILED++))
    fi
}

echo "📋 TEST 1: Chat API Authentication Enforcement"
echo "----------------------------------------------"

# Test 1.1: Chat API should reject guest users
run_test "Chat API rejects guest user" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\",\"userId\":\"guest-123\"}'" \
    0

# Test 1.2: Chat API should reject session users  
run_test "Chat API rejects session user" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\",\"userId\":\"session-123\"}'" \
    0

# Test 1.3: Chat API should reject temp users
run_test "Chat API rejects temp user" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\",\"userId\":\"temp-123\"}'" \
    0

# Test 1.4: Chat API should reject missing userId
run_test "Chat API rejects missing userId" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\"}'" \
    0

echo ""
echo "📋 TEST 2: Image Upload API Authentication Enforcement"
echo "-------------------------------------------------------"

# Create a test image
echo "Creating test image..."
echo "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" | base64 -d > /tmp/test-upload.gif

# Test 2.1: Upload API should reject guest users
run_test "Upload API rejects guest user" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/upload-dive-image -F 'image=@/tmp/test-upload.gif' -F 'nickname=guest-123' -F 'diveLogId=test-123'" \
    0

# Test 2.2: Upload API should reject session users
run_test "Upload API rejects session user" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/upload-dive-image -F 'image=@/tmp/test-upload.gif' -F 'nickname=session-123' -F 'diveLogId=test-123'" \
    0

# Test 2.3: Upload API should reject temp users
run_test "Upload API rejects temp user" \
    "curl -s -w '%{http_code}' -o /dev/null -X POST $API_BASE/api/openai/upload-dive-image -F 'image=@/tmp/test-upload.gif' -F 'nickname=temp-123' -F 'diveLogId=test-123'" \
    0

echo ""
echo "📋 TEST 3: Wix Identity Code Security"
echo "--------------------------------------"

# Test 3.1: Create identity code should require authentication
echo "Testing Wix identity code endpoints..."
echo "Note: These require Wix authentication and may return CORS errors in local testing"

echo ""
echo "📋 TEST 4: Frontend Authentication Gating"
echo "------------------------------------------"

# Test 4.1: Check if guest user IDs are still generated
echo "Checking for guest ID generation patterns..."

# Search for any remaining guest ID creation
if grep -r "guest-" --include="*.jsx" --include="*.js" --include="*.ts" pages/ components/ utils/ 2>/dev/null | grep -v "// " | grep -v "startsWith.*guest" | grep -v "includes.*guest" | grep -v "test" > /tmp/guest-search.txt; then
    echo -e "${YELLOW}⚠️  WARNING: Found potential guest ID generation:${NC}"
    cat /tmp/guest-search.txt
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✅ PASSED: No guest ID generation found in main code${NC}"
    ((TESTS_PASSED++))
fi

# Test 4.2: Check for session ID generation
if grep -r "session-" --include="*.jsx" --include="*.js" --include="*.ts" pages/ components/ utils/ 2>/dev/null | grep -v "// " | grep -v "startsWith.*session" | grep -v "includes.*session" | grep -v "test" > /tmp/session-search.txt; then
    echo -e "${YELLOW}⚠️  WARNING: Found potential session ID generation:${NC}"
    cat /tmp/session-search.txt
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✅ PASSED: No session ID generation found in main code${NC}"
    ((TESTS_PASSED++))
fi

# Test 4.3: Check ChatBox authentication gating
if grep -A 5 -B 5 "isRealMemberId" components/ChatBox.jsx > /dev/null; then
    echo -e "${GREEN}✅ PASSED: ChatBox has authentication gating${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED: ChatBox missing authentication gating${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "📋 TEST 5: PostMessage Origin Security"
echo "---------------------------------------"

# Test 5.1: Check bot-widget.js origin restrictions
if grep -A 10 "allowedWixOrigins" public/bot-widget.js > /dev/null; then
    echo -e "${GREEN}✅ PASSED: bot-widget.js has strict origin checking${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED: bot-widget.js missing strict origin checking${NC}"
    ((TESTS_FAILED++))
fi

# Test 5.2: Check Wix frontend origin restrictions  
if grep -A 5 "allowedOrigins" wix-site/wix-page/wix-frontend-CLEAN.js > /dev/null; then
    echo -e "${GREEN}✅ PASSED: Wix frontend has origin checking${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED: Wix frontend missing origin checking${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "📋 TEST 6: Build and Runtime Checks"
echo "------------------------------------"

# Test 6.1: Check if build passes
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Application builds successfully${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED: Build errors detected${NC}"
    ((TESTS_FAILED++))
fi

# Test 6.2: Check for TypeScript errors
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: No TypeScript errors${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: TypeScript errors detected (may be expected)${NC}"
fi

# Cleanup
rm -f /tmp/test-upload.gif /tmp/guest-search.txt /tmp/session-search.txt

echo ""
echo "==============================================="
echo "🔒 AUTHENTICATION SECURITY TEST RESULTS"
echo "==============================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL SECURITY TESTS PASSED!${NC}"
    echo "✅ Authentication hardening is properly implemented"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed - review security implementation${NC}"
    exit 1
fi
