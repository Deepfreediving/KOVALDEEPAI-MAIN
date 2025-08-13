#!/bin/bash
# 🗂️ ARCHIVE LEGACY FILES SCRIPT
# Safely moves consolidated files to archive folders
# Run this after testing master files

echo "🗂️ Starting Legacy Files Archival Process..."

# Create archive directories
echo "📁 Creating archive directories..."
mkdir -p "wix page/archive"
mkdir -p "Wix App/archive"

echo "✅ Archive directories created"

# Function to safely move files with backup
move_to_archive() {
    local source="$1"
    local destination="$2"
    
    if [ -f "$source" ]; then
        echo "📦 Moving: $source → $destination"
        mv "$source" "$destination"
        echo "✅ Moved: $(basename "$source")"
    else
        echo "⚠️  File not found: $source"
    fi
}

# Function to delete empty files
delete_empty() {
    local file="$1"
    
    if [ -f "$file" ]; then
        local size=$(wc -c < "$file" 2>/dev/null | tr -d ' ')
        if [ "$size" -eq 0 ]; then
            echo "🗑️  Deleting empty file: $file"
            rm "$file"
            echo "✅ Deleted: $(basename "$file")"
        else
            echo "📦 Moving non-empty file: $file"
            move_to_archive "$file" "wix page/archive/$(basename "$file")"
        fi
    else
        echo "⚠️  File not found: $file"
    fi
}

echo ""
echo "🔄 Processing Wix Page Files..."
echo "==============================="

# Archive utility files (keeping master)
move_to_archive "wix page/wix-data-utils.jsw" "wix page/archive/wix-data-utils.jsw"
move_to_archive "wix page/wix-expert-utils.jsw" "wix page/archive/wix-expert-utils.jsw"
move_to_archive "wix page/wix-index-optimized-utils.jsw" "wix page/archive/wix-index-optimized-utils.jsw"

# Delete empty master utils (replaced by wix-utils-master.jsw)
delete_empty "wix page/wix-master-utils.jsw"

# Archive user memory files (keeping master)
move_to_archive "wix page/http-userMemory.jsw" "wix page/archive/http-userMemory.jsw"
move_to_archive "wix page/http-userMemory-optimized.jsw" "wix page/archive/http-userMemory-optimized.jsw"
move_to_archive "wix page/http-userMemory-expert.jsw" "wix page/archive/http-userMemory-expert.jsw"

# Archive user profile files (keeping master)
move_to_archive "wix page/http-getUserProfile.jsw" "wix page/archive/http-getUserProfile.jsw"
move_to_archive "wix page/http-getUserProfile-expert.jsw" "wix page/archive/http-getUserProfile-expert.jsw"

# Archive dive logs files (keeping master)
move_to_archive "wix page/http-diveLogs.jsw" "wix page/archive/http-diveLogs.jsw"

# Delete empty dive logs expert file
delete_empty "wix page/http-diveLogs-expert.jsw"

echo ""
echo "🔄 Processing Wix App Files..."
echo "=============================="

# Archive app frontend files (keeping master)
move_to_archive "Wix App/wix-app-frontend.js" "Wix App/archive/wix-app-frontend.js"

# Delete empty app frontend expert file
delete_empty "Wix App/wix-app-frontend-expert.js"

echo ""
echo "📊 Archive Summary"
echo "=================="

# Count archived files
wix_archived=$(find "wix page/archive" -name "*.jsw" -o -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
app_archived=$(find "Wix App/archive" -name "*.jsw" -o -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
total_archived=$((wix_archived + app_archived))

echo "📦 Wix Page archived files: $wix_archived"
echo "📦 Wix App archived files: $app_archived"  
echo "📦 Total archived files: $total_archived"

echo ""
echo "✅ ACTIVE MASTER FILES"
echo "======================"
echo "🔥 wix page/wix-utils-master.jsw"
echo "🔥 wix page/http-userMemory-master.jsw"
echo "🔥 wix page/http-getUserProfile-master.jsw"
echo "🔥 wix page/http-diveLogs-master.jsw"
echo "🔥 wix page/wix-frontend-page-master.js"
echo "🔥 Wix App/wix-app-frontend-master.js"
echo "🔥 Wix App/wix-widget-loader.js"

echo ""
echo "📋 REMAINING SUPPORTING FILES"
echo "============================="
echo "📄 wix page/http-chat.jsw"
echo "📄 wix page/http-chat-expert.jsw"
echo "📄 wix page/http-wixConnection.jsw"
echo "📄 wix page/http-test-connection.jsw"
echo "📄 wix page/http-utils.jsw"

echo ""
echo "🎯 NEXT STEPS"
echo "============="
echo "1. 🧪 Test all master files thoroughly"
echo "2. 📝 Update import statements to use master files"
echo "3. 📚 Update documentation and references"
echo "4. 🚀 Deploy master files to production"
echo "5. 🗑️  Delete archive folder after successful deployment (optional)"

echo ""
echo "✅ ARCHIVAL COMPLETE!"
echo "All legacy files have been safely archived."
echo "Master files are ready for production use."

# Create archive index file
cat > "wix page/archive/README.md" << EOF
# 📦 Archived Wix Files

This folder contains the original Wix utility and HTTP function files that have been consolidated into master files.

## Archived on: $(date)

### Original Files Archived:
- \`wix-data-utils.jsw\` → Consolidated into \`../wix-utils-master.jsw\`
- \`wix-expert-utils.jsw\` → Consolidated into \`../wix-utils-master.jsw\`
- \`wix-index-optimized-utils.jsw\` → Consolidated into \`../wix-utils-master.jsw\`
- \`http-userMemory.jsw\` → Consolidated into \`../http-userMemory-master.jsw\`
- \`http-userMemory-optimized.jsw\` → Consolidated into \`../http-userMemory-master.jsw\`
- \`http-userMemory-expert.jsw\` → Consolidated into \`../http-userMemory-master.jsw\`
- \`http-getUserProfile.jsw\` → Consolidated into \`../http-getUserProfile-master.jsw\`
- \`http-getUserProfile-expert.jsw\` → Consolidated into \`../http-getUserProfile-master.jsw\`
- \`http-diveLogs.jsw\` → Consolidated into \`../http-diveLogs-master.jsw\`

### Master Files (Active):
- \`../wix-utils-master.jsw\` - All utility functions with version selection
- \`../http-userMemory-master.jsw\` - User memory API with all features
- \`../http-getUserProfile-master.jsw\` - User profile API with optimization
- \`../http-diveLogs-master.jsw\` - Dive logs API with semantic search
- \`../wix-frontend-page-master.js\` - Page frontend functionality

### Safety Note:
These files are preserved for:
- Emergency rollback if needed
- Reference during migration
- Historical code analysis

**Do not delete this archive until master files are fully tested and deployed in production.**
EOF

cat > "Wix App/archive/README.md" << EOF
# 📦 Archived Wix App Files

This folder contains the original Wix app frontend files that have been consolidated into master files.

## Archived on: $(date)

### Original Files Archived:
- \`wix-app-frontend.js\` → Consolidated into \`../wix-app-frontend-master.js\`

### Master Files (Active):
- \`../wix-app-frontend-master.js\` - Complete frontend with all modes

### Safety Note:
These files are preserved for emergency rollback and reference purposes.
EOF

echo "📄 Archive documentation created"
echo "🎉 Consolidation archival process completed successfully!"
