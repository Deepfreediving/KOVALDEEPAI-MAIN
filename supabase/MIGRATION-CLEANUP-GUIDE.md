# 🗑️ MIGRATION FILES TO DELETE

## ❌ **SAFE TO DELETE** (Overlapping/Duplicate Content):

```bash
# Navigate to migrations folder
cd /Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/supabase/migrations

# Delete overlapping files
rm 20250817010000_core_schema_and_rls.sql              # Overlapping user tables
rm 20250817020000_storage_buckets_and_policies.sql     # Can be recreated in Supabase UI
rm 20250817030000_onboarding_legal_userdocs.sql        # Replaced by legal_documents
rm 20250817040000_storage_policies.sql                 # Can be recreated in Supabase UI
rm 20250817050000_anonymous_users_support.sql          # Not needed with new auth
rm 20250818010000_user_memory_table.sql                # Included in consolidated
rm 20250818030000_admin_only_user_memory.sql           # Included in consolidated
rm 20250818040000_admin_only_dive_logs.sql             # Replaced by dive_logs
rm 2025-08-18_04_admin_only_dive_logs.sql              # Duplicate filename format
rm 20250821010000_educational_content.sql              # Not core to KovalAI functionality
rm 20250827010000_add_extracted_metrics_column.sql     # Included in consolidated
rm 20250827110000_complete_rls_policies.sql            # Replaced by new RLS
rm 20250827120000_performance_optimization.sql         # Included in consolidated
rm 20250827174000_safe_performance_views.sql           # Replaced by new views
rm 20250827175000_final_consolidated_fix.sql           # Replaced by this migration
rm 20250827180000_emergency_performance_fix.sql        # Replaced by this migration
rm 20250827190000_fix_ambiguous_column.sql             # Fixed in consolidated
rm 20250828073524_remote_schema.sql                    # Was auto-generated, replaced
rm 20250828120000_user_subscriptions_and_payments.sql  # Included in user_profiles
rm 20250828150000_fix_legal_document_view_security.sql # Fixed in consolidated
rm 20250828160000_complete_kovalai_schema.sql          # Replaced by this version
```

## ✅ **KEEP ONLY**:

- `20250828200000_consolidated_clean_schema.sql` (The master file)
- `README.md` (Documentation)

## 🎯 **RESULT**:

Your migrations folder will contain just:

```
supabase/migrations/
├── 20250828200000_consolidated_clean_schema.sql  ← THE MASTER FILE
└── README.md                                     ← Keep documentation
```

## ⚠️ **BACKUP FIRST**:

```bash
# Create backup before deleting
cp -r supabase/migrations supabase/migrations_backup_$(date +%Y%m%d)
```

## 🚀 **AFTER CLEANUP**:

1. Run the consolidated migration in Supabase
2. All your data structure will be clean and organized
3. No more overlapping tables or policies
4. Single source of truth for everything
