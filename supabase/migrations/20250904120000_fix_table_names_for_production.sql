-- ================================================================
-- FIX TABLE NAMES TO MATCH CODE EXPECTATIONS
-- ================================================================
-- The code expects 'dive_log_image' but schema has 'dive_images'
-- This migration fixes the mismatch for production

-- First, rename dive_images to dive_log_image to match code expectations
ALTER TABLE IF EXISTS public.dive_images RENAME TO dive_log_image;

-- Update foreign key references in dive_image_analysis table
ALTER TABLE IF EXISTS public.dive_image_analysis 
  DROP CONSTRAINT IF EXISTS dive_image_analysis_dive_image_id_fkey;

ALTER TABLE IF EXISTS public.dive_image_analysis 
  ADD CONSTRAINT dive_image_analysis_dive_image_id_fkey 
  FOREIGN KEY (dive_image_id) REFERENCES public.dive_log_image(id);

-- Update RLS policies
DROP POLICY IF EXISTS "dive_images_own_access" ON public.dive_log_image;
CREATE POLICY "dive_log_image_own_access" ON public.dive_log_image
  FOR ALL USING (user_id = auth.uid());

-- Update indexes to match new table name
DROP INDEX IF EXISTS idx_dive_images_dive_log;
DROP INDEX IF EXISTS idx_dive_images_user;
DROP INDEX IF EXISTS idx_dive_images_status;

CREATE INDEX IF NOT EXISTS idx_dive_log_image_dive_log_id ON public.dive_log_image(dive_log_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_user_id ON public.dive_log_image(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_image_processing_status ON public.dive_log_image(processing_status);

-- Add missing columns that the code expects
ALTER TABLE public.dive_log_image 
  ADD COLUMN IF NOT EXISTS bucket text DEFAULT 'dive-images',
  ADD COLUMN IF NOT EXISTS path_original text,
  ADD COLUMN IF NOT EXISTS path_compressed text,
  ADD COLUMN IF NOT EXISTS bytes bigint,
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS embedding vector;

-- Rename existing columns to match code expectations
ALTER TABLE public.dive_log_image 
  RENAME COLUMN image_url TO path_original;

-- Update grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dive_log_image TO authenticated;

-- Update comments
COMMENT ON TABLE public.dive_log_image IS 'Images uploaded for dive logs - matches code expectations';

-- ================================================================
-- ADD MISSING TABLES THAT CODE EXPECTS
-- ================================================================

-- App user table (referenced in code)
CREATE TABLE IF NOT EXISTS public.app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  display_name text,
  photo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- AI job table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.ai_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  image_id uuid REFERENCES public.dive_log_image(id),
  kind text NOT NULL,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- Chat tables (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.chat_thread (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.chat_thread(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  model text,
  tokens integer,
  metadata jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Coach assignment table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.coach_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid REFERENCES auth.users(id) NOT NULL,
  coach_user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at timestamptz DEFAULT NOW()
);

-- Journal entry table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.journal_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  dive_log_id uuid REFERENCES public.dive_logs(id),
  content text NOT NULL,
  mood smallint,
  tags text[],
  ai_summary text,
  embedding vector,
  created_at timestamptz DEFAULT NOW()
);

-- Location catalog table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.location_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  country_code text CHECK (length(country_code) IN (2, 3)),
  lat numeric,
  lng numeric,
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT NOW()
);

-- Training metric table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.training_metric (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  dive_log_id uuid REFERENCES public.dive_logs(id),
  pb_static_seconds integer,
  pb_dynamic_m numeric,
  co2_table jsonb,
  o2_table jsonb,
  hrv_rmssd numeric,
  hr_rest smallint,
  notes text,
  created_at timestamptz DEFAULT NOW()
);

-- Legal document table (if not exists)
CREATE TABLE IF NOT EXISTS public.legal_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  version integer DEFAULT 1,
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User acceptance table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.user_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  legal_document_id uuid REFERENCES public.legal_document(id) NOT NULL,
  version_accepted integer NOT NULL,
  accepted boolean DEFAULT true,
  signature text,
  signature_path text,
  ip inet,
  user_agent text,
  accepted_at timestamptz DEFAULT NOW()
);

-- Dive log comment table (referenced in performance migration)
CREATE TABLE IF NOT EXISTS public.dive_log_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_log_id uuid REFERENCES public.dive_logs(id) NOT NULL,
  author_user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Fix dive_log_audit table to use correct foreign key
ALTER TABLE public.dive_log_audit 
  DROP CONSTRAINT IF EXISTS dive_log_audit_log_id_fkey;

ALTER TABLE public.dive_log_audit 
  ADD CONSTRAINT dive_log_audit_dive_log_id_fkey 
  FOREIGN KEY (dive_log_id) REFERENCES public.dive_logs(id);

-- ================================================================
-- ENABLE RLS ON NEW TABLES
-- ================================================================

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dive_log_comment ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- CREATE RLS POLICIES
-- ================================================================

-- App user policies
CREATE POLICY "app_user_own_access" ON public.app_user
  FOR ALL USING (auth_user_id = auth.uid());

-- AI job policies
CREATE POLICY "ai_job_own_access" ON public.ai_job
  FOR ALL USING (user_id = auth.uid());

-- Chat policies
CREATE POLICY "chat_thread_own_access" ON public.chat_thread
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "chat_message_own_access" ON public.chat_message
  FOR ALL USING (user_id = auth.uid());

-- Coach assignment policies
CREATE POLICY "coach_assignment_participant_access" ON public.coach_assignment
  FOR ALL USING (athlete_user_id = auth.uid() OR coach_user_id = auth.uid());

-- Journal entry policies
CREATE POLICY "journal_entry_own_access" ON public.journal_entry
  FOR ALL USING (user_id = auth.uid());

-- Location catalog policies
CREATE POLICY "location_catalog_access" ON public.location_catalog
  FOR ALL USING (user_id IS NULL OR user_id = auth.uid());

-- Training metric policies
CREATE POLICY "training_metric_own_access" ON public.training_metric
  FOR ALL USING (user_id = auth.uid());

-- Legal document policies
CREATE POLICY "legal_document_public_read" ON public.legal_document
  FOR SELECT USING (is_active = true);

-- User acceptance policies
CREATE POLICY "user_acceptance_own_access" ON public.user_acceptance
  FOR ALL USING (user_id = auth.uid());

-- Dive log comment policies
CREATE POLICY "dive_log_comment_access" ON public.dive_log_comment
  FOR ALL USING (author_user_id = auth.uid());

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_job TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message TO authenticated;
GRANT SELECT ON public.coach_assignment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entry TO authenticated;
GRANT SELECT ON public.location_catalog TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.training_metric TO authenticated;
GRANT SELECT ON public.legal_document TO authenticated, anon;
GRANT SELECT, INSERT ON public.user_acceptance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dive_log_comment TO authenticated;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

COMMENT ON SCHEMA public IS 'KovalAI production schema - table names match code expectations';
