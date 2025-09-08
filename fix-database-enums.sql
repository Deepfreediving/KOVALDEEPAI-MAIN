-- Remove enum constraints to allow free text input
-- This should be run on the Supabase database

-- 1. Convert discipline from enum to text
ALTER TABLE dive_logs 
ALTER COLUMN discipline TYPE text;

-- 2. Convert surface_protocol from enum to text  
ALTER TABLE dive_logs 
ALTER COLUMN surface_protocol TYPE text;

-- 3. Convert exit_protocol from enum to text
ALTER TABLE dive_logs 
ALTER COLUMN exit_protocol TYPE text;

-- 4. Convert attempt_type from enum to text (if it's an enum)
ALTER TABLE dive_logs 
ALTER COLUMN attempt_type TYPE text;

-- 5. Add a comment explaining the design decision
COMMENT ON COLUMN dive_logs.discipline IS 'Free text field - users can describe their discipline naturally (e.g., "Constant Weight", "CWT with bifins", "Modified CNF technique")';
COMMENT ON COLUMN dive_logs.surface_protocol IS 'Free text field - users can describe their surface protocol naturally (e.g., "Clean with good recovery", "Slight samba but felt strong")';
COMMENT ON COLUMN dive_logs.exit_protocol IS 'Free text field - users can describe their exit naturally (e.g., "Smooth exit, controlled ascent", "Fast final meters but safe")';

-- 6. Create indexes for common searches (optional)
CREATE INDEX IF NOT EXISTS idx_dive_logs_discipline_text ON dive_logs USING gin(to_tsvector('english', discipline));
CREATE INDEX IF NOT EXISTS idx_dive_logs_surface_protocol_text ON dive_logs USING gin(to_tsvector('english', surface_protocol));

-- This allows:
-- - "Constant Weight with bifins" 
-- - "CNF with advanced mouthfill technique"
-- - "Clean surface protocol with 30-second recovery"
-- - "Slight samba on surface but felt strong throughout"
-- - "Modified FIM technique for training"
