"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = createSupabaseClient;
exports.createSupabaseClientFromEnv = createSupabaseClientFromEnv;
exports.createSupabaseAdminClient = createSupabaseAdminClient;
const supabase_js_1 = require("@supabase/supabase-js");
function createSupabaseClient(url, anonKey) {
    return (0, supabase_js_1.createClient)(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    });
}
// For environments where we have access to environment variables
function createSupabaseClientFromEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error('Missing Supabase environment variables');
    }
    return createSupabaseClient(url, key);
}
// For server-side operations with admin privileges
function createSupabaseAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing Supabase admin environment variables');
    }
    return (0, supabase_js_1.createClient)(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
