#!/bin/bash
# Static Code Analysis for Authentication Security
# Tests authentication hardening without needing a running server

echo "🔒 KOVAL AI STATIC AUTHENTICATION SECURITY AUDIT"
echo "================================================"
echo "Analyzing code for authentication security hardening"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASSED:${NC} $test_name"
        ((TESTS_PASSED++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAILED:${NC} $test_name"
        [ -n "$details" ] && echo "   $details"
        ((TESTS_FAILED++))
    else
        echo -e "${YELLOW}⚠️  WARNING:${NC} $test_name"
        [ -n "$details" ] && echo "   $details"
        ((WARNINGS++))
    fi
}

echo "📋 1. Chat API Authentication Enforcement"
echo "============================================"

# Check chat API rejects unauthenticated users
if grep -q "userId === \"guest\"" pages/api/openai/chat.ts && \
   grep -q "userId.startsWith(\"guest-\")" pages/api/openai/chat.ts && \
   grep -q "return res.status(401)" pages/api/openai/chat.ts; then
    test_result "Chat API enforces authentication" "PASS"
else
    test_result "Chat API enforces authentication" "FAIL" "Missing 401 authentication checks"
fi

# Check no default guest userId
if grep -q "userId = \"guest\"" pages/api/openai/chat.ts; then
    test_result "Chat API has no guest default" "FAIL" "Found default guest userId"
else
    test_result "Chat API has no guest default" "PASS"
fi

echo ""
echo "📋 2. Image Upload API Security"
echo "==============================="

# Check upload API authentication
if grep -q "userId.startsWith(\"guest-\")" pages/api/openai/upload-dive-image.ts && \
   grep -q "return res.status(401)" pages/api/openai/upload-dive-image.ts; then
    test_result "Upload API enforces authentication" "PASS"
else
    test_result "Upload API enforces authentication" "FAIL" "Missing 401 authentication checks"
fi

echo ""
echo "📋 3. Frontend Authentication Gating"
echo "===================================="

# Check ChatBox authentication gating
if grep -q "isRealMemberId" components/ChatBox.jsx && \
   grep -q "Authentication Required" components/ChatBox.jsx; then
    test_result "ChatBox enforces authentication" "PASS"
else
    test_result "ChatBox enforces authentication" "FAIL" "Missing authentication gating"
fi

# Check if getOrCreateUserId is removed from ChatBox
if grep -q "getOrCreateUserId" components/ChatBox.jsx; then
    test_result "ChatBox removed guest ID generation" "FAIL" "Still imports getOrCreateUserId"
else
    test_result "ChatBox removed guest ID generation" "PASS"
fi

echo ""
echo "📋 4. Wix Frontend Security"
echo "==========================="

# Check Wix frontend authentication requirements
if grep -q "showAuthenticationRequired" wix-site/wix-page/wix-frontend-CLEAN.js && \
   grep -q "requiresLogin: true" wix-site/wix-page/wix-frontend-CLEAN.js; then
    test_result "Wix frontend enforces authentication" "PASS"
else
    test_result "Wix frontend enforces authentication" "FAIL" "Missing authentication enforcement"
fi

# Check createGuestSession is not called on error
if grep -A 5 -B 5 "createGuestSession()" wix-site/wix-page/wix-frontend-CLEAN.js | grep -q "catch"; then
    test_result "Wix frontend removed guest fallback" "FAIL" "Still calls createGuestSession on error"
else
    test_result "Wix frontend removed guest fallback" "PASS"
fi

echo ""
echo "📋 5. PostMessage Origin Security"
echo "================================="

# Check bot-widget.js origin restrictions
if grep -q "allowedWixOrigins" public/bot-widget.js && \
   grep -q "www.deepfreediving.com" public/bot-widget.js; then
    test_result "Bot widget has strict origin checking" "PASS"
else
    test_result "Bot widget has strict origin checking" "FAIL" "Missing strict origin allowlist"
fi

# Check for wildcard origin usage
if grep -q "\"\\*\"" public/bot-widget.js || grep -q "'\\*'" public/bot-widget.js; then
    wildcard_count=$(grep -c "\"\\*\"\\|'\\*'" public/bot-widget.js)
    test_result "Bot widget avoids wildcard origins" "WARN" "Found $wildcard_count wildcard origins (review needed)"
else
    test_result "Bot widget avoids wildcard origins" "PASS"
fi

echo ""
echo "📋 6. Wix Backend Identity Code Security"
echo "========================================"

# Check identity code creation requires auth
if grep -q "getCurrentUser()" wix-site/wix-page/backend/http-functions.js && \
   grep -q "forbidden" wix-site/wix-page/backend/http-functions.js; then
    test_result "Identity code creation requires auth" "PASS"
else
    test_result "Identity code creation requires auth" "FAIL" "Missing authentication check"
fi

# Check identity codes are one-time use
if grep -q "used: true" wix-site/wix-page/backend/http-functions.js && \
   grep -q "usedAt:" wix-site/wix-page/backend/http-functions.js; then
    test_result "Identity codes are one-time use" "PASS"
else
    test_result "Identity codes are one-time use" "FAIL" "Missing one-time use enforcement"
fi

echo ""
echo "📋 7. Code Quality and Security Patterns"
echo "========================================"

# Check for remaining guest ID generation
guest_files=$(find pages components utils -name "*.jsx" -o -name "*.js" -o -name "*.ts" | xargs grep -l "guest-" 2>/dev/null | grep -v test | wc -l)
if [ "$guest_files" -gt 3 ]; then
    test_result "Limited guest ID references" "WARN" "Found guest ID references in $guest_files files"
else
    test_result "Limited guest ID references" "PASS"
fi

# Check for session ID generation
session_files=$(find pages components utils -name "*.jsx" -o -name "*.js" -o -name "*.ts" | xargs grep -l "session-" 2>/dev/null | grep -v test | wc -l)
if [ "$session_files" -gt 2 ]; then
    test_result "Limited session ID references" "WARN" "Found session ID references in $session_files files"
else
    test_result "Limited session ID references" "PASS"
fi

# Check build configuration
if grep -q "removeConsole.*production" next.config.js; then
    test_result "Production console removal enabled" "PASS"
else
    test_result "Production console removal enabled" "WARN" "Console statements may leak in production"
fi

echo ""
echo "📋 8. Runtime Error Prevention"
echo "=============================="

# Check for debug runtime script
if [ -f "public/debug-runtime.js" ]; then
    test_result "Runtime debug system installed" "PASS"
else
    test_result "Runtime debug system installed" "WARN" "No runtime error tracking"
fi

# Check preload optimization
if grep -q "preload.*deeplogo" pages/_document.js; then
    test_result "Critical resource preloading optimized" "PASS"
else
    test_result "Critical resource preloading optimized" "WARN" "Missing preload optimization"
fi

echo ""
echo "================================================"
echo "🔒 STATIC AUTHENTICATION SECURITY AUDIT RESULTS"
echo "================================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

echo ""
echo "📊 SECURITY RECOMMENDATIONS:"
echo "============================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 PRIMARY SECURITY IMPLEMENTATION: COMPLETE${NC}"
    echo "✅ All critical authentication hardening measures are in place"
    
    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}📋 SUGGESTED IMPROVEMENTS:${NC}"
        echo "• Review wildcard origin usage in postMessage calls"
        echo "• Consider additional runtime monitoring"
        echo "• Monitor guest/session ID references during development"
    fi
    
    echo ""
    echo -e "${BLUE}🚀 READY FOR PRODUCTION TESTING:${NC}"
    echo "1. Deploy to Vercel staging environment"
    echo "2. Test Wix integration with real member authentication"
    echo "3. Verify identity code endpoints work in Wix preview"
    echo "4. Monitor for any authentication bypass attempts"
    
else
    echo -e "${RED}🚨 CRITICAL SECURITY GAPS DETECTED${NC}"
    echo "❌ Fix failed tests before production deployment"
    echo ""
    echo -e "${YELLOW}IMMEDIATE ACTIONS REQUIRED:${NC}"
    echo "• Address all failed authentication checks"
    echo "• Test API endpoints with unauthenticated requests"
    echo "• Verify frontend gating works correctly"
fi

exit $TESTS_FAILED
