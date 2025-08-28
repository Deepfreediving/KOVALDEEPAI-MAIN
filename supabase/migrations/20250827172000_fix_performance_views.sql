-- Fix performance optimization with proper view creation
DROP VIEW IF EXISTS v_dive_logs_with_images CASCADE;
DROP VIEW IF EXISTS v_admin_dive_logs CASCADE;

-- Create optimized view for dive logs with images (single query solution)
CREATE OR REPLACE VIEW v_dive_logs_with_images AS
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
LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id
ORDER BY dl.date DESC, dl.created_at DESC;

-- Create admin-specific view with all permissions
CREATE OR REPLACE VIEW v_admin_dive_logs AS
SELECT * FROM v_dive_logs_with_images;

-- Grant necessary permissions
GRANT SELECT ON v_dive_logs_with_images TO authenticated;
GRANT SELECT ON v_dive_logs_with_images TO service_role;
GRANT SELECT ON v_admin_dive_logs TO authenticated;
GRANT SELECT ON v_admin_dive_logs TO service_role;

-- Create function for efficient dive log retrieval
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
  -- If no user_id provided, use current user
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Check if current user is admin or requesting their own data
  IF NOT (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin')
    OR auth.uid() = target_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT * FROM v_dive_logs_with_images v
  WHERE v.user_id = target_user_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_dive_logs_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dive_logs_optimized TO service_role;
