-- 🔐 SUPABASE STORAGE & RLS POLICIES
-- User-specific file access and security

-- =======================
-- STORAGE BUCKET POLICIES  
-- =======================

-- Create dive-images bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dive-images',
  'dive-images', 
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload dive images" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'dive-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own dive images" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'dive-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own dive images" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'dive-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
) 
WITH CHECK (
  bucket_id = 'dive-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files  
CREATE POLICY "Users can delete own dive images" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'dive-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =======================
-- DATABASE RLS POLICIES
-- =======================

-- Enable RLS on all dive-related tables
ALTER TABLE dive_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_log_image ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own dive logs
CREATE POLICY "Users own dive logs access" ON dive_logs
FOR ALL 
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

-- Policy: Users can only access their own dive images
CREATE POLICY "Users own dive images access" ON dive_log_image
FOR ALL 
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

-- =======================
-- HELPER FUNCTIONS
-- =======================

-- Function to get user's dive image folder path
CREATE OR REPLACE FUNCTION get_user_dive_folder(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN user_uuid::text || '/dive-images/';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate dive image upload
CREATE OR REPLACE FUNCTION validate_dive_image_upload(
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check file size (max 10MB)
  IF file_size > 10485760 THEN
    RETURN FALSE;
  END IF;
  
  -- Check mime type
  IF mime_type NOT IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp') THEN
    RETURN FALSE;
  END IF;
  
  -- Check file extension
  IF NOT (file_name ~* '\.(jpg|jpeg|png|webp)$') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- ADMIN BYPASS (for development)
-- =======================

-- Allow service role to bypass RLS for admin operations
CREATE POLICY "Service role bypass" ON dive_logs
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass images" ON dive_log_image  
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =======================
-- INDEXES FOR PERFORMANCE
-- =======================

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_date ON dive_logs (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_dive_images_user ON dive_log_image (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dive_images_log_link ON dive_log_image (dive_log_id);

-- =======================
-- GRANTS AND PERMISSIONS
-- =======================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON dive_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dive_log_image TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant service role full access for admin operations
GRANT ALL ON dive_logs TO service_role;
GRANT ALL ON dive_log_image TO service_role;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;
