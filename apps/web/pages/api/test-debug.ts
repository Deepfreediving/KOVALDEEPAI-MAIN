/**
 * 🔧 SIMPLE DEBUG DASHBOARD
 * 
 * Direct access debug page without complex routing
 */

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run basic tests immediately
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Test 1: Environment Check
    results.tests.environment = {
      NODE_ENV: process.env.NODE_ENV,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasPinecone: !!process.env.PINECONE_API_KEY,
      hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // Test 2: Quick Pinecone Test
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
        ok: pineconeResponse.ok
      };

      if (pineconeResponse.ok) {
        const pineconeData = await pineconeResponse.json();
        results.tests.pinecone.chunksReturned = pineconeData.chunks?.length || 0;
        results.tests.pinecone.hasCanonicalContent = pineconeData.chunks?.[0]?.includes('4 Rules of Direct Supervision') || false;
      }
    } catch (pineconeError: any) {
      results.tests.pinecone = { error: pineconeError.message };
    }

    // Test 3: Quick Chat Test
    try {
      const chatResponse = await fetch('https://kovaldeepai-main.vercel.app/api/chat/general', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "what are the 4 rules of direct supervision",
          userId: "debug-test"
        }),
      });

      results.tests.chat = {
        status: chatResponse.status,
        ok: chatResponse.ok
      };

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        results.tests.chat.contextChunks = chatData.metadata?.contextChunks || 0;
        results.tests.chat.hasCanonicalResponse = chatData.assistantMessage?.content?.includes('LMC and blackout may not be preventable') || false;
      } else {
        const errorText = await chatResponse.text();
        results.tests.chat.error = errorText.substring(0, 200);
      }
    } catch (chatError: any) {
      results.tests.chat = { error: chatError.message };
    }

    // Analysis
    results.analysis = {
      pineconeWorking: results.tests.pinecone?.ok === true,
      chatWorking: results.tests.chat?.ok === true,
      gettingKnowledge: results.tests.chat?.contextChunks > 0,
      canonicalContent: results.tests.chat?.hasCanonicalResponse === true
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>KovalDeepAI Debug Results</title>
    <style>
        body { font-family: monospace; background: #000; color: #0f0; padding: 20px; }
        .test { margin: 15px 0; padding: 10px; border: 1px solid #333; }
        .pass { border-color: #0f0; }
        .fail { border-color: #f00; color: #f00; }
        .warn { border-color: #ff0; color: #ff0; }
        pre { background: #111; padding: 10px; overflow-x: auto; }
        h2 { color: #0ff; }
        .summary { background: #222; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🔧 KovalDeepAI Debug Results</h1>
    <p>Timestamp: ${results.timestamp}</p>
    
    <div class="summary">
        <h2>🎯 QUICK SUMMARY</h2>
        <div class="${results.analysis.pineconeWorking ? 'pass' : 'fail'} test">
            Pinecone API: ${results.analysis.pineconeWorking ? '✅ WORKING' : '❌ FAILED'}
        </div>
        <div class="${results.analysis.chatWorking ? 'pass' : 'fail'} test">
            Chat API: ${results.analysis.chatWorking ? '✅ WORKING' : '❌ FAILED'}
        </div>
        <div class="${results.analysis.gettingKnowledge ? 'pass' : 'fail'} test">
            Knowledge Retrieval: ${results.analysis.gettingKnowledge ? '✅ WORKING' : '❌ FAILED'} 
            (Context Chunks: ${results.tests.chat?.contextChunks || 0})
        </div>
        <div class="${results.analysis.canonicalContent ? 'pass' : 'fail'} test">
            Canonical Content: ${results.analysis.canonicalContent ? '✅ WORKING' : '❌ FAILED'}
        </div>
    </div>

    <h2>📊 DETAILED RESULTS</h2>
    <pre>${JSON.stringify(results, null, 2)}</pre>

    <h2>🔗 MANUAL TEST LINKS</h2>
    <p><a href="https://kovaldeepai-main.vercel.app/" style="color: #0ff;">Test Main Chat Interface</a></p>
    <p><a href="https://kovaldeepai-main.vercel.app/api/pinecone/pineconequery-gpt" style="color: #0ff;">Test Pinecone Endpoint</a></p>
    <p><a href="https://kovaldeepai-main.vercel.app/api/chat/general" style="color: #0ff;">Test Chat Endpoint</a></p>

    <h2>🎯 EXPECTED vs ACTUAL</h2>
    <div class="test">
        <h3>Expected: Chat returns canonical "4 Rules"</h3>
        <p>Should include: "LMC and blackout may not be preventable so its mandatory to follow the 4 Rules of Direct Supervision"</p>
        <p>Actual: ${results.analysis.canonicalContent ? 'FOUND ✅' : 'NOT FOUND ❌'}</p>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      results
    });
  }
}
