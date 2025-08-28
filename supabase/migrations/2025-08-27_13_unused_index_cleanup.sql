-- ================================================
-- KovalAI — Unused Index Cleanup
-- ================================================
-- Remove unused indexes identified by Supabase Database Linter
-- WARNING: Only run this after confirming indexes are truly unused

-- First, let's check which indexes are actually unused
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
ORDER BY schemaname, tablename, indexname;

-- Remove unused indexes (commented out for safety - uncomment to execute)
-- Only uncomment these if you're sure the indexes are not needed

-- DROP INDEX IF EXISTS public.goal_user_date_idx;
-- DROP INDEX IF EXISTS public.user_document_user_idx;
-- DROP INDEX IF EXISTS public.dive_log_user_date_idx;
-- DROP INDEX IF EXISTS public.dive_log_user_date_simple_idx;
-- DROP INDEX IF EXISTS public.journal_user_idx;
-- DROP INDEX IF EXISTS public.image_user_idx;
-- DROP INDEX IF EXISTS public.memory_user_idx;
-- DROP INDEX IF EXISTS public.chat_msg_thread_idx;
-- DROP INDEX IF EXISTS public.job_user_status_idx;
-- DROP INDEX IF EXISTS public.tm_user_created_idx;
-- DROP INDEX IF EXISTS public.idx_dive_logs_discipline;
-- DROP INDEX IF EXISTS public.dlc_log_idx;
-- DROP INDEX IF EXISTS public.idx_user_memory_user_id;
-- DROP INDEX IF EXISTS public.idx_user_memory_created_at;
-- DROP INDEX IF EXISTS public.idx_user_memory_session_id;
-- DROP INDEX IF EXISTS public.idx_dive_logs_date;
-- DROP INDEX IF EXISTS public.idx_dive_log_audit_enclose;
-- DROP INDEX IF EXISTS public.idx_dive_log_audit_scores;
-- DROP INDEX IF EXISTS public.idx_educational_content_slug;
-- DROP INDEX IF EXISTS public.idx_educational_content_topic;
-- DROP INDEX IF EXISTS public.idx_educational_content_tags;
-- DROP INDEX IF EXISTS public.idx_educational_content_cert_level;
-- DROP INDEX IF EXISTS public.idx_dive_log_image_extracted_metrics;
-- DROP INDEX IF EXISTS public.idx_dive_log_image_path;
-- DROP INDEX IF EXISTS public.idx_dive_log_image_filename;

-- Keep the user_id index on dive_log_image as it's needed for RLS performance
-- DROP INDEX IF EXISTS public.idx_dive_log_image_user_id; -- Keep this one!

-- Instead, let's create more targeted indexes that will actually be used
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_id_date ON public.dive_logs(user_id, date DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_created ON public.dive_log_image(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_message_thread_created ON public.chat_message(thread_id, created_at DESC) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_memory_user_type_created ON public.user_memory(user_id, memory_type, created_at DESC) WHERE user_id IS NOT NULL;

-- Performance monitoring query to check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, tablename, indexname;
