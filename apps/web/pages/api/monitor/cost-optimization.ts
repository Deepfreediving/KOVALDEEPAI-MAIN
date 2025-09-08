// ✅ COST OPTIMIZATION SERVICE - Advanced cost tracking, budgeting, and optimization
import { NextApiRequest, NextApiResponse } from "next";
import { getServerClient } from '@/lib/supabase';

interface CostBudget {
  id?: string;
  name: string;
  daily_limit: number;
  monthly_limit: number;
  current_daily_spend: number;
  current_monthly_spend: number;
  alert_threshold: number; // Percentage (e.g., 80 for 80%)
  active: boolean;
  created_at?: string;
}

interface CostAlert {
  id?: string;
  budget_id: string;
  alert_type: 'daily_threshold' | 'monthly_threshold' | 'daily_exceeded' | 'monthly_exceeded';
  current_spend: number;
  limit_amount: number;
  percentage: number;
  sent_at: string;
}

interface CostOptimization {
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  savingEstimate: number;
  implementationComplexity: 'easy' | 'medium' | 'hard';
}

interface BudgetAlert {
  userId: string;
  alertType: 'budget_warning' | 'budget_exceeded' | 'anomaly_detected';
  message: string;
  recommendedActions: string[];
}

export class CostOptimizer {
  // Model cost efficiency ratings (tokens per dollar)
  static readonly MODEL_EFFICIENCY = {
    'gpt-4': { efficiency: 1.0, quality: 1.0 },
    'gpt-4-turbo': { efficiency: 3.0, quality: 0.95 },
    'gpt-3.5-turbo': { efficiency: 20.0, quality: 0.8 }
  };

  static async checkBudgetLimits(userId: string, estimatedCost: number): Promise<{
    allowed: boolean;
    reason?: string;
    suggestedAction?: string;
  }> {
    try {
      const supabase = getServerClient();
      
      // Get active budgets
      const { data: budgets, error } = await supabase
        .from('cost_budgets')
        .select('*')
        .eq('active', true);
        
      if (error || !budgets?.length) {
        return { allowed: true }; // No budgets = no limits
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      // Get current spending
      const { data: todaySpend } = await supabase
        .from('usage_analytics')
        .select('cost_estimate')
        .gte('timestamp', `${today}T00:00:00Z`)
        .eq('user_id', userId);

      const { data: monthSpend } = await supabase
        .from('usage_analytics')
        .select('cost_estimate')
        .gte('timestamp', `${monthStart}T00:00:00Z`)
        .eq('user_id', userId);

      const currentDailySpend = todaySpend?.reduce((sum, r) => sum + r.cost_estimate, 0) || 0;
      const currentMonthlySpend = monthSpend?.reduce((sum, r) => sum + r.cost_estimate, 0) || 0;

      for (const budget of budgets) {
        // Check daily limit
        if (currentDailySpend + estimatedCost > budget.daily_limit) {
          return {
            allowed: false,
            reason: `Daily budget limit exceeded ($${budget.daily_limit})`,
            suggestedAction: `Wait until tomorrow or increase daily limit. Current: $${currentDailySpend.toFixed(4)}`
          };
        }

        // Check monthly limit
        if (currentMonthlySpend + estimatedCost > budget.monthly_limit) {
          return {
            allowed: false,
            reason: `Monthly budget limit exceeded ($${budget.monthly_limit})`,
            suggestedAction: `Wait until next month or increase monthly limit. Current: $${currentMonthlySpend.toFixed(4)}`
          };
        }

        // Check alert thresholds
        const dailyPercentage = ((currentDailySpend + estimatedCost) / budget.daily_limit) * 100;
        const monthlyPercentage = ((currentMonthlySpend + estimatedCost) / budget.monthly_limit) * 100;

        if (dailyPercentage >= budget.alert_threshold) {
          await this.sendCostAlert({
            budget_id: budget.id!,
            alert_type: dailyPercentage >= 100 ? 'daily_exceeded' : 'daily_threshold',
            current_spend: currentDailySpend + estimatedCost,
            limit_amount: budget.daily_limit,
            percentage: dailyPercentage,
            sent_at: now.toISOString()
          });
        }

        if (monthlyPercentage >= budget.alert_threshold) {
          await this.sendCostAlert({
            budget_id: budget.id!,
            alert_type: monthlyPercentage >= 100 ? 'monthly_exceeded' : 'monthly_threshold',
            current_spend: currentMonthlySpend + estimatedCost,
            limit_amount: budget.monthly_limit,
            percentage: monthlyPercentage,
            sent_at: now.toISOString()
          });
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('❌ Budget check failed:', error);
      return { allowed: true }; // Fail open to avoid blocking service
    }
  }

  static async sendCostAlert(alert: CostAlert): Promise<void> {
    try {
      const supabase = getServerClient();
      
      // Check if we already sent this alert recently (avoid spam)
      const { data: recentAlert } = await supabase
        .from('cost_alerts')
        .select('*')
        .eq('budget_id', alert.budget_id)
        .eq('alert_type', alert.alert_type)
        .gte('sent_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .single();

      if (recentAlert) {
        return; // Already sent recently
      }

      // Save alert
      await supabase
        .from('cost_alerts')
        .insert([alert]);

      // In production, send actual alert (email, Slack, etc.)
      console.warn(`🚨 COST ALERT: ${alert.alert_type} - ${alert.percentage.toFixed(1)}% of budget used ($${alert.current_spend.toFixed(4)}/$${alert.limit_amount})`);
    } catch (error) {
      console.error('❌ Failed to send cost alert:', error);
    }
  }

  static recommendOptimalModel(
    userLevel: 'expert' | 'beginner',
    messageLength: number,
    hasDiveLogs: boolean,
    embedMode: boolean
  ): string {
    // For safety-critical coaching, always use GPT-4
    if (hasDiveLogs || userLevel === 'expert') {
      return 'gpt-4';
    }

    // For simple questions in embed mode, use GPT-3.5 Turbo
    if (embedMode && messageLength < 200) {
      return 'gpt-3.5-turbo';
    }

    // For medium complexity, use GPT-4 Turbo
    if (messageLength < 500) {
      return 'gpt-4-turbo';
    }

    // Default to GPT-4 for complex analysis
    return 'gpt-4';
  }

  static async analyzeCostTrends(timeRange: number = 30): Promise<{
    trends: any;
    recommendations: string[];
    potentialSavings: number;
  }> {
    try {
      const supabase = getServerClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);

      const { data: usage, error } = await supabase
        .from('usage_analytics')
        .select('*')
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error || !usage?.length) {
        return { trends: {}, recommendations: [], potentialSavings: 0 };
      }

      // Calculate trends
      const daily = usage.reduce((acc, record) => {
        const date = record.timestamp.split('T')[0];
        if (!acc[date]) {
          acc[date] = { cost: 0, tokens: 0, requests: 0 };
        }
        acc[date].cost += record.cost_estimate;
        acc[date].tokens += record.tokens_used;
        acc[date].requests += 1;
        return acc;
      }, {} as Record<string, any>);

      const byModel = usage.reduce((acc, record) => {
        if (!acc[record.model_used]) {
          acc[record.model_used] = { cost: 0, tokens: 0, requests: 0, avgResponseTime: 0 };
        }
        acc[record.model_used].cost += record.cost_estimate;
        acc[record.model_used].tokens += record.tokens_used;
        acc[record.model_used].requests += 1;
        acc[record.model_used].avgResponseTime += record.response_time_ms;
        return acc;
      }, {} as Record<string, any>);

      // Calculate averages
      Object.keys(byModel).forEach(model => {
        byModel[model].avgResponseTime = Math.round(byModel[model].avgResponseTime / byModel[model].requests);
        byModel[model].costPerToken = byModel[model].cost / byModel[model].tokens;
      });

      // Generate recommendations
      const recommendations: string[] = [];
      let potentialSavings = 0;

      // Check if GPT-4 is overused for simple queries
      const gpt4Usage = byModel['gpt-4'];
      if (gpt4Usage && gpt4Usage.requests > 50) {
        const avgTokensPerRequest = gpt4Usage.tokens / gpt4Usage.requests;
        if (avgTokensPerRequest < 500) {
          const savingsIfTurbo = gpt4Usage.cost * 0.7; // 70% savings with turbo
          potentialSavings += savingsIfTurbo;
          recommendations.push(`Consider using GPT-4 Turbo for simpler queries. Potential savings: $${savingsIfTurbo.toFixed(4)}/month`);
        }
      }

      // Check response time vs cost efficiency
      const inefficientModels = Object.entries(byModel)
        .filter(([model, stats]: [string, any]) => stats.avgResponseTime > 5000 && stats.costPerToken > 0.00003)
        .map(([model]) => model);

      if (inefficientModels.length > 0) {
        recommendations.push(`Models ${inefficientModels.join(', ')} have high cost and slow response times. Consider optimization.`);
      }

      // Check daily cost spikes
      const dailyCosts = Object.values(daily).map((d: any) => d.cost);
      const avgDailyCost = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
      const maxDailyCost = Math.max(...dailyCosts);

      if (maxDailyCost > avgDailyCost * 2) {
        recommendations.push(`Daily cost spikes detected. Max: $${maxDailyCost.toFixed(4)}, Avg: $${avgDailyCost.toFixed(4)}. Consider rate limiting.`);
      }

      return {
        trends: {
          daily,
          byModel,
          totalCost: usage.reduce((sum, r) => sum + r.cost_estimate, 0),
          totalTokens: usage.reduce((sum, r) => sum + r.tokens_used, 0),
          avgCostPerRequest: usage.reduce((sum, r) => sum + r.cost_estimate, 0) / usage.length
        },
        recommendations,
        potentialSavings
      };
    } catch (error) {
      console.error('❌ Cost analysis failed:', error);
      return { trends: {}, recommendations: [], potentialSavings: 0 };
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { action, timeRange = 30 } = req.query;

    if (action === 'trends') {
      try {
        const analysis = await CostOptimizer.analyzeCostTrends(Number(timeRange));
        return res.status(200).json(analysis);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to analyze cost trends' });
      }
    }

    if (action === 'budgets') {
      try {
        const supabase = getServerClient();
        const { data: budgets, error } = await supabase
          .from('cost_budgets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          return res.status(500).json({ error: 'Failed to fetch budgets' });
        }

        return res.status(200).json({ budgets });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch budgets' });
      }
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  }

  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'budget') {
      try {
        const budget: CostBudget = {
          ...req.body,
          current_daily_spend: 0,
          current_monthly_spend: 0,
          active: true
        };

        const supabase = getServerClient();
        const { data, error } = await supabase
          .from('cost_budgets')
          .insert([budget])
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Failed to create budget' });
        }

        return res.status(200).json({ budget: data });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to create budget' });
      }
    }

    if (action === 'check-budget') {
      try {
        const { userId, estimatedCost } = req.body;
        const result = await CostOptimizer.checkBudgetLimits(userId, estimatedCost);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to check budget' });
      }
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ✅ COMPREHENSIVE COST OPTIMIZATION EXTENSIONS
export class ComprehensiveCostOptimizer extends CostOptimizer {
  private supabase;

  constructor() {
    super();
    this.supabase = getServerClient();
  }

  // ✅ Analyze cost patterns and provide optimization recommendations
  async analyzeCostOptimizations(): Promise<CostOptimization[]> {
    try {
      const optimizations: CostOptimization[] = [];

      // Analyze token usage patterns
      const tokenAnalysis = await this.analyzeTokenUsage();
      optimizations.push(...tokenAnalysis);

      // Analyze response time vs cost
      const responseTimeAnalysis = await this.analyzeResponseTimeEfficiency();
      optimizations.push(...responseTimeAnalysis);

      // Analyze cache hit rates
      const cacheAnalysis = await this.analyzeCacheEfficiency();
      optimizations.push(...cacheAnalysis);

      // Analyze error rates and their cost impact
      const errorAnalysis = await this.analyzeErrorCosts();
      optimizations.push(...errorAnalysis);

      return optimizations.sort((a, b) => b.savingEstimate - a.savingEstimate);

    } catch (error) {
      console.error('❌ Cost optimization analysis failed:', error);
      return [];
    }
  }

  // ✅ Analyze token usage patterns
  private async analyzeTokenUsage(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      // Get high token usage patterns
      const { data: highTokenUsage } = await this.supabase
        .from('usage_analytics')
        .select('endpoint, tokens_used, metadata')
        .gt('tokens_used', 1000)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (highTokenUsage && highTokenUsage.length > 10) {
        optimizations.push({
          recommendation: 'Optimize prompts to reduce token usage - detected high token consumption patterns',
          impact: 'high',
          savingEstimate: 0.3, // 30% potential savings
          implementationComplexity: 'medium'
        });
      }

      // Analyze context optimization opportunities
      const avgContextSize = highTokenUsage?.reduce((sum, record) => 
        sum + (record.metadata?.contextChunks || 0), 0
      ) / Math.max(highTokenUsage?.length || 1, 1);

      if (avgContextSize > 5) {
        optimizations.push({
          recommendation: 'Implement smarter context selection to reduce unnecessary context chunks',
          impact: 'medium',
          savingEstimate: 0.15, // 15% potential savings
          implementationComplexity: 'medium'
        });
      }

    } catch (error) {
      console.error('❌ Token usage analysis failed:', error);
    }

    return optimizations;
  }

  // ✅ Analyze response time efficiency
  private async analyzeResponseTimeEfficiency(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      const { data: slowRequests } = await this.supabase
        .from('usage_analytics')
        .select('endpoint, response_time_ms, cost_estimate')
        .gt('response_time_ms', 5000)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (slowRequests && slowRequests.length > 5) {
        const avgCostPerSlow = slowRequests.reduce((sum, r) => sum + r.cost_estimate, 0) / slowRequests.length;
        
        optimizations.push({
          recommendation: 'Optimize slow requests that are consuming high costs - implement request timeout and fallbacks',
          impact: 'high',
          savingEstimate: avgCostPerSlow * slowRequests.length * 0.5, // 50% of slow request costs
          implementationComplexity: 'easy'
        });
      }

    } catch (error) {
      console.error('❌ Response time analysis failed:', error);
    }

    return optimizations;
  }

  // ✅ Analyze cache efficiency
  private async analyzeCacheEfficiency(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      const { data: recentRequests } = await this.supabase
        .from('usage_analytics')
        .select('metadata, cost_estimate')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const cacheHits = recentRequests?.filter(r => r.metadata?.cacheHit === true).length || 0;
      const totalRequests = recentRequests?.length || 1;
      const cacheHitRate = cacheHits / totalRequests;

      if (cacheHitRate < 0.1) { // Less than 10% cache hit rate
        const potentialSavings = recentRequests?.reduce((sum, r) => sum + r.cost_estimate, 0) * 0.3; // 30% could be cached
        
        optimizations.push({
          recommendation: 'Implement response caching for common dive patterns and coaching scenarios',
          impact: 'high',
          savingEstimate: potentialSavings || 0,
          implementationComplexity: 'medium'
        });
      }

    } catch (error) {
      console.error('❌ Cache analysis failed:', error);
    }

    return optimizations;
  }

  // ✅ Analyze error costs
  private async analyzeErrorCosts(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];

    try {
      const { data: errorCosts } = await this.supabase
        .from('usage_analytics')
        .select('cost_estimate')
        .eq('success', false)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const totalErrorCost = errorCosts?.reduce((sum, r) => sum + r.cost_estimate, 0) || 0;

      if (totalErrorCost > 0.1) { // More than $0.10 in error costs
        optimizations.push({
          recommendation: 'Implement better error handling and retry logic to reduce costs from failed requests',
          impact: 'medium',
          savingEstimate: totalErrorCost * 0.8, // 80% of error costs could be saved
          implementationComplexity: 'easy'
        });
      }

    } catch (error) {
      console.error('❌ Error cost analysis failed:', error);
    }

    return optimizations;
  }

  // ✅ Check for budget alerts
  async checkBudgetAlerts(): Promise<BudgetAlert[]> {
    try {
      const alerts: BudgetAlert[] = [];

      // Get active budgets
      const { data: budgets } = await this.supabase
        .from('cost_budgets')
        .select('*')
        .eq('active', true);

      if (!budgets) return alerts;

      for (const budget of budgets) {
        const currentUsage = await this.calculateCurrentUsage(budget.user_id, budget.period_type);
        const percentageUsed = (currentUsage / budget.limit_amount) * 100;

        // Update current usage
        await this.supabase
          .from('cost_budgets')
          .update({ current_usage: currentUsage })
          .eq('id', budget.id);

        // Check for alerts
        if (percentageUsed >= 100 && !budget.alert_sent) {
          alerts.push({
            userId: budget.user_id,
            alertType: 'budget_exceeded',
            message: `Budget exceeded: $${currentUsage.toFixed(4)} of $${budget.limit_amount} used (${percentageUsed.toFixed(1)}%)`,
            recommendedActions: [
              'Review recent usage patterns',
              'Consider optimizing API calls',
              'Increase budget limit if needed'
            ]
          });
        } else if (percentageUsed >= budget.alert_threshold && !budget.alert_sent) {
          alerts.push({
            userId: budget.user_id,
            alertType: 'budget_warning',
            message: `Budget warning: $${currentUsage.toFixed(4)} of $${budget.limit_amount} used (${percentageUsed.toFixed(1)}%)`,
            recommendedActions: [
              'Monitor usage closely',
              'Consider implementing optimizations'
            ]
          });
        }

        // Check for usage anomalies
        const anomaly = await this.detectUsageAnomalies(budget.user_id);
        if (anomaly) {
          alerts.push({
            userId: budget.user_id,
            alertType: 'anomaly_detected',
            message: `Unusual usage pattern detected: ${anomaly}`,
            recommendedActions: [
              'Review recent API activity',
              'Check for unexpected usage spikes'
            ]
          });
        }
      }

      return alerts;

    } catch (error) {
      console.error('❌ Budget alert check failed:', error);
      return [];
    }
  }

  // ✅ Calculate current usage for a period
  private async calculateCurrentUsage(userId: string, periodType: string): Promise<number> {
    const now = new Date();
    let periodStart = new Date();

    switch (periodType) {
      case 'daily':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { data } = await this.supabase
      .from('usage_analytics')
      .select('cost_estimate')
      .eq('user_id', userId)
      .gte('timestamp', periodStart.toISOString());

    return (data || []).reduce((sum, record) => sum + record.cost_estimate, 0);
  }

  // ✅ Detect usage anomalies
  private async detectUsageAnomalies(userId: string): Promise<string | null> {
    try {
      // Get last 7 days usage
      const { data: recentUsage } = await this.supabase
        .from('usage_analytics')
        .select('cost_estimate, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true });

      if (!recentUsage || recentUsage.length < 5) return null;

      // Calculate daily averages
      const dailyUsage: { [key: string]: number } = {};
      recentUsage.forEach(record => {
        const date = record.timestamp.split('T')[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + record.cost_estimate;
      });

      const dailyValues = Object.values(dailyUsage);
      const avgDaily = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
      const maxDaily = Math.max(...dailyValues);

      // Check for spike (more than 3x average)
      if (maxDaily > avgDaily * 3) {
        return `Usage spike detected: $${maxDaily.toFixed(4)} vs average $${avgDaily.toFixed(4)}`;
      }

      return null;

    } catch (error) {
      console.error('❌ Anomaly detection failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const comprehensiveCostOptimizer = new ComprehensiveCostOptimizer();
