-- ================================================
-- KovalAI — Security Advisor Fixes
-- ================================================
-- Comprehensive security improvements based on Supabase Security Advisor

-- 1. Enable RLS on all user-facing tables
ALTER TABLE IF EXISTS public.dive_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dive_log_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dive_log_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dive_log_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.location_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assistant_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.educational_content ENABLE ROW LEVEL SECURITY;

-- 2. Create performance indexes for foreign keys (fixes unindexed_foreign_keys warnings)
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

-- 3. Basic RLS policies for user-scoped tables
-- Only create policies if tables exist and don't already have them

-- Dive logs policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dive_logs' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own dive logs" ON public.dive_logs;
        CREATE POLICY "Users can view own dive logs" ON public.dive_logs
            FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can insert own dive logs" ON public.dive_logs;
        CREATE POLICY "Users can insert own dive logs" ON public.dive_logs
            FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can update own dive logs" ON public.dive_logs;
        CREATE POLICY "Users can update own dive logs" ON public.dive_logs
            FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can delete own dive logs" ON public.dive_logs;
        CREATE POLICY "Users can delete own dive logs" ON public.dive_logs
            FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- User memory policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memory' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own memory" ON public.user_memory;
        CREATE POLICY "Users can view own memory" ON public.user_memory
            FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can insert own memory" ON public.user_memory;
        CREATE POLICY "Users can insert own memory" ON public.user_memory
            FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can update own memory" ON public.user_memory;
        CREATE POLICY "Users can update own memory" ON public.user_memory
            FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can delete own memory" ON public.user_memory;
        CREATE POLICY "Users can delete own memory" ON public.user_memory
            FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- Chat message policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_message' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_message;
        CREATE POLICY "Users can view own chat messages" ON public.chat_message
            FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_message;
        CREATE POLICY "Users can insert own chat messages" ON public.chat_message
            FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- Chat thread policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_thread' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own chat threads" ON public.chat_thread;
        CREATE POLICY "Users can view own chat threads" ON public.chat_thread
            FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can insert own chat threads" ON public.chat_thread;
        CREATE POLICY "Users can insert own chat threads" ON public.chat_thread
            FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
        
        DROP POLICY IF EXISTS "Users can update own chat threads" ON public.chat_thread;
        CREATE POLICY "Users can update own chat threads" ON public.chat_thread
            FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- 4. Storage policies for dive-images bucket
DROP POLICY IF EXISTS "Users can view own dive images" ON storage.objects;
CREATE POLICY "Users can view own dive images" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'dive-images' 
        AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can upload own dive images" ON storage.objects;
CREATE POLICY "Users can upload own dive images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'dive-images' 
        AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own dive images" ON storage.objects;
CREATE POLICY "Users can update own dive images" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'dive-images' 
        AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    ) WITH CHECK (
        bucket_id = 'dive-images' 
        AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own dive images" ON storage.objects;
CREATE POLICY "Users can delete own dive images" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'dive-images' 
        AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    );

-- 5. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Create security definer functions for admin operations
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email IN ('daniel@deepfreediving.com', 'admin@kovaldeepai.com')
  );
$$;

-- 7. Educational content - public read, admin write
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'educational_content' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Anyone can view educational content" ON public.educational_content;
        CREATE POLICY "Anyone can view educational content" ON public.educational_content
            FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Only admins can manage educational content" ON public.educational_content;
        CREATE POLICY "Only admins can manage educational content" ON public.educational_content
            FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
END $$;

-- 8. Update existing dive_log_image policies to be more specific
DROP POLICY IF EXISTS "Users can view their own dive log images" ON public.dive_log_image;
CREATE POLICY "Users can view their own dive log images" ON public.dive_log_image
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own dive log images" ON public.dive_log_image;
CREATE POLICY "Users can insert their own dive log images" ON public.dive_log_image
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own dive log images" ON public.dive_log_image;
CREATE POLICY "Users can update their own dive log images" ON public.dive_log_image
    FOR UPDATE TO authenticated 
    USING ((SELECT auth.uid()) = user_id) 
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own dive log images" ON public.dive_log_image;
CREATE POLICY "Users can delete their own dive log images" ON public.dive_log_image
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 9. Verify all policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
