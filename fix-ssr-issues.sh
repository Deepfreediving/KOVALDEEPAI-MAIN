#!/bin/bash

# ✅ SSR-Compatible localStorage Fix Script
# This script fixes all "window is not defined" errors in the embed.jsx file

echo "🔧 Fixing SSR localStorage issues in embed.jsx..."

# Define the file path
FILE_PATH="/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/pages/embed.jsx"

# Create backup
cp "$FILE_PATH" "$FILE_PATH.backup"

# Replace all localStorage.getItem calls with safeGetItem
sed -i '' 's/localStorage\.getItem(/safeGetItem(/g' "$FILE_PATH"

# Replace all localStorage.setItem calls with safeSetItem
sed -i '' 's/localStorage\.setItem(/safeSetItem(/g' "$FILE_PATH"

# Replace all localStorage.removeItem calls with safeRemoveItem
sed -i '' 's/localStorage\.removeItem(/safeRemoveItem(/g' "$FILE_PATH"

# Replace localStorage.length with safeLocalStorageKeys().length
sed -i '' 's/localStorage\.length/safeLocalStorageKeys().length/g' "$FILE_PATH"

# Replace localStorage.key(i) with safeLocalStorageKeys()[i]
sed -i '' 's/localStorage\.key(i)/safeLocalStorageKeys()[i]/g' "$FILE_PATH"

# Fix JSON.parse calls to use safeParseJSON where appropriate
sed -i '' 's/JSON\.parse(localStorage\.getItem(/safeParseJSON(safeGetItem(/g' "$FILE_PATH"

echo "✅ localStorage fixes applied to embed.jsx"
echo "📄 Backup created at: $FILE_PATH.backup"

# Verify the changes
echo "🔍 Checking for remaining localStorage issues..."
grep -n "localStorage\." "$FILE_PATH" || echo "✅ No remaining localStorage issues found"
