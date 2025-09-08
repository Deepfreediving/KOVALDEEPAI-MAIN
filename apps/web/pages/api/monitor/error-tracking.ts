// ✅ ERROR MONITORING & ALERTING - Advanced error tracking and response optimization
import { NextApiRequest, NextApiResponse } from "next";
import { getServerClient } from '@/lib/supabase';

interface ErrorLog {
  id?: string;
  user_id?: string;
  endpoint: string;
  error_type: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  context: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

interface CircuitBreakerState {
  endpoint: string;
  failure_count: number;
  last_failure: string;
  state: 'closed' | 'open' | 'half-open';
  next_attempt: string;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  timeoutMs: 60000, // 1 minute
  resetTimeoutMs: 300000 // 5 minutes
};

const circuitBreakers = new Map<string, CircuitBreakerState>();

export class ErrorMonitor {
  static async logError(error: ErrorLog): Promise<void> {
    try {
      const supabase = getServerClient();
      
      await supabase
        .from('error_logs')
        .insert([{
          ...error,
          timestamp: new Date().toISOString()
        }]);
        
      // Update circuit breaker if needed
      if (error.severity === 'high' || error.severity === 'critical') {
        this.updateCircuitBreaker(error.endpoint, false);
      }
        
      // Alert on critical errors
      if (error.severity === 'critical') {
        await this.sendAlert(error);
      }
    } catch (err) {
      console.error('❌ Failed to log error:', err);
    }
  }

  static updateCircuitBreaker(endpoint: string, success: boolean): void {
    const current = circuitBreakers.get(endpoint) || {
      endpoint,
      failure_count: 0,
      last_failure: '',
      state: 'closed',
      next_attempt: ''
    };

    if (success) {
      // Reset on success
      current.failure_count = 0;
      current.state = 'closed';
    } else {
      current.failure_count += 1;
      current.last_failure = new Date().toISOString();
      
      if (current.failure_count >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
        current.state = 'open';
        current.next_attempt = new Date(
          Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeoutMs
        ).toISOString();
      }
    }

    circuitBreakers.set(endpoint, current);
  }

  static isCircuitOpen(endpoint: string): boolean {
    const breaker = circuitBreakers.get(endpoint);
    
    if (!breaker || breaker.state === 'closed') {
      return false;
    }
    
    if (breaker.state === 'open') {
      const now = new Date();
      const nextAttempt = new Date(breaker.next_attempt);
      
      if (now >= nextAttempt) {
        // Move to half-open state
        breaker.state = 'half-open';
        circuitBreakers.set(endpoint, breaker);
        return false;
      }
      
      return true;
    }
    
    return false; // half-open allows attempts
  }

  static async sendAlert(error: ErrorLog): Promise<void> {
    // In production, this would send alerts via email, Slack, etc.
    console.error('🚨 CRITICAL ERROR ALERT:', {
      endpoint: error.endpoint,
      error: error.error_message,
      user: error.user_id,
      time: error.timestamp
    });
  }

  static categorizeError(error: any): {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryable: boolean;
  } {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    
    // OpenAI specific errors
    if (code === 'rate_limit_exceeded') {
      return { type: 'rate_limit', severity: 'medium', retryable: true };
    }
    
    if (code === 'insufficient_quota' || message.includes('quota')) {
      return { type: 'quota_exceeded', severity: 'critical', retryable: false };
    }
    
    if (code === 'invalid_api_key') {
      return { type: 'auth_failure', severity: 'critical', retryable: false };
    }
    
    if (error.status >= 500) {
      return { type: 'server_error', severity: 'high', retryable: true };
    }
    
    if (message.includes('timeout') || error.name === 'AbortError') {
      return { type: 'timeout', severity: 'medium', retryable: true };
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return { type: 'network_error', severity: 'medium', retryable: true };
    }
    
    // Validation errors
    if (error.status === 400 || message.includes('validation')) {
      return { type: 'validation_error', severity: 'low', retryable: false };
    }
    
    // Default
    return { type: 'unknown_error', severity: 'medium', retryable: false };
  }
}

// Enhanced retry logic with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: { endpoint: string; userId?: string },
  maxRetries = 3
): Promise<T> {
  // Check circuit breaker
  if (ErrorMonitor.isCircuitOpen(context.endpoint)) {
    throw new Error(`Circuit breaker open for ${context.endpoint}`);
  }

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Success - update circuit breaker
      ErrorMonitor.updateCircuitBreaker(context.endpoint, true);
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      const errorInfo = ErrorMonitor.categorizeError(error);
      
      // Log the error
      await ErrorMonitor.logError({
        user_id: context.userId,
        endpoint: context.endpoint,
        error_type: errorInfo.type,
        error_message: error.message,
        error_code: error.code,
        stack_trace: error.stack,
        context: { attempt, maxRetries },
        severity: errorInfo.severity,
        resolved: false,
        timestamp: new Date().toISOString()
      });
      
      // Don't retry if not retryable or last attempt
      if (!errorInfo.retryable || attempt === maxRetries) {
        ErrorMonitor.updateCircuitBreaker(context.endpoint, false);
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Retrying ${context.endpoint} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { timeRange = 24, severity, endpoint } = req.query;
      const supabase = getServerClient();
      
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - Number(timeRange));
      
      let query = supabase
        .from('error_logs')
        .select('*')
        .gte('timestamp', cutoffDate.toISOString());
        
      if (severity) {
        query = query.eq('severity', severity);
      }
      
      if (endpoint) {
        query = query.eq('endpoint', endpoint);
      }
      
      const { data: errors, error } = await query.order('timestamp', { ascending: false });
      
      if (error) {
        return res.status(500).json({ error: 'Failed to fetch error logs' });
      }
      
      // Calculate error statistics
      const stats = {
        totalErrors: errors?.length || 0,
        errorsByType: {},
        errorsBySeverity: {},
        errorsByEndpoint: {},
        unresolvedErrors: errors?.filter(e => !e.resolved).length || 0,
        circuitBreakerStates: Object.fromEntries(circuitBreakers)
      };
      
      (errors || []).forEach(error => {
        // By type
        stats.errorsByType[error.error_type] = (stats.errorsByType[error.error_type] || 0) + 1;
        
        // By severity
        stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
        
        // By endpoint
        stats.errorsByEndpoint[error.endpoint] = (stats.errorsByEndpoint[error.endpoint] || 0) + 1;
      });
      
      return res.status(200).json({
        stats,
        errors: errors?.slice(0, 50), // Recent 50 errors
        circuitBreakers: Object.fromEntries(circuitBreakers)
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch monitoring data' });
    }
  }
  
  if (req.method === 'POST') {
    // Manual error logging endpoint
    try {
      const errorLog: ErrorLog = {
        ...req.body,
        timestamp: new Date().toISOString()
      };
      
      await ErrorMonitor.logError(errorLog);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to log error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
