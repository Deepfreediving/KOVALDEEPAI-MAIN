-- ✅ MONITORING OPTIMIZATION PHASE 2 - Maintenance Functions and Cleanup

-- Create comprehensive cleanup function for time-series data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT,
  operation_time INTERVAL
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  deleted_count BIGINT;
BEGIN
  -- Cleanup usage_analytics (keep 90 days)
  start_time := clock_timestamp();
  
  DELETE FROM usage_analytics 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  table_name := 'usage_analytics';
  rows_deleted := deleted_count;
  operation_time := end_time - start_time;
  RETURN NEXT;
  
  -- Cleanup error_logs (keep 30 days)
  start_time := clock_timestamp();
  
  DELETE FROM error_logs 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  table_name := 'error_logs';
  rows_deleted := deleted_count;
  operation_time := end_time - start_time;
  RETURN NEXT;
  
  -- Cleanup performance_metrics (keep 180 days for historical analysis)
  start_time := clock_timestamp();
  
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '180 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  table_name := 'performance_metrics';
  rows_deleted := deleted_count;
  operation_time := end_time - start_time;
  RETURN NEXT;
  
  -- Cleanup old cost_alerts (keep 60 days)
  start_time := clock_timestamp();
  
  DELETE FROM cost_alerts 
  WHERE sent_at < NOW() - INTERVAL '60 days' AND acknowledged = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  table_name := 'cost_alerts';
  rows_deleted := deleted_count;
  operation_time := end_time - start_time;
  RETURN NEXT;
  
  -- Update table statistics after cleanup
  ANALYZE usage_analytics;
  ANALYZE error_logs;
  ANALYZE performance_metrics;
  ANALYZE cost_alerts;
  
END;
$$ LANGUAGE plpgsql;

-- Create function to check database health
CREATE OR REPLACE FUNCTION check_monitoring_health()
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  status TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Check table bloat
  WITH bloat_check AS (
    SELECT 
      relname as tablename,
      ROUND((n_dead_tup::DECIMAL / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) as bloat_percentage
    FROM pg_stat_user_tables 
    WHERE relname IN ('usage_analytics', 'error_logs', 'performance_metrics')
  )
  SELECT 
    'table_bloat_' || tablename,
    bloat_percentage,
    CASE 
      WHEN bloat_percentage > 20 THEN 'WARNING'
      WHEN bloat_percentage > 40 THEN 'CRITICAL'
      ELSE 'OK'
    END,
    CASE 
      WHEN bloat_percentage > 20 THEN 'Consider running VACUUM on ' || tablename
      ELSE 'Table bloat is within acceptable limits'
    END
  FROM bloat_check;
  
  -- Check index usage
  WITH index_usage AS (
    SELECT 
      indexrelname,
      idx_scan,
      CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'GOOD'
      END as usage_status
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public' 
    AND indexrelname LIKE 'idx_%analytics%' OR indexrelname LIKE 'idx_%error%'
  )
  SELECT 
    'index_usage_' || indexrelname,
    idx_scan::NUMERIC,
    usage_status,
    CASE 
      WHEN usage_status = 'UNUSED' THEN 'Consider dropping unused index: ' || indexrelname
      WHEN usage_status = 'LOW_USAGE' THEN 'Monitor index usage: ' || indexrelname
      ELSE 'Index is being used effectively'
    END
  FROM index_usage;
  
  -- Check recent error rates
  WITH error_rate AS (
    SELECT 
      ROUND(
        (COUNT(*) FILTER (WHERE success = false)::DECIMAL / COUNT(*)) * 100, 2
      ) as error_percentage
    FROM usage_analytics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
  )
  SELECT 
    'error_rate_24h',
    error_percentage,
    CASE 
      WHEN error_percentage > 10 THEN 'CRITICAL'
      WHEN error_percentage > 5 THEN 'WARNING'
      ELSE 'OK'
    END,
    CASE 
      WHEN error_percentage > 10 THEN 'High error rate detected - investigate immediately'
      WHEN error_percentage > 5 THEN 'Elevated error rate - monitor closely'
      ELSE 'Error rate is within acceptable limits'
    END
  FROM error_rate;
  
  -- Check response time trends
  WITH response_time AS (
    SELECT 
      AVG(response_time_ms) as avg_response_time
    FROM usage_analytics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    AND success = true
  )
  SELECT 
    'avg_response_time_24h',
    avg_response_time,
    CASE 
      WHEN avg_response_time > 5000 THEN 'CRITICAL'
      WHEN avg_response_time > 2000 THEN 'WARNING'
      ELSE 'OK'
    END,
    CASE 
      WHEN avg_response_time > 5000 THEN 'Very slow response times - optimize queries'
      WHEN avg_response_time > 2000 THEN 'Slow response times - investigate performance'
      ELSE 'Response times are within acceptable limits'
    END
  FROM response_time;
  
END;
$$ LANGUAGE plpgsql;

-- Create function to optimize monitoring tables
CREATE OR REPLACE FUNCTION optimize_monitoring_tables()
RETURNS TABLE(
  table_name TEXT,
  operation TEXT,
  duration INTERVAL,
  status TEXT
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  -- VACUUM and ANALYZE usage_analytics
  start_time := clock_timestamp();
  EXECUTE 'VACUUM ANALYZE usage_analytics';
  end_time := clock_timestamp();
  
  table_name := 'usage_analytics';
  operation := 'VACUUM ANALYZE';
  duration := end_time - start_time;
  status := 'COMPLETED';
  RETURN NEXT;
  
  -- VACUUM and ANALYZE error_logs
  start_time := clock_timestamp();
  EXECUTE 'VACUUM ANALYZE error_logs';
  end_time := clock_timestamp();
  
  table_name := 'error_logs';
  operation := 'VACUUM ANALYZE';
  duration := end_time - start_time;
  status := 'COMPLETED';
  RETURN NEXT;
  
  -- VACUUM and ANALYZE performance_metrics
  start_time := clock_timestamp();
  EXECUTE 'VACUUM ANALYZE performance_metrics';
  end_time := clock_timestamp();
  
  table_name := 'performance_metrics';
  operation := 'VACUUM ANALYZE';
  duration := end_time - start_time;
  status := 'COMPLETED';
  RETURN NEXT;
  
  -- Reindex if needed (only for small tables or during maintenance windows)
  start_time := clock_timestamp();
  EXECUTE 'REINDEX INDEX CONCURRENTLY idx_usage_analytics_timestamp';
  end_time := clock_timestamp();
  
  table_name := 'usage_analytics';
  operation := 'REINDEX timestamp';
  duration := end_time - start_time;
  status := 'COMPLETED';
  RETURN NEXT;
  
END;
$$ LANGUAGE plpgsql;

-- Create function to generate monitoring reports
CREATE OR REPLACE FUNCTION generate_monitoring_report()
RETURNS TABLE(
  report_section TEXT,
  metric TEXT,
  value TEXT,
  trend TEXT
) AS $$
BEGIN
  -- Usage summary
  report_section := 'USAGE_SUMMARY';
  
  SELECT 
    'Total Requests (24h)',
    COUNT(*)::TEXT,
    CASE 
      WHEN COUNT(*) > LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', timestamp)) 
      THEN 'INCREASING'
      ELSE 'STABLE'
    END
  FROM usage_analytics 
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
  INTO metric, value, trend;
  RETURN NEXT;
  
  -- Error summary
  report_section := 'ERROR_SUMMARY';
  
  SELECT 
    'Total Errors (24h)',
    COUNT(*)::TEXT,
    'TRACKED'
  FROM error_logs 
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
  INTO metric, value, trend;
  RETURN NEXT;
  
  -- Cost summary
  report_section := 'COST_SUMMARY';
  
  SELECT 
    'Total Cost (24h)',
    '$' || ROUND(SUM(cost_estimate), 4)::TEXT,
    'TRACKED'
  FROM usage_analytics 
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
  INTO metric, value, trend;
  RETURN NEXT;
  
  -- Performance summary
  report_section := 'PERFORMANCE_SUMMARY';
  
  SELECT 
    'Avg Response Time (24h)',
    ROUND(AVG(response_time_ms))::TEXT || 'ms',
    'TRACKED'
  FROM usage_analytics 
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
  AND success = true
  INTO metric, value, trend;
  RETURN NEXT;
  
END;
$$ LANGUAGE plpgsql;

-- Create table to track maintenance operations
CREATE TABLE IF NOT EXISTS maintenance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,
  table_name TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTERVAL GENERATED ALWAYS AS (end_time - start_time) STORED,
  rows_affected BIGINT,
  status TEXT CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')) DEFAULT 'RUNNING',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for maintenance log
CREATE INDEX IF NOT EXISTS idx_maintenance_log_operation_time ON maintenance_log(operation_type, start_time);

-- Add RLS to maintenance log
ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage maintenance log" ON maintenance_log FOR ALL TO authenticated USING (true);

-- Function to log maintenance operations
CREATE OR REPLACE FUNCTION log_maintenance_operation(
  op_type TEXT,
  table_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  operation_id UUID;
BEGIN
  INSERT INTO maintenance_log (operation_type, table_name)
  VALUES (op_type, table_name)
  RETURNING id INTO operation_id;
  
  RETURN operation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete maintenance operation
CREATE OR REPLACE FUNCTION complete_maintenance_operation(
  operation_id UUID,
  rows_affected BIGINT DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE maintenance_log 
  SET 
    end_time = NOW(),
    rows_affected = complete_maintenance_operation.rows_affected,
    status = CASE WHEN error_msg IS NULL THEN 'COMPLETED' ELSE 'FAILED' END,
    error_message = error_msg
  WHERE id = operation_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION cleanup_monitoring_data() IS 'Automated cleanup of old monitoring data with configurable retention periods';
COMMENT ON FUNCTION check_monitoring_health() IS 'Health check function for monitoring tables and system metrics';
COMMENT ON FUNCTION optimize_monitoring_tables() IS 'Maintenance function to vacuum, analyze, and optimize monitoring tables';
COMMENT ON FUNCTION generate_monitoring_report() IS 'Generate summary reports of monitoring metrics';
COMMENT ON TABLE maintenance_log IS 'Log of maintenance operations performed on monitoring tables';

-- Create a convenience function to run all maintenance tasks
CREATE OR REPLACE FUNCTION run_full_maintenance()
RETURNS TABLE(
  task TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  operation_id UUID;
  cleanup_results RECORD;
  health_results RECORD;
  optimize_results RECORD;
BEGIN
  -- Log the start of full maintenance
  operation_id := log_maintenance_operation('FULL_MAINTENANCE');
  
  BEGIN
    -- Run cleanup
    task := 'CLEANUP';
    SELECT string_agg(table_name || ': ' || rows_deleted || ' rows', ', ') INTO details
    FROM cleanup_monitoring_data();
    status := 'COMPLETED';
    RETURN NEXT;
    
    -- Run health check
    task := 'HEALTH_CHECK';
    SELECT COUNT(*) || ' metrics checked' INTO details
    FROM check_monitoring_health() WHERE status != 'OK';
    status := 'COMPLETED';
    RETURN NEXT;
    
    -- Run optimization
    task := 'OPTIMIZATION';
    SELECT string_agg(table_name || ' ' || operation, ', ') INTO details
    FROM optimize_monitoring_tables();
    status := 'COMPLETED';
    RETURN NEXT;
    
    -- Complete the maintenance log
    PERFORM complete_maintenance_operation(operation_id, NULL, NULL);
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error
    PERFORM complete_maintenance_operation(operation_id, NULL, SQLERRM);
    
    task := 'ERROR';
    status := 'FAILED';
    details := SQLERRM;
    RETURN NEXT;
  END;
  
END;
$$ LANGUAGE plpgsql;
