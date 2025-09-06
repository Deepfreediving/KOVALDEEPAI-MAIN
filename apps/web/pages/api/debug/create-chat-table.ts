import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create chat_messages table
    const createTableQuery = `
      -- Create chat_messages table to store AI conversation history
      CREATE TABLE IF NOT EXISTS public.chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        user_identifier text NOT NULL,
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

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
      DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;

      -- Policies for chat_messages
      CREATE POLICY "Users can view their own chat messages"
      ON public.chat_messages FOR SELECT
      USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NULL AND user_identifier IS NOT NULL)
      );

      CREATE POLICY "Users can insert their own chat messages"
      ON public.chat_messages FOR INSERT
      WITH CHECK (
        auth.uid() = user_id OR 
        (auth.uid() IS NULL AND user_identifier IS NOT NULL)
      );

      -- Grant necessary permissions
      GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
      GRANT SELECT, INSERT ON public.chat_messages TO anon;
    `;

    // Execute the query using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { query: createTableQuery });

    if (error) {
      // Try alternative approach with direct query execution
      const { data: directData, error: directError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'chat_messages')
        .eq('table_schema', 'public');

      if (directError) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }

      // Table might already exist, let's check
      const tableExists = directData && directData.length > 0;
      
      return res.status(200).json({
        success: !tableExists, // If table exists, creation "failed" but that's ok
        tableExists,
        message: tableExists 
          ? 'chat_messages table already exists' 
          : 'Attempted to create table, but direct SQL execution is not available',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'chat_messages table created successfully',
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
