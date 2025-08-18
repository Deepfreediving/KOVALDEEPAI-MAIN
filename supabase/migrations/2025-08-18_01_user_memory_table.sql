-- Create user_memory table for storing chat memories
-- File: supabase/migrations/2025-08-18_01_user_memory_table.sql

-- Create user_memory table
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

-- Policy: Allow anonymous users to read/write their own memories using deterministic UUIDs
CREATE POLICY "Users can manage their own memories" ON public.user_memory
    FOR ALL 
    USING (
        user_id = auth.uid() OR 
        user_id::text = (
            SELECT encode(
                digest(
                    COALESCE(auth.jwt() ->> 'sub', 'anonymous') || 
                    COALESCE(auth.jwt() ->> 'email', 'guest'), 
                    'sha256'
                ), 
                'hex'
            )::uuid
        )::text
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

CREATE TRIGGER update_user_memory_updated_at 
    BEFORE UPDATE ON public.user_memory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
