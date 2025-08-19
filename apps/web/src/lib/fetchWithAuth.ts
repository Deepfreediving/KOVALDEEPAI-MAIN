import { getSupabaseClient } from '@/lib/supabaseClient';

interface FetchWithAuthOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Fetch wrapper that automatically includes Supabase JWT token
 */
export async function fetchWithAuth(
  url: string, 
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { requireAuth = true, ...fetchOptions } = options;
  
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (requireAuth && !session?.access_token) {
    throw new Error('Authentication required');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}

/**
 * Helper to make authenticated API calls with JSON response parsing
 */
export async function apiCall<T = any>(
  url: string, 
  options: FetchWithAuthOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
}
