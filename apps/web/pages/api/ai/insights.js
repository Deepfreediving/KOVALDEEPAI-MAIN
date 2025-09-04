// AI Insights API - Get personalized coaching from user's trained assistant
import { getAdminClient } from '@/lib/supabase'
import AssistantTrainingService from '@/lib/ai/assistantTrainingService'

export default async function handler(req, res) {
  try {
    const supabase = getAdminClient();
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, query, analysisType = 'general' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`🧠 AI insights request for user ${userId}: ${query || analysisType}`);

    // Get user profile and assistant ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('openai_assistant_id, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!userProfile.openai_assistant_id) {
      return res.status(400).json({ 
        error: 'No AI assistant found for this user',
        message: 'Upload some dive logs first to create your personal coach'
      });
    }

    // Get recent dive history for context
    const { data: recentDives } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10);

    let response;
    
    if (analysisType === 'patterns') {
      // Analyze dive patterns and safety
      response = await AssistantTrainingService.analyzeDivePatterns(
        userProfile.openai_assistant_id,
        recentDives || []
      );
    } else if (query) {
      // Answer specific question
      response = await AssistantTrainingService.generateInsights(
        userProfile.openai_assistant_id,
        query,
        recentDives || []
      );
    } else {
      return res.status(400).json({ error: 'Either query or analysisType=patterns is required' });
    }

    // Store the insights in user profile
    await supabase
      .from('user_profiles')
      .update({
        ai_insights: {
          latest_analysis: response,
          generated_at: new Date().toISOString(),
          query: query || `Pattern analysis (${analysisType})`,
          dive_count: recentDives?.length || 0
        }
      })
      .eq('user_id', userId);

    console.log(`✅ AI insights generated for ${userProfile.full_name}`);

    return res.status(200).json({
      success: true,
      insights: response,
      analysisType,
      diveCount: recentDives?.length || 0,
      assistantId: userProfile.openai_assistant_id,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI insights error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate insights',
      details: error.message 
    });
  }
}
