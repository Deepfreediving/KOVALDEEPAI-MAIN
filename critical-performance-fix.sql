-- CRITICAL PERFORMANCE FIX - Apply immediately to solve ERR_INSUFFICIENT_RESOURCES
-- Run this SQL directly in Supabase SQL Editor

-- ================================================================
-- CRITICAL PERFORMANCE FIXES FOR ERR_INSUFFICIENT_RESOURCES
-- ================================================================

-- 1. Optimize dive_logs table queries (primary bottleneck)
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_date_composite ON public.dive_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_created_composite ON public.dive_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dive_logs_admin_user ON public.dive_logs(user_id) WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- 2. Optimize dive_log_image table (N+1 query fix)
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_composite ON public.dive_log_image(dive_log_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_created ON public.dive_log_image(user_id, created_at DESC);

-- 3. Create optimized view for dive logs with images (single query solution)
-- Fixed to use actual column names from the table
CREATE OR REPLACE VIEW v_dive_logs_with_images AS
SELECT 
  dl.id,
  dl.user_id,
  dl.date,
  dl.discipline,
  dl.location,
  dl.target_depth,
  dl.reached_depth,
  dl.mouthfill_depth,
  dl.issue_depth,
  dl.total_dive_time,
  dl.squeeze,
  dl.issue_comment,
  dl.exit,
  dl.attempt_type,
  dl.surface_protocol,
  dl.notes,
  -- Use actual column names that exist in the table
  dl.bottom_time_seconds,
  dl.total_time_seconds,
  dl.discipline_type,
  dl.exit_status,
  dl.duration_seconds,
  dl.distance_m,
  dl.ear_squeeze,
  dl.lung_squeeze,
  dl.narcosis_level,
  dl.recovery_quality,
  dl.gear,
  dl.ai_analysis,
  dl.ai_summary,
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

-- 4. Add index on the view's underlying query pattern
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_id_btree ON public.dive_log_image(dive_log_id) WHERE dive_log_id IS NOT NULL;

-- 5. Create admin-specific optimized view (for the specific admin user causing issues)
CREATE OR REPLACE VIEW v_admin_dive_logs AS
SELECT 
  dl.*,
  dli.id as image_id,
  dli.bucket as image_bucket,
  dli.path as image_path,
  dli.original_filename,
  dli.ai_analysis as image_analysis,
  dli.extracted_metrics,
  CASE WHEN dli.id IS NOT NULL THEN true ELSE false END as has_image
FROM public.dive_logs dl
LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id
WHERE dl.user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY dl.date DESC;

-- 6. Add partial indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_dive_logs_recent_admin ON public.dive_logs(date DESC, created_at DESC) 
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' AND date >= CURRENT_DATE - INTERVAL '90 days';

-- 7. Optimize image queries for recent records
CREATE INDEX IF NOT EXISTS idx_dive_log_image_recent ON public.dive_log_image(dive_log_id, created_at DESC) 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- 8. Analyze tables to update query planner statistics
ANALYZE public.dive_logs;
ANALYZE public.dive_log_image;

-- 9. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_ai_job_image_id ON public.ai_job(image_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_user_id ON public.chat_message(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_user_id ON public.chat_thread(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_audit_log_id ON public.dive_log_audit(log_id);

-- Verify the fix worked
SELECT 
    schemaname, 
    tablename, 
    indexname,
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND (indexname LIKE 'idx_dive_logs_%' OR indexname LIKE 'idx_dive_log_image_%')
ORDER BY tablename, indexname;

-- Check if views were created
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_%dive%';
