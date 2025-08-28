-- ================================================================
-- CRITICAL PERFORMANCE FIX - EMERGENCY SQL SCRIPT
-- ================================================================
-- Run this directly in Supabase SQL Editor to fix ERR_INSUFFICIENT_RESOURCES
-- Uses only existing columns and correct table names

-- 1. Add critical indexes for the admin user causing resource exhaustion
CREATE INDEX IF NOT EXISTS idx_dive_logs_admin_user_date ON public.dive_logs(user_id, date DESC, created_at DESC)
WHERE user_id::text = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- 2. Add image join optimization indexes
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_user ON public.dive_log_image(dive_log_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_recent ON public.dive_log_image(user_id, created_at DESC) 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- 3. Create optimized view for dive_logs with images (single query instead of N+1)
CREATE OR REPLACE VIEW v_dive_logs_with_images AS
SELECT 
  dl.id,
  dl.user_id,
  dl.date,
  dl.discipline,
  dl.location,
  dl.target_depth,
  dl.reached_depth,
  dl.total_dive_time,
  dl.mouthfill_depth,
  dl.issue_depth,
  dl.squeeze,
  dl.exit,
  dl.attempt_type,
  dl.notes,
  dl.issue_comment,
  dl.surface_protocol,
  dl.metadata,
  dl.created_at,
  dl.updated_at,
  -- Image data (LEFT JOIN to avoid excluding logs without images)
  dli.id as image_id,
  dli.bucket as image_bucket,
  dli.path as image_path,
  dli.original_filename,
  dli.ai_analysis as image_analysis,
  dli.extracted_metrics,
  CASE WHEN dli.id IS NOT NULL THEN true ELSE false END as has_image
FROM public.dive_logs dl
LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id
ORDER BY dl.date DESC, dl.created_at DESC;

-- 4. Create admin-specific view for the problematic user
CREATE OR REPLACE VIEW v_admin_dive_logs AS
SELECT 
  dl.id,
  dl.user_id,
  dl.date,
  dl.discipline,
  dl.location,
  dl.target_depth,
  dl.reached_depth,
  dl.total_dive_time,
  dl.mouthfill_depth,
  dl.issue_depth,
  dl.squeeze,
  dl.exit,
  dl.attempt_type,
  dl.notes,
  dl.issue_comment,
  dl.surface_protocol,
  dl.metadata,
  dl.created_at,
  dl.updated_at,
  -- Image data
  dli.id as image_id,
  dli.bucket as image_bucket,
  dli.path as image_path,
  dli.original_filename,
  dli.ai_analysis as image_analysis,
  dli.extracted_metrics,
  CASE WHEN dli.id IS NOT NULL THEN true ELSE false END as has_image
FROM public.dive_logs dl
LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id
WHERE dl.user_id::text = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY dl.date DESC;

-- 5. Update table statistics for query optimizer
ANALYZE public.dive_logs;
ANALYZE public.dive_log_image;

-- 6. Verify the fix worked
SELECT 
    'Indexes created' as status,
    COUNT(*) as index_count 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_dive_logs_admin%';

-- 7. Test the optimized view (should return results instantly)
SELECT COUNT(*) as total_records 
FROM v_admin_dive_logs;

-- 8. Check for any remaining unindexed foreign keys
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('dive_logs', 'dive_log_image')
    AND attname IN ('user_id', 'dive_log_id')
ORDER BY tablename, attname;

SELECT 'Performance fix complete - ERR_INSUFFICIENT_RESOURCES should be resolved' as result;
