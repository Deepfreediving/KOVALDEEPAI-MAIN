-- Fix user references in dive_log_image table and create users view
-- Migration: 20250905000000_fix_user_references.sql

-- Drop existing foreign key constraint if it exists
DO $$ 
BEGIN
    -- Drop the constraint if it references a non-existent users table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'dive_log_image_user_id_fkey' 
        AND table_name = 'dive_log_image'
    ) THEN
        ALTER TABLE public.dive_log_image DROP CONSTRAINT dive_log_image_user_id_fkey;
        RAISE NOTICE 'Dropped existing user_id foreign key constraint';
    END IF;
END $$;

-- Ensure the dive_log_image table exists (it might be named dive_images)
DO $$
BEGIN
    -- If dive_images exists but dive_log_image doesn't, rename it
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_images')
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_image') THEN
        ALTER TABLE public.dive_images RENAME TO dive_log_image;
        RAISE NOTICE 'Renamed dive_images to dive_log_image';
    END IF;
END $$;

-- Create dive_log_image table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dive_log_image (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dive_log_id uuid, -- Will be nullable for standalone images
    user_id uuid NOT NULL, -- References auth.users
    
    -- Storage info
    bucket text NOT NULL DEFAULT 'dive-images',
    path_original text NOT NULL,
    path_compressed text,
    mime_type text NOT NULL,
    bytes bigint NOT NULL,
    
    -- AI analysis
    ai_analysis jsonb DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Add proper foreign key constraint to auth.users
DO $$
BEGIN
    -- Clean up any invalid user_id references first
    DELETE FROM public.dive_log_image 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE 'Cleaned up invalid user_id references';
    
    -- Add the foreign key constraint
    ALTER TABLE public.dive_log_image 
    ADD CONSTRAINT dive_log_image_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint to auth.users';
END $$;

-- Clean up invalid dive_log_id references and add foreign key
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
        -- First, clean up any invalid references
        UPDATE public.dive_log_image 
        SET dive_log_id = NULL 
        WHERE dive_log_id IS NOT NULL 
        AND dive_log_id NOT IN (SELECT id FROM public.dive_logs);
        
        RAISE NOTICE 'Cleaned up invalid dive_log_id references';
        
        -- Now add the foreign key constraint
        ALTER TABLE public.dive_log_image 
        ADD CONSTRAINT dive_log_image_dive_log_id_fkey 
        FOREIGN KEY (dive_log_id) REFERENCES public.dive_logs(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint to dive_logs table';
    END IF;
END $$;

-- Create a users view that maps to auth.users for backward compatibility
CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    email,
    created_at,
    updated_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users;

-- Grant access to the view
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Add RLS policies for dive_log_image
ALTER TABLE public.dive_log_image ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own images
CREATE POLICY "Users can manage their own images" ON public.dive_log_image
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can access all (for admin operations)
CREATE POLICY "Service role full access" ON public.dive_log_image
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER dive_log_image_updated_at
    BEFORE UPDATE ON public.dive_log_image
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_id ON public.dive_log_image(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_id ON public.dive_log_image(dive_log_id) WHERE dive_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dive_log_image_created_at ON public.dive_log_image(created_at DESC);

-- Create a function to test user creation for development
CREATE OR REPLACE FUNCTION create_test_user(email_param text)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
AS $$
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        email_param,
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id;
$$;

-- Add helpful comment
COMMENT ON TABLE public.dive_log_image IS 'Stores dive computer images with AI analysis results';
COMMENT ON VIEW public.users IS 'Backward compatibility view for auth.users table';
COMMENT ON FUNCTION create_test_user IS 'Development helper to create test users';
