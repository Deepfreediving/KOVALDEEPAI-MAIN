-- Migration: Remove enum constraints to allow free text input
-- Date: 2025-09-07
-- Purpose: Allow users to input natural language that OpenAI can process

-- First, drop dependent views and rules that prevent column type changes
DROP VIEW IF EXISTS v_recent_dives_analysis CASCADE;
DROP VIEW IF EXISTS v_dive_stats CASCADE;
DROP VIEW IF EXISTS v_user_dive_summary CASCADE;
DROP VIEW IF EXISTS v_dive_analysis CASCADE;
DROP VIEW IF EXISTS v_dive_performance CASCADE;

-- Remove CHECK constraints that validate enum values
ALTER TABLE dive_logs DROP CONSTRAINT IF EXISTS dive_logs_discipline_check;
ALTER TABLE dive_logs DROP CONSTRAINT IF EXISTS dive_logs_surface_protocol_check;
ALTER TABLE dive_logs DROP CONSTRAINT IF EXISTS dive_logs_exit_protocol_check;
ALTER TABLE dive_logs DROP CONSTRAINT IF EXISTS dive_logs_attempt_type_check;

-- Remove enum constraint from discipline column
ALTER TABLE dive_logs 
ALTER COLUMN discipline TYPE TEXT;

-- Remove enum constraint from surface_protocol column  
ALTER TABLE dive_logs 
ALTER COLUMN surface_protocol TYPE TEXT;

-- Remove enum constraint from exit_protocol column
ALTER TABLE dive_logs 
ALTER COLUMN exit_protocol TYPE TEXT;

-- Remove enum constraint from attempt_type column
ALTER TABLE dive_logs 
ALTER COLUMN attempt_type TYPE TEXT;

-- Drop the enum types entirely (if they exist)
DROP TYPE IF EXISTS dive_discipline;
DROP TYPE IF EXISTS surface_protocol_type;
DROP TYPE IF EXISTS exit_protocol_type;
DROP TYPE IF EXISTS attempt_type_enum;

-- Now users can input natural language:
-- discipline: "CWT", "Constant Weight with bifins", "Modified CNF technique"
-- surface_protocol: "Clean", "Good recovery", "Slight samba but recovered quickly"
-- exit_protocol: "Clean exit", "Small samba", "Felt strong"
-- attempt_type: "Training dive", "Competition attempt", "Fun dive"
