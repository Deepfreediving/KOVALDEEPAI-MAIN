import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Prefer generated types if present, otherwise fall back to basic typing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Database = any;

let browserClient: SupabaseClient<Database> | null = null;
let serviceClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing Supabase env for browser client');
  browserClient = createBrowserClient<Database>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

export function getSupabaseServiceClient(): SupabaseClient<Database> {
  if (serviceClient) return serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing Supabase env for service client');
  serviceClient = createClient<Database>(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return serviceClient;
}

// Lightweight query builder used by tests
export type QueryOptions = {
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, string | number | boolean | null>;
};

export function createQueryBuilder(client: SupabaseClient<Database>) {
  return {
    async select(table: string, columns = '*', opts: QueryOptions = {}) {
      try {
        let q: any = client.from(table).select(columns);
        if (opts.filters) {
          for (const [k, v] of Object.entries(opts.filters)) q = q.eq(k, v as any);
        }
        if (opts.orderBy) q = q.order(opts.orderBy, { ascending: !!opts.ascending });
        if (opts.limit) q = q.limit(opts.limit);
        const { data, error } = await q;
        return { data, error };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async update(table: string, values: any, opts: QueryOptions = {}) {
      if (!opts.filters || Object.keys(opts.filters).length === 0) {
        return { data: null, error: new Error('Unsafe update blocked: filters required') };
      }
      let q: any = client.from(table).update(values);
      for (const [k, v] of Object.entries(opts.filters)) q = q.eq(k, v as any);
      return await q.select();
    },
    async delete(table: string, opts: QueryOptions = {}) {
      if (!opts.filters || Object.keys(opts.filters).length === 0) {
        return { data: null, error: new Error('Unsafe delete blocked: filters required') };
      }
      let q: any = client.from(table).delete();
      for (const [k, v] of Object.entries(opts.filters)) q = q.eq(k, v as any);
      return await q.select();
    },
  };
}

export function createFunctionCaller(client: SupabaseClient<Database>) {
  return {
    async call(name: string, args: Record<string, any>) {
      try {
        const { data, error } = await client.rpc(name, args);
        return { data, error };
      } catch (error: any) {
        return { data: null, error };
      }
    },
  };
}

export function createAuthManager(client: SupabaseClient<Database>) {
  return {
    async getSession() {
      try {
        const { data, error } = await client.auth.getSession();
        return { session: data.session, error };
      } catch (error: any) {
        return { session: null, error };
      }
    },
    async getCurrentUser() {
      try {
        const { data, error } = await client.auth.getUser();
        return { user: data.user, error };
      } catch (error: any) {
        return { user: null, error };
      }
    },
  };
}

export async function checkSupabaseHealth() {
  try {
    const start = Date.now();
    const client = getSupabaseBrowserClient();
    const { error: authErr } = await client.auth.getSession();
    // Use a cheap query to ensure DB connectivity
    const { error: dbErr } = await client.from('dive_logs').select('id').limit(1);
    return {
      healthy: !authErr && !dbErr,
      database: !dbErr,
      auth: !authErr,
      latency: Date.now() - start,
      error: authErr?.message || dbErr?.message || null,
    };
  } catch (e: any) {
    return { healthy: false, database: false, auth: false, latency: 0, error: e.message };
  }
}
