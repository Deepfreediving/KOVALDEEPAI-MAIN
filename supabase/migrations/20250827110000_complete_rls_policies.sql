-- ================================================
-- KovalAI — 11 Complete RLS Policies (v11)
-- ================================================
-- Final RLS policies for dive log image functionality
-- This completes the dive computer image processing pipeline

-- Ensure RLS is enabled on dive_log_image table
ALTER TABLE dive_log_image ENABLE ROW LEVEL SECURITY;

-- DROP any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own dive log images" ON dive_log_image;
DROP POLICY IF EXISTS "Users can insert their own dive log images" ON dive_log_image;
DROP POLICY IF EXISTS "Users can update their own dive log images" ON dive_log_image;
DROP POLICY IF EXISTS "Users can delete their own dive log images" ON dive_log_image;

-- CREATE comprehensive RLS policies for dive_log_image
-- Using best practices: role targeting and SELECT wrapper for performance
CREATE POLICY "Users can view their own dive log images"
ON dive_log_image
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own dive log images"
ON dive_log_image
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own dive log images"
ON dive_log_image
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own dive log images"
ON dive_log_image
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Verify policies were created
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'dive_log_image'
ORDER BY policyname;

-- Add index for performance optimization on user_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_id ON dive_log_image(user_id);
