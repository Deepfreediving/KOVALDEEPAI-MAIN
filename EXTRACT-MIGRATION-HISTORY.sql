-- ================================================================
-- SUPABASE MIGRATION HISTORY EXTRACTION
-- ================================================================
-- Run this to see what migrations have been applied

-- 1. Check if supabase_migrations table exists and show applied migrations
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = 'supabase_migrations') THEN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN
            -- Show applied migrations
            PERFORM 'Applied Migrations:' as info;
            RAISE NOTICE 'Checking applied migrations...';
        ELSE
            RAISE NOTICE 'schema_migrations table does not exist';
        END IF;
    ELSE
        RAISE NOTICE 'supabase_migrations schema does not exist';
    END IF;
END $$;

-- Alternative: Check migration history from Supabase's internal tables
SELECT 'Migration Info:' as section,
       'Use Supabase Dashboard > Database > Migrations to see applied migrations' as note;

-- Show what columns exist in schema_migrations if table exists
SELECT 'Schema Migrations Columns:' as section,
       column_name,
       data_type
FROM information_schema.columns 
WHERE table_schema = 'supabase_migrations' 
    AND table_name = 'schema_migrations';

-- 2. Show current database statistics
SELECT 'Database Info:' as section, 
       current_database() as database_name,
       current_user as current_user,
       version() as postgres_version;

-- 3. Show all tables in public schema
SELECT 'Tables in public schema:' as section,
       table_name,
       table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Show all indexes with their definitions
SELECT 'Current Indexes:' as section,
       tablename,
       indexname,
       indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('dive_logs', 'dive_log_image', 'user_memory')
ORDER BY tablename, indexname;

-- 5. Show all views
SELECT 'Current Views:' as section,
       table_name,
       view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 6. Show RLS status for main tables
SELECT 'RLS Status:' as section,
       schemaname,
       tablename,
       rowsecurity as rls_enabled,
       (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
    AND tablename IN ('dive_logs', 'dive_log_image', 'user_memory', 'app_user')
ORDER BY tablename;
