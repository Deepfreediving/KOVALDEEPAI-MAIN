-- ✅ MONITORING OPTIMIZATION PHASE 1 - BRIN Indexes and Performance Views

-- Add BRIN indexes for better time-series performance on large tables
-- BRIN (Block Range INdex) indexes are perfect for time-series data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_timestamp_brin 
ON usage_analytics USING BRIN (timestamp) WITH (pages_per_range = 128);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_timestamp_brin 
ON error_logs USING BRIN (timestamp) WITH (pages_per_range = 128);

-- Add composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_user_timestamp 
ON usage_analytics (user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_endpoint_timestamp 
ON usage_analytics (endpoint, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_severity_timestamp 
ON error_logs (severity, timestamp DESC);

-- Create performance analysis views that integrate with pg_stat_statements
CREATE OR REPLACE VIEW query_performance_analysis AS
SELECT 
  ua.endpoint,
  ua.timestamp,
  ua.response_time_ms,
  ua.tokens_used,
  ua.cost_estimate,
  ua.success,
  -- Try to join with pg_stat_statements if available
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pg_stat_statements')
    THEN 'Available'
    ELSE 'Not Available'
  END as pg_stat_statements_status
FROM usage_analytics ua
WHERE ua.timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY ua.timestamp DESC;

-- Create real-time monitoring view
CREATE OR REPLACE VIEW realtime_performance_summary AS
SELECT 
  endpoint,
  COUNT(*) as request_count,
  AVG(response_time_ms)::INTEGER as avg_response_time,
  MIN(response_time_ms) as min_response_time,
  MAX(response_time_ms) as max_response_time,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100, 2
  ) as success_rate_percent,
  SUM(tokens_used) as total_tokens,
  SUM(cost_estimate) as total_cost,
  COUNT(DISTINCT user_id) as unique_users
FROM usage_analytics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY request_count DESC;

-- Create error analysis view
CREATE OR REPLACE VIEW error_analysis_summary AS
SELECT 
  endpoint,
  error_type,
  severity,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence,
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_errors
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint, error_type, severity
ORDER BY error_count DESC;

-- Create hourly performance metrics view
CREATE OR REPLACE VIEW hourly_performance_metrics AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  endpoint,
  COUNT(*) as requests,
  AVG(response_time_ms)::INTEGER as avg_response_time,
  SUM(tokens_used) as total_tokens,
  SUM(cost_estimate) as total_cost,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100, 2
  ) as success_rate
FROM usage_analytics 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), endpoint
ORDER BY hour DESC, requests DESC;

-- Add comments for documentation
COMMENT ON INDEX idx_usage_analytics_timestamp_brin IS 'BRIN index for efficient time-series queries on large usage_analytics table';
COMMENT ON INDEX idx_error_logs_timestamp_brin IS 'BRIN index for efficient time-series queries on large error_logs table';
COMMENT ON VIEW query_performance_analysis IS 'Real-time query performance analysis with pg_stat_statements integration';
COMMENT ON VIEW realtime_performance_summary IS 'Real-time performance summary for the last hour';
COMMENT ON VIEW error_analysis_summary IS 'Error analysis summary for the last 24 hours';
COMMENT ON VIEW hourly_performance_metrics IS 'Hourly performance metrics for the last 7 days';

-- Add monitoring for our monitoring tables themselves
CREATE OR REPLACE VIEW monitoring_table_stats AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins as total_inserts,
  n_tup_upd as total_updates,
  n_tup_del as total_deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND((n_dead_tup::DECIMAL / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) as dead_row_percentage,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename IN ('usage_analytics', 'error_logs', 'performance_metrics', 'cost_budgets', 'cost_alerts')
ORDER BY n_live_tup DESC;

COMMENT ON VIEW monitoring_table_stats IS 'Statistics about our monitoring tables themselves for maintenance tracking';
