-- Quick schema diagnostic to understand current state
-- Run this in Supabase SQL editor to understand the actual table structure

SELECT 'TABLES' as info_type, table_name, null as column_name, null as data_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('dive_logs', 'dive_log_image')

UNION ALL

SELECT 'COLUMNS' as info_type, table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('dive_logs', 'dive_log_image')

ORDER BY info_type DESC, table_name, column_name;
