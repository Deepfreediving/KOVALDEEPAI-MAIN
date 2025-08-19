import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, { 
      auth: { persistSession: true, autoRefreshToken: true } 
    })
  : null;

// Export a safe version that handles null case
export const safeSupabase = {
  ...supabase,
  // Add safe methods that won't crash if supabase is null
  isAvailable: () => !!supabase,
};
