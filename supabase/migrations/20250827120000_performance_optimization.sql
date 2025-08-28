-- ================================================================
-- KovalAI — Performance Optimization Migration
-- ================================================================
-- Fix unindexed foreign keys identified by Supabase linter
-- This migration adds missing indexes to improve query performance

-- Add missing foreign key indexes (only for tables that exist)
DO $$
BEGIN
    -- Check and create indexes only for tables that exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_job') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_job_image_id ON public.ai_job(image_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_message') THEN
        CREATE INDEX IF NOT EXISTS idx_chat_message_user_id ON public.chat_message(user_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_thread') THEN
        CREATE INDEX IF NOT EXISTS idx_chat_thread_user_id ON public.chat_thread(user_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_assignment') THEN
        CREATE INDEX IF NOT EXISTS idx_coach_assignment_athlete_user_id ON public.coach_assignment(athlete_user_id);
        CREATE INDEX IF NOT EXISTS idx_coach_assignment_coach_user_id ON public.coach_assignment(coach_user_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_comment') THEN
        CREATE INDEX IF NOT EXISTS idx_dive_log_comment_author_user_id ON public.dive_log_comment(author_user_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journal_entry') THEN
        CREATE INDEX IF NOT EXISTS idx_journal_entry_dive_log_id ON public.journal_entry(dive_log_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_catalog') THEN
        CREATE INDEX IF NOT EXISTS idx_location_catalog_user_id ON public.location_catalog(user_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_metric') THEN
        CREATE INDEX IF NOT EXISTS idx_training_metric_dive_log_id ON public.training_metric(dive_log_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_acceptance') THEN
        CREATE INDEX IF NOT EXISTS idx_user_acceptance_legal_document_id ON public.user_acceptance(legal_document_id);
    END IF;
END $$;

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

-- 3. Add index on image lookup pattern
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_id_btree ON public.dive_log_image(dive_log_id) WHERE dive_log_id IS NOT NULL;

-- Remove or update unused indexes that may conflict
-- Keep only the most useful indexes and remove redundant ones

-- Drop unused indexes that are not providing value
DROP INDEX IF EXISTS public.goal_user_date_idx;
DROP INDEX IF EXISTS public.user_document_user_idx;
DROP INDEX IF EXISTS public.dive_logs_user_date_idx;
DROP INDEX IF EXISTS public.dive_logs_user_date_simple_idx;
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
CREATE INDEX IF NOT EXISTS idx_dive_logs_recent_admin ON public.dive_logs(user_id, date DESC, created_at DESC) 
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Optimize image queries for recent records
CREATE INDEX IF NOT EXISTS idx_dive_log_image_recent ON public.dive_log_image(dive_log_id, created_at DESC);

-- ================================================================
-- DATABASE CONFIGURATION OPTIMIZATIONS
-- ================================================================

-- Analyze tables to update query planner statistics (only for existing tables)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        ANALYZE public.dive_logs;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
        ANALYZE public.dive_log_image;
    END IF;
END $$;

-- Add comment for documentation (only for indexes that exist)
DO $$
BEGIN
    -- Check if indexes exist before adding comments
    IF EXISTS (SELECT 1 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_ai_job_image_id') THEN
        EXECUTE 'COMMENT ON INDEX idx_ai_job_image_id IS ''Foreign key index for AI job image references''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_chat_message_user_id') THEN
        EXECUTE 'COMMENT ON INDEX idx_chat_message_user_id IS ''Foreign key index for chat message user references''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_chat_thread_user_id') THEN
        EXECUTE 'COMMENT ON INDEX idx_chat_thread_user_id IS ''Foreign key index for chat thread user references''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_journal_entry_dive_log_id') THEN
        EXECUTE 'COMMENT ON INDEX idx_journal_entry_dive_log_id IS ''Foreign key index for journal entry dive log references''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_dive_logs_user_date_composite') THEN
        EXECUTE 'COMMENT ON INDEX idx_dive_logs_user_date_composite IS ''Composite index for efficient user dive log queries ordered by date''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_dive_log_image_dive_log_composite') THEN
        EXECUTE 'COMMENT ON INDEX idx_dive_log_image_dive_log_composite IS ''Composite index to prevent N+1 queries for dive log images''';
    END IF;
END $$;

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
