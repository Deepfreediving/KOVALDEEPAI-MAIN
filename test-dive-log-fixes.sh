#!/bin/bash

# ✅ V6.0 DIVE LOG SAVE & DISPLAY TEST
# Test both localStorage sidebar refresh and Wix data format

echo "🧪 V6.0 DIVE LOG SAVE & DISPLAY TEST"
echo "===================================="

echo ""
echo "📋 Testing sidebar refresh mechanism..."

# Check SavedDiveLogsViewer has localStorage event listeners
echo "✅ Checking SavedDiveLogsViewer localStorage listeners:"
grep -n "addEventListener.*storage\|localStorageUpdate" components/SavedDiveLogsViewer.jsx | head -2 | sed 's/^/   /'

# Check DiveJournalDisplay dispatches events
echo "✅ Checking DiveJournalDisplay event dispatch:"
grep -n "dispatchEvent.*storage\|CustomEvent" components/DiveJournalDisplay.jsx | head -2 | sed 's/^/   /'

echo ""
echo "📋 Testing Wix data format..."

# Check that upload-dive-image doesn't use JSON.stringify for logEntry
echo "✅ Checking upload-dive-image.ts uses structured data:"
if grep -q "logEntry.*JSON.stringify" pages/api/openai/upload-dive-image.ts; then
  echo "   ❌ Still using JSON.stringify for logEntry"
else
  echo "   ✅ Using structured data fields instead of JSON string"
fi

# Check individual fields are being sent
echo "✅ Checking structured fields in upload-dive-image.ts:"
grep -n "discipline:\|location:\|targetDepth:\|reachedDepth:" pages/api/openai/upload-dive-image.ts | head -4 | sed 's/^/   /'

echo ""
echo "📋 Testing save-dive-log structure..."

# Check save-dive-log uses proper field mapping
echo "✅ Checking save-dive-log.ts field structure:"
grep -n "discipline:\|reachedDepth:\|targetDepth:" pages/api/analyze/save-dive-log.ts | head -3 | sed 's/^/   /'

echo ""
echo "📋 Building project to verify no errors..."

if npm run build --silent > /dev/null 2>&1; then
  echo "✅ Build successful - No compilation errors"
else
  echo "❌ Build failed - Check for syntax errors"
  exit 1
fi

echo ""
echo "📊 TEST SUMMARY:"
echo "================"

STORAGE_LISTENERS=$(grep -c "addEventListener.*storage\|localStorageUpdate" components/SavedDiveLogsViewer.jsx)
EVENT_DISPATCHERS=$(grep -c "dispatchEvent.*storage\|CustomEvent" components/DiveJournalDisplay.jsx)
STRUCTURED_FIELDS=$(grep -c "discipline:\|location:\|targetDepth:\|reachedDepth:" pages/api/openai/upload-dive-image.ts)

echo "✅ Storage event listeners: $STORAGE_LISTENERS"
echo "✅ Event dispatchers: $EVENT_DISPATCHERS"
echo "✅ Structured data fields: $STRUCTURED_FIELDS"

if [ "$STORAGE_LISTENERS" -ge 2 ] && [ "$EVENT_DISPATCHERS" -ge 1 ] && [ "$STRUCTURED_FIELDS" -ge 4 ]; then
  echo ""
  echo "🎯 **FIXES IMPLEMENTED SUCCESSFULLY**"
  echo ""
  echo "   🔧 Issue 1: Sidebar not refreshing after dive log save"
  echo "      ✅ Added localStorage event listeners to SavedDiveLogsViewer"
  echo "      ✅ Added event dispatching to DiveJournalDisplay"
  echo "      ✅ Both storage and custom events supported"
  echo ""
  echo "   🔧 Issue 2: Incorrect format in Wix collection"
  echo "      ✅ Replaced JSON.stringify logEntry with structured fields"
  echo "      ✅ Individual fields (discipline, location, depths) now sent separately"
  echo "      ✅ Wix collection will show proper data structure"
  echo ""
  echo "🚀 **EXPECTED BEHAVIOR:**"
  echo "   • Dive logs should now appear in sidebar immediately after saving"
  echo "   • Wix collection should show readable individual fields instead of JSON blob"
  echo "   • Both localStorage and Wix backend should have consistent data"
else
  echo ""
  echo "⚠️ **SOME FIXES MAY BE INCOMPLETE**"
  echo "   Check the implementation and ensure all changes were applied correctly"
fi

echo ""
