/**
 * 🗄️ SUPABASE TABLE SETUP
 * 
 * Creates missing tables if they don't exist
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    tables: {},
    fixes: []
  };

  try {
    const supabase = getAdminClient();

    // Check and create chat_messages table if it doesn't exist
    try {
      // First try to query the table
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      if (error && error.message.includes("does not exist")) {
        results.tables.chat_messages = "MISSING - Need to create";
        results.fixes.push("chat_messages table needs to be created in Supabase");
        
        // Note: We can't create tables via API, only via Supabase dashboard or migrations
        results.recommendations = [
          "Go to Supabase Dashboard > Table Editor",
          "Create table: chat_messages",
          "Columns: id (uuid, primary), user_id (text), message (text), response (text), timestamp (timestamp), context_data (jsonb)"
        ];
      } else {
        results.tables.chat_messages = error ? `ERROR: ${error.message}` : "EXISTS";
      }
    } catch (chatError: any) {
      results.tables.chat_messages = `ERROR: ${chatError.message}`;
    }

    // Check dive_logs table
    try {
      const { data, error } = await supabase
        .from('dive_logs')
        .select('id')
        .limit(1);

      results.tables.dive_logs = error ? `ERROR: ${error.message}` : "EXISTS";
    } catch (diveError: any) {
      results.tables.dive_logs = `ERROR: ${diveError.message}`;
    }

    // Check user_profiles table
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      results.tables.user_profiles = error ? `ERROR: ${error.message}` : "EXISTS";
    } catch (profileError: any) {
      results.tables.user_profiles = `ERROR: ${profileError.message}`;
    }

    res.status(200).json(results);

  } catch (error: any) {
    console.error('❌ Error checking Supabase tables:', error);
    res.status(500).json({
      ...results,
      error: error.message
    });
  }
}
