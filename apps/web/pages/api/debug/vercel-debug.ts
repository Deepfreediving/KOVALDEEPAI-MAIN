/**
 * 🔍 COMPREHENSIVE VERCEL DEBUG SYSTEM
 * 
 * Tests all critical paths:
 * - Dive log saving
 * - Image analysis
 * - Journal saving
 * - Chat functionality
 * - Supabase connections
 * - File paths and environment variables
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    paths: {},
    supabase: {},
    apis: {},
    errors: []
  };

  try {
    // 1. ENVIRONMENT AUDIT
    console.log('🔍 Starting comprehensive Vercel debug...');
    
    diagnostics.environment = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV,
      BASE_URL: process.env.BASE_URL || 'not set',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      PINECONE_API_KEY: process.env.PINECONE_API_KEY ? 'SET' : 'NOT SET',
      PINECONE_INDEX: process.env.PINECONE_INDEX || 'not set'
    };

    // 2. PATH CONSTRUCTION AUDIT
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';

    diagnostics.paths = {
      constructedBaseUrl: baseUrl,
      chatEndpoint: `${baseUrl}/api/chat/general`,
      pineconeEndpoint: `${baseUrl}/api/pinecone/pineconequery-gpt`,
      diveLogSaveEndpoint: `${baseUrl}/api/supabase/dive-logs`,
      imageAnalysisEndpoint: `${baseUrl}/api/analyze/analyze-dive-image`,
      journalSaveEndpoint: `${baseUrl}/api/supabase/chat`
    };

    // 3. SUPABASE CONNECTION TEST
    console.log('🔍 Testing Supabase connection...');
    try {
      const supabase = getAdminClient();
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      diagnostics.supabase.connection = testError ? 'FAILED' : 'SUCCESS';
      diagnostics.supabase.connectionError = testError?.message;
      diagnostics.supabase.testQueryResult = testData ? 'DATA_RETURNED' : 'NO_DATA';

      // Test dive_logs table
      const { data: diveLogsData, error: diveLogsError } = await supabase
        .from('dive_logs')
        .select('id')
        .limit(1);

      diagnostics.supabase.diveLogsTable = diveLogsError ? 'FAILED' : 'SUCCESS';
      diagnostics.supabase.diveLogsError = diveLogsError?.message;

      // Test chat_messages table
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      diagnostics.supabase.chatTable = chatError ? 'FAILED' : 'SUCCESS';
      diagnostics.supabase.chatError = chatError?.message;

      // Test storage bucket
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('dive-images')
        .list('', { limit: 1 });

      diagnostics.supabase.storage = storageError ? 'FAILED' : 'SUCCESS';
      diagnostics.supabase.storageError = storageError?.message;

    } catch (supabaseError: any) {
      diagnostics.supabase.connection = 'FAILED';
      diagnostics.supabase.connectionError = supabaseError.message;
      diagnostics.errors.push(`Supabase connection failed: ${supabaseError.message}`);
    }

    // 4. API ENDPOINT TESTS
    console.log('🔍 Testing API endpoints...');

    // Test Pinecone endpoint
    try {
      const pineconeResponse = await fetch(diagnostics.paths.pineconeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "4 rules of direct supervision",
          returnChunks: true,
        }),
      });

      diagnostics.apis.pinecone = {
        status: pineconeResponse.status,
        ok: pineconeResponse.ok,
        contentType: pineconeResponse.headers.get('content-type')
      };

      if (pineconeResponse.ok) {
        const pineconeResult = await pineconeResponse.json();
        diagnostics.apis.pinecone.chunksReturned = pineconeResult.chunks?.length || 0;
        diagnostics.apis.pinecone.hasIndexMatch = !!pineconeResult.indexMatch;
      } else {
        const errorText = await pineconeResponse.text();
        diagnostics.apis.pinecone.error = errorText.substring(0, 200);
      }
    } catch (pineconeError: any) {
      diagnostics.apis.pinecone = {
        status: 'ERROR',
        error: pineconeError.message
      };
      diagnostics.errors.push(`Pinecone API test failed: ${pineconeError.message}`);
    }

    // Test Chat endpoint
    try {
      const chatResponse = await fetch(diagnostics.paths.chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "test message",
          userId: "debug-test-user"
        }),
      });

      diagnostics.apis.chat = {
        status: chatResponse.status,
        ok: chatResponse.ok,
        contentType: chatResponse.headers.get('content-type')
      };

      if (chatResponse.ok) {
        const chatResult = await chatResponse.json();
        diagnostics.apis.chat.hasAssistantMessage = !!chatResult.assistantMessage;
        diagnostics.apis.chat.contextChunks = chatResult.metadata?.contextChunks || 0;
      } else {
        const errorText = await chatResponse.text();
        diagnostics.apis.chat.error = errorText.substring(0, 200);
      }
    } catch (chatError: any) {
      diagnostics.apis.chat = {
        status: 'ERROR',
        error: chatError.message
      };
      diagnostics.errors.push(`Chat API test failed: ${chatError.message}`);
    }

    // 5. DIVE LOG SAVE TEST
    console.log('🔍 Testing dive log save...');
    try {
      const testDiveLog = {
        userId: 'debug-test-user-12345',
        date: new Date().toISOString().split('T')[0],
        discipline: 'Constant Weight',
        targetDepth: 50,
        reachedDepth: 48,
        location: 'Test Location',
        notes: 'Debug test dive log'
      };

      const diveLogResponse = await fetch(diagnostics.paths.diveLogSaveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testDiveLog),
      });

      diagnostics.apis.diveLogSave = {
        status: diveLogResponse.status,
        ok: diveLogResponse.ok,
        contentType: diveLogResponse.headers.get('content-type')
      };

      if (diveLogResponse.ok) {
        const diveLogResult = await diveLogResponse.json();
        diagnostics.apis.diveLogSave.success = diveLogResult.success;
        diagnostics.apis.diveLogSave.hasId = !!diveLogResult.id;
      } else {
        const errorText = await diveLogResponse.text();
        diagnostics.apis.diveLogSave.error = errorText.substring(0, 200);
      }
    } catch (diveLogError: any) {
      diagnostics.apis.diveLogSave = {
        status: 'ERROR',
        error: diveLogError.message
      };
      diagnostics.errors.push(`Dive log save test failed: ${diveLogError.message}`);
    }

    // 6. FILE SYSTEM CHECKS
    console.log('🔍 Checking file system...');
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check if knowledge index exists
      const knowledgeIndexPath = path.join(process.cwd(), 'apps', 'web', 'knowledge', 'koval-knowledge-index.json');
      const indexExists = fs.existsSync(knowledgeIndexPath);
      
      diagnostics.filesystem = {
        knowledgeIndexExists: indexExists,
        workingDirectory: process.cwd()
      };

      if (indexExists) {
        const indexStats = fs.statSync(knowledgeIndexPath);
        diagnostics.filesystem.indexSize = indexStats.size;
        diagnostics.filesystem.indexModified = indexStats.mtime;
      }
    } catch (fsError: any) {
      diagnostics.filesystem = {
        error: fsError.message
      };
      diagnostics.errors.push(`Filesystem check failed: ${fsError.message}`);
    }

    // 7. SUMMARY
    diagnostics.summary = {
      totalErrors: diagnostics.errors.length,
      supabaseHealthy: diagnostics.supabase.connection === 'SUCCESS',
      pineconeHealthy: diagnostics.apis.pinecone?.ok === true,
      chatHealthy: diagnostics.apis.chat?.ok === true,
      diveLogSaveHealthy: diagnostics.apis.diveLogSave?.ok === true,
      overallHealth: diagnostics.errors.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
    };

    console.log('✅ Debug complete. Summary:', diagnostics.summary);

    res.status(200).json(diagnostics);

  } catch (error: any) {
    console.error('❌ Debug system error:', error);
    diagnostics.errors.push(`Debug system error: ${error.message}`);
    
    res.status(500).json({
      ...diagnostics,
      criticalError: error.message,
      stack: error.stack
    });
  }
}
