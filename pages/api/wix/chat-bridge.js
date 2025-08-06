// NEW FILE - does not overwrite anything
// pages/api/wix/chat-bridge.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userMessage, conversationHistory, userId, profile } = req.body;

    // ✅ OPTION 1: Try your Wix backend first
    try {
      const wixResponse = await fetch('https://www.deepfreediving.com/_functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          conversationHistory: conversationHistory || [],
          userId,
          profile
        })
      });

      if (wixResponse.ok) {
        const wixData = await wixResponse.json();
        return res.status(200).json({
          aiResponse: wixData.aiResponse || wixData.response,
          success: true,
          source: 'wix-backend'
        });
      }
    } catch (wixError) {
      console.warn('⚠️ Wix backend unavailable, using Next.js fallback');
    }

    // ✅ OPTION 2: Fallback to your existing chat.ts
    const nextjsResponse = await fetch(`${req.headers.origin}/api/openai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        userId,
        profile,
        embedMode: true
      })
    });
    
    if (nextjsResponse.ok) {
      const nextjsData = await nextjsResponse.json();
      return res.status(200).json({
        aiResponse: nextjsData.assistantMessage?.content || nextjsData.answer,
        success: true,
        source: 'nextjs-fallback'
      });
    }

    throw new Error('Both Wix and Next.js APIs failed');

  } catch (error) {
    console.error('❌ Chat bridge error:', error);
    return res.status(500).json({ 
      error: 'Chat service temporarily unavailable',
      success: false
    });
  }
}