import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Database, UserProfile } from './supabase';
export interface AuthResult {
    user: User | null;
    session: Session | null;
    error?: string;
}
export declare class AuthService {
    private supabase;
    constructor(supabase: SupabaseClient<Database>);
    signUp(email: string, password: string, metadata?: any): Promise<AuthResult>;
    signIn(email: string, password: string): Promise<AuthResult>;
    signOut(): Promise<{
        error?: string;
    }>;
    getCurrentUser(): Promise<User | null>;
    getCurrentUserId(): Promise<string | null>;
    getCurrentSession(): Promise<Session | null>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null>;
    onAuthStateChange(callback: (event: string, session: Session | null) => void): {
        data: {
            subscription: import("@supabase/supabase-js").Subscription;
        };
    };
}
