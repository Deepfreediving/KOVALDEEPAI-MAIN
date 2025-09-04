import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,       // URL is fine to reuse
  process.env.SUPABASE_SERVICE_ROLE_KEY!       // NEVER expose to browser
);
