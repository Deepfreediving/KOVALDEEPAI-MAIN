import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Database, UserProfile } from './supabase';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error?: string;
}

export class AuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data;
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
