-- Create user_memory table to fix chat API errors
-- This stores conversation memory and context for the AI assistant

CREATE TABLE IF NOT EXISTS public.user_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type VARCHAR(50) DEFAULT 'conversation',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON public.user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON public.user_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memory_created_at ON public.user_memory(created_at);

-- Enable Row Level Security
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous and authenticated users
CREATE POLICY "Users can read their own memory" ON public.user_memory
  FOR SELECT USING (true); -- Allow reading all for now

CREATE POLICY "Users can insert their own memory" ON public.user_memory
  FOR INSERT WITH CHECK (true); -- Allow inserting all for now

CREATE POLICY "Users can update their own memory" ON public.user_memory
  FOR UPDATE USING (true); -- Allow updating all for now

CREATE POLICY "Users can delete their own memory" ON public.user_memory
  FOR DELETE USING (true); -- Allow deleting all for now

-- Grant permissions to anonymous users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memory TO authenticated;
