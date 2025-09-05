/**
 * 🚀 INSTANT API TESTS
 * 
 * Runs tests immediately and returns JSON results
 */

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {}
  };

  try {
    console.log('🔍 Starting instant debug tests...');

    // TEST 1: Pinecone Knowledge Retrieval
    console.log('Testing Pinecone...');
    try {
      const pineconeResponse = await fetch('https://kovaldeepai-main.vercel.app/api/pinecone/pineconequery-gpt', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "4 rules of direct supervision",
          returnChunks: true,
        }),
      });

      results.tests.pinecone = {
        status: pineconeResponse.status,
        ok: pineconeResponse.ok,
        responseTime: Date.now() - startTime
      };

      if (pineconeResponse.ok) {
        const data = await pineconeResponse.json();
        results.tests.pinecone.chunksReturned = data.chunks?.length || 0;
        results.tests.pinecone.hasIndexMatch = !!data.indexMatch;
        results.tests.pinecone.verbatim = data.verbatim;
        results.tests.pinecone.botMustSay = data.indexMatch?.bot_must_say;
      } else {
        const errorText = await pineconeResponse.text();
        results.tests.pinecone.error = errorText.substring(0, 300);
      }
    } catch (pineconeError: any) {
      results.tests.pinecone = { 
        status: 'ERROR',
        error: pineconeError.message 
      };
    }

    // TEST 2: Chat API with Knowledge
    console.log('Testing Chat API...');
    try {
      const chatStartTime = Date.now();
      const chatResponse = await fetch('https://kovaldeepai-main.vercel.app/api/chat/general', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "what are the 4 rules of direct supervision",
          userId: "instant-debug-test"
        }),
      });

      results.tests.chat = {
        status: chatResponse.status,
        ok: chatResponse.ok,
        responseTime: Date.now() - chatStartTime
      };

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        const content = data.assistantMessage?.content || '';
        
        results.tests.chat.contextChunks = data.metadata?.contextChunks || 0;
        results.tests.chat.processingTime = data.metadata?.processingTime;
        results.tests.chat.userLevel = data.metadata?.userLevel;
        results.tests.chat.responseLength = content.length;
        
        // Check for canonical content
        results.tests.chat.analysis = {
          hasCanonicalBotMustSay: content.includes('LMC and blackout may not be preventable so its mandatory to follow the 4 Rules of Direct Supervision'),
          hasGenericRules: content.includes('philosophy and training methodology'),
          hasOneUpOneDown: content.includes('One Up') && content.includes('One Down'),
          hasArmsReach: content.includes('arm\'s reach') || content.includes('Arm\'s Reach'),
          hasTripleOK: content.includes('Triple OK') || content.includes('triple ok'),
          has30Seconds: content.includes('30 seconds') || content.includes('30 Seconds')
        };

        // Extract first 200 chars for inspection
        results.tests.chat.responsePreview = content.substring(0, 200) + '...';
        
      } else {
        const errorText = await chatResponse.text();
        results.tests.chat.error = errorText.substring(0, 300);
      }
    } catch (chatError: any) {
      results.tests.chat = { 
        status: 'ERROR',
        error: chatError.message 
      };
    }

    // TEST 3: Environment Check
    results.tests.environment = {
      NODE_ENV: process.env.NODE_ENV,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasPinecone: !!process.env.PINECONE_API_KEY,
      hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasVercelUrl: !!process.env.VERCEL_URL
    };

    // SUMMARY ANALYSIS
    const pineconeWorking = results.tests.pinecone?.ok === true;
    const chatWorking = results.tests.chat?.ok === true;
    const gettingKnowledge = (results.tests.chat?.contextChunks || 0) > 0;
    const hasCanonicalContent = results.tests.chat?.analysis?.hasCanonicalBotMustSay === true;
    const isGeneric = results.tests.chat?.analysis?.hasGenericRules === true;

    results.summary = {
      overallStatus: (pineconeWorking && chatWorking && gettingKnowledge && hasCanonicalContent) ? 'HEALTHY' : 'ISSUES_DETECTED',
      pineconeWorking,
      chatWorking,
      gettingKnowledge,
      hasCanonicalContent,
      isReturningGenericContent: isGeneric,
      totalResponseTime: Date.now() - startTime,
      issues: []
    };

    // Identify specific issues
    if (!pineconeWorking) {
      results.summary.issues.push('Pinecone API not responding correctly');
    }
    if (!chatWorking) {
      results.summary.issues.push('Chat API not responding correctly');
    }
    if (!gettingKnowledge) {
      results.summary.issues.push(`Chat not retrieving knowledge (contextChunks: ${results.tests.chat?.contextChunks || 0})`);
    }
    if (!hasCanonicalContent) {
      results.summary.issues.push('Chat not returning canonical "Bot Must Say" content');
    }
    if (isGeneric) {
      results.summary.issues.push('Chat returning generic freediving advice instead of Daniel Koval content');
    }

    // Success message
    if (results.summary.overallStatus === 'HEALTHY') {
      results.summary.message = '✅ All systems working! Chat should return canonical Daniel Koval safety content.';
    } else {
      results.summary.message = `❌ ${results.summary.issues.length} issue(s) detected. See issues array for details.`;
    }

    console.log('✅ Instant debug complete:', results.summary);

    res.status(200).json(results);

  } catch (error: any) {
    console.error('❌ Instant debug error:', error);
    
    results.summary = {
      overallStatus: 'ERROR',
      error: error.message,
      totalResponseTime: Date.now() - startTime
    };

    res.status(500).json(results);
  }
}
