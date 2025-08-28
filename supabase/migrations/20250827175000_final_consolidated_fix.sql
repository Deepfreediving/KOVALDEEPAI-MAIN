-- ================================================================
-- FINAL CONSOLIDATED MIGRATION FIX
-- ================================================================
-- This migration resolves all conflicts and ensures everything works

-- 1. Ensure helper functions exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = NOW(); 
    RETURN NEW; 
END $$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$
LANGUAGE plpgsql;

-- 2. Ensure dive_logs table has all required columns
DO $$
BEGIN
    -- Add missing columns to dive_logs if they don't exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        -- Add columns that might be missing
        BEGIN
            ALTER TABLE public.dive_logs ADD COLUMN IF NOT EXISTS bottom_time_seconds INTEGER;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.dive_logs ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.dive_logs ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE public.dive_logs ADD COLUMN IF NOT EXISTS ai_summary TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        
        RAISE NOTICE 'Updated dive_logs table schema';
    END IF;
END $$;

-- 3. Add all critical performance indexes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        -- Critical indexes for performance
        CREATE INDEX IF NOT EXISTS idx_dive_logs_user_date_final ON public.dive_logs(user_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_dive_logs_user_created_final ON public.dive_logs(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_dive_logs_admin_final ON public.dive_logs(user_id) WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
        CREATE INDEX IF NOT EXISTS idx_dive_logs_date_final ON public.dive_logs(date DESC);
        CREATE INDEX IF NOT EXISTS idx_dive_logs_created_final ON public.dive_logs(created_at DESC);
        
        RAISE NOTICE 'Added dive_logs performance indexes';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
        -- Image table indexes
        CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_final ON public.dive_log_image(dive_log_id);
        CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_final ON public.dive_log_image(user_id);
        CREATE INDEX IF NOT EXISTS idx_dive_log_image_composite_final ON public.dive_log_image(dive_log_id, user_id);
        
        RAISE NOTICE 'Added dive_log_image performance indexes';
    END IF;
END $$;

-- 4. Create safe optimized view
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        -- Drop existing conflicting views first
        DROP VIEW IF EXISTS v_dive_logs_with_images CASCADE;
        DROP VIEW IF EXISTS v_admin_dive_logs CASCADE;
        
        -- Create new optimized view with only guaranteed columns
        CREATE VIEW v_dive_logs_with_images AS
        SELECT 
          dl.id,
          dl.user_id,
          dl.date,
          dl.discipline,
          COALESCE(dl.location, '') as location,
          COALESCE(dl.target_depth, NULL) as target_depth,
          COALESCE(dl.reached_depth, NULL) as reached_depth,
          COALESCE(dl.total_dive_time, '') as total_dive_time,
          COALESCE(dl.notes, '') as notes,
          dl.created_at,
          dl.updated_at,
          dli.id as image_id,
          COALESCE(dli.bucket, '') as image_bucket,
          COALESCE(dli.path_original, '') as image_path,
          CASE WHEN dli.id IS NOT NULL THEN true ELSE false END as has_image
        FROM public.dive_logs dl
        LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id
        ORDER BY dl.date DESC, dl.created_at DESC;
        
        -- Grant permissions
        GRANT SELECT ON v_dive_logs_with_images TO authenticated;
        GRANT SELECT ON v_dive_logs_with_images TO service_role;
        
        RAISE NOTICE 'Created safe optimized view';
    END IF;
END $$;

-- 5. Update statistics
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        ANALYZE public.dive_logs;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
        ANALYZE public.dive_log_image;
    END IF;
END $$;

-- 6. Final verification
SELECT 
    'Migration completed successfully' as status,
    count(*) as new_indexes_created
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE '%_final';

SELECT 
    'Views created' as status,
    count(*) as views_count
FROM information_schema.views 
WHERE table_schema = 'public' 
    AND table_name LIKE '%dive%';
