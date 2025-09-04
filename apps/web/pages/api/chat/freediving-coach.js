/**
 * AI Freediving Coach Chat API
 */

import { getAdminClient } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, message, context } = req.body

    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'User ID and message are required' 
      })
    }

    const supabase = getAdminClient()

    // Simulate AI coach response based on context
    const mockResponse = generateCoachResponse(message, context)

    // Store chat message
    const { data: chatRecord, error: chatError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        message: message,
        response: mockResponse,
        context_data: context || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (chatError) {
      console.warn('Chat table may not exist:', chatError.message)
    }

    res.status(200).json({
      success: true,
      response: mockResponse,
      messageId: chatRecord?.id || 'mock-message-id'
    })

  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ 
      error: 'Chat failed',
      details: error.message 
    })
  }
}

function generateCoachResponse(message, context) {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('squeeze')) {
    return `I see you experienced a squeeze at depth. This is common and can be addressed through:\n\n1. **Equalization Technique**: Practice the Frenzel maneuver on land first\n2. **Descent Speed**: Slow down your descent to give more time for equalization\n3. **Pre-dive Preparation**: Do gentle neck stretches and jaw exercises\n4. **Practice**: Start with shallower depths and gradually progress\n\nBased on your recent dives, I notice you've been training regularly at ${context?.recentDives?.[0]?.location || 'various locations'}. Consider working with a certified instructor to refine your technique.`
  }
  
  if (lowerMessage.includes('breath hold') || lowerMessage.includes('apnea')) {
    return `For breath hold improvement:\n\n1. **CO2 Tolerance**: Practice CO2 tables\n2. **Relaxation**: Focus on mental relaxation techniques\n3. **Dry Training**: Practice static apnea on land\n4. **Progressive Training**: Gradually increase hold times\n\nYour certification level (${context?.userLevel || 'beginner'}) suggests you should focus on safety and proper technique before pushing limits.`
  }
  
  return `Thank you for your question about freediving. As an AI coach, I recommend:\n\n1. Always prioritize safety over performance\n2. Train with a certified buddy or instructor\n3. Practice proper technique before increasing difficulty\n4. Listen to your body and respect your limits\n\nBased on your diving history, you're making good progress. Keep focusing on technique and safety!`
}
