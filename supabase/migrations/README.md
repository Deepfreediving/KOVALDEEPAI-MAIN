# Supabase Migrations

## 🗂️ Essential Migrations (In Order)

### **Core Schema**

1. `2025-08-17_01_core_schema_and_rls.sql` - Core database schema and RLS policies
2. `2025-08-17_02_storage_buckets_and_policies.sql` - Storage setup
3. `2025-08-17_03_onboarding_legal_userdocs.sql` - User onboarding system
4. `2025-08-17_04_storage_policies.sql` - Storage policies
5. `2025-08-17_05_anonymous_users_support.sql` - Anonymous user support

### **Application Tables**

6. `2025-08-18_01_user_memory_table.sql` - User memory system
7. `2025-08-18_03_admin_only_user_memory.sql` - Admin-only memory access
8. `2025-08-18_04_admin_only_dive_logs.sql` - Dive logs table with admin access
9. `2025-08-21_01_educational_content.sql` - Educational content system

### **Recent Updates**

10. `2025-08-27_01_add-extracted-metrics-column.sql` - Image metrics extraction
11. `11_complete_rls_policies.sql` - Complete RLS policy setup
12. `12_performance_optimization.sql` - Performance indexes and optimizations

### **Emergency Fixes**

13. `20250827175000_final_consolidated_fix.sql` - Consolidated schema fixes
14. `20250827180000_emergency_performance_fix.sql` - **EMERGENCY: ERR_INSUFFICIENT_RESOURCES fix**

## ⚠️ Critical Performance Fix

**If experiencing `ERR_INSUFFICIENT_RESOURCES` errors, run immediately:**

```sql
-- Copy and paste content from: 20250827180000_emergency_performance_fix.sql
```

This adds essential database indexes to resolve performance issues.

## 🧹 Cleanup Complete

- ✅ Removed scattered SQL files from root directory
- ✅ Removed duplicate SQL files from apps/web
- ✅ Consolidated redundant migrations
- ✅ Kept only essential migrations in proper order
- ✅ All migrations now properly organized in `/supabase/migrations/`

## 📋 Migration Status

Total Essential Migrations: **14**

- Core Schema: 5 files
- Application Tables: 4 files
- Recent Updates: 3 files
- Emergency Fixes: 2 files

## 🚀 Usage

To apply all migrations in Supabase:

1. Run migrations 1-13 in order for full setup
2. Run migration 14 immediately if experiencing performance issues
