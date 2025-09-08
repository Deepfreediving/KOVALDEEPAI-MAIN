// Batch analysis API for dive logs pattern detection and coaching insights
import { getAdminClient } from '@/lib/supabase';
import { handleVercelAuth } from '@/lib/vercelAuth';

// OpenAI batch analysis function
async function analyzeDiveLogsBatch(diveLogs, analysisType = 'pattern') {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Prepare dive logs data for analysis - MINIMAL DATA TO STAY UNDER TOKEN LIMIT
  const logsData = diveLogs.map(log => ({
    date: log.date,
    discipline: log.discipline,
    location: log.location,
    targetDepth: log.target_depth,
    reachedDepth: log.reached_depth,
    squeeze: log.squeeze,
    notes: log.notes ? log.notes.substring(0, 100) : null, // Truncate notes
  }));

  let systemPrompt = "";
  
  if (analysisType === 'pattern') {
    systemPrompt = `You are an expert freediving coach analyzing dive logs for patterns, flaws, and areas for improvement.

Analyze the provided dive logs and identify:

1. **Performance Patterns**: 
   - Depth progression trends
   - Success/failure rates by discipline
   - Seasonal or location-based patterns
   - Recovery quality trends

2. **Technical Issues**:
   - Recurring squeeze problems (ear vs lung)
   - Mouthfill technique issues
   - Exit protocol consistency
   - Surface protocol adherence

3. **Training Insights**:
   - Depth targets vs achievements
   - Bottom time optimization
   - Recovery patterns
   - Gear effectiveness

4. **Risk Assessment**:
   - Dangerous patterns or behaviors
   - Safety protocol compliance
   - Progressive overload appropriateness

Provide specific, actionable coaching recommendations based on the data.`;
  } else if (analysisType === 'safety') {
    systemPrompt = `You are a freediving safety expert analyzing dive logs for safety concerns and risk patterns.

Focus on:
1. Safety protocol adherence
2. Progressive depth increases
3. Recovery quality patterns
4. Equipment safety issues
5. Environmental risk factors
6. Emergency preparedness indicators

Provide safety-focused recommendations.`;
  } else if (analysisType === 'performance') {
    systemPrompt = `You are a freediving performance coach analyzing dive logs for optimization opportunities.

Focus on:
1. Performance progression tracking
2. Technique optimization areas
3. Training periodization effectiveness
4. Competition readiness indicators
5. Mental preparation insights

Provide performance-focused recommendations.`;
  }

  const prompt = `${systemPrompt}

Dive Logs Data:
${JSON.stringify(logsData, null, 2)}

Please provide a comprehensive analysis in the following format:

## Summary
Brief overview of the diver's current status and key findings.

## Key Patterns Identified
- List major patterns discovered
- Include specific data points and trends

## Areas for Improvement
- Specific technical issues to address
- Training recommendations
- Safety considerations

## Coaching Recommendations
- Short-term action items (next 1-2 sessions)
- Medium-term goals (next month)
- Long-term development plan (next 3 months)

## Risk Assessment
- Current risk level (Low/Medium/High)
- Specific safety concerns
- Recommended safety measures

## Progress Tracking
- Key metrics to monitor
- Success indicators
- Recommended logging improvements`;

  try {
    console.log('🧠 Sending request to OpenAI...');
    console.log('📝 Prompt length:', prompt.length);
    console.log('📊 Number of logs:', logsData.length);
    console.log('📋 Sample data structure:', JSON.stringify(logsData[0] || {}, null, 2));
    
    const requestBody = {
      model: 'gpt-4-turbo-preview', // Use turbo version with larger context
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500, // Reduce to leave more room for input
      temperature: 0.7,
    };
    
    console.log('🌐 Request body size:', JSON.stringify(requestBody).length);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No analysis generated';
  } catch (error) {
    console.error('❌ OpenAI batch analysis error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Handle Vercel authentication protection for API routes
  handleVercelAuth(req, res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, analysisType = 'pattern', timeRange = 'all' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`🔍 Starting batch analysis for user: ${userId}, type: ${analysisType}, range: ${timeRange}`);

    const supabase = getAdminClient();
    
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase admin client');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Could not initialize Supabase client'
      });
    }

    // Build query with time range filter
    let query = supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    // Apply time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }
    }

    // Get dive logs for analysis
    const { data: diveLogs, error } = await query;

    if (error) {
      console.error('❌ Error fetching dive logs for analysis:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch dive logs',
        details: error.message 
      });
    }

    if (!diveLogs || diveLogs.length === 0) {
      return res.status(400).json({ 
        error: 'No dive logs found for analysis',
        message: 'At least one dive log is required for batch analysis'
      });
    }

    console.log(`📊 Analyzing ${diveLogs.length} dive logs...`);

    // Perform batch analysis using OpenAI
    const analysisResult = await analyzeDiveLogsBatch(diveLogs, analysisType);

    // Save analysis result to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('dive_log_analyses')
      .insert({
        user_id: userId,
        analysis_type: analysisType,
        time_range: timeRange,
        logs_count: diveLogs.length,
        analysis_result: analysisResult,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.warn('⚠️ Could not save analysis to database:', saveError);
      // Continue without failing - analysis still succeeded
    }

    console.log(`✅ Batch analysis completed for ${diveLogs.length} logs`);

    return res.status(200).json({
      success: true,
      analysis: {
        id: savedAnalysis?.id,
        type: analysisType,
        timeRange: timeRange,
        logsAnalyzed: diveLogs.length,
        result: analysisResult,
        createdAt: new Date().toISOString()
      },
      diveLogs: diveLogs,
      message: `Successfully analyzed ${diveLogs.length} dive logs`
    });

  } catch (error) {
    console.error('❌ Batch analysis API error:', error);
    return res.status(500).json({
      error: 'Batch analysis failed',
      details: error.message
    });
  }
}
