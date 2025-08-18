-- Fix for duplicate trigger error
-- Run this in Supabase SQL Editor if you encounter trigger conflicts

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_memory_updated_at ON public.user_memory;

-- Recreate the trigger
CREATE TRIGGER update_user_memory_updated_at 
    BEFORE UPDATE ON public.user_memory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'update_user_memory_updated_at';
