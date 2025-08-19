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
  memory_type: 'dive_log' | 'analysis' | 'session' | 'preference';
  content: any;
  embedding?: number[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

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
    };
  };
}

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client with fallback for missing env vars
export const createSupabaseClientFromEnv = (): SupabaseClient<Database> | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables - running in offline mode');
    return null;
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

// Default client instance (can be null if env vars missing)
export const supabase = createSupabaseClientFromEnv();

export default supabase;
