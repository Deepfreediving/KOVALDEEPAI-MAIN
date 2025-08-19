import { SupabaseClient } from '@supabase/supabase-js';
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
export declare function createSupabaseClient(url: string, anonKey: string): SupabaseClient<Database>;
export declare function createSupabaseClientFromEnv(): SupabaseClient<Database>;
export declare function createSupabaseAdminClient(): SupabaseClient<Database>;
