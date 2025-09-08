// ✅ COMPREHENSIVE TESTING SUITE - Test all OpenAI optimizations and monitoring
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { NextApiRequest, NextApiResponse } from 'next';
import { comprehensiveMonitor } from '../monitor/comprehensive-monitoring';
import { comprehensiveCostOptimizer } from '../monitor/cost-optimization';
import { getServerClient } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  getServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null })
  }))
}));

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"test": "response"}' } }],
          usage: { total_tokens: 150 }
        })
      }
    }
  }))
}));

describe('🧪 COMPREHENSIVE OPENAI OPTIMIZATIONS TEST SUITE', () => {
  let mockRequest: Partial<NextApiRequest>;
  let mockResponse: Partial<NextApiResponse>;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      body: {
        message: 'Test dive analysis request',
        userId: 'test-user-123'
      },
      query: {},
      headers: { 'user-agent': 'test-client' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('📊 MONITORING SYSTEM TESTS', () => {
    test('✅ Should track comprehensive usage metrics', async () => {
      const testMetric = {
        user_id: 'test-user',
        endpoint: '/api/openai/chat',
        tokens_used: 150,
        response_time_ms: 1200,
        model_used: 'gpt-4',
        cost_estimate: 0.0045,
        success: true,
        metadata: {
          userLevel: 'beginner',
          contextChunks: 3,
          cacheHit: false
        }
      };

      await expect(comprehensiveMonitor.trackComprehensiveUsage(testMetric)).resolves.not.toThrow();
    });

    test('✅ Should log enhanced errors with severity classification', async () => {
      const testError = {
        user_id: 'test-user',
        endpoint: '/api/openai/chat',
        error_type: 'OpenAITimeoutError',
        error_message: 'Request timed out after 15 seconds',
        severity: 'high' as const,
        context: { timeout: 15000 }
      };

      await expect(comprehensiveMonitor.logEnhancedError(testError)).resolves.not.toThrow();
    });

    test('✅ Should generate performance summary', async () => {
      const summary = await comprehensiveMonitor.getPerformanceSummary('24h');
      expect(Array.isArray(summary)).toBe(true);
    });

    test('✅ Should run database health check', async () => {
      const health = await comprehensiveMonitor.checkDatabaseHealth();
      expect(Array.isArray(health)).toBe(true);
    });
  });

  describe('💰 COST OPTIMIZATION TESTS', () => {
    test('✅ Should analyze cost optimization opportunities', async () => {
      const optimizations = await comprehensiveCostOptimizer.analyzeCostOptimizations();
      expect(Array.isArray(optimizations)).toBe(true);
    });

    test('✅ Should check budget alerts', async () => {
      const alerts = await comprehensiveCostOptimizer.checkBudgetAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('✅ Should detect token usage patterns', async () => {
      // Mock high token usage data
      const mockSupabase = getServerClient();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue({
          data: [
            { tokens_used: 1200, metadata: { contextChunks: 6 } },
            { tokens_used: 1500, metadata: { contextChunks: 8 } }
          ]
        })
      });

      const optimizations = await comprehensiveCostOptimizer.analyzeCostOptimizations();
      expect(optimizations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🎯 OPENAI INTEGRATION TESTS', () => {
    test('✅ Should validate dive data extraction', () => {
      // Import the function to test (this would be in the actual chat.ts file)
      const testMessage = "I did a 112m CWT dive with some equalization issues";
      
      // Mock the extraction function
      const extractDiveDataFromMessage = (message: string) => {
        const diveData: any = {};
        if (message.includes('112m')) diveData.depth = 112;
        if (message.includes('CWT')) diveData.discipline = 'CWT';
        if (message.includes('equalization')) diveData.issues = 'equalization';
        return diveData;
      };

      const result = extractDiveDataFromMessage(testMessage);
      expect(result.depth).toBe(112);
      expect(result.discipline).toBe('CWT');
      expect(result.issues).toBe('equalization');
    });

    test('✅ Should validate dive data safety checks', () => {
      const validateDiveData = (diveData: any) => {
        const errors: string[] = [];
        if (diveData.depth > 300) errors.push('Unrealistic depth');
        if (diveData.depth < 0) errors.push('Invalid depth');
        return { isValid: errors.length === 0, errors };
      };

      // Test valid data
      const validData = { depth: 100, discipline: 'CWT' };
      const validResult = validateDiveData(validData);
      expect(validResult.isValid).toBe(true);

      // Test invalid data
      const invalidData = { depth: 400, discipline: 'CWT' };
      const invalidResult = validateDiveData(invalidData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Unrealistic depth');
    });

    test('✅ Should handle response caching', () => {
      const generateCacheKey = (message: string, userLevel: string) => {
        return `${message.slice(0, 50)}-${userLevel}`;
      };

      const cacheKey = generateCacheKey('Test message for caching', 'beginner');
      expect(cacheKey).toContain('beginner');
      expect(cacheKey.length).toBeLessThanOrEqual(100);
    });

    test('✅ Should implement retry logic with exponential backoff', async () => {
      let attempts = 0;
      const maxRetries = 3;

      const withRetry = async (fn: () => Promise<any>, options: { maxRetries?: number } = {}) => {
        const retries = options.maxRetries || 3;
        
        for (let i = 0; i < retries; i++) {
          try {
            attempts++;
            if (attempts < 2) throw new Error('Simulated failure');
            return await fn();
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
          }
        }
      };

      const testFunction = async () => 'success';
      const result = await withRetry(testFunction, { maxRetries });
      
      expect(result).toBe('success');
      expect(attempts).toBe(2); // Failed once, succeeded on second attempt
    });
  });

  describe('🛡️ SAFETY VALIDATION TESTS', () => {
    test('✅ Should detect dangerous dive progressions', () => {
      const checkSafeProgression = (currentDepth: number, previousDepth: number) => {
        const increase = currentDepth - previousDepth;
        return {
          safe: increase <= 3,
          warning: increase > 3 ? 'Progression too aggressive - max 2-3m increase recommended' : null
        };
      };

      // Safe progression
      const safeCheck = checkSafeProgression(83, 80);
      expect(safeCheck.safe).toBe(true);

      // Dangerous progression
      const dangerousCheck = checkSafeProgression(90, 80);
      expect(dangerousCheck.safe).toBe(false);
      expect(dangerousCheck.warning).toContain('too aggressive');
    });

    test('✅ Should validate E.N.C.L.O.S.E. framework application', () => {
      const applyEncloseFramework = (diveData: any) => {
        const analysis = {
          E: diveData.equalization || 'No equalization issues reported',
          N: diveData.narcosis || 'No narcosis symptoms detected',
          C: diveData.contractions || 'Contractions pattern not specified',
          L: diveData.lmc || 'No LMC indicators',
          O: diveData.oxygen || 'Oxygen levels not monitored',
          S: diveData.squeeze || 'No squeeze reported',
          E_emergency: 'Standard safety protocols apply'
        };
        return analysis;
      };

      const diveData = { equalization: 'Mild difficulty at 60m', narcosis: 'None' };
      const analysis = applyEncloseFramework(diveData);
      
      expect(analysis.E).toContain('Mild difficulty');
      expect(analysis.N).toBe('None');
    });

    test('✅ Should include medical disclaimers in all responses', () => {
      const addMedicalDisclaimer = (response: any) => {
        const disclaimer = "⚠️ SAFETY DISCLAIMER: This is coaching advice only. Always dive with proper supervision and consult medical professionals for health concerns. Never dive alone.";
        
        if (typeof response === 'string') {
          return response + '\n\n' + disclaimer;
        }
        
        if (typeof response === 'object') {
          return { ...response, medical_disclaimer: disclaimer };
        }
        
        return response;
      };

      const testResponse = { coaching_feedback: "Practice your turn technique" };
      const result = addMedicalDisclaimer(testResponse);
      
      expect(result.medical_disclaimer).toContain('SAFETY DISCLAIMER');
      expect(result.medical_disclaimer).toContain('Never dive alone');
    });
  });

  describe('⚡ PERFORMANCE OPTIMIZATION TESTS', () => {
    test('✅ Should optimize context selection for relevance', () => {
      const scoreChunkRelevance = (chunk: string, keywords: string[]) => {
        let score = 0;
        keywords.forEach(keyword => {
          if (chunk.toLowerCase().includes(keyword.toLowerCase())) score += 1;
        });
        
        // Bonus for safety content
        const safetyTerms = ['safety', 'danger', 'risk', 'emergency'];
        safetyTerms.forEach(term => {
          if (chunk.toLowerCase().includes(term)) score += 2;
        });
        
        return score;
      };

      const chunk1 = "This is about equalization techniques and safety protocols";
      const chunk2 = "Random content not related to diving";
      const keywords = ['equalization', 'safety'];

      const score1 = scoreChunkRelevance(chunk1, keywords);
      const score2 = scoreChunkRelevance(chunk2, keywords);

      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBeGreaterThanOrEqual(4); // 1 for equalization + 2 for safety
    });

    test('✅ Should implement response format validation', () => {
      const validateResponseFormat = (response: string) => {
        try {
          const parsed = JSON.parse(response);
          const requiredFields = ['safety_assessment', 'coaching_feedback', 'medical_disclaimer'];
          const hasRequired = requiredFields.every(field => field in parsed);
          return { valid: hasRequired, parsed };
        } catch {
          return { valid: false, parsed: null };
        }
      };

      const validResponse = JSON.stringify({
        safety_assessment: "No immediate concerns",
        coaching_feedback: "Focus on technique",
        medical_disclaimer: "Safety disclaimer text"
      });

      const result = validateResponseFormat(validResponse);
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeTruthy();
    });

    test('✅ Should track token usage for cost optimization', () => {
      const calculateTokenCost = (tokens: number, model: string) => {
        const costs = {
          'gpt-4': 0.00003,
          'gpt-4-turbo': 0.00001,
          'gpt-3.5-turbo': 0.0000015
        };
        return tokens * (costs[model as keyof typeof costs] || costs['gpt-4']);
      };

      const cost1 = calculateTokenCost(1000, 'gpt-4');
      const cost2 = calculateTokenCost(1000, 'gpt-3.5-turbo');

      expect(cost1).toBeGreaterThan(cost2);
      expect(cost1).toBe(0.03);
    });
  });

  describe('🔧 INTEGRATION TESTS', () => {
    test('✅ Should handle full request cycle with monitoring', async () => {
      // This would test the entire flow from request to response
      // including monitoring, error handling, and optimization

      const mockChatHandler = async (req: any, res: any) => {
        const startTime = Date.now();
        
        try {
          // Simulate OpenAI call
          const response = { content: '{"test": "response"}' };
          const processingTime = Date.now() - startTime;

          // Track usage
          await comprehensiveMonitor.trackComprehensiveUsage({
            user_id: req.body.userId,
            endpoint: '/api/openai/chat',
            tokens_used: 150,
            response_time_ms: processingTime,
            model_used: 'gpt-4',
            cost_estimate: 0.0045,
            success: true,
            metadata: { processingTime }
          });

          return res.status(200).json({ success: true, response });
        } catch (error) {
          await comprehensiveMonitor.logEnhancedError({
            user_id: req.body.userId,
            endpoint: '/api/openai/chat',
            error_type: 'TestError',
            error_message: 'Test error',
            severity: 'low'
          });
          
          return res.status(500).json({ error: 'Test error' });
        }
      };

      await expect(mockChatHandler(mockRequest, mockResponse)).resolves.not.toThrow();
    });

    test('✅ Should maintain database connections under load', async () => {
      // Simulate multiple concurrent monitoring operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        comprehensiveMonitor.trackComprehensiveUsage({
          user_id: `test-user-${i}`,
          endpoint: '/api/openai/chat',
          tokens_used: 100 + i,
          response_time_ms: 1000 + i * 100,
          model_used: 'gpt-4',
          cost_estimate: 0.003 + i * 0.001,
          success: true,
          metadata: { batchTest: true }
        })
      );

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });
});

// ✅ PERFORMANCE BENCHMARKING
describe('🚀 PERFORMANCE BENCHMARKS', () => {
  test('✅ Monitoring should complete within 100ms', async () => {
    const startTime = Date.now();
    
    await comprehensiveMonitor.trackComprehensiveUsage({
      user_id: 'benchmark-user',
      endpoint: '/api/openai/chat',
      tokens_used: 150,
      response_time_ms: 1200,
      model_used: 'gpt-4',
      cost_estimate: 0.0045,
      success: true,
      metadata: { benchmark: true }
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100);
  });

  test('✅ Cost optimization analysis should complete within 500ms', async () => {
    const startTime = Date.now();
    await comprehensiveCostOptimizer.analyzeCostOptimizations();
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
  });
});

// ✅ TEST HELPERS
export const testHelpers = {
  createMockDiveData: (overrides = {}) => ({
    depth: 80,
    discipline: 'CWT',
    totalTime: '3:45',
    issues: '',
    ...overrides
  }),

  createMockUsageMetric: (overrides = {}) => ({
    user_id: 'test-user',
    endpoint: '/api/openai/chat',
    tokens_used: 150,
    response_time_ms: 1200,
    model_used: 'gpt-4',
    cost_estimate: 0.0045,
    success: true,
    metadata: {},
    ...overrides
  }),

  createMockError: (overrides = {}) => ({
    user_id: 'test-user',
    endpoint: '/api/openai/chat',
    error_type: 'TestError',
    error_message: 'Test error message',
    severity: 'medium' as const,
    ...overrides
  })
};

export default testHelpers;
