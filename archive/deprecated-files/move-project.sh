#!/bin/bash

# Script to move the project to a directory without spaces
# This will fix the Next.js file watching issue

echo "🚀 Moving project to fix space-in-path issue..."

# Create new directory without spaces
NEW_DIR="/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main"

# Create the directory if it doesn't exist
mkdir -p "$(dirname "$NEW_DIR")"

# Copy all files to the new location
echo "📁 Copying files to: $NEW_DIR"
cp -r "/Users/danielkoval/Documents/buildaiagent/Project directory/KovalDeepAI-main" "$NEW_DIR"

echo "✅ Project copied successfully!"
echo ""
echo "Next steps:"
echo "1. cd \"$NEW_DIR\""
echo "2. npm install"
echo "3. npm run dev"
echo ""
echo "⚠️  Remember to update your IDE/editor to open the new location"
echo "🗂️  You can safely delete the old directory after confirming everything works"
