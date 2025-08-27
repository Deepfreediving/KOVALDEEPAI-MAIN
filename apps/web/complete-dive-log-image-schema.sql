-- Add missing columns to dive_log_image table
-- This will complete the table schema for dive computer image storage

-- Add missing columns
ALTER TABLE dive_log_image 
ADD COLUMN IF NOT EXISTS path TEXT NOT NULL DEFAULT '';

ALTER TABLE dive_log_image 
ADD COLUMN IF NOT EXISTS original_filename TEXT NULL;

ALTER TABLE dive_log_image 
ADD COLUMN IF NOT EXISTS file_size BIGINT NULL;

ALTER TABLE dive_log_image 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comments to document the columns
COMMENT ON COLUMN dive_log_image.path IS 'Storage path/key for the image file';
COMMENT ON COLUMN dive_log_image.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN dive_log_image.file_size IS 'File size in bytes';
COMMENT ON COLUMN dive_log_image.updated_at IS 'Timestamp when record was last updated';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dive_log_image_path ON dive_log_image (path);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_filename ON dive_log_image (original_filename);

-- Update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_dive_log_image_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_dive_log_image_updated_at ON dive_log_image;
CREATE TRIGGER trigger_update_dive_log_image_updated_at
    BEFORE UPDATE ON dive_log_image
    FOR EACH ROW
    EXECUTE FUNCTION update_dive_log_image_updated_at();

-- Add RLS policies for dive_log_image table
-- Enable RLS if not already enabled
ALTER TABLE dive_log_image ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own dive log images" ON dive_log_image;
DROP POLICY IF EXISTS "Users can insert their own dive log images" ON dive_log_image;
DROP POLICY IF EXISTS "Users can update their own dive log images" ON dive_log_image;
DROP POLICY IF EXISTS "Users can delete their own dive log images" ON dive_log_image;

-- Allow users to view their own dive log images
CREATE POLICY "Users can view their own dive log images" ON dive_log_image
    FOR SELECT USING (auth.uid() = user_id::uuid);

-- Allow users to insert their own dive log images
CREATE POLICY "Users can insert their own dive log images" ON dive_log_image
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to update their own dive log images
CREATE POLICY "Users can update their own dive log images" ON dive_log_image
    FOR UPDATE USING (auth.uid() = user_id::uuid)
    WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to delete their own dive log images
CREATE POLICY "Users can delete their own dive log images" ON dive_log_image
    FOR DELETE USING (auth.uid() = user_id::uuid);

-- Verify all columns now exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dive_log_image' 
ORDER BY ordinal_position;

-- Verify policies were created
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'dive_log_image'
ORDER BY policyname;
