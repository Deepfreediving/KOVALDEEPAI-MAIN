-- TEMPORARY: Disable RLS on dive_log_image table for testing
-- ⚠️ WARNING: This removes security - only for testing!

-- Disable RLS temporarily
ALTER TABLE dive_log_image DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'dive_log_image';

-- REMEMBER: Re-enable RLS after testing with:
-- ALTER TABLE dive_log_image ENABLE ROW LEVEL SECURITY;
