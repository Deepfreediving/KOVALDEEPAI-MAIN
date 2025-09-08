#!/bin/bash

# 🚀 Frontend Browser Test Script
# Tests both local and production deployments of KovalDeepAI

echo "🏊‍♂️ KovalDeepAI Frontend Test Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test URLs
LOCAL_URL="http://localhost:3000"
PROD_URL="https://kovaldeepai-main.vercel.app"

echo "📡 Testing API Health..."
echo ""

# Test Local Health
echo -n "Local Health: "
LOCAL_HEALTH=$(curl -s "$LOCAL_URL/api/health" 2>/dev/null)
if [[ $? -eq 0 && "$LOCAL_HEALTH" == *"healthy"* ]]; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test Production Health  
echo -n "Production Health: "
PROD_HEALTH=$(curl -s "$PROD_URL/api/health" 2>/dev/null)
if [[ $? -eq 0 && "$PROD_HEALTH" == *"healthy"* ]]; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo ""
echo "📊 Testing Batch APIs..."
echo ""

# Test UUID for API calls
TEST_UUID="123e4567-e89b-12d3-a456-426614174000"

# Test Local Batch Logs API
echo -n "Local Batch Logs: "
LOCAL_BATCH=$(curl -s "$LOCAL_URL/api/dive/batch-logs?userId=$TEST_UUID&limit=5" 2>/dev/null)
if [[ $? -eq 0 && "$LOCAL_BATCH" == *"logs"* ]]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️ No logs or error${NC}"
fi

# Test Production Batch Logs API
echo -n "Production Batch Logs: "
PROD_BATCH=$(curl -s "$PROD_URL/api/dive/batch-logs?userId=$TEST_UUID&limit=5" 2>/dev/null)
if [[ $? -eq 0 && "$PROD_BATCH" == *"logs"* ]]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️ No logs or error${NC}"
fi

echo ""
echo "🔗 Opening Frontend URLs in Browser..."
echo ""

# Check if we're on macOS to use 'open' command
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening local development server..."
    open "$LOCAL_URL"
    sleep 2
    
    echo "Opening production deployment..."
    open "$PROD_URL"
else
    echo "Please manually open these URLs in your browser:"
    echo "Local: $LOCAL_URL"
    echo "Production: $PROD_URL"
fi

echo ""
echo "🧪 Manual Testing Instructions:"
echo "==============================="
echo ""
echo "1. ${BLUE}Navigate to Dive Journal${NC}"
echo "   - Click the 'Dive Journal' button on the main page"
echo "   - Check if the modal/component opens correctly"
echo ""
echo "2. ${BLUE}Test Tab Navigation${NC}"
echo "   - Verify you can see 3 tabs: 'Saved Logs', 'Add New', 'Batch Analysis'"
echo "   - Click on each tab to ensure they switch correctly"
echo ""
echo "3. ${BLUE}Test Batch Analysis Tab${NC}"
echo "   - Click on the 'Batch Analysis' tab"
echo "   - Check if you see:"
echo "     * Analysis type dropdown (Pattern Detection, Safety Analysis, etc.)"
echo "     * Time range dropdown (Last Week, Month, etc.)"
echo "     * Filter options (Discipline, Location, Dates)"
echo "     * 'Analyze X Dives' button"
echo ""
echo "4. ${BLUE}Test Authentication State${NC}"
echo "   - Open browser DevTools (F12)"
echo "   - Go to Console tab"
echo "   - Look for any React/Next.js errors"
echo "   - Check if user authentication is working"
echo ""
echo "5. ${BLUE}Test Dive Log Creation${NC}"
echo "   - Try adding a new dive log in the 'Add New' tab"
echo "   - Fill out the form and save"
echo "   - Check if it appears in 'Saved Logs'"
echo ""
echo "6. ${BLUE}Test Batch Analysis (if you have logs)${NC}"
echo "   - If you have dive logs, try running batch analysis"
echo "   - Select analysis type and time range"
echo "   - Click 'Analyze' button"
echo "   - Check if analysis completes successfully"
echo ""
echo "📋 ${YELLOW}Report any issues you find:${NC}"
echo "   - UI/UX problems"
echo "   - JavaScript errors in console"
echo "   - API failures"
echo "   - Missing functionality"
echo ""
echo "✅ ${GREEN}Test completed! Check browsers for results.${NC}"
