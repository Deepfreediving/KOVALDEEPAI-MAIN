-- ================================================================
-- SAFE SCHEMA ALIGNMENT FOR PRODUCTION
-- ================================================================
-- Safely align existing cloud database with code expectations
-- This migration handles existing tables and only makes necessary changes

-- ================================================================
-- STEP 1: CHECK AND RENAME TABLES SAFELY
-- ================================================================

-- Only rename dive_images to dive_log_image if dive_images exists and dive_log_image doesn't
DO $$ 
BEGIN
  -- Check if we need to rename dive_images to dive_log_image
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_images')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
    
    ALTER TABLE public.dive_images RENAME TO dive_log_image;
    RAISE NOTICE 'Renamed dive_images to dive_log_image';
    
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
    RAISE NOTICE 'dive_log_image table already exists - skipping rename';
  ELSE
    RAISE NOTICE 'Neither dive_images nor dive_log_image found - will create dive_log_image';
  END IF;
END $$;

-- ================================================================
-- STEP 2: ENSURE DIVE_LOG_IMAGE TABLE HAS ALL REQUIRED COLUMNS
-- ================================================================

-- Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.dive_log_image (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  dive_log_id uuid REFERENCES public.dive_logs(id),
  created_at timestamptz DEFAULT NOW()
);

-- Add missing columns that the code expects (safe - won't error if column exists)
DO $$ 
BEGIN
  -- Add bucket column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'bucket') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN bucket text DEFAULT 'dive-images';
  END IF;
  
  -- Add path_original column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'path_original') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN path_original text;
  END IF;
  
  -- Add path_compressed column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'path_compressed') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN path_compressed text;
  END IF;
  
  -- Add mime_type column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'mime_type') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN mime_type text;
  END IF;
  
  -- Add bytes column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'bytes') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN bytes bigint;
  END IF;
  
  -- Add width column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'width') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN width integer;
  END IF;
  
  -- Add height column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'height') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN height integer;
  END IF;
  
  -- Add sha256 column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'sha256') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN sha256 text;
  END IF;
  
  -- Add ocr_text column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'ocr_text') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN ocr_text text;
  END IF;
  
  -- Add ai_summary column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'ai_summary') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN ai_summary text;
  END IF;
  
  -- Add ai_analysis column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'ai_analysis') THEN
    ALTER TABLE public.dive_log_image ADD COLUMN ai_analysis jsonb;
  END IF;
  
  -- Add embedding column (if vector extension is available)
  BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'embedding') THEN
      ALTER TABLE public.dive_log_image ADD COLUMN embedding vector;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Vector extension not available - skipping embedding column';
  END;
  
END $$;

-- ================================================================
-- STEP 3: MIGRATE DATA FROM OLD COLUMNS TO NEW COLUMNS
-- ================================================================

-- If we have an image_url column, migrate it to path_original
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dive_log_image' AND column_name = 'image_url') THEN
    -- Copy data from image_url to path_original where path_original is null
    UPDATE public.dive_log_image 
    SET path_original = image_url 
    WHERE path_original IS NULL AND image_url IS NOT NULL;
    
    RAISE NOTICE 'Migrated image_url data to path_original';
  END IF;
END $$;

-- ================================================================
-- STEP 4: ENSURE PROPER INDEXES
-- ================================================================

-- Create indexes safely (won't error if they exist)
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_id ON public.dive_log_image(dive_log_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_id ON public.dive_log_image(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_sha256 ON public.dive_log_image(sha256) WHERE sha256 IS NOT NULL;

-- ================================================================
-- STEP 5: ENSURE RLS AND PERMISSIONS
-- ================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.dive_log_image ENABLE ROW LEVEL SECURITY;

-- Drop old policies and create new ones
DROP POLICY IF EXISTS "dive_images_own_access" ON public.dive_log_image;
DROP POLICY IF EXISTS "dive_log_image_own_access" ON public.dive_log_image;

-- Create the policy we need
CREATE POLICY "dive_log_image_own_access" ON public.dive_log_image
  FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dive_log_image TO authenticated;

-- ================================================================
-- STEP 6: VERIFY MIGRATION
-- ================================================================

-- Show the final table structure
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed. Final dive_log_image table structure:';
END $$;

-- Show columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'dive_log_image'
ORDER BY ordinal_position;

COMMENT ON TABLE public.dive_log_image IS 'Images for dive logs - aligned with code expectations';
