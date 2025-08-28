-- ================================================================
-- SAFE PERFORMANCE VIEWS - TARGET dive_logs TABLE
-- ================================================================
-- This migration creates optimized views for dive_logs table

-- Create view if tables exist
DO $$
DECLARE
    dive_logs_exists boolean;
    dive_log_image_exists boolean;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'dive_logs'
    ) INTO dive_logs_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'dive_log_image'
    ) INTO dive_log_image_exists;
    
    IF dive_logs_exists AND dive_log_image_exists THEN
        -- Create optimized view with correct column names
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
          dl.created_at,
          dl.updated_at,
          dli.id as image_id,
          dli.bucket as image_bucket,
          dli.path_original as image_path,
          dli.path_compressed,
          dli.mime_type,
          dli.ai_summary as image_ai_summary,
          dli.ai_analysis as image_analysis,
          dli.ocr_text,
          CASE WHEN dli.id IS NOT NULL THEN true ELSE false END as has_image
        FROM public.dive_logs dl
        LEFT JOIN public.dive_log_image dli ON dl.id = dli.dive_log_id
        ORDER BY dl.date DESC, dl.created_at DESC;
        
        -- Grant permissions
        GRANT SELECT ON v_dive_logs_with_images TO authenticated;
        GRANT SELECT ON v_dive_logs_with_images TO service_role;
        
        RAISE NOTICE 'Created v_dive_logs_with_images view successfully';
    ELSE
        RAISE NOTICE 'Required tables do not exist (dive_logs: %, dive_log_image: %), skipping view creation', 
                     dive_logs_exists, dive_log_image_exists;
    END IF;
END $$;;
