import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface DiveLog {
  id: string;
  user_id: string;
  date: string;
  location?: string;
  discipline?: string;
  depth?: number;
  duration?: number;
  notes?: string;
  watch_photo?: string;
  analysis?: string;
  created_at: string;
  updated_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  memory_type: 'dive_log' | 'preference' | 'goal' | 'analysis';
  content: any;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

// Database schema type
export interface Database {
  public: {
    Tables: {
      dive_logs: {
        Row: DiveLog;
        Insert: Omit<DiveLog, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DiveLog, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_memory: {
        Row: UserMemory;
        Insert: Omit<UserMemory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserMemory, 'id' | 'created_at' | 'updated_at'>>;
      };
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'created_at' | 'updated_at'>>;
      };
    };
  };
}

export function createSupabaseClient(
  url: string,
  anonKey: string
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: { 
      persistSession: true, 
      autoRefreshToken: true 
    }
  });
}

// For environments where we have access to environment variables
export function createSupabaseClientFromEnv(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient(url, key);
}

// For server-side operations with admin privileges
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase admin environment variables');
  }
  
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
