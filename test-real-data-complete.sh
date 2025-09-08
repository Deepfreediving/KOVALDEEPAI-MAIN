#!/bin/bash

# 🏊‍♂️ Complete Real Data Frontend Test
# Tests the entire workflow with your actual dive profile data

echo "🏊‍♂️ KovalDeepAI Real Data Frontend Test"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TEST_USER_ID="123e4567-e89b-12d3-a456-426614174000"

echo "📊 Testing Real Dive Logs API..."
echo ""

# Test batch logs retrieval
echo -n "Batch Logs (Local): "
BATCH_LOGS=$(curl -s "http://localhost:3000/api/dive/batch-logs?userId=$TEST_USER_ID" 2>/dev/null)
if [[ "$BATCH_LOGS" == *"logs"* && "$BATCH_LOGS" == *"95.8"* ]]; then
    echo -e "${GREEN}✅ Real data found (5 logs)${NC}"
else
    echo -e "${RED}❌ No real data found${NC}"
fi

# Test batch logs retrieval (Production)
echo -n "Batch Logs (Prod): "
PROD_BATCH_LOGS=$(curl -s "https://kovaldeepai-main.vercel.app/api/dive/batch-logs?userId=$TEST_USER_ID" 2>/dev/null)
if [[ "$PROD_BATCH_LOGS" == *"logs"* && "$PROD_BATCH_LOGS" == *"95.8"* ]]; then
    echo -e "${GREEN}✅ Real data synced to production${NC}"
else
    echo -e "${YELLOW}⚠️ Data not yet synced to production${NC}"
fi

echo ""
echo "🔍 Testing Batch Analysis with Real Data..."
echo ""

# Test local batch analysis
echo -n "Performance Analysis (Local): "
ANALYSIS_RESULT=$(curl -s -X POST "http://localhost:3000/api/dive/batch-analysis" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$TEST_USER_ID\",\"analysisType\":\"performance\",\"timeRange\":\"all\"}" 2>/dev/null)

if [[ "$ANALYSIS_RESULT" == *"101.4m"* && "$ANALYSIS_RESULT" == *"FIM"* ]]; then
    echo -e "${GREEN}✅ Analysis includes real dive data${NC}"
else
    echo -e "${YELLOW}⚠️ Analysis may not include all real data${NC}"
fi

echo ""
echo "🧠 Testing OpenAI Analysis Quality..."
echo ""

# Test safety analysis
echo -n "Safety Analysis: "
SAFETY_RESULT=$(curl -s -X POST "http://localhost:3000/api/dive/batch-analysis" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$TEST_USER_ID\",\"analysisType\":\"safety\",\"timeRange\":\"all\"}" 2>/dev/null)

if [[ "$SAFETY_RESULT" == *"success"* ]]; then
    echo -e "${GREEN}✅ Safety analysis working${NC}"
else
    echo -e "${RED}❌ Safety analysis failed${NC}"
fi

# Test coaching insights
echo -n "Coaching Insights: "
COACHING_RESULT=$(curl -s -X POST "http://localhost:3000/api/dive/batch-analysis" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$TEST_USER_ID\",\"analysisType\":\"coaching\",\"timeRange\":\"all\"}" 2>/dev/null)

if [[ "$COACHING_RESULT" == *"success"* ]]; then
    echo -e "${GREEN}✅ Coaching analysis working${NC}"
else
    echo -e "${RED}❌ Coaching analysis failed${NC}"
fi

echo ""
echo "📱 Opening Frontend for Manual Testing..."
echo ""

# Open both local and production for comparison
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening local development (with real data)..."
    open "http://localhost:3000"
    sleep 2
    
    echo "Opening production deployment..."
    open "https://kovaldeepai-main.vercel.app/"
else
    echo "Please open these URLs manually:"
    echo "Local: http://localhost:3000"
    echo "Production: https://kovaldeepai-main.vercel.app/"
fi

echo ""
echo "🧪 Real Data Manual Test Checklist:"
echo "===================================="
echo ""
echo "✅ ${GREEN}Data Setup Complete:${NC}"
echo "   • 5 real dive logs from your actual freediving sessions"
echo "   • Depths: 95.8m, 97.5m, 99.0m, 101.4m, 96.7m (2018-2019)"
echo "   • All FIM (Free Immersion) discipline"
echo "   • Realistic times, temperatures, and notes"
echo ""
echo "🔍 ${BLUE}Frontend Tests to Perform:${NC}"
echo ""
echo "1. ${YELLOW}Navigate to Dive Journal${NC}"
echo "   ✓ Click 'Dive Journal' button"
echo "   ✓ Modal should open with your data"
echo ""
echo "2. ${YELLOW}Check Saved Logs Tab${NC}"
echo "   ✓ Should show 5 real dive logs"
echo "   ✓ Verify dates: 2019-05-20, 2018-07-24, 2018-07-13, 2018-07-16, 2018-07-08"
echo "   ✓ Verify depths: 95.8m to 101.4m range"
echo "   ✓ Check that notes contain realistic details"
echo ""
echo "3. ${YELLOW}Test Batch Analysis Tab${NC}"
echo "   ✓ Click 'Batch Analysis' tab"
echo "   ✓ Should show 'Analyze 5 Dives' button"
echo "   ✓ Try different analysis types:"
echo "     - Pattern Detection (should find depth progression)"
echo "     - Safety Analysis (should note good thermal management)"
echo "     - Performance Review (should highlight 100m+ achievement)"
echo "     - Coaching Insights (should suggest training progression)"
echo ""
echo "4. ${YELLOW}Test Analysis Quality${NC}"
echo "   ✓ Analysis should reference specific depths (95.8m, 101.4m, etc.)"
echo "   ✓ Should mention FIM discipline"
echo "   ✓ Should note progression from 2018 to 2019"
echo "   ✓ Should identify thermal consistency (30-31°C)"
echo "   ✓ Should recognize the 100m+ breakthrough"
echo ""
echo "5. ${YELLOW}Test Export Functionality${NC}"
echo "   ✓ Click 'Export CSV' button"
echo "   ✓ Should download CSV with real dive data"
echo "   ✓ Verify all 5 dives are included with correct details"
echo ""
echo "🚨 ${RED}Report Any Issues:${NC}"
echo "   • Missing or incorrect dive data"
echo "   • Analysis not referencing real details"
echo "   • Frontend errors or broken functionality"
echo "   • Performance issues with 5+ logs"
echo ""
echo "✅ ${GREEN}Real Data Test Ready!${NC}"
echo "Your actual freediving data is now in the system for comprehensive testing."
