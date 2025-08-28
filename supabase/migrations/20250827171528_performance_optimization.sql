-- ================================================================
-- KovalAI — Performance Optimization Migration
-- ================================================================
-- Fix unindexed foreign keys identified by Supabase linter
-- This migration adds missing indexes to improve query performance

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_ai_job_image_id ON public.ai_job(image_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_user_id ON public.chat_message(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_user_id ON public.chat_thread(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignment_athlete_user_id ON public.coach_assignment(athlete_user_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignment_coach_user_id ON public.coach_assignment(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_audit_log_id ON public.dive_log_audit(log_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_comment_author_user_id ON public.dive_log_comment(author_user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_dive_log_id ON public.journal_entry(dive_log_id);
CREATE INDEX IF NOT EXISTS idx_location_catalog_user_id ON public.location_catalog(user_id);
CREATE INDEX IF NOT EXISTS idx_training_metric_dive_log_id ON public.training_metric(dive_log_id);
CREATE INDEX IF NOT EXISTS idx_user_acceptance_legal_document_id ON public.user_acceptance(legal_document_id);

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

-- 4. Add index on the view's underlying query pattern
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_id_btree ON public.dive_log_image(dive_log_id) WHERE dive_log_id IS NOT NULL;

-- 5. Create admin-specific optimized view (for the specific admin user causing issues)
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

-- Remove or update unused indexes that may conflict
-- Keep only the most useful indexes and remove redundant ones

-- Drop unused indexes that are not providing value
DROP INDEX IF EXISTS public.goal_user_date_idx;
DROP INDEX IF EXISTS public.user_document_user_idx;
DROP INDEX IF EXISTS public.dive_log_user_date_idx;
DROP INDEX IF EXISTS public.dive_log_user_date_simple_idx;
DROP INDEX IF EXISTS public.journal_user_idx;
DROP INDEX IF EXISTS public.image_user_idx;
DROP INDEX IF EXISTS public.memory_user_idx;
DROP INDEX IF EXISTS public.chat_msg_thread_idx;
DROP INDEX IF EXISTS public.job_user_status_idx;
DROP INDEX IF EXISTS public.tm_user_created_idx;
DROP INDEX IF EXISTS public.idx_dive_logs_discipline;
DROP INDEX IF EXISTS public.dlc_log_idx;

-- Keep essential user_memory indexes (these might be used later)
-- DROP INDEX IF EXISTS public.idx_user_memory_user_id;
-- DROP INDEX IF EXISTS public.idx_user_memory_created_at;
-- DROP INDEX IF EXISTS public.idx_user_memory_session_id;

-- Keep essential dive_logs indexes 
-- DROP INDEX IF EXISTS public.idx_dive_logs_date;

-- Keep essential audit indexes (these are for E.N.C.L.O.S.E. system)
-- DROP INDEX IF EXISTS public.idx_dive_log_audit_enclose;
-- DROP INDEX IF EXISTS public.idx_dive_log_audit_scores;

-- Keep educational content indexes (for future content system)
-- DROP INDEX IF EXISTS public.idx_educational_content_slug;
-- DROP INDEX IF EXISTS public.idx_educational_content_topic;
-- DROP INDEX IF EXISTS public.idx_educational_content_tags;
-- DROP INDEX IF EXISTS public.idx_educational_content_cert_level;

-- Update dive_log_image indexes - keep the most useful ones
DROP INDEX IF EXISTS public.idx_dive_log_image_extracted_metrics;
DROP INDEX IF EXISTS public.idx_dive_log_image_path;
DROP INDEX IF EXISTS public.idx_dive_log_image_filename;
-- Keep idx_dive_log_image_user_id as it's essential for RLS performance

-- ================================================================
-- QUERY PERFORMANCE OPTIMIZATIONS
-- ================================================================

-- Add partial indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_dive_logs_recent_admin ON public.dive_logs(date DESC, created_at DESC) 
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' AND date >= CURRENT_DATE - INTERVAL '90 days';

-- Optimize image queries for recent records
CREATE INDEX IF NOT EXISTS idx_dive_log_image_recent ON public.dive_log_image(dive_log_id, created_at DESC) 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- ================================================================
-- DATABASE CONFIGURATION OPTIMIZATIONS
-- ================================================================

-- Analyze tables to update query planner statistics
ANALYZE public.dive_logs;
ANALYZE public.dive_log_image;
ANALYZE public.dive_log_audit;

-- Add comment for documentation
COMMENT ON INDEX idx_ai_job_image_id IS 'Foreign key index for AI job image references';
COMMENT ON INDEX idx_chat_message_user_id IS 'Foreign key index for chat message user references';
COMMENT ON INDEX idx_chat_thread_user_id IS 'Foreign key index for chat thread user references';
COMMENT ON INDEX idx_dive_log_audit_log_id IS 'Foreign key index for dive log audit references';
COMMENT ON INDEX idx_journal_entry_dive_log_id IS 'Foreign key index for journal entry dive log references';
COMMENT ON INDEX idx_dive_logs_user_date_composite IS 'Composite index for efficient user dive log queries ordered by date';
COMMENT ON INDEX idx_dive_log_image_dive_log_composite IS 'Composite index to prevent N+1 queries for dive log images';
COMMENT ON VIEW v_dive_logs_with_images IS 'Optimized view combining dive logs with images to prevent N+1 queries';
COMMENT ON VIEW v_admin_dive_logs IS 'Admin-specific optimized view for high-traffic admin user queries';

-- Verify indexes were created
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
