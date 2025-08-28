-- APPLY THIS DIRECTLY IN SUPABASE SQL EDITOR
-- This script creates optimized views and functions for dive log performance

-- Step 1: Drop existing problematic views
DROP VIEW IF EXISTS v_dive_logs_with_images CASCADE;
DROP VIEW IF EXISTS v_admin_dive_logs CASCADE;

-- Step 2: Create optimized view for dive logs with images
CREATE VIEW v_dive_logs_with_images AS
SELECT 
  dl.id,
  dl.user_id,
  dl.date,
  dl.discipline,
  dl.location,
  dl.target_depth,
  dl.reached_depth,
  dl.total_dive_time,
  dl.mouthfill_depth,
  dl.issue_depth,
  dl.squeeze,
  dl.exit,
  dl.attempt_type,
  dl.notes,
  dl.issue_comment,
  dl.surface_protocol,
  dl.metadata,
  dl.created_at,
  dl.updated_at,
  -- Image data (LEFT JOIN to avoid excluding logs without images)
  dli.id as image_id,
  dli.bucket as image_bucket,
  dli.path as image_path,
  dli.original_filename,
  dli.ai_analysis as image_analysis,
  dli.extracted_metrics,
  CASE WHEN dli.id IS NOT NULL THEN true ELSE false END as has_image
FROM public.dive_logs dl
LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id;

-- Step 3: Create admin view
CREATE VIEW v_admin_dive_logs AS
SELECT * FROM v_dive_logs_with_images;

-- Step 4: Grant permissions
GRANT SELECT ON v_dive_logs_with_images TO authenticated;
GRANT SELECT ON v_dive_logs_with_images TO service_role;
GRANT SELECT ON v_admin_dive_logs TO authenticated;
GRANT SELECT ON v_admin_dive_logs TO service_role;

-- Step 5: Create optimized function
CREATE OR REPLACE FUNCTION get_user_dive_logs_optimized(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  date date,
  discipline text,
  location text,
  target_depth numeric,
  reached_depth numeric,
  total_dive_time interval,
  mouthfill_depth numeric,
  issue_depth numeric,
  squeeze text,
  exit text,
  attempt_type text,
  notes text,
  issue_comment text,
  surface_protocol text,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  image_id uuid,
  image_bucket text,
  image_path text,
  original_filename text,
  image_analysis jsonb,
  extracted_metrics jsonb,
  has_image boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no user_id provided, return all logs (for admin)
  IF target_user_id IS NULL THEN
    RETURN QUERY
    SELECT * FROM v_dive_logs_with_images
    ORDER BY date DESC, created_at DESC;
  ELSE
    -- Return logs for specific user
    RETURN QUERY
    SELECT * FROM v_dive_logs_with_images v
    WHERE v.user_id = target_user_id
    ORDER BY v.date DESC, v.created_at DESC;
  END IF;
END;
$$;

-- Step 6: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_dive_logs_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dive_logs_optimized TO service_role;
