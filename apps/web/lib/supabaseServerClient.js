import { createClient } from '@supabase/supabase-js';

// Singleton pattern for server-side Supabase client
let serverSupabaseInstance = null;

export function getServerSupabaseClient() {
  if (serverSupabaseInstance) {
    return serverSupabaseInstance;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables for server client');
    return null;
  }
  
  serverSupabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Server-side doesn't need session persistence
      autoRefreshToken: false,
    },
  });
  
  return serverSupabaseInstance;
}

// For admin operations that need elevated privileges
let adminSupabaseInstance = null;

export function getAdminSupabaseClient() {
  if (adminSupabaseInstance) {
    return adminSupabaseInstance;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Missing Supabase admin environment variables - falling back to anon client');
    return getServerSupabaseClient();
  }
  
  adminSupabaseInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  return adminSupabaseInstance;
}
