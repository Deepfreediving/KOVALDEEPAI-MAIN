-- Create user_memory table with admin-only access
-- File: supabase/migrations/2025-08-18_03_admin_only_user_memory.sql

-- Create user_memory table first
CREATE TABLE IF NOT EXISTS public.user_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    message_content TEXT NOT NULL,
    assistant_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can manage their own memories" ON public.user_memory;

-- Create admin-only policy
-- Replace with Daniel's actual email
CREATE POLICY "Admin only access to user_memory" ON public.user_memory
    FOR ALL 
    USING (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON public.user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_created_at ON public.user_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_user_memory_session_id ON public.user_memory(session_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS update_user_memory_updated_at ON public.user_memory;

CREATE TRIGGER update_user_memory_updated_at 
    BEFORE UPDATE ON public.user_memory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
