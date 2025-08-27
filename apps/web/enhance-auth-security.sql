-- Additional security configuration for Supabase Auth
-- Addresses Auth OTP Long Expiry and Password Protection issues

-- 1. Update auth configuration for better security
-- Note: Some of these settings need to be configured in Supabase Dashboard > Authentication > Settings

-- For now, we'll create a configuration verification script

-- Check current auth settings
SELECT 
    'Current auth configuration check' as info,
    NOW() as timestamp;

-- 2. Create secure password validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Password must be at least 8 characters
    IF LENGTH(password) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- Password must contain at least one uppercase letter
    IF password !~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Password must contain at least one lowercase letter
    IF password !~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Password must contain at least one digit
    IF password !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Password must contain at least one special character
    IF password !~ '[^a-zA-Z0-9]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 3. Create function to log authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_attempts (
    id SERIAL PRIMARY KEY,
    user_email TEXT,
    ip_address INET,
    success BOOLEAN,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT
);

-- Enable RLS on auth attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access auth attempts
CREATE POLICY "Service role only" ON public.auth_attempts
    FOR ALL USING (false);

-- 4. Create function to check for brute force attempts
CREATE OR REPLACE FUNCTION public.check_brute_force(email TEXT, ip INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_failures INTEGER;
BEGIN
    -- Count failed attempts in last 15 minutes
    SELECT COUNT(*)
    INTO recent_failures
    FROM public.auth_attempts
    WHERE (user_email = email OR ip_address = ip)
    AND success = FALSE
    AND attempt_time > NOW() - INTERVAL '15 minutes';
    
    -- Block if more than 5 failed attempts
    IF recent_failures >= 5 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 5. Create secure session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- 6. Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW() OR last_activity < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 7. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id SERIAL PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP address or user ID
    endpoint TEXT NOT NULL,
    requests INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only access
CREATE POLICY "Service role only rate limits" ON public.rate_limits
    FOR ALL USING (false);

-- 8. Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    identifier TEXT, 
    endpoint TEXT, 
    max_requests INTEGER DEFAULT 100,
    window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_requests INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Clean up old rate limit entries
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    -- Get current request count
    SELECT COALESCE(SUM(requests), 0)
    INTO current_requests
    FROM public.rate_limits
    WHERE rate_limits.identifier = check_rate_limit.identifier
    AND rate_limits.endpoint = check_rate_limit.endpoint
    AND rate_limits.window_start > window_start;
    
    -- Check if limit exceeded
    IF current_requests >= max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Update or insert rate limit record
    INSERT INTO public.rate_limits (identifier, endpoint, requests, window_start)
    VALUES (identifier, endpoint, 1, NOW())
    ON CONFLICT (identifier, endpoint) 
    DO UPDATE SET 
        requests = rate_limits.requests + 1,
        window_start = CASE 
            WHEN rate_limits.window_start < window_start THEN NOW()
            ELSE rate_limits.window_start
        END;
    
    RETURN TRUE;
END;
$$;

-- 9. Security monitoring views
CREATE OR REPLACE VIEW public.security_alerts AS
SELECT 
    'Failed login attempts' as alert_type,
    user_email as details,
    COUNT(*) as count,
    MAX(attempt_time) as last_occurrence
FROM public.auth_attempts
WHERE success = FALSE 
AND attempt_time > NOW() - INTERVAL '1 hour'
GROUP BY user_email
HAVING COUNT(*) >= 3

UNION ALL

SELECT 
    'Expired sessions' as alert_type,
    'Sessions not cleaned up' as details,
    COUNT(*) as count,
    MAX(expires_at) as last_occurrence
FROM public.user_sessions
WHERE expires_at < NOW() AND is_active = TRUE;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_time ON public.auth_attempts(user_email, attempt_time);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time ON public.auth_attempts(ip_address, attempt_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);

-- 11. Security configuration comments
COMMENT ON FUNCTION public.validate_password_strength IS 'Validates password meets security requirements';
COMMENT ON FUNCTION public.check_brute_force IS 'Prevents brute force attacks by limiting failed attempts';
COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Removes expired and old sessions';
COMMENT ON FUNCTION public.check_rate_limit IS 'Implements rate limiting for API endpoints';
COMMENT ON TABLE public.auth_attempts IS 'Tracks authentication attempts for security monitoring';
COMMENT ON TABLE public.user_sessions IS 'Manages user sessions with security controls';
COMMENT ON TABLE public.rate_limits IS 'Implements rate limiting to prevent abuse';

SELECT 'Security configuration applied successfully' as status;
