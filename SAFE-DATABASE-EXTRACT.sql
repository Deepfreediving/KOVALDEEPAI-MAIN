-- ================================================================
-- SIMPLE DATABASE STATE EXTRACTION - SAFE VERSION
-- ================================================================
-- This script safely extracts your current database state

-- 1. Show current database info
SELECT 'Database Info' as section, 
       current_database() as database_name,
       current_user as current_user;

-- 2. Show all tables in public schema with row counts
SELECT 'Tables:' as section,
       table_name,
       table_type,
       (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Show dive_logs table structure (if it exists)
SELECT 'dive_logs columns:' as section,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'dive_logs'
ORDER BY ordinal_position;

-- 4. Show dive_log_image table structure (if it exists)
SELECT 'dive_log_image columns:' as section,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'dive_log_image'
ORDER BY ordinal_position;

-- 5. Show current indexes on dive tables
SELECT 'Indexes on dive tables:' as section,
       tablename,
       indexname,
       indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND (tablename LIKE '%dive%' OR tablename = 'user_memory')
ORDER BY tablename, indexname;

-- 6. Show current views
SELECT 'Current Views:' as section,
       table_name
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 7. Show RLS status
SELECT 'RLS Status:' as section,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN ('dive_logs', 'dive_log_image', 'user_memory', 'app_user')
ORDER BY tablename;

-- 8. Show functions that might be triggers
SELECT 'Functions:' as section,
       routine_name,
       routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_name LIKE '%updated_at%'
ORDER BY routine_name;
