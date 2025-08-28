#!/bin/bash

# ================================================================
# EMERGENCY PERFORMANCE FIX DEPLOYMENT SCRIPT
# ================================================================
# This script fixes the ERR_INSUFFICIENT_RESOURCES error by:
# 1. Applying database performance optimizations
# 2. The updated API will automatically use optimized views

echo "🚀 Deploying performance fixes for ERR_INSUFFICIENT_RESOURCES..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📊 Step 1: Apply database performance optimizations..."
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "======================================================"
cat apply-performance-fix.sql
echo "======================================================"
echo ""

echo "⏳ Press Enter after you've run the SQL in Supabase..."
read -p ""

echo "🔄 Step 2: Deploy updated API to Vercel..."
npm run build
npx vercel --prod

echo "✅ Step 3: Test the API..."
echo "Testing dive logs API..."

# Test the API endpoint
curl -s "https://kovaldeepai-main.vercel.app/api/supabase/dive-logs?userId=f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Accept: application/json" \
  | jq -r '.meta.processingTime // "API response invalid"'

echo ""
echo "🎉 Performance optimization deployment complete!"
echo ""
echo "📋 What was fixed:"
echo "   ✓ Added database indexes for efficient queries"
echo "   ✓ Created optimized views to eliminate N+1 queries"
echo "   ✓ Updated API to use optimized views with fallback"
echo "   ✓ Added query limits to prevent resource exhaustion"
echo ""
echo "🔍 Monitor your application logs to confirm the ERR_INSUFFICIENT_RESOURCES error is resolved."
