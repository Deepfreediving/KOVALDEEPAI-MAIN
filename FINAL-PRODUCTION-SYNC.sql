-- ================================================================
-- FINAL PRODUCTION SYNC MIGRATION - IDEMPOTENT & SAFE
-- ================================================================
-- This migration safely synchronizes your database to the target state
-- All operations are idempotent and will not fail if already applied

-- Step 1: Ensure core tables exist with correct structure
-- ================================================================

-- Create dive_logs table if not exists (with correct name)
CREATE TABLE IF NOT EXISTS public.dive_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    dive_date DATE NOT NULL,
    location TEXT,
    max_depth DECIMAL(5,2),
    dive_time INTEGER,
    water_temperature DECIMAL(4,1),
    visibility DECIMAL(4,1),
    conditions TEXT,
    notes TEXT,
    buddy TEXT,
    dive_number INTEGER,
    equipment_used TEXT,
    weather TEXT,
    current TEXT,
    entry_exit TEXT,
    safety_stop_time INTEGER,
    surface_interval INTEGER,
    discipline TEXT CHECK (discipline IN ('static', 'dynamic', 'depth', 'training', 'competition')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dive_log_image table if not exists
CREATE TABLE IF NOT EXISTS public.dive_log_image (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dive_log_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    image_name TEXT,
    image_size INTEGER,
    image_type TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add extracted_metrics column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'dive_log_image' 
        AND column_name = 'extracted_metrics'
    ) THEN
        ALTER TABLE dive_log_image ADD COLUMN extracted_metrics JSONB NULL;
        
        -- Add comment
        COMMENT ON COLUMN dive_log_image.extracted_metrics IS 'JSON metadata extracted from dive computer images (depth, time, temperature, etc.)';
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'dive_log_image_dive_log_id_fkey'
        AND table_name = 'dive_log_image'
    ) THEN
        ALTER TABLE dive_log_image 
        ADD CONSTRAINT dive_log_image_dive_log_id_fkey 
        FOREIGN KEY (dive_log_id) REFERENCES dive_logs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 2: Create optimized indexes (idempotent)
-- ================================================================

-- User-based indexes for fast user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_logs_user_id 
ON public.dive_logs(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_logs_user_date 
ON public.dive_logs(user_id, dive_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_logs_user_created 
ON public.dive_logs(user_id, created_at DESC);

-- Discipline filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_logs_discipline 
ON public.dive_logs(discipline);

-- Date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_logs_dive_date 
ON public.dive_logs(dive_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_logs_created_at 
ON public.dive_logs(created_at);

-- Image table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_log_image_dive_log_id 
ON public.dive_log_image(dive_log_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_log_image_created_at 
ON public.dive_log_image(created_at);

-- Extracted metrics index for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dive_log_image_extracted_metrics 
ON dive_log_image USING gin (extracted_metrics);

-- Step 3: Create/replace optimized views
-- ================================================================

-- Drop existing views first (safe - will recreate)
DROP VIEW IF EXISTS v_dive_logs_with_images CASCADE;
DROP VIEW IF EXISTS v_admin_dive_logs CASCADE;

-- Create optimized view for dive logs with images
CREATE VIEW v_dive_logs_with_images AS
SELECT 
    d.id,
    d.user_id,
    d.dive_date,
    d.location,
    d.max_depth,
    d.dive_time,
    d.water_temperature,
    d.visibility,
    d.conditions,
    d.notes,
    d.buddy,
    d.dive_number,
    d.equipment_used,
    d.weather,
    d.current,
    d.entry_exit,
    d.safety_stop_time,
    d.surface_interval,
    d.discipline,
    d.created_at,
    d.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', img.id,
                'image_url', img.image_url,
                'image_name', img.image_name,
                'image_size', img.image_size,
                'image_type', img.image_type,
                'extracted_metrics', img.extracted_metrics,
                'upload_date', img.upload_date
            )
        ) FILTER (WHERE img.id IS NOT NULL),
        '[]'::json
    ) as images,
    COUNT(img.id) as image_count
FROM dive_logs d
LEFT JOIN dive_log_image img ON d.id = img.dive_log_id
GROUP BY d.id, d.user_id, d.dive_date, d.location, d.max_depth, d.dive_time, 
         d.water_temperature, d.visibility, d.conditions, d.notes, d.buddy, 
         d.dive_number, d.equipment_used, d.weather, d.current, d.entry_exit,
         d.safety_stop_time, d.surface_interval, d.discipline, d.created_at, d.updated_at;

-- Create admin view (optimized for high-traffic admin queries)
CREATE VIEW v_admin_dive_logs AS
SELECT 
    d.id,
    d.user_id,
    d.dive_date,
    d.location,
    d.max_depth,
    d.dive_time,
    d.discipline,
    d.created_at,
    COUNT(img.id) as image_count
FROM dive_logs d
LEFT JOIN dive_log_image img ON d.id = img.dive_log_id
GROUP BY d.id, d.user_id, d.dive_date, d.location, d.max_depth, 
         d.dive_time, d.discipline, d.created_at;

-- Add comments to views
COMMENT ON VIEW v_dive_logs_with_images IS 'Optimized view for dive logs with aggregated images - prevents N+1 queries';
COMMENT ON VIEW v_admin_dive_logs IS 'Admin-specific optimized view for high-traffic admin user queries';

-- Step 4: Create update triggers (idempotent)
-- ================================================================

-- Create update function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers (safe - will recreate)
DROP TRIGGER IF EXISTS update_dive_logs_updated_at ON public.dive_logs;
DROP TRIGGER IF EXISTS update_dive_log_image_updated_at ON public.dive_log_image;

-- Create updated_at triggers
CREATE TRIGGER update_dive_logs_updated_at
    BEFORE UPDATE ON public.dive_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dive_log_image_updated_at
    BEFORE UPDATE ON public.dive_log_image
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: RLS Policies (idempotent)
-- ================================================================

-- Enable RLS on tables
ALTER TABLE dive_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_log_image ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe)
DROP POLICY IF EXISTS "Admin only access to dive_logs" ON public.dive_logs;
DROP POLICY IF EXISTS "Admin only access to dive_log_image" ON public.dive_log_image;
DROP POLICY IF EXISTS "Temporary test policy for dive_logs" ON public.dive_logs;

-- Create consolidated admin-only policies
CREATE POLICY "Admin only access to dive_logs" ON public.dive_logs
    FOR ALL
    USING (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    );

CREATE POLICY "Admin only access to dive_log_image" ON public.dive_log_image
    FOR ALL
    USING (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    );

-- Step 6: Grant necessary permissions
-- ================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON dive_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dive_log_image TO authenticated;
GRANT SELECT ON v_dive_logs_with_images TO authenticated;
GRANT SELECT ON v_admin_dive_logs TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 7: Verify installation
-- ================================================================

-- Show final state
SELECT 'Migration Complete - Final State:' as status;

-- Show tables
SELECT 'Tables:' as section, table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('dive_logs', 'dive_log_image')
ORDER BY table_name;

-- Show views
SELECT 'Views:' as section, table_name
FROM information_schema.views 
WHERE table_schema = 'public'
    AND table_name LIKE '%dive%'
ORDER BY table_name;

-- Show indexes
SELECT 'Indexes:' as section, tablename, indexname
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('dive_logs', 'dive_log_image')
ORDER BY tablename, indexname;

-- Final success message
SELECT 'SUCCESS: All performance optimizations applied safely!' as final_status;
