// ✅ USAGE ANALYTICS & MONITORING - Track OpenAI usage, costs, and performance
import { NextApiRequest, NextApiResponse } from "next";
import { getServerClient } from '@/lib/supabase';

// Usage tracking interface
interface UsageMetric {
  id?: string;
  user_id: string;
  endpoint: string;
  tokens_used: number;
  response_time_ms: number;
  model_used: string;
  cost_estimate: number;
  success: boolean;
  error_type?: string;
  timestamp: string;
  metadata?: any;
}

// Cost per token for different models (approximate)
const TOKEN_COSTS = {
  'gpt-4': { input: 0.00003, output: 0.00006 },
  'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
  'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 }
};

export async function trackUsage(metric: UsageMetric): Promise<void> {
  try {
    const supabase = getServerClient();
    
    const { error } = await supabase
      .from('usage_analytics')
      .insert([metric]);
      
    if (error) {
      console.error('❌ Failed to track usage:', error);
    }
  } catch (error) {
    console.error('❌ Usage tracking error:', error);
  }
}

export function calculateCost(
  tokensUsed: number, 
  model: string, 
  inputTokens?: number, 
  outputTokens?: number
): number {
  const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS['gpt-4'];
  
  if (inputTokens && outputTokens) {
    return (inputTokens * costs.input) + (outputTokens * costs.output);
  }
  
  // Estimate 70% input, 30% output if not specified
  const estimatedInput = Math.floor(tokensUsed * 0.7);
  const estimatedOutput = tokensUsed - estimatedInput;
  
  return (estimatedInput * costs.input) + (estimatedOutput * costs.output);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Record a usage metric
    try {
      const metric: UsageMetric = {
        ...req.body,
        timestamp: new Date().toISOString()
      };
      
      await trackUsage(metric);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to record metric' });
    }
  }
  
  if (req.method === 'GET') {
    // Get analytics data
    try {
      const { userId, timeRange = 7 } = req.query;
      const supabase = getServerClient();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - Number(timeRange));
      
      let query = supabase
        .from('usage_analytics')
        .select('*')
        .gte('timestamp', cutoffDate.toISOString());
        
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data: metrics, error } = await query.order('timestamp', { ascending: false });
      
      if (error) {
        return res.status(500).json({ error: 'Failed to fetch analytics' });
      }
      
      // Calculate summary statistics
      const summary = {
        totalRequests: metrics?.length || 0,
        totalTokens: metrics?.reduce((sum, m) => sum + m.tokens_used, 0) || 0,
        totalCost: metrics?.reduce((sum, m) => sum + m.cost_estimate, 0) || 0,
        avgResponseTime: metrics?.length 
          ? Math.round(metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length)
          : 0,
        successRate: metrics?.length 
          ? Math.round((metrics.filter(m => m.success).length / metrics.length) * 100)
          : 0,
        errorBreakdown: {},
        dailyUsage: {}
      };
      
      // Error breakdown
      const errors = metrics?.filter(m => !m.success) || [];
      summary.errorBreakdown = errors.reduce((acc, m) => {
        const errorType = m.error_type || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Daily usage breakdown
      summary.dailyUsage = (metrics || []).reduce((acc, m) => {
        const date = m.timestamp.split('T')[0];
        if (!acc[date]) {
          acc[date] = { requests: 0, tokens: 0, cost: 0 };
        }
        acc[date].requests += 1;
        acc[date].tokens += m.tokens_used;
        acc[date].cost += m.cost_estimate;
        return acc;
      }, {} as Record<string, any>);
      
      return res.status(200).json({
        summary,
        metrics: metrics?.slice(0, 100) // Limit to recent 100
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
