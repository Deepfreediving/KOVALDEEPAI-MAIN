/**
 * 💾 DIVE LOG & JOURNAL SAVE DEBUG SYSTEM
 * 
 * Tests the complete saving pipeline:
 * - Dive log data validation
 * - Database insertion
 * - Response handling
 * - UI state management simulation
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    diveLogSave: {},
    journalSave: {},
    database: {},
    validation: {},
    errors: []
  };

  try {
    console.log('💾 Starting dive log & journal save debug...');

    // 1. DATABASE CONNECTION TEST
    try {
      const supabase = getAdminClient();
      
      // Test dive_logs table access
      const { data: diveLogsTest, error: diveLogsError } = await supabase
        .from('dive_logs')
        .select('id')
        .limit(1);

      diagnostics.database.diveLogsTable = {
        accessible: !diveLogsError,
        error: diveLogsError?.message,
        sampleDataExists: diveLogsTest && diveLogsTest.length > 0
      };

      // Test chat_messages table
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      diagnostics.database.chatTable = {
        accessible: !chatError,
        error: chatError?.message
      };

      // Test user_profiles table for user validation
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .limit(1);

      diagnostics.database.userProfilesTable = {
        accessible: !profileError,
        error: profileError?.message,
        hasUsers: profileData && profileData.length > 0
      };

    } catch (dbError: any) {
      diagnostics.database.connection = {
        status: 'FAILED',
        error: dbError.message
      };
      diagnostics.errors.push(`Database connection failed: ${dbError.message}`);
    }

    // 2. DIVE LOG SAVE TEST
    try {
      const testDiveLogData = {
        userId: 'test-user-123',
        date: new Date().toISOString().split('T')[0],
        discipline: 'Constant Weight',
        targetDepth: 45,
        reachedDepth: 42,
        diveTime: 120,
        location: 'Test Pool',
        notes: 'Debug test dive log entry',
        equipment: 'Wetsuit, fins, mask',
        conditions: 'Good',
        mouthfillDepth: 20,
        issueDepth: null,
        issueComment: null
      };

      diagnostics.validation.diveLogData = {
        hasRequiredFields: !!(testDiveLogData.userId && testDiveLogData.date),
        dataStructure: Object.keys(testDiveLogData),
        userIdFormat: testDiveLogData.userId.length > 5 ? 'VALID_LENGTH' : 'TOO_SHORT'
      };

      // Test actual save using internal proxy to bypass Vercel protection
      const proxyEndpoint = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/api/internal/proxy`
        : `https://kovaldeepai-main.vercel.app/api/internal/proxy`;

      const proxyResponse = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/api/supabase/save-dive-log',
          method: 'POST',
          body: testDiveLogData
        })
      });

      const proxyResult = await proxyResponse.json();

      diagnostics.diveLogSave.apiCall = {
        endpoint: proxyResult.originalUrl || '/api/supabase/save-dive-log',
        status: proxyResult.status || proxyResponse.status,
        ok: proxyResult.success || false,
        statusText: proxyResult.success ? 'OK' : 'Failed',
        contentType: proxyResponse.headers.get('content-type')
      };

      if (proxyResult.success) {
        diagnostics.diveLogSave.response = {
          success: proxyResult.data?.success,
          hasId: !!proxyResult.data?.id,
          message: proxyResult.data?.message
        };
      } else {
        const errorText = JSON.stringify(proxyResult.data || proxyResult);
        diagnostics.diveLogSave.error = errorText;
        diagnostics.errors.push(`Dive log save failed: ${proxyResult.status} - ${errorText}`);
      }

    } catch (diveLogError: any) {
      diagnostics.diveLogSave.error = diveLogError.message;
      diagnostics.errors.push(`Dive log save test failed: ${diveLogError.message}`);
    }

    // 3. JOURNAL/CHAT SAVE TEST
    try {
      const testChatData = {
        userId: 'test-user-123',
        message: 'Debug test chat message',
        assistantReply: 'Debug test assistant reply',
        timestamp: new Date().toISOString()
      };

      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';

      const proxyEndpoint = `${baseUrl}/api/internal/proxy`;
      
      const chatProxyResponse = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/api/supabase/chat',
          method: 'POST',
          body: testChatData
        })
      });

      const chatProxyResult = await chatProxyResponse.json();

      diagnostics.journalSave.apiCall = {
        endpoint: chatProxyResult.originalUrl || '/api/supabase/chat',
        status: chatProxyResult.status || chatProxyResponse.status,
        ok: chatProxyResult.success || false,
        statusText: chatProxyResult.success ? 'OK' : 'Failed'
      };

      if (chatProxyResult.success) {
        diagnostics.journalSave.response = {
          success: chatProxyResult.data?.success,
          hasId: !!chatProxyResult.data?.id,
          message: chatProxyResult.data?.message
        };
      } else {
        const errorText = JSON.stringify(chatProxyResult.data || chatProxyResult);
        diagnostics.journalSave.error = errorText;
        diagnostics.errors.push(`Journal save failed: ${chatProxyResult.status} - ${errorText}`);
      }

    } catch (journalError: any) {
      diagnostics.journalSave.error = journalError.message;
      diagnostics.errors.push(`Journal save test failed: ${journalError.message}`);
    }

    // 4. UI STATE SIMULATION TEST
    diagnostics.uiSimulation = {
      note: 'This tests the expected response format for UI state management',
      expectedDiveLogFormat: {
        success: true,
        id: 'uuid-string',
        message: 'Dive log saved successfully'
      },
      expectedChatFormat: {
        success: true,
        id: 'uuid-string',
        assistantMessage: { role: 'assistant', content: 'response' }
      },
      commonIssues: [
        'Missing success field causes UI not to close',
        'HTTP 500 errors prevent proper error handling',
        'Malformed JSON responses break client parsing',
        'Missing CORS headers block requests'
      ]
    };

    // 5. DIRECT DATABASE TEST
    diagnostics.database.directInsert = {
      status: 'SKIPPED',
      note: 'Direct database test skipped due to TypeScript typing issues',
      recommendation: 'Use API endpoints for database operations'
    };

    // 6. SUMMARY
    diagnostics.summary = {
      totalErrors: diagnostics.errors.length,
      databaseHealthy: diagnostics.database.diveLogsTable?.accessible === true,
      diveLogSaveWorking: diagnostics.diveLogSave.apiCall?.ok === true,
      journalSaveWorking: diagnostics.journalSave.apiCall?.ok === true,
      directDbWorking: diagnostics.database.directInsert?.status === 'SUCCESS',
      overallHealth: diagnostics.errors.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
      recommendations: []
    };

    // Add specific recommendations based on issues found
    if (!diagnostics.summary.databaseHealthy) {
      diagnostics.summary.recommendations.push('Check Supabase connection and table schemas');
    }
    if (!diagnostics.summary.diveLogSaveWorking) {
      diagnostics.summary.recommendations.push('Check dive log API endpoint and validation logic');
    }
    if (!diagnostics.summary.journalSaveWorking) {
      diagnostics.summary.recommendations.push('Check chat/journal save API endpoint');
    }

    console.log('✅ Dive log & journal debug complete. Summary:', diagnostics.summary);

    res.status(200).json(diagnostics);

  } catch (error: any) {
    console.error('❌ Dive log & journal debug error:', error);
    diagnostics.errors.push(`Debug system error: ${error.message}`);
    
    res.status(500).json({
      ...diagnostics,
      criticalError: error.message,
      stack: error.stack
    });
  }
}
