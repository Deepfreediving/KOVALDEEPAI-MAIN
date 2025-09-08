// ✅ MONITORING DASHBOARD API - Real-time performance and error monitoring
import { NextApiRequest, NextApiResponse } from "next";
import { comprehensiveMonitor } from './comprehensive-monitoring';
import { getServerClient } from '@/lib/supabase';

interface DashboardData {
  performance: {
    last24h: any[];
    last7d: any[];
    realtime: any[];
  };
  errors: {
    recent: any[];
    byType: any[];
    critical: any[];
  };
  health: {
    database: any[];
    tables: any[];
    recommendations: string[];
  };
  costs: {
    current: number;
    budget: any[];
    alerts: any[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServerClient();

    // ✅ Get comprehensive dashboard data
    const dashboardData: DashboardData = {
      performance: {
        last24h: await comprehensiveMonitor.getPerformanceSummary('24h'),
        last7d: await comprehensiveMonitor.getPerformanceSummary('7d'),
        realtime: await comprehensiveMonitor.getPerformanceSummary('1h')
      },
      errors: {
        recent: await comprehensiveMonitor.getErrorAnalysis('24h'),
        byType: await getErrorsByType(),
        critical: await getCriticalErrors()
      },
      health: {
        database: await comprehensiveMonitor.checkDatabaseHealth(),
        tables: await getTableStats(),
        recommendations: await getHealthRecommendations()
      },
      costs: {
        current: await getCurrentCosts(),
        budget: await getBudgetStatus(),
        alerts: await getRecentAlerts()
      }
    };

    // ✅ Calculate summary metrics
    const summary = {
      totalRequests24h: dashboardData.performance.last24h.reduce((sum, p) => sum + (p.request_count || 0), 0),
      avgResponseTime: Math.round(
        dashboardData.performance.last24h.reduce((sum, p) => sum + (p.avg_response_time || 0), 0) / 
        Math.max(dashboardData.performance.last24h.length, 1)
      ),
      errorRate: calculateErrorRate(dashboardData.performance.last24h),
      totalCost24h: dashboardData.performance.last24h.reduce((sum, p) => sum + (p.total_cost || 0), 0),
      activeAlerts: dashboardData.costs.alerts.filter((alert: any) => !alert.acknowledged).length,
      healthScore: calculateHealthScore(dashboardData.health.database)
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ✅ Helper functions for dashboard data
async function getErrorsByType(): Promise<any[]> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from('error_logs')
      .select('error_type, severity')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Group manually since Supabase doesn't support SQL GROUP BY in select
    const grouped: { [key: string]: number } = {};
    data?.forEach(item => {
      const key = `${item.error_type}-${item.severity}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped).map(([key, count]) => {
      const [error_type, severity] = key.split('-');
      return { error_type, severity, count };
    }).sort((a, b) => b.count - a.count);

  } catch (error) {
    console.error('❌ Error getting errors by type:', error);
    return [];
  }
}

async function getCriticalErrors(): Promise<any[]> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .eq('severity', 'critical')
      .eq('resolved', false)
      .order('timestamp', { ascending: false })
      .limit(10);

    return data || [];
  } catch (error) {
    console.error('❌ Error getting critical errors:', error);
    return [];
  }
}

async function getTableStats(): Promise<any[]> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase.rpc('monitoring_table_stats');
    return data || [];
  } catch (error) {
    console.error('❌ Error getting table stats:', error);
    return [];
  }
}

async function getHealthRecommendations(): Promise<string[]> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase.rpc('check_monitoring_health');
    
    const recommendations = (data || [])
      .filter((metric: any) => metric.status !== 'OK')
      .map((metric: any) => metric.recommendation);

    return recommendations;
  } catch (error) {
    console.error('❌ Error getting health recommendations:', error);
    return [];
  }
}

async function getCurrentCosts(): Promise<number> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from('usage_analytics')
      .select('cost_estimate')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return (data || []).reduce((sum, record) => sum + record.cost_estimate, 0);
  } catch (error) {
    console.error('❌ Error getting current costs:', error);
    return 0;
  }
}

async function getBudgetStatus(): Promise<any[]> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from('cost_budgets')
      .select('*')
      .eq('active', true);

    return data || [];
  } catch (error) {
    console.error('❌ Error getting budget status:', error);
    return [];
  }
}

async function getRecentAlerts(): Promise<any[]> {
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from('cost_alerts')
      .select('*')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(20);

    return data || [];
  } catch (error) {
    console.error('❌ Error getting recent alerts:', error);
    return [];
  }
}

function calculateErrorRate(performanceData: any[]): number {
  const totalRequests = performanceData.reduce((sum, p) => sum + (p.request_count || 0), 0);
  const successfulRequests = performanceData.reduce((sum, p) => sum + (p.successful_requests || 0), 0);
  
  if (totalRequests === 0) return 0;
  return Math.round(((totalRequests - successfulRequests) / totalRequests) * 100 * 100) / 100;
}

function calculateHealthScore(healthData: any[]): number {
  if (!healthData || healthData.length === 0) return 100;
  
  const totalMetrics = healthData.length;
  const goodMetrics = healthData.filter((metric: any) => metric.status === 'OK').length;
  
  return Math.round((goodMetrics / totalMetrics) * 100);
}
