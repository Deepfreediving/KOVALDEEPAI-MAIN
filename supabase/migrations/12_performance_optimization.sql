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

-- Add comment for documentation
COMMENT ON INDEX idx_ai_job_image_id IS 'Foreign key index for AI job image references';
COMMENT ON INDEX idx_chat_message_user_id IS 'Foreign key index for chat message user references';
COMMENT ON INDEX idx_chat_thread_user_id IS 'Foreign key index for chat thread user references';
COMMENT ON INDEX idx_dive_log_audit_log_id IS 'Foreign key index for dive log audit references';
COMMENT ON INDEX idx_journal_entry_dive_log_id IS 'Foreign key index for journal entry dive log references';

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
