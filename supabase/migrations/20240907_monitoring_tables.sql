-- ✅ MONITORING TABLES - Create tables for usage analytics and error tracking

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  model_used TEXT DEFAULT 'gpt-4',
  cost_estimate DECIMAL(10, 6) DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_timestamp ON usage_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_endpoint ON usage_analytics(endpoint);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_success ON usage_analytics(success);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,
  context JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);

-- Performance metrics table for tracking response times and quality
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  avg_response_time_ms INTEGER,
  success_rate DECIMAL(5, 2),
  error_rate DECIMAL(5, 2),
  total_requests INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  hour INTEGER DEFAULT EXTRACT(hour FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint, date, hour)
);

-- Create index for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint_date ON performance_metrics(endpoint, date);

-- Function to calculate daily performance metrics
CREATE OR REPLACE FUNCTION calculate_performance_metrics()
RETURNS void AS $$
DECLARE
  metric_record RECORD;
BEGIN
  -- Calculate metrics for each endpoint and hour
  FOR metric_record IN
    SELECT 
      endpoint,
      DATE(timestamp) as metric_date,
      EXTRACT(hour FROM timestamp) as metric_hour,
      AVG(response_time_ms) as avg_response_time,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE success = true) as successful_requests
    FROM usage_analytics
    WHERE timestamp >= NOW() - INTERVAL '2 hours'
    GROUP BY endpoint, DATE(timestamp), EXTRACT(hour FROM timestamp)
  LOOP
    INSERT INTO performance_metrics (
      endpoint,
      avg_response_time_ms,
      success_rate,
      error_rate,
      total_requests,
      date,
      hour
    ) VALUES (
      metric_record.endpoint,
      metric_record.avg_response_time,
      ROUND((metric_record.successful_requests::DECIMAL / metric_record.total_requests) * 100, 2),
      ROUND(((metric_record.total_requests - metric_record.successful_requests)::DECIMAL / metric_record.total_requests) * 100, 2),
      metric_record.total_requests,
      metric_record.metric_date,
      metric_record.metric_hour
    )
    ON CONFLICT (endpoint, date, hour)
    DO UPDATE SET
      avg_response_time_ms = EXCLUDED.avg_response_time_ms,
      success_rate = EXCLUDED.success_rate,
      error_rate = EXCLUDED.error_rate,
      total_requests = EXCLUDED.total_requests;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add Row Level Security (RLS) policies if needed
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (you can modify these based on your auth setup)
CREATE POLICY "Admin can view all analytics" ON usage_analytics FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin can view all errors" ON error_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin can view all metrics" ON performance_metrics FOR ALL TO authenticated USING (true);

-- Create a view for easy monitoring dashboard queries
CREATE OR REPLACE VIEW monitoring_dashboard AS
SELECT 
  DATE(ua.timestamp) as date,
  ua.endpoint,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE ua.success = true) as successful_requests,
  ROUND(AVG(ua.response_time_ms), 0) as avg_response_time_ms,
  SUM(ua.tokens_used) as total_tokens,
  ROUND(SUM(ua.cost_estimate), 4) as total_cost,
  COUNT(DISTINCT ua.user_id) as unique_users,
  COUNT(el.id) as total_errors,
  COUNT(el.id) FILTER (WHERE el.severity = 'critical') as critical_errors
FROM usage_analytics ua
LEFT JOIN error_logs el ON ua.user_id = el.user_id AND DATE(ua.timestamp) = DATE(el.timestamp)
WHERE ua.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(ua.timestamp), ua.endpoint
ORDER BY date DESC, total_requests DESC;

-- Comment for documentation
COMMENT ON TABLE usage_analytics IS 'Tracks OpenAI API usage, costs, and performance metrics';
COMMENT ON TABLE error_logs IS 'Tracks application errors for monitoring and debugging';
COMMENT ON TABLE performance_metrics IS 'Aggregated performance metrics by endpoint and time';
COMMENT ON VIEW monitoring_dashboard IS 'Monitoring dashboard view for quick analytics overview';

-- Cost budgets table for cost management
CREATE TABLE IF NOT EXISTS cost_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  daily_limit DECIMAL(10, 4) DEFAULT 10.00,
  monthly_limit DECIMAL(10, 4) DEFAULT 300.00,
  current_daily_spend DECIMAL(10, 4) DEFAULT 0,
  current_monthly_spend DECIMAL(10, 4) DEFAULT 0,
  alert_threshold INTEGER DEFAULT 80, -- Percentage
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost alerts table
CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES cost_budgets(id) ON DELETE CASCADE,
  alert_type TEXT CHECK (alert_type IN ('daily_threshold', 'monthly_threshold', 'daily_exceeded', 'monthly_exceeded')),
  current_spend DECIMAL(10, 4),
  limit_amount DECIMAL(10, 4),
  percentage DECIMAL(5, 2),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for cost tables
CREATE INDEX IF NOT EXISTS idx_cost_budgets_active ON cost_budgets(active);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_budget_id ON cost_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_sent_at ON cost_alerts(sent_at);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_alert_type ON cost_alerts(alert_type);

-- Add RLS for cost tables
ALTER TABLE cost_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for cost tables
CREATE POLICY "Admin can manage budgets" ON cost_budgets FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin can view alerts" ON cost_alerts FOR ALL TO authenticated USING (true);

-- Function to update daily/monthly spend in budgets
CREATE OR REPLACE FUNCTION update_budget_spending()
RETURNS void AS $$
DECLARE
  budget_record RECORD;
  daily_spend DECIMAL(10, 4);
  monthly_spend DECIMAL(10, 4);
BEGIN
  FOR budget_record IN SELECT * FROM cost_budgets WHERE active = true
  LOOP
    -- Calculate daily spend
    SELECT COALESCE(SUM(cost_estimate), 0) INTO daily_spend
    FROM usage_analytics
    WHERE DATE(timestamp) = CURRENT_DATE;

    -- Calculate monthly spend
    SELECT COALESCE(SUM(cost_estimate), 0) INTO monthly_spend
    FROM usage_analytics
    WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE);

    -- Update budget
    UPDATE cost_budgets
    SET 
      current_daily_spend = daily_spend,
      current_monthly_spend = monthly_spend
    WHERE id = budget_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE cost_budgets IS 'Budget limits and spending tracking for cost control';
COMMENT ON TABLE cost_alerts IS 'Cost alert notifications for budget management';
COMMENT ON FUNCTION update_budget_spending() IS 'Updates current spending amounts in budget records';
