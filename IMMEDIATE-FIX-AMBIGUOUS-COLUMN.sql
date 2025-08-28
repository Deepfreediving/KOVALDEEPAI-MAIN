-- IMMEDIATE FIX: Apply this directly in Supabase SQL Editor
-- ================================================================
-- Fix Ambiguous Column Reference in get_user_dive_logs_optimized
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_dive_logs_optimized(target_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, user_id uuid, date date, discipline text, location text, target_depth numeric, reached_depth numeric, total_dive_time interval, mouthfill_depth numeric, issue_depth numeric, squeeze text, exit text, attempt_type text, notes text, issue_comment text, surface_protocol text, metadata jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, image_id uuid, image_bucket text, image_path text, original_filename text, image_analysis jsonb, extracted_metrics jsonb, has_image boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- If no user_id provided, use current user
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Check if current user is admin or requesting their own data
  -- FIXED: Specify auth.users.id to avoid ambiguous reference
  IF NOT (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = auth.users.id AND raw_user_meta_data->>'role' = 'admin')
    OR auth.uid() = target_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT v.id, v.user_id, v.date, v.discipline, v.location, v.target_depth, v.reached_depth, 
         v.total_dive_time, v.mouthfill_depth, v.issue_depth, v.squeeze, v.exit, v.attempt_type, 
         v.notes, v.issue_comment, v.surface_protocol, v.metadata, v.created_at, v.updated_at, 
         v.image_id, v.image_bucket, v.image_path, v.original_filename, v.image_analysis, 
         v.extracted_metrics, v.has_image
  FROM v_dive_logs_with_images v
  WHERE v.user_id = target_user_id
  ORDER BY v.date DESC, v.created_at DESC;
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_dive_logs_optimized(uuid) IS 'Optimized function to get dive logs with images for a user - fixes ambiguous column reference';

-- Test the function to ensure it works
SELECT 'Testing function...' as status;
SELECT id, date, location, has_image 
FROM public.get_user_dive_logs_optimized('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid)
LIMIT 3;
SELECT 'Function test complete!' as status;
