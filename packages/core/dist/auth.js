"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
class AuthService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async signUp(email, password, metadata) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            if (error)
                throw error;
            return {
                user: data.user,
                session: data.session
            };
        }
        catch (error) {
            return {
                user: null,
                session: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error)
                throw error;
            return {
                user: data.user,
                session: data.session
            };
        }
        catch (error) {
            return {
                user: null,
                session: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error)
                throw error;
            return {};
        }
        catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error)
                throw error;
            return user;
        }
        catch {
            return null;
        }
    }
    async getCurrentUserId() {
        const user = await this.getCurrentUser();
        return user?.id ?? null;
    }
    async getCurrentSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error)
                throw error;
            return session;
        }
        catch {
            return null;
        }
    }
    async getUserProfile(userId) {
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
    async updateUserProfile(userId, updates) {
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
    onAuthStateChange(callback) {
        return this.supabase.auth.onAuthStateChange(callback);
    }
}
exports.AuthService = AuthService;
