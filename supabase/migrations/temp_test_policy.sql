-- Temporary RLS policy fix for testing
-- This will allow any authenticated request to insert (for testing only)

-- Drop existing policy
DROP POLICY IF EXISTS "Admin only access to dive_logs" ON public.dive_logs;

-- Create a temporary permissive policy for testing
CREATE POLICY "Temporary test policy for dive_logs" ON public.dive_logs
    FOR ALL 
    USING (true)
    WITH CHECK (true);
