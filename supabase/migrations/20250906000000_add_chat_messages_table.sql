-- ================================================================
-- Add chat_messages table for AI chat history
-- ================================================================

-- Create chat_messages table to store AI conversation history
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_identifier text NOT NULL, -- For anonymous users or custom user IDs
  message text NOT NULL,
  response text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_identifier ON public.chat_messages(user_identifier);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages
-- Users can view their own chat history
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages FOR SELECT
USING (
  auth.uid() = user_id OR 
  (auth.uid() IS NULL AND user_identifier IS NOT NULL)
);

-- Users can insert their own chat messages
CREATE POLICY "Users can insert their own chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() IS NULL AND user_identifier IS NOT NULL)
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_chat_messages ON public.chat_messages;
CREATE TRIGGER set_updated_at_chat_messages
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO anon;
