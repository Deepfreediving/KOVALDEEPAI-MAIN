-- ================================================================
-- IMMEDIATE PERFORMANCE FIX - GUARANTEED TO WORK
-- ================================================================
-- This script ONLY adds indexes and functions - no views, no schema changes

-- Step 1: Create helper function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 2: Add critical indexes for dive_logs performance (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_dive_logs_user_date_perf ON public.dive_logs(user_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_dive_logs_admin_perf ON public.dive_logs(user_id) WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
        CREATE INDEX IF NOT EXISTS idx_dive_logs_created_perf ON public.dive_logs(created_at DESC);
        
        RAISE NOTICE 'Added dive_logs indexes successfully';
    ELSE
        RAISE NOTICE 'dive_logs table does not exist';
    END IF;
END $$;

-- Step 3: Add critical indexes for dive_log_image performance (only if table exists)  
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
        CREATE INDEX IF NOT EXISTS idx_dive_log_image_perf ON public.dive_log_image(dive_log_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_perf ON public.dive_log_image(user_id);
        CREATE INDEX IF NOT EXISTS idx_dive_log_image_created_perf ON public.dive_log_image(created_at DESC);
        
        RAISE NOTICE 'Added dive_log_image indexes successfully';
    ELSE
        RAISE NOTICE 'dive_log_image table does not exist';
    END IF;
END $$;

-- Step 4: Update query planner statistics (safe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        ANALYZE public.dive_logs;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
        ANALYZE public.dive_log_image;
    END IF;
END $$;

-- Step 5: Verify what was created
SELECT 
    'Performance indexes created' as status,
    tablename, 
    indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE '%_perf'
ORDER BY tablename;
