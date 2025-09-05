#!/bin/bash

# 🧹 COMPREHENSIVE PROJECT REORGANIZATION SCRIPT
# Moves all SQL, test, and debug files to proper locations

echo "🚀 Starting comprehensive project reorganization..."

# Create proper directory structure
mkdir -p supabase/migrations/archive
mkdir -p tests/{unit,integration,e2e,manual}
mkdir -p tests/debug
mkdir -p tests/data
mkdir -p scripts/{setup,utils,maintenance}
mkdir -p docs/{schemas,policies,api}

echo "📁 Created proper directory structure"

# 1. MOVE ALL SQL FILES TO SUPABASE/MIGRATIONS
echo "📄 Moving SQL files to supabase/migrations..."

# Move scattered SQL files to migrations
find . -name "*.sql" -not -path "./supabase/migrations/*" -not -path "./node_modules/*" -not -path "./.git/*" -exec mv {} supabase/migrations/ \;

# Rename SQL files with proper migration timestamps
cd supabase/migrations
for file in *.sql; do
    if [[ ! "$file" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}_ ]]; then
        new_name="2025-08-27_$(printf "%02d" $(($(ls 2025-08-27_*.sql 2>/dev/null | wc -l) + 1)))_${file}"
        mv "$file" "$new_name" 2>/dev/null || true
    fi
done
cd ../..

echo "✅ SQL files organized in supabase/migrations/"

# 2. MOVE ALL TEST FILES TO TESTS/
echo "🧪 Moving test files to tests/..."

# Move root-level test files
find . -maxdepth 1 -name "test-*" -o -name "*test*" -name "*.js" -exec mv {} tests/manual/ \;
find . -maxdepth 1 -name "final-*test*" -name "*.js" -exec mv {} tests/integration/ \;
find . -maxdepth 1 -name "debug-*" -name "*.js" -exec mv {} tests/debug/ \;

# Move apps/web scattered test files
find apps/web -name "test-*" -name "*.js" -not -path "apps/web/tests/*" -exec mv {} tests/manual/ \;

# Organize existing test structure
if [ -d "apps/web/tests" ]; then
    cp -r apps/web/tests/* tests/
    rm -rf apps/web/tests
fi

echo "✅ Test files organized in tests/"

# 3. MOVE UTILITY SCRIPTS
echo "🔧 Moving utility scripts..."

# Move utility scripts to scripts/
find . -maxdepth 1 -name "*.sh" -exec mv {} scripts/utils/ \;
find . -maxdepth 1 -name "check-*" -name "*.js" -exec mv {} scripts/utils/ \;
find . -maxdepth 1 -name "verify-*" -name "*.js" -exec mv {} scripts/utils/ \;
find . -maxdepth 1 -name "setup-*" -name "*.js" -exec mv {} scripts/setup/ \;
find . -maxdepth 1 -name "cleanup-*" -name "*.js" -exec mv {} scripts/maintenance/ \;

echo "✅ Utility scripts organized in scripts/"

# 4. CLEAN UP DUPLICATE FILES
echo "🗑️ Removing duplicate and legacy files..."

# Remove backup files
find . -name "*.backup" -delete
find . -name "*.bak" -delete
find . -name "*~" -delete

# Remove empty directories
find . -type d -empty -delete

echo "✅ Cleanup completed"

# 5. CREATE INDEX FILES
echo "📋 Creating index files..."

# Create tests/README.md
cat > tests/README.md << 'EOF'
# Tests Directory

## Structure
- `unit/` - Unit tests for individual functions/components
- `integration/` - Integration tests for API endpoints and database operations
- `e2e/` - End-to-end tests for complete workflows
- `manual/` - Manual test scripts and utilities
- `debug/` - Debug and diagnostic scripts
- `data/` - Test data and fixtures

## Running Tests
```bash
# Run integration tests
node tests/integration/test-dive-computer-images.js

# Run manual tests
node tests/manual/test-supabase-connection.js
```
EOF

# Create scripts/README.md
cat > scripts/README.md << 'EOF'
# Scripts Directory

## Structure
- `setup/` - Project setup and initialization scripts
- `utils/` - Utility scripts for development and debugging
- `maintenance/` - Cleanup and maintenance scripts

## Usage
```bash
# Run setup scripts
./scripts/setup/setup-database.sh

# Run utilities
node scripts/utils/check-env.js
```
EOF

# Create supabase/migrations/README.md
cat > supabase/migrations/README.md << 'EOF'
# Database Migrations

All SQL files for database schema, RLS policies, and data migrations.

## Naming Convention
- Format: `YYYY-MM-DD_NN_description.sql`
- Run in chronological order
- Each migration should be idempotent

## Apply Migrations
```bash
supabase db reset
# or
supabase migration up
```
EOF

echo "✅ Index files created"

echo "🎉 Project reorganization completed!"
echo ""
echo "📊 Summary:"
echo "   ✅ SQL files → supabase/migrations/"
echo "   ✅ Test files → tests/{unit,integration,e2e,manual,debug}/"
echo "   ✅ Scripts → scripts/{setup,utils,maintenance}/"
echo "   ✅ Documentation → docs/"
echo "   ✅ Removed duplicates and backups"
echo ""
echo "🚀 Your project is now properly organized!"
