-- Create dive_logs table with admin-only access
-- File: supabase/migrations/2025-08-18_04_admin_only_dive_logs.sql

-- Create dive_logs table first
CREATE TABLE IF NOT EXISTS public.dive_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    discipline TEXT NOT NULL,
    location TEXT,
    target_depth DECIMAL(5,2),
    reached_depth DECIMAL(5,2),
    total_dive_time TEXT,
    mouthfill_depth DECIMAL(5,2),
    issue_depth DECIMAL(5,2),
    squeeze BOOLEAN DEFAULT false,
    exit TEXT,
    attempt_type TEXT,
    notes TEXT,
    issue_comment TEXT,
    surface_protocol TEXT,
    -- Add missing performance-critical columns
    bottom_time_seconds INTEGER,
    total_time_seconds INTEGER,
    discipline_type TEXT,
    exit_status TEXT,
    duration_seconds INTEGER,
    distance_m DECIMAL(8,2),
    ear_squeeze TEXT,
    lung_squeeze TEXT,
    narcosis_level INTEGER,
    recovery_quality TEXT,
    gear JSONB DEFAULT '{}'::jsonb,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    ai_summary TEXT,
    -- Standard timestamps and metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.dive_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can manage their own dive logs" ON public.dive_logs;
DROP POLICY IF EXISTS "Allow anonymous users to manage dive logs" ON public.dive_logs;

-- Create admin-only policy for dive_logs
CREATE POLICY "Admin only access to dive_logs" ON public.dive_logs
    FOR ALL 
    USING (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_id ON public.dive_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_logs_date ON public.dive_logs(date);
CREATE INDEX IF NOT EXISTS idx_dive_logs_discipline ON public.dive_logs(discipline);
CREATE INDEX IF NOT EXISTS idx_dive_logs_created_at ON public.dive_logs(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dive_logs_updated_at 
    BEFORE UPDATE ON public.dive_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
