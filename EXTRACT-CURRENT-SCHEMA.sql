-- ================================================================
-- SUPABASE SCHEMA EXTRACTION SCRIPT
-- ================================================================
-- Run this in Supabase SQL Editor to get the current working schema

-- 1. Extract all tables and their complete structure
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' ||
    array_to_string(
        array_agg(
            column_name || ' ' || 
            CASE 
                WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
                WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
                WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                WHEN data_type = 'USER-DEFINED' THEN udt_name
                ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
        ), 
        E',\n    '
    ) || 
    ');' as table_ddl
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name IN ('dive_logs', 'dive_log_image', 'user_memory', 'app_user', 'ai_job', 'chat_thread', 'chat_message', 'educational_content')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 2. Extract all indexes
SELECT 
    'CREATE INDEX IF NOT EXISTS ' || indexname || ' ON ' || schemaname || '.' || tablename || 
    CASE 
        WHEN strpos(indexdef, 'WHERE') > 0 
        THEN ' ' || substring(indexdef from 'ON [^(]+(.*)') 
        ELSE ' ' || substring(indexdef from 'ON [^(]+(.*)') 
    END || ';' as index_ddl
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
    AND indexname NOT LIKE 'pg_%'
ORDER BY tablename, indexname;

-- 3. Extract all views
SELECT 
    'CREATE OR REPLACE VIEW ' || table_name || ' AS ' || view_definition || ';' as view_ddl
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Extract all functions
SELECT 
    'CREATE OR REPLACE FUNCTION ' || routine_name || '(' ||
    COALESCE(
        (SELECT string_agg(parameter_name || ' ' || udt_name, ', ' ORDER BY ordinal_position)
         FROM information_schema.parameters p
         WHERE p.specific_name = r.specific_name
           AND parameter_mode = 'IN'), 
        ''
    ) || ') RETURNS ' || 
    CASE 
        WHEN data_type = 'USER-DEFINED' THEN type_udt_name
        ELSE data_type 
    END || 
    ' AS $$ ' || routine_definition || ' $$ LANGUAGE ' || external_language || ';' as function_ddl
FROM information_schema.routines r
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- 5. Extract RLS policies
SELECT 
    'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename ||
    ' FOR ' || cmd ||
    CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
    CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
    ';' as policy_ddl
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Extract table constraints and foreign keys
SELECT 
    'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name || 
    ' ADD CONSTRAINT ' || tc.constraint_name || ' ' ||
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY (' || kcu.column_name || ')'
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
            'FOREIGN KEY (' || kcu.column_name || ') REFERENCES ' || 
            ccu.table_schema || '.' || ccu.table_name || '(' || ccu.column_name || ')'
        WHEN tc.constraint_type = 'UNIQUE' THEN 'UNIQUE (' || kcu.column_name || ')'
        WHEN tc.constraint_type = 'CHECK' THEN 'CHECK (' || cc.check_clause || ')'
    END || ';' as constraint_ddl
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.check_constraints cc 
    ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
