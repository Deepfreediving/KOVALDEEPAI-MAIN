// ✅ COMPREHENSIVE MONITORING SERVICE - Integrates all monitoring capabilities
import { NextApiRequest, NextApiResponse } from "next";
import { getServerClient } from '@/lib/supabase';

// Enhanced monitoring interfaces
interface ComprehensiveMetric {
  user_id: string;
  endpoint: string;
  tokens_used: number;
  response_time_ms: number;
  model_used: string;
  cost_estimate: number;
  success: boolean;
  error_type?: string;
  metadata?: {
    userLevel?: string;
    depthRange?: string;
    contextChunks?: number;
    diveContext?: number;
    cacheHit?: boolean;
    retryCount?: number;
    validationErrors?: string[];
    safetyConcerns?: string[];
    embedMode?: boolean;
    processingTime?: number;
  };
}

interface PerformanceMetric {
  endpoint: string;
  date: string;
  hour: number;
  avg_response_time: number;
  total_requests: number;
  success_rate: number;
  total_tokens: number;
  total_cost: number;
  unique_users: number;
  error_count: number;
}

interface ErrorLogEntry {
  user_id: string;
  endpoint: string;
  error_type: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  context?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
}

export class ComprehensiveMonitor {
  private supabase;
  
  constructor() {
    this.supabase = getServerClient();
  }

  // ✅ Enhanced usage tracking with comprehensive metadata
  async trackComprehensiveUsage(metric: ComprehensiveMetric): Promise<void> {
    try {
      // Insert into usage_analytics
      const { error: usageError } = await this.supabase
        .from('usage_analytics')
        .insert([{
          user_id: metric.user_id,
          endpoint: metric.endpoint,
          tokens_used: metric.tokens_used,
          response_time_ms: metric.response_time_ms,
          model_used: metric.model_used,
          cost_estimate: metric.cost_estimate,
          success: metric.success,
          error_type: metric.error_type,
          metadata: metric.metadata,
          timestamp: new Date().toISOString()
        }]);

      if (usageError) {
        console.error('❌ Failed to track comprehensive usage:', usageError);
        return;
      }

      // Update aggregated performance metrics
      await this.updatePerformanceMetrics(metric);

      // Check for cost alerts
      await this.checkCostAlerts(metric.user_id, metric.cost_estimate);

      console.log(`✅ Comprehensive usage tracked for ${metric.endpoint}`);
      
    } catch (error) {
      console.error('❌ Comprehensive monitoring error:', error);
    }
  }

  // ✅ Enhanced error logging with severity classification
  async logEnhancedError(error: ErrorLogEntry): Promise<void> {
    try {
      const { error: logError } = await this.supabase
        .from('error_logs')
        .insert([{
          user_id: error.user_id,
          endpoint: error.endpoint,
          error_type: error.error_type,
          error_message: error.error_message,
          error_code: error.error_code,
          stack_trace: error.stack_trace,
          context: error.context,
          severity: error.severity,
          resolved: false,
          timestamp: new Date().toISOString()
        }]);

      if (logError) {
        console.error('❌ Failed to log enhanced error:', logError);
        return;
      }

      // Check if this is a critical error that needs immediate attention
      if (error.severity === 'critical') {
        await this.triggerCriticalAlert(error);
      }

      console.log(`✅ Enhanced error logged: ${error.error_type} (${error.severity})`);
      
    } catch (err) {
      console.error('❌ Error logging failed:', err);
    }
  }

  // ✅ Update aggregated performance metrics
  private async updatePerformanceMetrics(metric: ComprehensiveMetric): Promise<void> {
    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const hour = now.getHours();

      // Check if record exists for this hour
      const { data: existing } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('endpoint', metric.endpoint)
        .eq('date', date)
        .eq('hour', hour)
        .single();

      if (existing) {
        // Update existing record
        const newAvgResponseTime = (
          (existing.avg_response_time * existing.total_requests + metric.response_time_ms) /
          (existing.total_requests + 1)
        );
        
        const newSuccessRate = (
          (existing.success_rate * existing.total_requests + (metric.success ? 100 : 0)) /
          (existing.total_requests + 1)
        );

        await this.supabase
          .from('performance_metrics')
          .update({
            avg_response_time: Math.round(newAvgResponseTime),
            total_requests: existing.total_requests + 1,
            success_rate: Math.round(newSuccessRate * 100) / 100,
            total_tokens: existing.total_tokens + metric.tokens_used,
            total_cost: existing.total_cost + metric.cost_estimate,
            error_count: existing.error_count + (metric.success ? 0 : 1)
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await this.supabase
          .from('performance_metrics')
          .insert([{
            endpoint: metric.endpoint,
            date,
            hour,
            avg_response_time: metric.response_time_ms,
            total_requests: 1,
            success_rate: metric.success ? 100 : 0,
            total_tokens: metric.tokens_used,
            total_cost: metric.cost_estimate,
            unique_users: 1,
            error_count: metric.success ? 0 : 1
          }]);
      }
    } catch (error) {
      console.error('❌ Failed to update performance metrics:', error);
    }
  }

  // ✅ Check for cost alerts and budget limits
  private async checkCostAlerts(userId: string, cost: number): Promise<void> {
    try {
      // Get user's cost budget
      const { data: budget } = await this.supabase
        .from('cost_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .single();

      if (!budget) return;

      // Calculate current period cost
      const periodStart = new Date();
      if (budget.period_type === 'daily') {
        periodStart.setHours(0, 0, 0, 0);
      } else if (budget.period_type === 'weekly') {
        periodStart.setDate(periodStart.getDate() - periodStart.getDay());
      } else if (budget.period_type === 'monthly') {
        periodStart.setDate(1);
      }

      const { data: periodUsage } = await this.supabase
        .from('usage_analytics')
        .select('cost_estimate')
        .eq('user_id', userId)
        .gte('timestamp', periodStart.toISOString());

      const currentCost = (periodUsage || []).reduce((sum, record) => sum + record.cost_estimate, 0) + cost;
      const percentageUsed = (currentCost / budget.limit_amount) * 100;

      // Check alert thresholds
      if (percentageUsed >= budget.alert_threshold && !budget.alert_sent) {
        await this.sendCostAlert(userId, budget, currentCost, percentageUsed);
      }

      // Update budget with current usage
      await this.supabase
        .from('cost_budgets')
        .update({
          current_usage: currentCost,
          alert_sent: percentageUsed >= budget.alert_threshold
        })
        .eq('id', budget.id);

    } catch (error) {
      console.error('❌ Cost alert check failed:', error);
    }
  }

  // ✅ Send cost alert
  private async sendCostAlert(userId: string, budget: any, currentCost: number, percentageUsed: number): Promise<void> {
    try {
      await this.supabase
        .from('cost_alerts')
        .insert([{
          user_id: userId,
          budget_id: budget.id,
          alert_type: percentageUsed >= 100 ? 'budget_exceeded' : 'budget_warning',
          threshold_percentage: budget.alert_threshold,
          current_usage: currentCost,
          budget_limit: budget.limit_amount,
          message: `Budget ${percentageUsed >= 100 ? 'exceeded' : 'warning'}: ${percentageUsed.toFixed(1)}% of ${budget.period_type} limit used`,
          sent_at: new Date().toISOString()
        }]);

      console.log(`🚨 Cost alert sent for user ${userId}: ${percentageUsed.toFixed(1)}% budget used`);
    } catch (error) {
      console.error('❌ Failed to send cost alert:', error);
    }
  }

  // ✅ Trigger critical error alert
  private async triggerCriticalAlert(error: ErrorLogEntry): Promise<void> {
    try {
      // Log the critical alert
      await this.supabase
        .from('cost_alerts')
        .insert([{
          user_id: error.user_id,
          alert_type: 'critical_error',
          message: `Critical error in ${error.endpoint}: ${error.error_message}`,
          sent_at: new Date().toISOString()
        }]);

      console.log(`🚨 CRITICAL ALERT: ${error.error_type} in ${error.endpoint}`);
    } catch (err) {
      console.error('❌ Failed to trigger critical alert:', err);
    }
  }

  // ✅ Get real-time performance summary
  async getPerformanceSummary(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    try {
      const intervals = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days' };
      const interval = intervals[timeframe];

      const { data } = await this.supabase
        .rpc('realtime_performance_summary')
        .gte('timestamp', `now() - interval '${interval}'`);

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get performance summary:', error);
      return [];
    }
  }

  // ✅ Get error analysis
  async getErrorAnalysis(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    try {
      const intervals = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days' };
      const interval = intervals[timeframe];

      const { data } = await this.supabase
        .rpc('error_analysis_summary')
        .gte('timestamp', `now() - interval '${interval}'`);

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get error analysis:', error);
      return [];
    }
  }

  // ✅ Run database health check
  async checkDatabaseHealth(): Promise<any> {
    try {
      const { data } = await this.supabase.rpc('check_monitoring_health');
      return data || [];
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return [];
    }
  }

  // ✅ Run maintenance operations
  async runMaintenance(): Promise<any> {
    try {
      const { data } = await this.supabase.rpc('run_full_maintenance');
      return data || [];
    } catch (error) {
      console.error('❌ Maintenance operation failed:', error);
      return [];
    }
  }
}

// Export singleton instance
export const comprehensiveMonitor = new ComprehensiveMonitor();

// ✅ API endpoint for monitoring dashboard
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { action, timeframe } = req.query;

    try {
      switch (action) {
        case 'performance':
          const performance = await comprehensiveMonitor.getPerformanceSummary(timeframe as any);
          return res.status(200).json({ data: performance });

        case 'errors':
          const errors = await comprehensiveMonitor.getErrorAnalysis(timeframe as any);
          return res.status(200).json({ data: errors });

        case 'health':
          const health = await comprehensiveMonitor.checkDatabaseHealth();
          return res.status(200).json({ data: health });

        case 'maintenance':
          const maintenance = await comprehensiveMonitor.runMaintenance();
          return res.status(200).json({ data: maintenance });

        default:
          return res.status(400).json({ error: 'Invalid action parameter' });
      }
    } catch (error) {
      console.error('❌ Monitoring API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
