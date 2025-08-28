-- ===== FIX RLS POLICIES FOR DIVE_LOG_IMAGE TABLE =====
-- This will allow authenticated users to insert and read their own dive images

-- Step 1: Ensure RLS is enabled (should already be enabled)
ALTER TABLE dive_log_image ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policy for authenticated users to insert their own dive images
CREATE POLICY "Allow user to insert own dive images"
ON dive_log_image
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Step 3: Create policy for authenticated users to read their own dive images
CREATE POLICY "Allow user to read own dive images"
ON dive_log_image
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Step 4: Create policy for authenticated users to update their own dive images
CREATE POLICY "Allow user to update own dive images"
ON dive_log_image
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Step 5: Create policy for authenticated users to delete their own dive images
CREATE POLICY "Allow user to delete own dive images"
ON dive_log_image
FOR DELETE
USING (
  auth.uid() = user_id
);

-- ===== ALSO UPDATE DIVE_LOGS TABLE POLICIES =====
-- Ensure dive_logs table has proper RLS policies too

-- Enable RLS on dive_logs if not already enabled
ALTER TABLE dive_logs ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for dive_logs
CREATE POLICY "Allow user to insert own dive logs"
ON dive_logs
FOR INSERT
WITH CHECK (
  auth.uid()::text = user_id
);

CREATE POLICY "Allow user to read own dive logs"
ON dive_logs
FOR SELECT
USING (
  auth.uid()::text = user_id
);

CREATE POLICY "Allow user to update own dive logs"
ON dive_logs
FOR UPDATE
USING (
  auth.uid()::text = user_id
)
WITH CHECK (
  auth.uid()::text = user_id
);

CREATE POLICY "Allow user to delete own dive logs"
ON dive_logs
FOR DELETE
USING (
  auth.uid()::text = user_id
);

-- ===== VERIFICATION QUERIES =====
-- Run these to verify the policies were created correctly

-- Check RLS status
SELECT schemaname, tablename, rowsecurity, hasoids 
FROM pg_tables 
WHERE tablename IN ('dive_logs', 'dive_log_image');

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('dive_logs', 'dive_log_image')
ORDER BY tablename, policyname;
