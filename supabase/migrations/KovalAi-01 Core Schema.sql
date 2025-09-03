-- ================================================================
-- CONSOLIDATED KOVALAI SUPABASE SCHEMA - CLEAN SLATE
-- ================================================================
-- This migration consolidates all overlapping schemas into one clean structure
-- Removes duplicates, fixes naming conflicts, and aligns with KovalAI project needs

-- ================================================================
-- STEP 1: CLEAN UP EXISTING OVERLAPPING TABLES
-- ================================================================

-- Drop all conflicting policies first (only on existing tables)
DO $$ 
BEGIN
  -- Drop policies on dive_logs if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_logs') THEN
    DROP POLICY IF EXISTS "Admin only access to dive_logs" ON public.dive_logs;
    DROP POLICY IF EXISTS "dive_logs_own_data" ON public.dive_logs;
    DROP POLICY IF EXISTS "Users can manage their own dive logs" ON public.dive_logs;
  END IF;
  
  -- Drop policies on dive_log if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log') THEN
    DROP POLICY IF EXISTS "dive_log_user_access" ON public.dive_log;
    DROP POLICY IF EXISTS "dive_log_delete_own_anonymous" ON public.dive_log;
    DROP POLICY IF EXISTS "dive_log_read_own_anonymous" ON public.dive_log;
    DROP POLICY IF EXISTS "dive_log_update_own_anonymous" ON public.dive_log;
    DROP POLICY IF EXISTS "dive_log_write_own_anonymous" ON public.dive_log;
  END IF;
  
  -- Drop policies on dive_log_audit if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dive_log_audit') THEN
    DROP POLICY IF EXISTS "dive_log_audit_user_access" ON public.dive_log_audit;
  END IF;
END $$;

-- Drop overlapping views and functions safely
DROP VIEW IF EXISTS public.v_dive_logs_with_images CASCADE;
DROP VIEW IF EXISTS public.v_dive_metrics CASCADE;
DROP VIEW IF EXISTS public.v_user_enclose_summary CASCADE;
DROP VIEW IF EXISTS public.v_user_complete_context CASCADE;
DROP VIEW IF EXISTS public.v_recent_dives_with_analysis CASCADE;
DROP VIEW IF EXISTS public.legal_document_current CASCADE;

-- Drop functions that might conflict
DROP FUNCTION IF EXISTS public.get_user_ai_readiness(uuid) CASCADE;

-- Drop all existing tables to ensure clean slate
DROP TABLE IF EXISTS public.user_memory CASCADE;
DROP TABLE IF EXISTS public.dive_log_audit CASCADE;
DROP TABLE IF EXISTS public.dive_image_analysis CASCADE;
DROP TABLE IF EXISTS public.dive_images CASCADE;
DROP TABLE IF EXISTS public.dive_logs CASCADE;
DROP TABLE IF EXISTS public.dive_log CASCADE; -- Legacy table name
DROP TABLE IF EXISTS public.user_legal_signatures CASCADE;
DROP TABLE IF EXISTS public.legal_documents CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ================================================================
-- STEP 2: EXTENSIONS AND TYPES
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certification_level') THEN
    CREATE TYPE certification_level AS ENUM ('L1', 'L2', 'L3', 'instructor', 'none');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('basic', 'premium', 'coach', 'lifetime');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dive_discipline') THEN
    CREATE TYPE dive_discipline AS ENUM ('CNF', 'CWT', 'CWTB', 'FIM', 'VWT', 'NLT', 'DNF', 'STA', 'DYN', 'DYNB');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'surface_protocol') THEN
    CREATE TYPE surface_protocol AS ENUM ('OK', 'BO', 'LMC', 'DQ', 'DNF');
  END IF;
END $$;

-- Helper function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END $$;

-- ================================================================
-- STEP 3: CORE USER TABLES
-- ================================================================

-- User profiles (extends auth.users) - SINGLE SOURCE OF TRUTH
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text,
  nickname text,
  avatar_url text,
  
  -- Certification information
  certification_level certification_level DEFAULT 'none',
  certification_date date,
  instructor_name text,
  personal_best_depth integer, -- meters
  years_experience integer DEFAULT 0,
  
  -- Subscription and payment status
  subscription_status subscription_status DEFAULT 'trial',
  subscription_plan subscription_plan,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  stripe_customer_id text,
  paypal_customer_id text,
  
  -- Usage limits
  dive_logs_limit integer DEFAULT 10, -- Free tier limit
  
  -- Profile settings
  settings jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Legal documents table
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL, -- 'terms', 'privacy', 'waiver'
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  effective_date timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  
  UNIQUE(slug, version)
);

-- User legal document signatures
CREATE TABLE IF NOT EXISTS public.user_legal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  legal_document_id uuid REFERENCES legal_documents(id) NOT NULL,
  document_slug text NOT NULL,
  document_version text NOT NULL,
  ip_address inet,
  user_agent text,
  signed_at timestamptz DEFAULT NOW(),
  
  UNIQUE(user_id, document_slug, document_version)
);

-- ================================================================
-- STEP 4: DIVE LOG TABLES - CONSOLIDATED STRUCTURE
-- ================================================================

-- Main dive logs table - SINGLE SOURCE OF TRUTH
CREATE TABLE IF NOT EXISTS public.dive_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic dive information
  date date NOT NULL,
  location text,
  discipline dive_discipline,
  
  -- Depth and time metrics
  target_depth integer, -- meters
  reached_depth integer, -- meters
  total_dive_time integer, -- seconds (renamed from total_time_seconds for consistency)
  descent_time integer, -- seconds (renamed from descent_seconds)
  bottom_time integer, -- seconds (renamed from bottom_time_seconds)
  ascent_time integer, -- seconds (renamed from ascent_seconds)
  
  -- Speed calculations (auto-calculated)
  descent_speed_mps numeric(6,3), -- meters per second
  ascent_speed_mps numeric(6,3), -- meters per second
  
  -- Technical details
  mouthfill_depth integer, -- meters
  surface_interval integer, -- seconds
  attempt_number integer DEFAULT 1,
  attempt_type text CHECK (attempt_type IN ('training', 'official', 'fun', 'competition')),
  
  -- Safety and issues
  squeeze boolean DEFAULT false,
  blackout boolean DEFAULT false,
  lmc boolean DEFAULT false, -- Loss of Motor Control
  issue_depth integer,
  issue_comment text,
  surface_protocol surface_protocol,
  exit_protocol text,
  
  -- Environmental conditions
  water_temp integer, -- celsius
  air_temp integer, -- celsius
  visibility_meters integer,
  current_strength text CHECK (current_strength IN ('none', 'light', 'moderate', 'strong')),
  
  -- Equipment
  wetsuit_thickness text,
  weights_kg numeric(4,1),
  fins_type text,
  mask_type text,
  
  -- Notes and subjective
  notes text,
  coach_notes text,
  feeling_rating integer CHECK (feeling_rating BETWEEN 1 AND 10),
  
  -- AI analysis (populated by OpenAI)
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  ai_analysis_timestamp timestamptz,
  ai_risk_score integer CHECK (ai_risk_score BETWEEN 0 AND 100),
  ai_summary text,
  ai_suggestions text,
  
  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Dive images table
CREATE TABLE IF NOT EXISTS public.dive_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_log_id uuid REFERENCES dive_logs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Image storage (Supabase Storage)
  image_url text NOT NULL,
  filename text NOT NULL,
  original_filename text,
  path text NOT NULL DEFAULT '',
  file_size bigint,
  mime_type text,
  width_pixels integer,
  height_pixels integer,
  
  -- Image classification
  image_type text CHECK (image_type IN ('depth_chart', 'surface_protocol', 'equipment', 'location', 'technique', 'other')),
  
  -- Processing status
  processing_status text CHECK (processing_status IN ('uploaded', 'processing', 'analyzed', 'error')) DEFAULT 'uploaded',
  error_message text,
  
  -- AI extracted metrics (from OpenAI Vision)
  extracted_metrics jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  upload_timestamp timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Dive image analysis results (OpenAI Vision API results)
CREATE TABLE IF NOT EXISTS public.dive_image_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_image_id uuid REFERENCES dive_images(id) ON DELETE CASCADE NOT NULL,
  dive_log_id uuid REFERENCES dive_logs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Analysis type
  analysis_type text CHECK (analysis_type IN ('depth_profile', 'technique_analysis', 'safety_assessment', 'equipment_check')),
  
  -- Raw AI analysis data
  raw_analysis_data jsonb DEFAULT '{}'::jsonb,
  
  -- Extracted metrics
  max_depth_detected integer, -- meters
  dive_time_detected integer, -- seconds
  descent_rate numeric(5,2), -- m/s
  ascent_rate numeric(5,2), -- m/s
  
  -- Scoring
  depth_accuracy_score integer CHECK (depth_accuracy_score BETWEEN 0 AND 100),
  technique_score integer CHECK (technique_score BETWEEN 0 AND 100),
  safety_score integer CHECK (safety_score BETWEEN 0 AND 100),
  overall_confidence numeric(3,2) CHECK (overall_confidence BETWEEN 0 AND 1),
  
  -- AI feedback
  technique_feedback text,
  safety_concerns text[],
  recommendations text[],
  areas_for_improvement text[],
  positive_aspects text[],
  overall_assessment text,
  coaching_suggestions text,
  
  -- AI metadata
  openai_model_used text,
  processing_time_ms integer,
  
  -- Timestamps
  analyzed_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Dive log audit table (E.N.C.L.O.S.E. system)
CREATE TABLE IF NOT EXISTS public.dive_log_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dive_log_id uuid REFERENCES dive_logs(id) ON DELETE CASCADE NOT NULL,
  
  -- Audit scoring
  completeness_score smallint NOT NULL CHECK (completeness_score BETWEEN 0 AND 100),
  risk_score smallint NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  score_final numeric(5,2),
  score_safety smallint CHECK (score_safety BETWEEN 0 AND 100),
  score_technique smallint CHECK (score_technique BETWEEN 0 AND 100),
  score_efficiency smallint CHECK (score_efficiency BETWEEN 0 AND 100),
  score_readiness smallint CHECK (score_readiness BETWEEN 0 AND 100),
  
  -- E.N.C.L.O.S.E. framework data
  enclose jsonb DEFAULT '[]'::jsonb,
  
  -- Analysis results
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL,
  suggestions text NOT NULL,
  
  -- AI metadata
  criteria_version text DEFAULT 'koval_enclose_v1',
  model text,
  
  -- Metadata
  created_at timestamptz DEFAULT NOW()
);

-- User memory table (for chat context)
CREATE TABLE IF NOT EXISTS public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_content text NOT NULL,
  assistant_response text,
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- ================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_legal_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_log_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- User profiles - users see their own profile
CREATE POLICY "user_profiles_own_access" ON user_profiles
  FOR ALL USING (user_id = auth.uid());

-- Legal documents - public read for active documents
CREATE POLICY "legal_documents_public_read" ON legal_documents
  FOR SELECT USING (is_active = true);

-- User signatures - users see their own signatures
CREATE POLICY "user_signatures_own_access" ON user_legal_signatures
  FOR ALL USING (user_id = auth.uid());

-- Dive logs - users see their own dive logs
CREATE POLICY "dive_logs_own_access" ON dive_logs
  FOR ALL USING (user_id = auth.uid());

-- Dive images - users see their own images
CREATE POLICY "dive_images_own_access" ON dive_images
  FOR ALL USING (user_id = auth.uid());

-- Dive image analysis - users see their own analysis
CREATE POLICY "dive_image_analysis_own_access" ON dive_image_analysis
  FOR ALL USING (user_id = auth.uid());

-- Dive log audit - users see their own audits
CREATE POLICY "dive_log_audit_own_access" ON dive_log_audit
  FOR ALL USING (user_id = auth.uid());

-- User memory - users see their own memory
CREATE POLICY "user_memory_own_access" ON user_memory
  FOR ALL USING (user_id = auth.uid());

-- ================================================================
-- STEP 6: PERFORMANCE INDEXES
-- ================================================================

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Legal document indexes
CREATE INDEX IF NOT EXISTS idx_legal_docs_active ON legal_documents(slug, is_active);
CREATE INDEX IF NOT EXISTS idx_user_signatures_user ON user_legal_signatures(user_id);

-- Dive log indexes
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_id ON dive_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_date ON dive_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_dive_logs_date ON dive_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_dive_logs_created ON dive_logs(created_at DESC);

-- Dive image indexes
CREATE INDEX IF NOT EXISTS idx_dive_images_dive_log ON dive_images(dive_log_id);
CREATE INDEX IF NOT EXISTS idx_dive_images_user ON dive_images(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_images_status ON dive_images(processing_status);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_dive_analysis_dive_log ON dive_image_analysis(dive_log_id);
CREATE INDEX IF NOT EXISTS idx_dive_analysis_user ON dive_image_analysis(user_id);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_dive_audit_user ON dive_log_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_audit_dive_log ON dive_log_audit(dive_log_id);

-- Memory indexes
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_created ON user_memory(created_at DESC);

-- ================================================================
-- STEP 7: VIEWS FOR AI INTEGRATION
-- ================================================================

-- Complete user context for AI coaching
CREATE OR REPLACE VIEW v_user_ai_context AS
SELECT 
  up.user_id,
  up.full_name,
  up.nickname,
  up.certification_level,
  up.certification_date,
  up.personal_best_depth,
  up.years_experience,
  up.subscription_status,
  up.subscription_plan,
  
  -- Legal compliance
  ARRAY_AGG(DISTINCT uls.document_slug) FILTER (WHERE uls.document_slug IS NOT NULL) as signed_documents,
  
  -- Dive statistics
  COUNT(dl.id) as total_dives,
  MAX(dl.reached_depth) as max_depth_achieved,
  AVG(dl.reached_depth)::integer as avg_depth,
  COUNT(CASE WHEN dl.squeeze = true THEN 1 END) as squeeze_count,
  COUNT(CASE WHEN dl.blackout = true THEN 1 END) as blackout_count,
  
  -- Recent activity
  MAX(dl.date) as last_dive_date,
  COUNT(CASE WHEN dl.date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as dives_last_30_days,
  
  -- AI readiness check
  CASE WHEN 
    up.certification_level IS NOT NULL AND
    up.subscription_status = 'active' AND
    EXISTS(SELECT 1 FROM user_legal_signatures WHERE user_id = up.user_id AND document_slug = 'waiver') AND
    COUNT(dl.id) > 0
  THEN true ELSE false END as ai_coaching_ready
  
FROM user_profiles up
LEFT JOIN user_legal_signatures uls ON up.user_id = uls.user_id
LEFT JOIN dive_logs dl ON up.user_id = dl.user_id
GROUP BY up.user_id, up.full_name, up.nickname, up.certification_level, 
         up.certification_date, up.personal_best_depth, up.years_experience,
         up.subscription_status, up.subscription_plan;

-- Recent dives with analysis for coaching
CREATE OR REPLACE VIEW v_recent_dives_analysis AS
SELECT 
  dl.*,
  di.image_url,
  di.processing_status as image_status,
  dia.technique_score,
  dia.safety_score,
  dia.overall_assessment,
  dia.coaching_suggestions,
  dia.areas_for_improvement,
  dla.score_final as audit_score,
  dla.enclose as enclose_data
FROM dive_logs dl
LEFT JOIN dive_images di ON dl.id = di.dive_log_id
LEFT JOIN dive_image_analysis dia ON di.id = dia.dive_image_id
LEFT JOIN dive_log_audit dla ON dl.id = dla.dive_log_id
WHERE dl.date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY dl.date DESC, dl.created_at DESC;

-- ================================================================
-- STEP 8: TRIGGERS FOR UPDATED_AT
-- ================================================================

-- User profiles trigger
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dive logs trigger
CREATE TRIGGER trg_dive_logs_updated_at
  BEFORE UPDATE ON dive_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- User memory trigger
CREATE TRIGGER trg_user_memory_updated_at
  BEFORE UPDATE ON user_memory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- STEP 9: GRANTS AND PERMISSIONS
-- ================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON legal_documents TO authenticated, anon;
GRANT SELECT, INSERT ON user_legal_signatures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dive_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dive_images TO authenticated;
GRANT SELECT ON dive_image_analysis TO authenticated;
GRANT SELECT ON dive_log_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_memory TO authenticated;

-- Grant access to views
GRANT SELECT ON v_user_ai_context TO authenticated;
GRANT SELECT ON v_recent_dives_analysis TO authenticated;

-- ================================================================
-- STEP 10: UTILITY FUNCTIONS
-- ================================================================

-- Function to check AI coaching readiness
CREATE OR REPLACE FUNCTION get_user_ai_readiness(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'ready', ai_coaching_ready,
    'user_id', user_id,
    'certification_level', certification_level,
    'subscription_status', subscription_status,
    'total_dives', total_dives,
    'signed_documents', signed_documents,
    'last_dive_date', last_dive_date
  ) INTO result
  FROM v_user_ai_context
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(result, jsonb_build_object('ready', false, 'error', 'User not found'));
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_ai_readiness(uuid) TO authenticated;

-- ================================================================
-- STEP 11: INSERT ESSENTIAL DATA
-- ================================================================

-- Insert basic legal documents
INSERT INTO legal_documents (slug, version, title, content, is_active) VALUES
('terms', '1.0', 'Terms of Service', 'KovalAI Terms of Service content...', true),
('privacy', '1.0', 'Privacy Policy', 'KovalAI Privacy Policy content...', true),
('waiver', '1.0', 'Freediving Liability Waiver', 'Freediving liability waiver content...', true)
ON CONFLICT (slug, version) DO NOTHING;

-- ================================================================
-- STEP 12: COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE user_profiles IS 'Complete user profiles with certification and subscription info';
COMMENT ON TABLE legal_documents IS 'Legal documents (terms, privacy, waivers) that users must sign';
COMMENT ON TABLE user_legal_signatures IS 'Record of legal document signatures by users';
COMMENT ON TABLE dive_logs IS 'Main dive log entries with complete metrics and AI analysis';
COMMENT ON TABLE dive_images IS 'Images uploaded for dive logs (depth charts, technique analysis)';
COMMENT ON TABLE dive_image_analysis IS 'AI analysis results from OpenAI Vision API';
COMMENT ON TABLE dive_log_audit IS 'E.N.C.L.O.S.E. framework audit results';
COMMENT ON TABLE user_memory IS 'Chat memory for maintaining conversation context';

COMMENT ON VIEW v_user_ai_context IS 'Complete user context for AI coaching eligibility and personalization';
COMMENT ON VIEW v_recent_dives_analysis IS 'Recent dives with all analysis for AI coaching feedback';

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
