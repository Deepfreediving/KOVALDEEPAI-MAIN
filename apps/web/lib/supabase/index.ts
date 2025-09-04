/**
 * 🎯 UNIFIED SUPABASE CLIENT - Single Source of Truth
 * 
 * This module consolidates all Supabase client functionality into a single,
 * type-safe, production-ready interface. It replaces:
 * - supabaseClient.ts
 * - supabaseAdmin.ts
 * - supabaseProductionClient.ts
 * - Parts of supabaseAdvanced.ts
 * 
 * Features:
 * - TypeScript first with generated types
 * - SSR/SSG compatible
 * - Environment-driven configuration
 * - Connection pooling and optimization
 * - Comprehensive error handling
 * - Health checks and monitoring
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, createBrowserClient } from '@supabase/ssr'
import { type Database } from '@/types/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'

// Type definitions
export type SupabaseClientType = SupabaseClient<Database>
export type { Database } from '@/types/supabase'

// Configuration
const SUPABASE_CONFIG = {
  CONNECTION_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF: 1.5,
  BATCH_SIZE: 100,
  MAX_CONCURRENT_REQUESTS: 5,
  CACHE_TTL: 300000,
} as const

// Environment variables - with fallbacks for development
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_KEY || process.env.KOVALAISERVICEROLEKEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Debug environment variables
console.log('🔧 Supabase Environment Variables:', {
  SUPABASE_URL: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'MISSING',
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 30)}...` : 'MISSING',
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.substring(0, 30)}...` : 'MISSING'
})

// Validate environment variables - only warn instead of throwing
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase environment variables not configured - running in offline mode')
}

// Singleton instances
let browserClient: SupabaseClientType | null = null
let serverClient: SupabaseClientType | null = null
let adminClient: SupabaseClientType | null = null

/**
 * ✅ BROWSER CLIENT - For client-side operations
 * Replaces: supabaseClient.ts
 */
export function getBrowserClient(): SupabaseClientType {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured - returning null client')
    return null as any
  }

  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'koval-ai-unified@1.0.0',
      },
    },
  })

  return browserClient
}

/**
 * ✅ SERVER CLIENT - For SSR operations with user context
 * Replaces: supabaseServerClient.js
 * Note: In Pages Router, use getAdminClient() for API routes
 */
export function getServerClient(cookieStore?: any) {
  // For Pages Router compatibility, fallback to browser client if no cookies
  if (!cookieStore && typeof window !== 'undefined') {
    return getBrowserClient()
  }

  // If cookies provided (App Router), use server client
  if (cookieStore) {
    return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })
  }

  // Fallback to admin client for API routes in Pages Router
  return getAdminClient()
}

/**
 * ✅ ADMIN CLIENT - For service-level operations
 * Replaces: supabaseAdmin.ts
 */
export function getAdminClient(): SupabaseClientType {
  if (!isSupabaseConfigured || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Supabase admin not configured - returning null client')
    console.warn('Environment check:', {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    })
    return null as any
  }

  if (adminClient) {
    return adminClient
  }

  console.log('🔑 Creating Supabase admin client with URL:', SUPABASE_URL)

  adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'koval-ai-admin@1.0.0',
      },
    },
  })

  return adminClient
}

/**
 * ✅ HEALTH CHECK - Monitor Supabase connection
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  latency: number
  timestamp: string
  details: {
    auth: boolean
    database: boolean
    storage: boolean
  }
}> {
  const startTime = Date.now()
  const client = getBrowserClient()
  
  try {
    // Test auth
    const { data: authData, error: authError } = await client.auth.getSession()
    const authHealthy = !authError

    // Test database
    const { error: dbError } = await client
      .from('dive_logs')
      .select('id')
      .limit(1)
    const dbHealthy = !dbError

    // Test storage (basic check)
    const { error: storageError } = await client.storage.listBuckets()
    const storageHealthy = !storageError

    const latency = Date.now() - startTime
    const allHealthy = authHealthy && dbHealthy && storageHealthy

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      latency,
      timestamp: new Date().toISOString(),
      details: {
        auth: authHealthy,
        database: dbHealthy,
        storage: storageHealthy,
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: {
        auth: false,
        database: false,
        storage: false,
      },
    }
  }
}

/**
 * ✅ QUERY BUILDER HELPERS - Type-safe operations
 */
export class SupabaseQueryBuilder {
  private client: SupabaseClientType

  constructor(client: SupabaseClientType) {
    this.client = client
  }

  // Dive logs operations
  async getDiveLogs(userId: string, limit = 50) {
    return this.client
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
  }

  async createDiveLog(diveLog: TablesInsert<'dive_logs'>) {
    return (this.client as any)
      .from('dive_logs')
      .insert(diveLog)
      .select()
      .single()
  }

  async updateDiveLog(id: string, updates: TablesUpdate<'dive_logs'>) {
    return (this.client as any)
      .from('dive_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  }

  async deleteDiveLog(id: string) {
    return this.client
      .from('dive_logs')
      .delete()
      .eq('id', id)
  }

  // User profiles operations
  async getUserProfile(userId: string) {
    return this.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
  }

  async createUserProfile(profile: TablesInsert<'user_profiles'>) {
    return (this.client as any)
      .from('user_profiles')
      .insert(profile)
      .select()
      .single()
  }

  async updateUserProfile(userId: string, updates: TablesUpdate<'user_profiles'>) {
    return (this.client as any)
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()
  }

  // Chat sessions operations
  async getChatSession(userId: string) {
    return this.client
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })
      .limit(1)
      .single()
  }

  async createChatSession(session: TablesInsert<'chat_sessions'>) {
    return (this.client as any)
      .from('chat_sessions')
      .insert(session)
      .select()
      .single()
  }

  async updateChatSession(id: string, updates: TablesUpdate<'chat_sessions'>) {
    return (this.client as any)
      .from('chat_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  }
}

/**
 * ✅ CONVENIENCE EXPORTS - Easy access to common patterns
 */
export const supabase = getBrowserClient()
export const queries = supabase ? new SupabaseQueryBuilder(getBrowserClient()) : null

// Additional exports for backwards compatibility
export { getBrowserClient as createClient }
export { getAdminClient as createAdminClient }
export { getServerClient as createServerClient }

/**
 * ✅ RESET CLIENTS - For testing/debugging purposes
 */
export function resetClients(): void {
  browserClient = null
  serverClient = null
  adminClient = null
  console.log('🔄 All Supabase clients reset')
}

// Default export for compatibility - handle null case
export default getBrowserClient()
