// Compatibility layer for legacy imports - TypeScript version
export { supabase } from './supabase/index'
export { getBrowserClient } from './supabase/index'
export { getBrowserClient as createClient } from './supabase/index'  
export { getAdminClient } from './supabase/index'
export { getServerClient } from './supabase/index'
export { queries, healthCheck } from './supabase/index'
export type { Database, TablesInsert, TablesUpdate } from '../types/supabase'

// Default export for default imports
import { getBrowserClient } from './supabase/index'
export default getBrowserClient()
